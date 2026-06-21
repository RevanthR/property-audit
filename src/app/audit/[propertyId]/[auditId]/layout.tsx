"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import { Navbar } from "@/components/layout/navbar";
import { StepNav } from "@/components/audit/step-nav";
import { AutoSaveIndicator } from "@/components/audit/auto-save-indicator";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { HOSTEL_STEPS, HOTEL_STEPS } from "@/lib/audit-config";

export default function AuditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ propertyId: string; auditId: string }>;
}) {
  const { propertyId, auditId } = use(params);
  const pathname = usePathname();
  const { drafts, markSynced } = useAuditStore();
  const draft = drafts[auditId];
  const [isSaving, setIsSaving] = useState(false);
  const syncTimer = useRef<NodeJS.Timeout | null>(null);

  const syncToDb = useCallback(async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      await fetch(`/api/audits/${auditId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      markSynced(auditId);
    } catch {
      // silent — data is safe in localStorage
    } finally {
      setIsSaving(false);
    }
  }, [draft, auditId, markSynced]);

  // Auto-sync every 30s
  useEffect(() => {
    syncTimer.current = setInterval(syncToDb, 30000);
    return () => { if (syncTimer.current) clearInterval(syncTimer.current); };
  }, [syncToDb]);

  // Sync on page hide (tab close / navigate away)
  useEffect(() => {
    const handler = () => { syncToDb(); };
    window.addEventListener("pagehide", handler);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") syncToDb();
    });
    return () => window.removeEventListener("pagehide", handler);
  }, [syncToDb]);

  if (!draft) return <div className="min-h-screen bg-gray-50"><Navbar />{children}</div>;

  const steps = draft.propertyType === "hostel" ? HOSTEL_STEPS : HOTEL_STEPS;
  const currentStepKey = getCurrentStepKey(pathname, draft.propertyType);
  const completedKeys = getCompletedKeys(draft, steps.map((s) => s.key));

  const stepsWithHref = steps.map((s) => ({
    ...s,
    href: `/audit/${propertyId}/${auditId}/${s.href}`,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="border-b border-gray-200 bg-white sticky top-14 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          {/* Property name + save indicator */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{draft.propertyType}</p>
              <h2 className="text-sm font-semibold text-gray-900">{draft.propertyName}</h2>
            </div>
            <div className="flex items-center gap-3">
              <AutoSaveIndicator lastSyncedAt={draft.lastSyncedAt} isSaving={isSaving} />
              <Button size="sm" variant="outline" onClick={syncToDb} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </div>
          {/* Step nav */}
          <StepNav steps={stepsWithHref} currentKey={currentStepKey} completedKeys={completedKeys} />
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

function getCurrentStepKey(pathname: string, type: string) {
  if (pathname.includes("/process")) return "process";
  if (pathname.includes("/maintenance/rooms")) return type === "hostel" ? "rooms" : "guest_rooms";
  if (pathname.includes("/maintenance/property")) return "property";
  if (pathname.includes("/manpower")) return "manpower";
  if (pathname.includes("/equipment")) return "equipment";
  if (pathname.includes("/hotel/front-office")) return "front_office";
  if (pathname.includes("/hotel/housekeeping")) return "housekeeping";
  if (pathname.includes("/hotel/engineering")) return "engineering";
  if (pathname.includes("/hotel/food-beverage")) return "food_beverage";
  if (pathname.includes("/hotel/property-management")) return "property_mgmt";
  if (pathname.includes("/hotel/security")) return "security";
  if (pathname.includes("/hotel/finance")) return "finance";
  if (pathname.includes("/hotel/hr")) return "hr";
  if (pathname.includes("/hotel/guest-experience")) return "guest_exp";
  if (pathname.includes("/review")) return "review";
  return "";
}

function getCompletedKeys(draft: ReturnType<typeof useAuditStore.getState>["drafts"][string], allKeys: string[]) {
  const completed: string[] = [];
  if (draft.process.admissionsRemarks || draft.process.paymentsRemarks) completed.push("process");
  if (draft.rooms.length > 0) { completed.push("rooms"); completed.push("guest_rooms"); }
  if (draft.commonAreas.some((a) => a.remarks)) completed.push("property");
  if (draft.manpower.some((m) => m.count !== null)) completed.push("manpower");
  if (draft.equipment.some((e) => e.condition || e.count !== null)) completed.push("equipment");
  if (draft.frontOffice.some((s) => s.remarks)) completed.push("front_office");
  if (draft.housekeeping.some((s) => s.remarks || s.checklist.length)) completed.push("housekeeping");
  if (draft.engineering.some((s) => s.remarks || s.checklist.length)) completed.push("engineering");
  if (draft.foodBeverage.some((s) => s.remarks || s.checklist.length)) completed.push("food_beverage");
  if (draft.propertyManagement.some((s) => s.remarks)) completed.push("property_mgmt");
  if (draft.security.some((s) => s.remarks || s.checklist.length)) completed.push("security");
  if (draft.finance.some((s) => s.remarks || s.checklist.length)) completed.push("finance");
  if (draft.humanResources.some((s) => s.remarks || s.checklist.length)) completed.push("hr");
  if (draft.guestExperience.some((s) => s.remarks)) completed.push("guest_exp");
  return completed;
}
