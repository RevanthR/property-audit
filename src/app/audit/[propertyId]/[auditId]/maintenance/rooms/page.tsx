"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, ArrowRight, Trash2, CheckCircle, Clock, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export default function RoomsPage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const upsertRoom = useAuditStore((s) => s.upsertRoom);
  const removeRoom = useAuditStore((s) => s.removeRoom);
  const [roomInput, setRoomInput] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!draft) return null;

  const isHostel = draft.propertyType === "hostel";
  const nextStep = isHostel
    ? `/audit/${propertyId}/${auditId}/maintenance/property`
    : `/audit/${propertyId}/${auditId}/hotel/housekeeping`;

  function addRoom() {
    const num = roomInput.trim().toUpperCase();
    if (!num) { setError("Enter a room number."); return; }
    if (draft.rooms.some((r) => r.roomNumber === num)) {
      setError("Room already added.");
      return;
    }
    setError("");
    upsertRoom(auditId, { id: generateId(), roomNumber: num, checklist: [], savedToDb: false });
    setRoomInput("");
  }

  function openRoom(roomId: string) {
    router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms/${roomId}`);
  }

  const completedRooms = draft.rooms.filter((r) => r.checklist.some((c) => c.condition !== null));
  const pendingRooms = draft.rooms.filter((r) => !r.checklist.some((c) => c.condition !== null));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Room Audit</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add rooms and complete the checklist for each.
          {draft.rooms.length > 0 && (
            <span className="ml-2 font-medium text-blue-600">{completedRooms.length}/{draft.rooms.length} complete</span>
          )}
        </p>
      </div>

      {/* Add room */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Room number (e.g. 101, A-12)"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRoom()}
              error={error}
              className="flex-1"
            />
            <Button onClick={addRoom} size="default">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Room list */}
      {draft.rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No rooms added yet. Enter a room number above to begin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRooms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pending</p>
              <div className="space-y-2">
                {pendingRooms.map((room) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    status="pending"
                    onOpen={() => openRoom(room.id)}
                    onRemove={() => setConfirmDeleteId(room.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {completedRooms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Completed</p>
              <div className="space-y-2">
                {completedRooms.map((room) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    status="done"
                    onOpen={() => openRoom(room.id)}
                    onRemove={() => setConfirmDeleteId(room.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-base">Remove room?</DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Room{" "}
                  <strong>
                    {draft.rooms.find((r) => r.id === confirmDeleteId)?.roomNumber}
                  </strong>{" "}
                  and all its checklist data will be permanently deleted.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (confirmDeleteId) removeRoom(auditId, confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => {
          const prev = isHostel
            ? `/audit/${propertyId}/${auditId}/process`
            : `/audit/${propertyId}/${auditId}/hotel/front-office`;
          router.push(prev);
        }}>
          ← Back
        </Button>
        <Button onClick={() => router.push(nextStep)}>
          Next: {isHostel ? "Common Areas" : "Housekeeping"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RoomRow({
  room,
  status,
  onOpen,
  onRemove,
}: {
  room: { id: string; roomNumber: string; checklist: unknown[] };
  status: "pending" | "done";
  onOpen: () => void;
  onRemove: () => void;
}) {
  const notOkCount = (room.checklist as Array<{ condition: string | null }>).filter((c) => c.condition === "not_ok").length;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer hover:shadow-sm transition",
        status === "done" ? "border-green-200 bg-green-50/30" : "border-gray-200 bg-white"
      )}
      onClick={onOpen}
    >
      {status === "done" ? (
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
      ) : (
        <Clock className="h-5 w-5 text-gray-300 shrink-0" />
      )}
      <div className="flex-1">
        <span className="font-medium text-gray-900">Room {room.roomNumber}</span>
        {status === "done" && notOkCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {notOkCount} issue{notOkCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </div>
  );
}
