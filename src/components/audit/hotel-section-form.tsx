"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuditStore, type HotelSubAreaDraft, type ChecklistEntry } from "@/lib/store/audit";
import { ChecklistItemRow } from "./checklist-item-row";
import { AddChecklistItemInline } from "./add-checklist-item-inline";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CachedTemplate = { id: string; name: string; context: string; moduleType: string; items: { id: string; itemLabel: string }[] };

// Module-level cache so templates are fetched once per session
const templateCache = new Map<string, CachedTemplate[]>();

// Maps sectionKey (Zustand draft key) → template context string
const SECTION_CONTEXT: Partial<Record<string, string>> = {
  frontOffice:        "hotel_front_office",
  housekeeping:       "hotel_housekeeping",
  engineering:        "hotel_engineering",
  foodBeverage:       "hotel_food_beverage",
  propertyManagement: "hotel_property_mgmt",
  security:           "hotel_security",
  finance:            "hotel_finance",
  humanResources:     "hotel_hr",
  guestExperience:    "hotel_guest_experience",
};

// Stable empty fallback — a new [] each call causes useSyncExternalStore infinite loop
const EMPTY_SUBAREAS: HotelSubAreaDraft[] = [];

interface HotelSectionFormProps {
  auditId: string;
  sectionKey: keyof Pick<
    ReturnType<typeof useAuditStore.getState>["drafts"][string],
    | "frontOffice"
    | "housekeeping"
    | "engineering"
    | "foodBeverage"
    | "propertyManagement"
    | "security"
    | "finance"
    | "humanResources"
    | "guestExperience"
  >;
  showErrors?: boolean;
}

export function HotelSectionForm({ auditId, sectionKey, showErrors }: HotelSectionFormProps) {
  const subAreas = useAuditStore(
    useCallback((s) => (s.drafts[auditId]?.[sectionKey] as HotelSubAreaDraft[] | undefined) ?? EMPTY_SUBAREAS, [auditId, sectionKey])
  );
  const draftVersion = useAuditStore(useCallback((s) => s.drafts[auditId]?.version ?? 0, [auditId]));
  const updateHotelSection = useAuditStore((s) => s.updateHotelSection);

  const [kitchenChecklist, setKitchenChecklist] = useState<ChecklistEntry[]>([]);
  const [kitchenTemplates, setKitchenTemplates] = useState(templateCache.get("kitchen") ?? []);
  const kitchenInitialised = useRef(false);
  const lastSyncedVersion = useRef(-1);
  const pendingKitchenEdit = useRef(false);
  const hasKitchen = subAreas.some((s) => s.subAreaKey === "kitchen");

  // Load kitchen templates once (initKitchenChecklist is called by the version-bump effect).
  useEffect(() => {
    if (!hasKitchen || kitchenInitialised.current) return;
    kitchenInitialised.current = true;

    const cached = templateCache.get("kitchen");
    if (cached) {
      setKitchenTemplates(cached);
      return;
    }

    fetch("/api/templates?context=kitchen")
      .then((r) => r.json())
      .then((tmpls) => {
        templateCache.set("kitchen", tmpls);
        setKitchenTemplates(tmpls);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKitchen]);

  // Re-init kitchen checklist whenever draftVersion increases (IDB hydration, server pull, post-save).
  useEffect(() => {
    if (!hasKitchen || !kitchenTemplates.length) return;
    if (draftVersion <= lastSyncedVersion.current) return;
    lastSyncedVersion.current = draftVersion;
    pendingKitchenEdit.current = false;
    initKitchenChecklist(kitchenTemplates);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftVersion, kitchenTemplates, hasKitchen]);

  // Sync section templates on every mount — no cache guard so moduleType changes take effect immediately.
  // Handles two cases:
  //   1. Section-level template (context === sectionCtx) → creates/updates __checklist sub-area
  //   2. Sub-area-level templates (context === sectionCtx_subAreaKey) → overrides static sub-area moduleType
  useEffect(() => {
    const sectionCtx = SECTION_CONTEXT[sectionKey as string];
    if (!sectionCtx) return;

    fetch(`/api/templates?contextPrefix=${sectionCtx}`)
      .then((r) => r.json())
      .then((tmpls: CachedTemplate[]) => {
        const currentSubs = (useAuditStore.getState().drafts[auditId]?.[sectionKey] as HotelSubAreaDraft[]) ?? [];
        let updatedSubs = [...currentSubs];
        let changed = false;

        // ── Section-level template → __checklist sub-area ──────────────────────
        const sectionTmpl = tmpls.find((t) => t.context === sectionCtx);
        if (sectionTmpl) {
          const newType = (sectionTmpl.moduleType ?? "checklist") as HotelSubAreaDraft["moduleType"];
          const idx = updatedSubs.findIndex((s) => s.subAreaKey === "__checklist");

          if (idx === -1) {
            // First visit — seed the sub-area
            const seeded: ChecklistEntry[] = newType === "checklist"
              ? sectionTmpl.items.map((item) => ({ itemId: item.id, itemLabel: item.itemLabel, condition: null as null, remarks: "" }))
              : [];
            updatedSubs.push({ subAreaKey: "__checklist", subAreaLabel: "Section Checklist", moduleType: newType, checklist: seeded, remarks: "" });
            changed = true;
          } else if (updatedSubs[idx].moduleType !== newType) {
            // Admin changed moduleType — update in place, preserve auditor's data
            updatedSubs[idx] = { ...updatedSubs[idx], moduleType: newType };
            changed = true;
          }
        }

        // ── Sub-area-level templates → override static sub-area moduleType ─────
        // e.g. context "hotel_housekeeping_public_cleaning" overrides subAreaKey "public_cleaning"
        for (const tmpl of tmpls) {
          if (tmpl.context === sectionCtx) continue;
          if (!tmpl.context.startsWith(sectionCtx + "_")) continue;
          const subAreaKey = tmpl.context.slice(sectionCtx.length + 1);
          const newType = (tmpl.moduleType ?? "checklist") as HotelSubAreaDraft["moduleType"];
          const idx = updatedSubs.findIndex((s) => s.subAreaKey === subAreaKey);
          if (idx !== -1 && updatedSubs[idx].moduleType !== newType) {
            updatedSubs[idx] = { ...updatedSubs[idx], moduleType: newType };
            changed = true;
          }
        }

        if (changed) updateHotelSection(auditId, sectionKey, updatedSubs);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, sectionKey]);

  function initKitchenChecklist(tmpls: typeof kitchenTemplates) {
    const kitchenSub = subAreas.find((s) => s.subAreaKey === "kitchen");
    if (kitchenSub && kitchenSub.checklist.length > 0) {
      const existing = kitchenSub.checklist;
      const byId = new Map(existing.map((c) => [c.itemId, c]));
      const byLabel = new Map(existing.map((c) => [c.itemLabel.toLowerCase().trim(), c]));
      const customItems = existing.filter((c) => c.itemId.startsWith("custom_"));
      const templateItems = tmpls.flatMap((t) =>
        t.items.map((item) => {
          const found = byId.get(item.id) ?? byLabel.get(item.itemLabel.toLowerCase().trim());
          return { itemId: item.id, itemLabel: item.itemLabel, condition: found?.condition ?? null, remarks: found?.remarks ?? "" };
        })
      );
      setKitchenChecklist([...templateItems, ...customItems]);
    } else {
      setKitchenChecklist(
        tmpls.flatMap((t) =>
          t.items.map((item) => ({ itemId: item.id, itemLabel: item.itemLabel, condition: null as null, remarks: "" }))
        )
      );
    }
  }

  // Sync kitchen checklist back to Zustand. Guard on pendingKitchenEdit so a server-pull
  // re-sync doesn't immediately push the server's own data back to the DB.
  useEffect(() => {
    if (!kitchenChecklist.length || !pendingKitchenEdit.current) return;
    const currentSubs = (useAuditStore.getState().drafts[auditId]?.[sectionKey] as HotelSubAreaDraft[] | undefined) ?? EMPTY_SUBAREAS;
    const updated = currentSubs.map((s) =>
      s.subAreaKey === "kitchen" ? { ...s, checklist: kitchenChecklist } : s
    );
    updateHotelSection(auditId, sectionKey, updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchenChecklist]);

  const updateRemarks = useCallback((subAreaKey: string, remarks: string) => {
    const currentSubs = (useAuditStore.getState().drafts[auditId]?.[sectionKey] as HotelSubAreaDraft[] | undefined) ?? EMPTY_SUBAREAS;
    const updated = currentSubs.map((s) => (s.subAreaKey === subAreaKey ? { ...s, remarks } : s));
    updateHotelSection(auditId, sectionKey, updated);
  }, [auditId, sectionKey, updateHotelSection]);

  const updateKitchenItem = useCallback((idx: number, updated: ChecklistEntry) => {
    pendingKitchenEdit.current = true;
    setKitchenChecklist((prev) => prev.map((item, i) => (i === idx ? updated : item)));
  }, []);

  // Read fresh sub-areas from the store on every call so rapid clicks don't overwrite
  // each other via a stale closure. Without this, two quick taps use the same pre-render
  // subAreas snapshot and the second write silently discards the first selection.
  const updateChecklistItem = useCallback((subAreaKey: string, idx: number, updated: ChecklistEntry) => {
    const currentSubs = (useAuditStore.getState().drafts[auditId]?.[sectionKey] as HotelSubAreaDraft[] | undefined) ?? EMPTY_SUBAREAS;
    const updatedSubs = currentSubs.map((s) =>
      s.subAreaKey === subAreaKey
        ? { ...s, checklist: s.checklist.map((c, i) => (i === idx ? updated : c)) }
        : s
    );
    updateHotelSection(auditId, sectionKey, updatedSubs);
  }, [auditId, sectionKey, updateHotelSection]);

  const addChecklistItem = useCallback((subAreaKey: string, label: string) => {
    const currentSubs = (useAuditStore.getState().drafts[auditId]?.[sectionKey] as HotelSubAreaDraft[] | undefined) ?? EMPTY_SUBAREAS;
    const newItem: ChecklistEntry = {
      itemId: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemLabel: label,
      condition: null,
      remarks: "",
    };
    const updatedSubs = currentSubs.map((s) =>
      s.subAreaKey === subAreaKey ? { ...s, checklist: [...s.checklist, newItem] } : s
    );
    updateHotelSection(auditId, sectionKey, updatedSubs);
  }, [auditId, sectionKey, updateHotelSection]);

  const addKitchenItem = useCallback((label: string) => {
    pendingKitchenEdit.current = true;
    const newItem: ChecklistEntry = {
      itemId: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemLabel: label,
      condition: null,
      remarks: "",
    };
    setKitchenChecklist((prev) => [...prev, newItem]);
  }, []);

  return (
    <div className="space-y-4">
      {subAreas.map((sub) => (
        <Card key={sub.subAreaKey}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">{sub.subAreaLabel}</CardTitle>
              <Badge variant={sub.moduleType === "checklist" ? "default" : "secondary"} className="text-xs shrink-0">
                {sub.moduleType === "checklist" ? "Checklist" : "Remarks"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sub.moduleType === "remarks" ? (
              <Textarea
                placeholder={`Enter remarks for ${sub.subAreaLabel}...`}
                value={sub.remarks}
                onChange={(e) => updateRemarks(sub.subAreaKey, e.target.value)}
                rows={3}
              />
            ) : sub.subAreaKey === "kitchen" ? (
              <div className="space-y-6">
                {kitchenTemplates.map((tmpl) => {
                  const tmplItemIds = new Set(tmpl.items.map((ti) => ti.id));
                  const tmplItems = tmpl.items.map((ti) =>
                    kitchenChecklist.find((c) => c.itemId === ti.id) || {
                      itemId: ti.id, itemLabel: ti.itemLabel, condition: null as null, remarks: "",
                    }
                  );
                  return (
                    <div key={tmpl.id}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 pb-1 border-b border-gray-100">
                        {tmpl.name}
                      </h4>
                      <div className="space-y-2">
                        {tmplItems.map((item) => {
                          const globalIdx = kitchenChecklist.findIndex((c) => c.itemId === item.itemId);
                          return (
                            <ChecklistItemRow
                              key={item.itemId}
                              item={item}
                              onChange={(updated) => { if (globalIdx >= 0) updateKitchenItem(globalIdx, updated); }}
                              showError={showErrors}
                            />
                          );
                        })}
                        {kitchenChecklist.filter((c) => c.itemId.startsWith("custom_") && !tmplItemIds.has(c.itemId)).map((item) => {
                          const globalIdx = kitchenChecklist.findIndex((c) => c.itemId === item.itemId);
                          return (
                            <ChecklistItemRow key={item.itemId} item={item} onChange={(u) => updateKitchenItem(globalIdx, u)} showError={showErrors} />
                          );
                        })}
                      </div>
                      <AddChecklistItemInline onAdd={addKitchenItem} />
                    </div>
                  );
                })}
                {kitchenTemplates.length === 0 && (
                  <AddChecklistItemInline onAdd={addKitchenItem} />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {sub.checklist.map((item, idx) => (
                  <ChecklistItemRow
                    key={item.itemId || idx}
                    item={item}
                    onChange={(updated) => updateChecklistItem(sub.subAreaKey, idx, updated)}
                    showError={showErrors}
                  />
                ))}
                <AddChecklistItemInline onAdd={(label) => addChecklistItem(sub.subAreaKey, label)} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
