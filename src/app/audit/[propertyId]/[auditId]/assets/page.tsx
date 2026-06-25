"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import type { AssetInventoryItemDraft, Condition } from "@/lib/store/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddChecklistItemInline } from "@/components/audit/add-checklist-item-inline";
import { ArrowRight, Package, CheckCircle2, AlertCircle, Minus } from "lucide-react";
import { StepFooter } from "@/components/audit/step-footer";
import { cn } from "@/lib/utils";

interface TemplateItem {
  id: string;
  itemLabel: string;
  orderIndex: number;
}

const CONDITIONS: { value: Condition; label: string; color: string; icon: React.ReactNode }[] = [
  { value: "ok", label: "Ok", color: "border-green-500 bg-green-50 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { value: "not_ok", label: "Not Ok", color: "border-red-500 bg-red-50 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  { value: "not_available", label: "N/A", color: "border-gray-400 bg-gray-50 text-gray-600", icon: <Minus className="h-3.5 w-3.5" /> },
];

export default function AssetsPage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();

  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const updateAssetInventory = useAuditStore((s) => s.updateAssetInventory);

  const [items, setItems] = useState<AssetInventoryItemDraft[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedVersion = useRef(-1);

  // Determine context based on property type
  const context = draft?.propertyType === "hostel" ? "asset_inventory_hostel" : "asset_inventory_hotel";

  // On mount: if draft already has items use those, otherwise load from template.
  useEffect(() => {
    if (!draft) return;
    if (draft.assetInventory && draft.assetInventory.length > 0) {
      setItems(draft.assetInventory);
      lastSyncedVersion.current = draft.version ?? 0;
      return;
    }
    // Load template items
    setLoadingTemplates(true);
    fetch(`/api/templates?context=${context}`)
      .then((r) => r.json())
      .then((data: TemplateItem[]) => {
        const seeded: AssetInventoryItemDraft[] = data.map((t) => ({
          templateItemId: t.id,
          itemLabel: t.itemLabel,
          condition: null,
          remarks: "",
        }));
        setItems(seeded);
        updateAssetInventory(auditId, seeded);
      })
      .finally(() => setLoadingTemplates(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, context]);

  // Re-sync when draft.version increases (server pull, post-save) — only if items are
  // already populated so we don't interfere with the template-loading flow.
  useEffect(() => {
    if (!draft || !draft.assetInventory?.length) return;
    const v = draft.version ?? 0;
    if (v <= lastSyncedVersion.current) return;
    lastSyncedVersion.current = v;
    setItems(draft.assetInventory);
  }, [draft]);

  function handleCondition(idx: number, condition: Condition) {
    setItems((prev) => {
      const next = prev.map((item, i) =>
        i === idx ? { ...item, condition, remarks: condition !== "not_ok" ? "" : item.remarks } : item
      );
      scheduleSync(next);
      return next;
    });
  }

  function handleRemarks(idx: number, remarks: string) {
    setItems((prev) => {
      const next = prev.map((item, i) => (i === idx ? { ...item, remarks } : item));
      scheduleSync(next);
      return next;
    });
  }

  function scheduleSync(next: AssetInventoryItemDraft[]) {
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => updateAssetInventory(auditId, next), 400);
  }

  function addCustomItem(label: string) {
    const newItem: AssetInventoryItemDraft = {
      templateItemId: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemLabel: label,
      condition: null,
      remarks: "",
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      scheduleSync(next);
      return next;
    });
  }

  if (!draft) return null;

  const filled = items.filter((i) => i.condition !== null).length;
  const errors = items.filter((i) => i.condition === "not_ok" && !i.remarks.trim()).length;

  const isHostel = draft.propertyType === "hostel";
  const prevStep = isHostel
    ? `/audit/${propertyId}/${auditId}/equipment`
    : `/audit/${propertyId}/${auditId}/hotel/guest-experience`;
  const nextStep = `/audit/${propertyId}/${auditId}/review`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Asset Inventory
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {draft.propertyType === "hostel" ? "Hostel" : "Hotel"} asset checklist.
          {items.length > 0 && (
            <span className="ml-2 font-medium text-blue-600">
              {filled}/{items.length} checked
              {errors > 0 && <span className="text-red-500 ml-2">· {errors} need remarks</span>}
            </span>
          )}
        </p>
      </div>

      {loadingTemplates ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="text-center py-6 text-gray-400 space-y-1">
              <Package className="h-8 w-8 mx-auto opacity-40" />
              <p className="text-sm font-medium">No items yet — add yours below or ask admin to seed from Templates</p>
            </div>
          )}
          {items.map((item, idx) => (
            <Card
              key={item.templateItemId}
              className={cn(
                "transition-colors",
                item.condition === "not_ok" && "border-red-200",
                item.condition === "ok" && "border-green-200",
              )}
            >
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <span className="text-sm text-gray-400 font-mono w-6 shrink-0 pt-0.5 text-right">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-2">{item.itemLabel}</p>

                    {/* Condition buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {CONDITIONS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => handleCondition(idx, c.value)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                            item.condition === c.value
                              ? c.color + " border-2"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          )}
                        >
                          {c.icon}
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* Remarks — required for Not Ok */}
                    {item.condition === "not_ok" && (
                      <div className="mt-2">
                        <textarea
                          placeholder="Describe the issue (required)"
                          value={item.remarks}
                          onChange={(e) => handleRemarks(idx, e.target.value)}
                          rows={2}
                          className={cn(
                            "w-full text-sm px-3 py-2 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500",
                            !item.remarks.trim() ? "border-red-300 bg-red-50" : "border-gray-200"
                          )}
                        />
                        {!item.remarks.trim() && (
                          <p className="text-xs text-red-500 mt-1">Remarks required for Not Ok items</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <AddChecklistItemInline onAdd={addCustomItem} />
        </div>
      )}

      <StepFooter>
        <Button variant="outline" onClick={() => router.push(prevStep)}>
          ← Back
        </Button>
        <Button onClick={() => router.push(nextStep)}>
          Next: Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </StepFooter>
    </div>
  );
}
