"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore, type EquipmentDraft } from "@/lib/store/audit";
import { ConditionSelect } from "@/components/audit/condition-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Wrench } from "lucide-react";
import type { Condition } from "@/lib/store/audit";

export default function EquipmentPage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  const { drafts, updateEquipment } = useAuditStore();
  const draft = drafts[auditId];

  const [equipment, setEquipment] = useState<EquipmentDraft[]>(draft?.equipment || []);

  useEffect(() => {
    if (auditId) updateEquipment(auditId, equipment);
  }, [equipment, auditId, updateEquipment]);

  if (!draft) return null;

  function updateItem(item: string, updates: Partial<EquipmentDraft>) {
    setEquipment((prev) =>
      prev.map((e) => (e.item === item ? { ...e, ...updates } : e))
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Equipment</h2>
        <p className="text-sm text-gray-500 mt-1">Check condition and counts for all equipment</p>
      </div>

      {equipment.map((e) => (
        <Card key={e.item}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-400" />
              {e.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {e.moduleType === "status" ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Condition</p>
                <ConditionSelect
                  value={e.condition}
                  onChange={(v: Condition) => updateItem(e.item, { condition: v })}
                />
              </div>
            ) : (
              <Input
                label="Count"
                type="number"
                min={0}
                placeholder="0"
                value={e.count !== null ? String(e.count) : ""}
                onChange={(ev) =>
                  updateItem(e.item, { count: ev.target.value === "" ? null : Number(ev.target.value) })
                }
              />
            )}
            <Textarea
              label="Remarks"
              placeholder="Any observations..."
              value={e.remarks}
              onChange={(ev) => updateItem(e.item, { remarks: ev.target.value })}
              rows={2}
            />
            {e.moduleType === "status" && e.condition === "not_ok" && !e.remarks.trim() && (
              <p className="text-xs text-red-600">Remarks required when condition is Not Ok</p>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => router.push(`/audit/${propertyId}/${auditId}/manpower`)}>
          ← Back
        </Button>
        <Button onClick={() => router.push(`/audit/${propertyId}/${auditId}/review`)}>
          Next: Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
