"use client";

import { use, useEffect, useRef, useCallback, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuditStore } from "@/lib/store/audit";
import { useSession } from "@/lib/store/session";
import { Navbar } from "@/components/layout/navbar";
import { StepNav } from "@/components/audit/step-nav";
import type { StepStatus } from "@/components/audit/step-nav";
import { AutoSaveIndicator } from "@/components/audit/auto-save-indicator";
import { SectionConflictDialog } from "@/components/audit/section-conflict-dialog";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { HOSTEL_STEPS, HOTEL_STEPS } from "@/lib/audit-config";
import { computeStepCompletions } from "@/lib/completion";
import { transformServerAuditToLocalDraft } from "@/lib/transform-audit";

const STEP_LABELS: Record<string, string> = {
  process: "Process",
  rooms: "Rooms", guest_rooms: "Rooms",
  property: "Common Areas",
  manpower: "Manpower",
  equipment: "Equipment",
  assets: "Asset Inventory",
  front_office: "Front Office",
  housekeeping: "Housekeeping",
  engineering: "Engineering",
  food_beverage: "Food & Beverage",
  property_mgmt: "Property Management",
  security: "Security",
  finance: "Finance",
  hr: "Human Resources",
  guest_exp: "Guest Experience",
  review: "Review",
};

export default function AuditLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ propertyId: string; auditId: string }>;
}) {
  const { propertyId, auditId } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();

  const draft = useAuditStore(useCallback((s) => s.drafts[auditId], [auditId]));
  const markSynced = useAuditStore((s) => s.markSynced);
  const initDraft = useAuditStore((s) => s.initDraft);

  const [isSaving, setIsSaving] = useState(false);
  const [loadingFromDb, setLoadingFromDb] = useState(false);

  // Section lock state
  const [conflictInfo, setConflictInfo] = useState<{ lockedBy: string; sectionKey: string } | null>(null);
  const lockHeartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const currentLockRef = useRef<string | null>(null); // sectionKey we currently hold

  // Load from DB if no local draft (user joined an existing audit via URL / join button)
  useEffect(() => {
    if (draft || loadingFromDb) return;
    setLoadingFromDb(true);
    fetch(`/api/audits/${auditId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.audit) {
          initDraft(transformServerAuditToLocalDraft(data));
        } else {
          // Audit not found — redirect home
          router.replace("/");
        }
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoadingFromDb(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  // Stable ref to draft so syncToDb doesn't re-create on every draft change
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
    } catch { /* silent — data safe in localStorage */ } finally {
      setIsSaving(false);
    }
  }, [auditId, markSynced]);

  // Auto-sync every 30s and on page hide
  useEffect(() => {
    const timer = setInterval(syncToDb, 30000);
    return () => clearInterval(timer);
  }, [syncToDb]);
  useEffect(() => {
    const onHide = () => syncToDb();
    const onVis = () => { if (document.visibilityState === "hidden") syncToDb(); };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("pagehide", onHide); document.removeEventListener("visibilitychange", onVis); };
  }, [syncToDb]);

  // ── Section lock management ──────────────────────────────────────────────────
  const currentStepKey = draft ? getCurrentStepKey(pathname, draft.propertyType) : "";

  const acquireLock = useCallback(async (sectionKey: string, force = false) => {
    if (!user || !sectionKey || sectionKey === "review") return;
    try {
      const res = await fetch(`/api/audits/${auditId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey, userId: user.id, userName: user.name, force }),
      });
      const data = await res.json();
      if (!data.acquired && !force) {
        setConflictInfo({ lockedBy: data.lockedBy, sectionKey });
      }
    } catch { /* ignore — lock is best-effort */ }
  }, [auditId, user]);

  const releaseLock = useCallback(async (sectionKey: string) => {
    if (!user || !sectionKey || sectionKey === "review") return;
    try {
      await fetch(`/api/audits/${auditId}/lock`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey, userId: user.id }),
      });
    } catch { /* ignore */ }
  }, [auditId, user]);

  // Acquire lock when step changes; release old lock
  useEffect(() => {
    if (!currentStepKey || currentStepKey === "review") return;
    const prev = currentLockRef.current;
    currentLockRef.current = currentStepKey;

    if (prev && prev !== currentStepKey) releaseLock(prev);
    acquireLock(currentStepKey);

    // Heartbeat every 25s to keep lock alive
    clearInterval(lockHeartbeatRef.current!);
    lockHeartbeatRef.current = setInterval(() => acquireLock(currentStepKey), 25000);

    return () => {
      clearInterval(lockHeartbeatRef.current!);
      releaseLock(currentStepKey);
      currentLockRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepKey]);

  function handleTakeover() {
    if (!conflictInfo) return;
    acquireLock(conflictInfo.sectionKey, true);
    setConflictInfo(null);
  }

  // useMemo must be called unconditionally — before any early return
  const completions = useMemo(() => (draft ? computeStepCompletions(draft) : {}), [draft]);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!draft) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading audit…</p>
        </div>
      </div>
    );
  }

  const steps = draft.propertyType === "hostel" ? HOSTEL_STEPS : HOTEL_STEPS;

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

  const stepsWithHref = steps.map((s) => ({ ...s, href: `/audit/${propertyId}/${auditId}/${s.href}` }));

  const overallPct = Math.round(
    Object.values(completions).reduce((sum, c) => sum + c.pct, 0) /
    Math.max(Object.values(completions).length, 1)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="border-b border-gray-200 bg-white sticky top-14 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{draft.propertyType}</p>
              <h2 className="text-sm font-semibold text-gray-900">{draft.propertyName}</h2>
            </div>
            <div className="flex items-center gap-3">
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
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
          <StepNav steps={stepsWithHref} currentKey={currentStepKey} stepStatuses={stepStatuses} />
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <SectionConflictDialog
        open={!!conflictInfo}
        lockedBy={conflictInfo?.lockedBy ?? ""}
        sectionLabel={STEP_LABELS[conflictInfo?.sectionKey ?? ""] ?? conflictInfo?.sectionKey ?? ""}
        onTakeover={handleTakeover}
        onDismiss={() => setConflictInfo(null)}
      />
    </div>
  );
}

function getCurrentStepKey(pathname: string, type: string) {
  if (pathname.includes("/process")) return "process";
  if (pathname.includes("/maintenance/rooms")) return type === "hostel" ? "rooms" : "guest_rooms";
  if (pathname.includes("/maintenance/property")) return "property";
  if (pathname.includes("/manpower")) return "manpower";
  if (pathname.includes("/equipment")) return "equipment";
  if (pathname.includes("/assets")) return "assets";
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
