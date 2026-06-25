"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Download, Send } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { isReadyToSubmit } from "@/lib/completion";

export default function ReviewPage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const clearDraft = useAuditStore((s) => s.clearDraft);
  const [submitting, setSubmitting] = useState(false);

  if (!draft) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Audit draft not found. Please go back to the dashboard.</p>
        <Button className="mt-4" onClick={() => router.push("/")}>Dashboard</Button>
      </div>
    );
  }

  // Compute summary stats
  const allRoomItems = draft.rooms.flatMap((r) => r.checklist);
  const roomOk = allRoomItems.filter((c) => c.condition === "ok").length;
  const roomNotOk = allRoomItems.filter((c) => c.condition === "not_ok").length;

  async function handleSync() {
    try {
      await fetch(`/api/audits/${auditId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
    } catch { /* silent */ }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Final sync first
      await handleSync();
      // Mark submitted
      await fetch(`/api/audits/${auditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      });
      clearDraft(auditId);
      toast({ title: "Audit submitted!", description: "Your audit has been saved successfully.", variant: "success" });
      router.push(`/reports/${auditId}`);
    } catch {
      toast({ title: "Submit failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const isHostel = draft.propertyType === "hostel";
  const { ready, issues } = isReadyToSubmit(draft);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review & Submit</h2>
        <p className="text-sm text-gray-500 mt-1">Summary of the audit — review before submitting</p>
      </div>

      {/* Audit header */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 space-y-1">
          <p className="font-semibold text-gray-900">{draft.propertyName}</p>
          <p className="text-sm text-gray-500">{draft.propertyType === "hostel" ? "Hostel" : "Hotel"}</p>
          <p className="text-sm text-gray-600">Audited by <strong>{draft.auditorName}</strong></p>
          <p className="text-sm text-gray-600">Date: <strong>{formatDate(draft.auditDate)}</strong></p>
        </CardContent>
      </Card>

      {/* Rooms summary */}
      {draft.rooms.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rooms ({draft.rooms.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm mb-3">
              <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> {roomOk} Ok</span>
              <span className="text-red-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {roomNotOk} Not Ok</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {[...draft.rooms].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: "base" })).map((r) => {
                const issues = r.checklist.filter((c) => c.condition === "not_ok").length;
                const done = r.checklist.filter((c) => c.condition !== null).length;
                return (
                  <div key={r.id} className="flex items-center gap-2 text-sm py-1 border-b border-gray-50">
                    <span className="font-medium">Room {r.roomNumber}</span>
                    <span className="text-gray-400 text-xs">{done}/{r.checklist.length} items</span>
                    {issues > 0 && <Badge variant="destructive">{issues} issue{issues > 1 ? "s" : ""}</Badge>}
                    {done === r.checklist.length && issues === 0 && <Badge variant="success">All Ok</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hostel sections summary */}
      {isHostel && (
        <>
          <SummaryCard title="Process" items={[
            { label: "Admissions", value: draft.process.admissionsRemarks ? "Noted" : "—" },
            { label: "Payments", value: draft.process.paymentsRemarks ? "Noted" : "—" },
          ]} />
          <SummaryCard title="Manpower" items={
            draft.manpower.map((m) => ({ label: m.label, value: m.count !== null ? `${m.count} staff` : "—" }))
          } />
          <SummaryCard title="Equipment" items={
            draft.equipment.map((e) => ({
              label: e.label,
              value: e.condition ? e.condition.replace("_", " ") : e.count !== null ? String(e.count) : "—",
              status: e.condition === "not_ok" ? "bad" : e.condition === "ok" ? "good" : undefined,
            }))
          } />
        </>
      )}

      {/* Hotel sections summary */}
      {!isHostel && (
        <>
          <SummaryCard title="Front Office" items={draft.frontOffice.map((s) => ({ label: s.subAreaLabel, value: s.remarks ? "Noted" : "—" }))} />
          <SummaryCard title="Housekeeping" items={draft.housekeeping.map((s) => ({ label: s.subAreaLabel, value: s.remarks || s.checklist.length > 0 ? "Noted" : "—" }))} />
          <SummaryCard title="Engineering" items={draft.engineering.map((s) => ({ label: s.subAreaLabel, value: s.remarks || s.checklist.length > 0 ? "Noted" : "—" }))} />
          <SummaryCard title="Food & Beverage" items={draft.foodBeverage.map((s) => ({ label: s.subAreaLabel, value: s.remarks || s.checklist.length > 0 ? "Noted" : "—" }))} />
          <SummaryCard title="Property Management" items={draft.propertyManagement.map((s) => ({ label: s.subAreaLabel, value: s.remarks ? "Noted" : "—" }))} />
          <SummaryCard title="Security" items={draft.security.map((s) => ({ label: s.subAreaLabel, value: s.remarks || s.checklist.length > 0 ? "Noted" : "—" }))} />
          <SummaryCard title="Finance" items={draft.finance.map((s) => ({ label: s.subAreaLabel, value: s.remarks || s.checklist.length > 0 ? "Noted" : "—" }))} />
          <SummaryCard title="Human Resources" items={draft.humanResources.map((s) => ({ label: s.subAreaLabel, value: s.remarks || s.checklist.length > 0 ? "Noted" : "—" }))} />
          <SummaryCard title="Guest Experience" items={draft.guestExperience.map((s) => ({ label: s.subAreaLabel, value: s.remarks ? "Noted" : "—" }))} />
        </>
      )}

      {!ready && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800">Audit is incomplete</p>
          <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
            {issues.slice(0, 5).map((issue, i) => <li key={i}>{issue}</li>)}
            {issues.length > 5 && <li>…and {issues.length - 5} more</li>}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={handleSync}>
          <Download className="h-4 w-4" />
          Save Draft
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={submitting || !ready} title={!ready ? "Complete all sections before submitting" : undefined}>
          <Send className="h-4 w-4" />
          {submitting ? "Submitting..." : "Submit Audit"}
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string; status?: "good" | "bad" }[];
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-600">{item.label}</span>
              <span className={
                item.status === "bad" ? "text-red-600 font-medium" :
                item.status === "good" ? "text-green-600 font-medium" :
                item.value === "—" ? "text-gray-300" : "text-gray-800 font-medium"
              }>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
