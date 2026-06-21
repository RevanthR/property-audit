"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function ProcessPage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  const { drafts, updateProcess } = useAuditStore();
  const draft = drafts[auditId];

  const [admissions, setAdmissions] = useState(draft?.process.admissionsRemarks || "");
  const [payments, setPayments] = useState(draft?.process.paymentsRemarks || "");

  // Sync to store on every change
  useEffect(() => {
    if (!auditId) return;
    updateProcess(auditId, { admissionsRemarks: admissions, paymentsRemarks: payments });
  }, [admissions, payments, auditId, updateProcess]);

  if (!draft) return null;

  function goNext() {
    router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Process</h2>
        <p className="text-sm text-gray-500 mt-1">Section 1 of {draft.propertyType === "hostel" ? "5" : "10"}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admissions</CardTitle>
        </CardHeader>
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
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
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
        <Button onClick={goNext}>
          Next: Rooms
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
