"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { StepFooter } from "@/components/audit/step-footer";

export default function ProcessPage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const updateProcess = useAuditStore((s) => s.updateProcess);

  const [admissions, setAdmissions] = useState(draft?.process.admissionsRemarks || "");
  const [payments, setPayments] = useState(draft?.process.paymentsRemarks || "");

  // Re-sync local state whenever draft.version increases.
  // Covers three cases:
  //   1. IDB hydration on first mount — version goes from -1 → N
  //   2. Server pull (poll / refreshFromDb on tab focus) — version jumps ahead
  //   3. Post-save markSynced — version bumps but draft.process already matches local state,
  //      so setAdmissions/setPayments are effectively no-ops.
  const lastSyncedVersion = useRef(-1);
  const pendingEdit = useRef(false); // true only while the user has unsaved local edits

  useEffect(() => {
    if (!draft) return;
    const v = draft.version ?? 0;
    if (v <= lastSyncedVersion.current) return;
    lastSyncedVersion.current = v;
    pendingEdit.current = false; // clear edit flag — server data wins for this version
    setAdmissions(draft.process.admissionsRemarks || "");
    setPayments(draft.process.paymentsRemarks || "");
  }, [draft]);

  // Debounce store writes. Guard on pendingEdit so a server-pull re-sync that calls
  // setAdmissions/setPayments doesn't immediately push the server's own data back.
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!auditId || !pendingEdit.current) return;
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => {
      updateProcess(auditId, { admissionsRemarks: admissions, paymentsRemarks: payments });
    }, 600);
    return () => clearTimeout(debounceRef.current!);
  }, [admissions, payments, auditId, updateProcess]);

  if (!draft) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Process</h2>
        <p className="text-sm text-gray-500 mt-1">Section 1 of {draft.propertyType === "hostel" ? "5" : "10"}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Admissions</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter remarks about the admissions process..."
            value={admissions}
            onChange={(e) => { pendingEdit.current = true; setAdmissions(e.target.value); }}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter remarks about the payments process..."
            value={payments}
            onChange={(e) => { pendingEdit.current = true; setPayments(e.target.value); }}
            rows={4}
          />
        </CardContent>
      </Card>

      <StepFooter className="justify-end">
        <Button onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)}>
          Next: Rooms <ArrowRight className="h-4 w-4" />
        </Button>
      </StepFooter>
    </div>
  );
}
