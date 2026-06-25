"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore, type ChecklistEntry } from "@/lib/store/audit";
import { ChecklistItemRow } from "@/components/audit/checklist-item-row";
import { AddChecklistItemInline } from "@/components/audit/add-checklist-item-inline";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

// Module-level cache — kitchen templates fetched once per session
type KitchenTemplate = { id: string; name: string; items: { id: string; itemLabel: string }[] };
let kitchenTmplCacheData: KitchenTemplate[] | null = null;

export default function PropertyManagementPage({
  params,
}: {
  params: Promise<{ propertyId: string; auditId: string }>;
}) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();

  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const updateCommonArea = useAuditStore((s) => s.updateCommonArea);

  const kitchenArea = draft?.commonAreas.find((a) => a.areaKey === "kitchen");
  const [kitchenChecklist, setKitchenChecklist] = useState<ChecklistEntry[]>(kitchenArea?.checklist ?? []);
  const [kitchenTemplates, setKitchenTemplates] = useState<KitchenTemplate[]>(kitchenTmplCacheData ?? []);
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(kitchenTmplCacheData === null);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (kitchenTmplCacheData) {
      setKitchenTemplates(kitchenTmplCacheData);
      initChecklist(kitchenTmplCacheData);
      setLoading(false);
      return;
    }
    fetch("/api/templates?context=kitchen")
      .then((r) => r.json())
      .then((tmpls) => {
        kitchenTmplCacheData = tmpls;
        setKitchenTemplates(tmpls);
        initChecklist(tmpls);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initChecklist(tmpls: KitchenTemplate[]) {
    const existing = kitchenArea?.checklist ?? [];

    if (existing.length > 0) {
      // Items saved to DB before templateItemId was stored come back with DB row UUIDs.
      // Match by itemId first, then fall back to label so condition/remarks are preserved.
      const byId = new Map(existing.map((c) => [c.itemId, c]));
      const byLabel = new Map(existing.map((c) => [c.itemLabel.toLowerCase().trim(), c]));
      const customItems = existing.filter((c) => c.itemId.startsWith("custom_"));

      const templateItems = tmpls.flatMap((t) =>
        t.items.map((item) => {
          const found = byId.get(item.id) ?? byLabel.get(item.itemLabel.toLowerCase().trim());
          return {
            itemId: item.id, // always normalise to template ID
            itemLabel: item.itemLabel,
            condition: found?.condition ?? null,
            remarks: found?.remarks ?? "",
          };
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

  function addKitchenItem(label: string) {
    const newItem = {
      itemId: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemLabel: label,
      condition: null as null,
      remarks: "",
    };
    setKitchenChecklist((prev) => [...prev, newItem]);
  }

  // Debounce kitchen checklist → Zustand writes
  const kitchenDebounce = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!kitchenArea || !kitchenChecklist.length) return;
    clearTimeout(kitchenDebounce.current!);
    kitchenDebounce.current = setTimeout(() => {
      updateCommonArea(auditId, { ...kitchenArea, checklist: kitchenChecklist });
    }, 400);
    return () => clearTimeout(kitchenDebounce.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchenChecklist]);

  // Debounce remarks → Zustand writes
  const remarksTimers = useRef<Record<string, NodeJS.Timeout>>({});
  function handleRemarksChange(areaKey: string, value: string) {
    const area = draft?.commonAreas.find((a) => a.areaKey === areaKey);
    if (!area) return;
    clearTimeout(remarksTimers.current[areaKey]);
    // Update local display via draft optimistically isn't practical here — Zustand update is the only way
    // so we debounce at a comfortable 400ms
    remarksTimers.current[areaKey] = setTimeout(() => {
      updateCommonArea(auditId, { ...area, remarks: value });
    }, 400);
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

      <Card>
        <CardHeader><CardTitle className="text-base">Kitchen</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="space-y-6">
              {kitchenTemplates.map((tmpl) => {
                const tmplItems = tmpl.items.map((ti) =>
                  kitchenChecklist.find((c) => c.itemId === ti.id) || {
                    itemId: ti.id, itemLabel: ti.itemLabel, condition: null as null, remarks: "",
                  }
                );
                return (
                  <div key={tmpl.id}>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2 pb-1 border-b border-gray-100">{tmpl.name}</h4>
                    <div className="space-y-2">
                      {tmplItems.map((item) => {
                        const globalIdx = kitchenChecklist.findIndex((c) => c.itemId === item.itemId);
                        return (
                          <ChecklistItemRow
                            key={item.itemId}
                            item={item}
                            onChange={(u) => {
                              if (globalIdx < 0) return;
                              setKitchenChecklist((prev) => prev.map((c, i) => (i === globalIdx ? u : c)));
                            }}
                            showError={showErrors}
                          />
                        );
                      })}
                      {kitchenChecklist.filter((c) => c.itemId.startsWith("custom_")).map((item) => {
                        const globalIdx = kitchenChecklist.findIndex((c) => c.itemId === item.itemId);
                        return (
                          <ChecklistItemRow key={item.itemId} item={item} onChange={(u) => setKitchenChecklist((prev) => prev.map((c, i) => (i === globalIdx ? u : c)))} showError={showErrors} />
                        );
                      })}
                    </div>
                    <AddChecklistItemInline onAdd={addKitchenItem} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {nonKitchenAreas.map((area) => (
        <RemarksCard key={area.areaKey} area={area} onChange={(v) => handleRemarksChange(area.areaKey, v)} />
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)}>
          ← Back
        </Button>
        <Button onClick={handleNext}>
          Next: Manpower <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Isolated component with local state so area remarks don't cause page re-renders
function RemarksCard({ area, onChange }: { area: { areaKey: string; areaLabel: string; remarks: string }; onChange: (v: string) => void }) {
  const [value, setValue] = useState(area.remarks || "");
  // Sync local state if the area is restored from a saved draft (e.g. navigation back)
  const areaKey = area.areaKey;
  useEffect(() => { setValue(area.remarks || ""); }, [areaKey]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{area.areaLabel}</CardTitle></CardHeader>
      <CardContent>
        <Textarea
          placeholder={`Enter remarks for ${area.areaLabel}...`}
          value={value}
          onChange={(e) => { setValue(e.target.value); onChange(e.target.value); }}
          rows={3}
        />
      </CardContent>
    </Card>
  );
}
