"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore, type ManpowerDraft } from "@/lib/store/audit";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Users } from "lucide-react";
import { StepFooter } from "@/components/audit/step-footer";

export default function ManpowerPage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const updateManpower = useAuditStore((s) => s.updateManpower);

  const [manpower, setManpower] = useState<ManpowerDraft[]>(draft?.manpower || []);

  // Re-sync whenever draft.version increases (IDB hydration, server pull, post-save).
  const lastSyncedVersion = useRef(-1);
  const pendingEdit = useRef(false);

  useEffect(() => {
    if (!draft) return;
    const v = draft.version ?? 0;
    if (v <= lastSyncedVersion.current) return;
    lastSyncedVersion.current = v;
    pendingEdit.current = false;
    setManpower(draft.manpower);
  }, [draft]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Guard: never write an empty array, and skip if no user edit has happened.
    if (!auditId || !manpower.length || !pendingEdit.current) return;
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => updateManpower(auditId, manpower), 600);
    return () => clearTimeout(debounceRef.current!);
  }, [manpower, auditId, updateManpower]);

  if (!draft) return null;

  function updateItem(section: string, field: "count" | "remarks", value: string | number | null) {
    pendingEdit.current = true;
    setManpower((prev) =>
      prev.map((m) => (m.section === section ? { ...m, [field]: value } : m))
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Manpower</h2>
        <p className="text-sm text-gray-500 mt-1">Staff counts and remarks for each category</p>
      </div>

      {manpower.map((m) => (
        <Card key={m.section}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              {m.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Number of people"
              type="number"
              min={0}
              placeholder="0"
              value={m.count !== null ? String(m.count) : ""}
              onChange={(e) =>
                updateItem(m.section, "count", e.target.value === "" ? null : Number(e.target.value))
              }
            />
            <Textarea
              label="Remarks"
              placeholder="Any observations or notes..."
              value={m.remarks}
              onChange={(e) => updateItem(m.section, "remarks", e.target.value)}
              rows={2}
            />
          </CardContent>
        </Card>
      ))}

      <StepFooter>
        <Button variant="outline" onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/property`)}>
          ← Back
        </Button>
        <Button onClick={() => router.push(`/audit/${propertyId}/${auditId}/equipment`)}>
          Next: Equipment
          <ArrowRight className="h-4 w-4" />
        </Button>
      </StepFooter>
    </div>
  );
}
