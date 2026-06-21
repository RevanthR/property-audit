"use client";

import { useEffect, useState } from "react";
import { useAuditStore, type HotelSubAreaDraft, type ChecklistEntry } from "@/lib/store/audit";
import { ChecklistItemRow } from "./checklist-item-row";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const { drafts, updateHotelSection } = useAuditStore();
  const draft = drafts[auditId];
  const subAreas: HotelSubAreaDraft[] = (draft?.[sectionKey] as HotelSubAreaDraft[]) || [];

  const [kitchenChecklist, setKitchenChecklist] = useState<ChecklistEntry[]>([]);
  const [kitchenTemplates, setKitchenTemplates] = useState<
    { id: string; name: string; items: { id: string; itemLabel: string }[] }[]
  >([]);

  // Load kitchen templates if this section has a kitchen sub-area
  const hasKitchen = subAreas.some((s) => s.subAreaKey === "kitchen");
  useEffect(() => {
    if (!hasKitchen) return;
    const kitchenSub = subAreas.find((s) => s.subAreaKey === "kitchen");
    fetch("/api/templates?context=kitchen")
      .then((r) => r.json())
      .then((tmpls) => {
        setKitchenTemplates(tmpls);
        if (kitchenSub && kitchenSub.checklist.length > 0) {
          setKitchenChecklist(kitchenSub.checklist);
        } else {
          setKitchenChecklist(
            tmpls.flatMap((t: { items: { id: string; itemLabel: string }[] }) =>
              t.items.map((item) => ({
                itemId: item.id,
                itemLabel: item.itemLabel,
                condition: null as null,
                remarks: "",
              }))
            )
          );
        }
      });
  }, [hasKitchen]);

  // Sync kitchen checklist
  useEffect(() => {
    if (!kitchenChecklist.length) return;
    const updated = subAreas.map((s) =>
      s.subAreaKey === "kitchen" ? { ...s, checklist: kitchenChecklist } : s
    );
    updateHotelSection(auditId, sectionKey, updated);
  }, [kitchenChecklist]);

  function updateRemarks(subAreaKey: string, remarks: string) {
    const updated = subAreas.map((s) => (s.subAreaKey === subAreaKey ? { ...s, remarks } : s));
    updateHotelSection(auditId, sectionKey, updated);
  }

  function updateKitchenItem(idx: number, updated: ChecklistEntry) {
    setKitchenChecklist((prev) => prev.map((item, i) => (i === idx ? updated : item)));
  }

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
                      itemId: ti.id,
                      itemLabel: ti.itemLabel,
                      condition: null as null,
                      remarks: "",
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
              // Generic checklist sub-area (no DB templates — admin configures these)
              <div className="space-y-2">
                {sub.checklist.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No checklist items configured for this area yet.</p>
                ) : (
                  sub.checklist.map((item, idx) => (
                    <ChecklistItemRow
                      key={item.itemId || idx}
                      item={item}
                      onChange={(updated) => {
                        const updatedSubs = subAreas.map((s) =>
                          s.subAreaKey === sub.subAreaKey
                            ? { ...s, checklist: s.checklist.map((c, i) => (i === idx ? updated : c)) }
                            : s
                        );
                        updateHotelSection(auditId, sectionKey, updatedSubs);
                      }}
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
