"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore, type ChecklistEntry } from "@/lib/store/audit";
import { ChecklistItemRow } from "@/components/audit/checklist-item-row";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function PropertyManagementPage({
  params,
}: {
  params: Promise<{ propertyId: string; auditId: string }>;
}) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  const { drafts, updateCommonArea } = useAuditStore();
  const draft = drafts[auditId];

  const [kitchenChecklist, setKitchenChecklist] = useState<ChecklistEntry[]>([]);
  const [kitchenTemplates, setKitchenTemplates] = useState<
    { id: string; name: string; items: { id: string; itemLabel: string }[] }[]
  >([]);
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!draft) return;
    fetch("/api/templates?context=kitchen")
      .then((r) => r.json())
      .then((tmpls) => {
        setKitchenTemplates(tmpls);
        const kitchenArea = draft.commonAreas.find((a) => a.areaKey === "kitchen");
        if (kitchenArea && kitchenArea.checklist.length > 0) {
          setKitchenChecklist(kitchenArea.checklist);
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
        setLoading(false);
      });
  }, [auditId]);

  // Sync kitchen checklist to store
  useEffect(() => {
    if (!draft || !kitchenChecklist.length) return;
    const kitchenArea = draft.commonAreas.find((a) => a.areaKey === "kitchen");
    if (kitchenArea) {
      updateCommonArea(auditId, { ...kitchenArea, checklist: kitchenChecklist });
    }
  }, [kitchenChecklist]);

  function updateKitchenItem(idx: number, updated: ChecklistEntry) {
    setKitchenChecklist((prev) => prev.map((item, i) => (i === idx ? updated : item)));
  }

  function handleRemarksChange(areaKey: string, value: string) {
    const area = draft?.commonAreas.find((a) => a.areaKey === areaKey);
    if (area) updateCommonArea(auditId, { ...area, remarks: value });
  }

  function handleNext() {
    const hasErrors = kitchenChecklist.some((c) => c.condition === "not_ok" && !c.remarks.trim());
    if (hasErrors) { setShowErrors(true); return; }
    router.push(`/audit/${propertyId}/${auditId}/manpower`);
  }

  if (!draft) return null;

  const nonKitchenAreas = draft.commonAreas.filter((a) => a.areaKey !== "kitchen");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Property Management</h2>
        <p className="text-sm text-gray-500 mt-1">Common areas inspection</p>
      </div>

      {showErrors && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Please add remarks for all kitchen items marked as "Not Ok".
        </div>
      )}

      {/* Kitchen — checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kitchen</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
          ) : (
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
                    <h4 className="text-sm font-semibold text-gray-600 mb-2 pb-1 border-b border-gray-100">
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
          )}
        </CardContent>
      </Card>

      {/* Other areas — remarks only */}
      {nonKitchenAreas.map((area) => (
        <Card key={area.areaKey}>
          <CardHeader>
            <CardTitle className="text-base">{area.areaLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={`Enter remarks for ${area.areaLabel}...`}
              value={area.remarks || ""}
              onChange={(e) => handleRemarksChange(area.areaKey, e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)}>
          ← Back
        </Button>
        <Button onClick={handleNext}>
          Next: Manpower
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
