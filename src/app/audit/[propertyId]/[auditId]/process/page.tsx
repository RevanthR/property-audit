"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function ProcessPage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const updateProcess = useAuditStore((s) => s.updateProcess);

  const [admissions, setAdmissions] = useState(draft?.process.admissionsRemarks || "");
  const [payments, setPayments] = useState(draft?.process.paymentsRemarks || "");

  // Debounce store writes — only sync after 600ms of no typing
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!auditId) return;
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
            onChange={(e) => setAdmissions(e.target.value)}
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
            onChange={(e) => setPayments(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)}>
          Next: Rooms <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
