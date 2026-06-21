"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore, type ChecklistEntry } from "@/lib/store/audit";
import { ChecklistItemRow } from "@/components/audit/checklist-item-row";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export default function RoomChecklistPage({
  params,
}: {
  params: Promise<{ propertyId: string; auditId: string; roomId: string }>;
}) {
  const { propertyId, auditId, roomId } = use(params);
  const router = useRouter();
  const { drafts, upsertRoom } = useAuditStore();
  const draft = drafts[auditId];
  const room = draft?.rooms.find((r) => r.id === roomId);

  const [checklist, setChecklist] = useState<ChecklistEntry[]>([]);
  const [templates, setTemplates] = useState<
    { id: string; name: string; items: { id: string; itemLabel: string }[] }[]
  >([]);
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!draft) return;
    const context = draft.propertyType === "hostel" ? "room_hostel" : "room_hotel";
    fetch(`/api/templates?context=${context}`)
      .then((r) => r.json())
      .then((tmpls) => {
        setTemplates(tmpls);

        // Build initial checklist from templates (or restore from draft)
        if (room && room.checklist.length > 0) {
          setChecklist(room.checklist);
        } else {
          const items: ChecklistEntry[] = tmpls.flatMap(
            (t: { items: { id: string; itemLabel: string }[] }) =>
              t.items.map((item) => ({
                itemId: item.id,
                itemLabel: item.itemLabel,
                condition: null,
                remarks: "",
              }))
          );
          setChecklist(items);
        }
        setLoading(false);
      });
  }, [auditId, draft?.propertyType]);

  // Save to store whenever checklist changes
  useEffect(() => {
    if (!room || !checklist.length) return;
    upsertRoom(auditId, { ...room, checklist });
  }, [checklist]);

  function updateItem(idx: number, updated: ChecklistEntry) {
    setChecklist((prev) => prev.map((item, i) => (i === idx ? updated : item)));
  }

  function handleSave() {
    // Validate: not_ok items must have remarks
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

  // Group by template for hotel (multiple categories)
  const isHostel = draft.propertyType === "hostel";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)}
          className="p-1 text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Room {room.roomNumber}</h2>
          <p className="text-sm text-gray-500">{doneCount}/{checklist.length} items reviewed</p>
        </div>
      </div>

      {/* Progress + summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(doneCount / checklist.length) * 100}%` }}
          />
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

      {/* Checklist */}
      {isHostel ? (
        <div className="space-y-2">
          {checklist.map((item, idx) => (
            <ChecklistItemRow
              key={item.itemId || idx}
              item={item}
              onChange={(updated) => updateItem(idx, updated)}
              showError={showErrors}
            />
          ))}
        </div>
      ) : (
        // Hotel: grouped by category template
        <div className="space-y-6">
          {templates.map((tmpl) => {
            const startIdx = checklist.findIndex((c) => {
              return tmpl.items.some((ti) => ti.id === c.itemId);
            });
            const tmplItems = tmpl.items.map((ti) =>
              checklist.find((c) => c.itemId === ti.id) || {
                itemId: ti.id,
                itemLabel: ti.itemLabel,
                condition: null as null,
                remarks: "",
              }
            );

            return (
              <div key={tmpl.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{tmpl.name}</h3>
                  <div className="flex-1 h-px bg-gray-200" />
                  <Badge variant="secondary" className="text-xs">
                    {tmplItems.filter((c) => c.condition !== null).length}/{tmplItems.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {tmplItems.map((item, i) => {
                    const globalIdx = checklist.findIndex(
                      (c) => c.itemId === item.itemId
                    );
                    return (
                      <ChecklistItemRow
                        key={item.itemId}
                        item={item}
                        onChange={(updated) => updateItem(globalIdx >= 0 ? globalIdx : i, updated)}
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

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)}
        >
          ← Rooms List
        </Button>
        <Button onClick={handleSave}>
          Save Room
          <CheckCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
