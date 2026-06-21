"use client";

import { use, useEffect, useRef, useCallback, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import { Navbar } from "@/components/layout/navbar";
import { StepNav } from "@/components/audit/step-nav";
import type { StepStatus } from "@/components/audit/step-nav";
import { AutoSaveIndicator } from "@/components/audit/auto-save-indicator";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { HOSTEL_STEPS, HOTEL_STEPS } from "@/lib/audit-config";
import { computeStepCompletions } from "@/lib/completion";

export default function AuditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ propertyId: string; auditId: string }>;
}) {
  const { propertyId, auditId } = use(params);
  const pathname = usePathname();
  // Specific selectors — only re-render when THIS draft or markSynced changes
  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const markSynced = useAuditStore((s) => s.markSynced);
  const [isSaving, setIsSaving] = useState(false);

  // Stable ref — always holds latest draft without causing effect re-runs
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const syncToDb = useCallback(async () => {
    const d = draftRef.current;
    if (!d) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (res.ok) markSynced(auditId);
      // 409 conflict → toast shown by the layout below if desired (currently silent)
    } catch {
      // silent — data is safe in localStorage
    } finally {
      setIsSaving(false);
    }
  }, [auditId, markSynced]);

  // Stable 30s timer — depends only on stable `syncToDb`
  useEffect(() => {
    const timer = setInterval(syncToDb, 30000);
    return () => clearInterval(timer);
  }, [syncToDb]);

  // Sync on page hide
  useEffect(() => {
    const onHide = () => syncToDb();
    const onVisibility = () => { if (document.visibilityState === "hidden") syncToDb(); };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncToDb]);

  if (!draft) return <div className="min-h-screen bg-gray-50"><Navbar />{children}</div>;

  const steps = draft.propertyType === "hostel" ? HOSTEL_STEPS : HOTEL_STEPS;
  const currentStepKey = getCurrentStepKey(pathname, draft.propertyType);

  // Memoized — only recomputes when the draft actually changes reference
  const completions = useMemo(() => computeStepCompletions(draft), [draft]);
  const stepStatuses: Record<string, StepStatus> = {};
  for (const step of steps) {
    if (step.key === "review") {
      stepStatuses[step.key] = currentStepKey === "review" ? "in-progress" : "untouched";
      continue;
    }
    const c = completions[step.key];
    if (!c) { stepStatuses[step.key] = "untouched"; continue; }
    if (c.hasErrors) stepStatuses[step.key] = "error";
    else if (c.pct === 100) stepStatuses[step.key] = "done";
    else if (c.touched) stepStatuses[step.key] = "in-progress";
    else stepStatuses[step.key] = "untouched";
  }

  const stepsWithHref = steps.map((s) => ({
    ...s,
    href: `/audit/${propertyId}/${auditId}/${s.href}`,
  }));

  const overallPct = Math.round(
    Object.values(completions).reduce((sum, c) => sum + c.pct, 0) /
    Math.max(Object.values(completions).length, 1)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="border-b border-gray-200 bg-white sticky top-14 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          {/* Property name + progress + save */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{draft.propertyType}</p>
              <h2 className="text-sm font-semibold text-gray-900">{draft.propertyName}</h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Overall progress pill */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-100 rounded-full">
                  <div
                    className={`h-1.5 rounded-full transition-all ${overallPct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{overallPct}%</span>
              </div>
              <AutoSaveIndicator lastSyncedAt={draft.lastSyncedAt} isSaving={isSaving} />
              <Button size="sm" variant="outline" onClick={syncToDb} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </div>
          {/* Step nav — all steps are clickable links */}
          <StepNav steps={stepsWithHref} currentKey={currentStepKey} stepStatuses={stepStatuses} />
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
