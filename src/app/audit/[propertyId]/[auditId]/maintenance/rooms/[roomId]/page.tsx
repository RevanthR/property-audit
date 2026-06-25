"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore, type ChecklistEntry } from "@/lib/store/audit";
import { ChecklistItemRow } from "@/components/audit/checklist-item-row";
import { AddChecklistItemInline } from "@/components/audit/add-checklist-item-inline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { StepFooter } from "@/components/audit/step-footer";

// Module-level template cache — fetched once per session per context
const tmplCache = new Map<string, { id: string; name: string; items: { id: string; itemLabel: string }[] }[]>();

export default function RoomChecklistPage({
  params,
}: {
  params: Promise<{ propertyId: string; auditId: string; roomId: string }>;
}) {
  const { propertyId, auditId, roomId } = use(params);
  const router = useRouter();

  // Specific selectors — don't re-render when unrelated drafts change
  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const room = useAuditStore(useCallback((s) => s.drafts[auditId]?.rooms.find((r) => r.id === roomId), [auditId, roomId]));
  const upsertRoom = useAuditStore((s) => s.upsertRoom);

  const [checklist, setChecklist] = useState<ChecklistEntry[]>(room?.checklist ?? []);
  const [templates, setTemplates] = useState(tmplCache.get(draft?.propertyType ?? "") ?? []);
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(templates.length === 0);

  useEffect(() => {
    if (!draft) return;
    const context = draft.propertyType === "hostel" ? "room_hostel" : "room_hotel";
    const cached = tmplCache.get(context);
    if (cached) {
      setTemplates(cached);
      initChecklist(cached);
      setLoading(false);
      return;
    }
    fetch(`/api/templates?context=${context}`)
      .then((r) => r.json())
      .then((tmpls) => {
        tmplCache.set(context, tmpls);
        setTemplates(tmpls);
        initChecklist(tmpls);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initChecklist(tmpls: typeof templates) {
    if (room && room.checklist.length > 0) {
      const existing = room.checklist;
      const byId = new Map(existing.map((c) => [c.itemId, c]));
      const byLabel = new Map(existing.map((c) => [c.itemLabel.toLowerCase().trim(), c]));
      const customItems = existing.filter((c) => c.itemId.startsWith("custom_"));
      const templateItems = tmpls.flatMap((t) =>
        t.items.map((item) => {
          const found = byId.get(item.id) ?? byLabel.get(item.itemLabel.toLowerCase().trim());
          return { itemId: item.id, itemLabel: item.itemLabel, condition: found?.condition ?? null, remarks: found?.remarks ?? "" };
        })
      );
      setChecklist([...templateItems, ...customItems]);
    } else {
      setChecklist(
        tmpls.flatMap((t) =>
          t.items.map((item) => ({ itemId: item.id, itemLabel: item.itemLabel, condition: null as null, remarks: "" }))
        )
      );
    }
  }

  // Debounce store writes — don't write Zustand on every single condition click
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!room || !checklist.length) return;
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => {
      upsertRoom(auditId, { ...room, checklist });
    }, 400);
    return () => clearTimeout(debounceRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist]);

  function updateItem(idx: number, updated: ChecklistEntry) {
    setChecklist((prev) => prev.map((item, i) => (i === idx ? updated : item)));
  }

  function addCustomItem(label: string) {
    const newItem: ChecklistEntry = {
      itemId: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemLabel: label,
      condition: null,
      remarks: "",
    };
    setChecklist((prev) => [...prev, newItem]);
  }

  function handleSave() {
    const hasErrors = checklist.some((c) => c.condition === "not_ok" && !c.remarks.trim());
    if (hasErrors) { setShowErrors(true); return; }
    router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`);
  }

  if (!draft || !room) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const okCount = checklist.filter((c) => c.condition === "ok").length;
  const notOkCount = checklist.filter((c) => c.condition === "not_ok").length;
  const naCount = checklist.filter((c) => c.condition === "not_available").length;
  const doneCount = checklist.filter((c) => c.condition !== null).length;
  const isHostel = draft.propertyType === "hostel";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)} className="p-1 text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Room {room.roomNumber}</h2>
          <p className="text-sm text-gray-500">{doneCount}/{checklist.length} items reviewed</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%` }} />
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3.5 w-3.5" /> {okCount} Ok</span>
          <span className="flex items-center gap-1 text-red-600"><AlertCircle className="h-3.5 w-3.5" /> {notOkCount} Not Ok</span>
          <span className="text-gray-400">{naCount} N/A</span>
          <span className="text-gray-300 ml-auto">{checklist.length - doneCount} remaining</span>
        </div>
      </div>

      {showErrors && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Please add remarks for all items marked as "Not Ok" before saving.
        </div>
      )}

      {isHostel ? (
        <div className="space-y-2">
          {checklist.map((item, idx) => (
            <ChecklistItemRow key={item.itemId || idx} item={item} onChange={(u) => updateItem(idx, u)} showError={showErrors} />
          ))}
          <AddChecklistItemInline onAdd={addCustomItem} />
        </div>
      ) : (
        <div className="space-y-6">
          {templates.map((tmpl) => {
            // Template items + any custom items that don't belong to a template
            const tmplItemIds = new Set(tmpl.items.map((ti) => ti.id));
            const tmplItems = tmpl.items.map((ti) =>
              checklist.find((c) => c.itemId === ti.id) || { itemId: ti.id, itemLabel: ti.itemLabel, condition: null as null, remarks: "" }
            );
            return (
              <div key={tmpl.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{tmpl.name}</h3>
                  <div className="flex-1 h-px bg-gray-200" />
                  <Badge variant="secondary" className="text-xs">{tmplItems.filter((c) => c.condition !== null).length}/{tmplItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  {tmplItems.map((item) => {
                    const globalIdx = checklist.findIndex((c) => c.itemId === item.itemId);
                    return (
                      <ChecklistItemRow key={item.itemId} item={item} onChange={(u) => { if (globalIdx >= 0) updateItem(globalIdx, u); }} showError={showErrors} />
                    );
                  })}
                  {/* Custom items added by auditor for this template group */}
                  {checklist.filter((c) => c.itemId.startsWith("custom_") && !tmplItemIds.has(c.itemId)).map((item, idx) => {
                    const globalIdx = checklist.findIndex((c) => c.itemId === item.itemId);
                    return (
                      <ChecklistItemRow key={item.itemId} item={item} onChange={(u) => updateItem(globalIdx, u)} showError={showErrors} />
                    );
                  })}
                </div>
                <AddChecklistItemInline onAdd={addCustomItem} />
              </div>
            );
          })}
          {/* If no templates yet, still allow adding custom items */}
          {templates.length === 0 && (
            <AddChecklistItemInline onAdd={addCustomItem} />
          )}
        </div>
      )}

      <StepFooter>
        <Button variant="outline" onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)}>
          ← Rooms List
        </Button>
        <Button onClick={handleSave}>
          Save Room <CheckCircle className="h-4 w-4" />
        </Button>
      </StepFooter>
    </div>
  );
}
