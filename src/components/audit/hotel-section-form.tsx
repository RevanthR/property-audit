"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuditStore, type HotelSubAreaDraft, type ChecklistEntry } from "@/lib/store/audit";
import { ChecklistItemRow } from "./checklist-item-row";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Module-level cache so kitchen templates are fetched once per session
const templateCache = new Map<string, { id: string; name: string; items: { id: string; itemLabel: string }[] }[]>();

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
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {sub.checklist.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No checklist items configured. Admin can add them in Templates.</p>
                ) : (
                  sub.checklist.map((item, idx) => (
                    <ChecklistItemRow
                      key={item.itemId || idx}
                      item={item}
                      onChange={(updated) => updateChecklistItem(sub.subAreaKey, idx, updated)}
                      showError={showErrors}
                    />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
