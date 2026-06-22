"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuditStore, type HotelSubAreaDraft, type ChecklistEntry } from "@/lib/store/audit";
import { ChecklistItemRow } from "./checklist-item-row";
import { AddChecklistItemInline } from "./add-checklist-item-inline";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CachedTemplate = { id: string; name: string; moduleType: string; items: { id: string; itemLabel: string }[] };

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
  const updateHotelSection = useAuditStore((s) => s.updateHotelSection);

  const [kitchenChecklist, setKitchenChecklist] = useState<ChecklistEntry[]>([]);
  const [kitchenTemplates, setKitchenTemplates] = useState(templateCache.get("kitchen") ?? []);
  const kitchenInitialised = useRef(false);
  const sectionInitialised = useRef(false);

  const hasKitchen = subAreas.some((s) => s.subAreaKey === "kitchen");

  // Load kitchen templates once (use cache if available)
  useEffect(() => {
    if (!hasKitchen || kitchenInitialised.current) return;
    kitchenInitialised.current = true;

    const cached = templateCache.get("kitchen");
    if (cached) {
      setKitchenTemplates(cached);
      initKitchenChecklist(cached);
      return;
    }

    fetch("/api/templates?context=kitchen")
      .then((r) => r.json())
      .then((tmpls) => {
        templateCache.set("kitchen", tmpls);
        setKitchenTemplates(tmpls);
        initKitchenChecklist(tmpls);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKitchen]);

  // Load section-level template (e.g. hotel_front_office) and inject as __checklist sub-area
  useEffect(() => {
    if (sectionInitialised.current) return;
    sectionInitialised.current = true;

    const context = SECTION_CONTEXT[sectionKey as string];
    if (!context) return;

    const cacheKey = `section:${context}`;
    const cached = templateCache.get(cacheKey);

    const applyTemplate = (tmpls: CachedTemplate[]) => {
      // No template record → admin hasn't initialized this section yet, don't add sub-area
      if (!tmpls.length) return;

      // Read current sub-areas fresh from store (not stale closure)
      const currentSubs = (useAuditStore.getState().drafts[auditId]?.[sectionKey] as HotelSubAreaDraft[]) ?? [];
      if (currentSubs.some((s) => s.subAreaKey === "__checklist")) return; // already seeded

      // Use the template's moduleType (admin may have set it to remarks/count/status)
      const templateModuleType = (tmpls[0]?.moduleType ?? "checklist") as HotelSubAreaDraft["moduleType"];

      const seeded: ChecklistEntry[] = templateModuleType === "checklist"
        ? tmpls.flatMap((t) =>
            t.items.map((item) => ({ itemId: item.id, itemLabel: item.itemLabel, condition: null as null, remarks: "" }))
          )
        : [];

      const checklistSub: HotelSubAreaDraft = {
        subAreaKey: "__checklist",
        subAreaLabel: "Section Checklist",
        moduleType: templateModuleType,
        checklist: seeded,
        remarks: "",
      };

      updateHotelSection(auditId, sectionKey, [...currentSubs, checklistSub]);
    };

    if (cached) {
      applyTemplate(cached);
      return;
    }

    fetch(`/api/templates?context=${context}`)
      .then((r) => r.json())
      .then((tmpls) => {
        templateCache.set(cacheKey, tmpls);
        applyTemplate(tmpls);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initKitchenChecklist(tmpls: typeof kitchenTemplates) {
    const kitchenSub = subAreas.find((s) => s.subAreaKey === "kitchen");
    if (kitchenSub && kitchenSub.checklist.length > 0) {
      setKitchenChecklist(kitchenSub.checklist);
    } else {
      setKitchenChecklist(
        tmpls.flatMap((t) =>
          t.items.map((item) => ({ itemId: item.id, itemLabel: item.itemLabel, condition: null as null, remarks: "" }))
        )
      );
    }
  }

  // Sync kitchen checklist back to Zustand (debounced via checklist-item-row already)
  const kitchenChecklistRef = useRef(kitchenChecklist);
  kitchenChecklistRef.current = kitchenChecklist;

  useEffect(() => {
    if (!kitchenChecklist.length) return;
    const updated = subAreas.map((s) =>
      s.subAreaKey === "kitchen" ? { ...s, checklist: kitchenChecklist } : s
    );
    updateHotelSection(auditId, sectionKey, updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchenChecklist]);

  const updateRemarks = useCallback((subAreaKey: string, remarks: string) => {
    const updated = subAreas.map((s) => (s.subAreaKey === subAreaKey ? { ...s, remarks } : s));
    updateHotelSection(auditId, sectionKey, updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAreas, auditId, sectionKey]);

  const updateKitchenItem = useCallback((idx: number, updated: ChecklistEntry) => {
    setKitchenChecklist((prev) => prev.map((item, i) => (i === idx ? updated : item)));
  }, []);

  const updateChecklistItem = useCallback((subAreaKey: string, idx: number, updated: ChecklistEntry) => {
    const updatedSubs = subAreas.map((s) =>
      s.subAreaKey === subAreaKey
        ? { ...s, checklist: s.checklist.map((c, i) => (i === idx ? updated : c)) }
        : s
    );
    updateHotelSection(auditId, sectionKey, updatedSubs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAreas, auditId, sectionKey]);

  const addChecklistItem = useCallback((subAreaKey: string, label: string) => {
    const newItem: ChecklistEntry = {
      itemId: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemLabel: label,
      condition: null,
      remarks: "",
    };
    const updatedSubs = subAreas.map((s) =>
      s.subAreaKey === subAreaKey ? { ...s, checklist: [...s.checklist, newItem] } : s
    );
    updateHotelSection(auditId, sectionKey, updatedSubs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAreas, auditId, sectionKey]);

  const addKitchenItem = useCallback((label: string) => {
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
                              onChange={(updated) => updateKitchenItem(globalIdx >= 0 ? globalIdx : 0, updated)}
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
