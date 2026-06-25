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
  const updateDraft = useAuditStore((s) => s.updateDraft);

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
          const serverVersion: number = data.audit.version ?? 0;
          // Only overwrite local draft if server is strictly newer — prevents a race
          // where IDB hydrates with local unsaved changes after the fetch starts.
          if (serverVersion > (draftRef.current?.version ?? -1)) {
            initDraft(transformServerAuditToLocalDraft(data));
          }
        } else {
          // Audit not found — redirect home
          router.replace("/");
        }
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoadingFromDb(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  // Stable ref to draft so syncToDb/refreshFromDb don't re-create on every draft change
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastRefreshRef = useRef<number>(0);
  // Timestamp of the last completed sync or remote pull (initDraft from poll/refresh).
  // Guards the change-debounce so that markSynced / initDraft state updates don't
  // re-trigger a sync — only genuine user edits should start the debounce.
  const lastSyncCompletedRef = useRef<number>(0);
  // Timestamp of the last user-initiated edit. Used by the poll to skip pulling when
  // local has unsaved changes (debounce is pending but hasn't fired yet).
  const lastEditTimeRef = useRef<number>(0);

  // force=true: always push (exit syncs, manual Save button).
  // force=false (default): only push if this device has unsaved local changes — prevents
  // a device with a stale draft from overwriting newer data pushed by another device.
  const syncToDb = useCallback(async (keepalive = false, force = false) => {
    const d = draftRef.current;
    if (!d) return;
    if (!force && lastEditTimeRef.current <= lastSyncCompletedRef.current) return;
    setIsSaving(true);
    try {
      const body = JSON.stringify(d);
      const res = await fetch(`/api/audits/${auditId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        ...(keepalive && body.length < 65536 ? { keepalive: true } : {}),
      });
      if (res.ok) {
        const json = await res.json();
        lastSyncCompletedRef.current = Date.now();
        markSynced(auditId, json.version);
      }
    } catch { /* silent — data safe in IndexedDB */ } finally {
      setIsSaving(false);
    }
  }, [auditId, markSynced]);

  // Re-fetch from DB when the page becomes visible again (tab focus, app foreground,
  // returning from another device). Throttled to at most once per 10s.
  //
  // Pushes local state to DB first so we never overwrite unsaved local changes —
  // "server version ahead" only means another device added data, not that local is stale.
  const refreshFromDb = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 10000) return;
    lastRefreshRef.current = now;
    try {
      // Flush unsaved local changes before comparing versions.
      // syncToDb skips automatically if no local changes exist (won't overwrite server data).
      await syncToDb();
      // Pull only if server is still ahead after our push (or if we had nothing to push).
      const res = await fetch(`/api/audits/${auditId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.audit) return;
      const serverVersion: number = data.audit.version ?? 0;
      if (serverVersion > (draftRef.current?.version ?? -1)) {
        lastSyncCompletedRef.current = Date.now();
        initDraft(transformServerAuditToLocalDraft(data));
      }
    } catch { /* silent */ }
  }, [auditId, initDraft, syncToDb]);

  // On initial mount (draft already in IDB from a previous session on THIS device), check
  // if the server has newer data — e.g. another device made edits since the last close.
  const didInitialRefresh = useRef(false);
  useEffect(() => {
    if (!draft || didInitialRefresh.current) return;
    didInitialRefresh.current = true;
    refreshFromDb();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Debounced sync on every real user edit.
  // Guards against two false triggers:
  //   • markSynced updates draft.lastSyncedAt after every sync → would cause infinite loop
  //   • initDraft from poll/refreshFromDb updates draft → would ping-pong between devices
  // Both are suppressed by the 500ms window after lastSyncCompletedRef is set.
  const hasHydrated = useRef(false);
  const changeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!hasHydrated.current) { hasHydrated.current = true; return; }
    if (!draft) return;
    if (Date.now() - lastSyncCompletedRef.current < 500) return; // sync/pull just happened — not a user edit
    lastEditTimeRef.current = Date.now();
    clearTimeout(changeDebounceRef.current!);
    changeDebounceRef.current = setTimeout(syncToDb, 2000);
    return () => clearTimeout(changeDebounceRef.current!);
  }, [draft, syncToDb]);

  // 30s heartbeat as a fallback (covers cases where the draft ref didn't change but time passed).
  useEffect(() => {
    const recurring = setInterval(syncToDb, 30000);
    return () => clearInterval(recurring);
  }, [syncToDb]);

  // Poll for version changes every 5s while the tab is visible.
  // Skips if local has unsaved edits (debounce pending) to avoid overwriting them.
  // Sets lastSyncCompletedRef before initDraft so the change-debounce ignores the update.
  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      // Local has unsaved changes — wait for the debounce to push them first.
      if (lastEditTimeRef.current > lastSyncCompletedRef.current) return;
      try {
        const res = await fetch(`/api/audits/${auditId}/version`);
        if (!res.ok) return;
        const { version: serverVersion } = await res.json();
        if (serverVersion > (draftRef.current?.version ?? -1)) {
          const full = await fetch(`/api/audits/${auditId}`);
          if (!full.ok) return;
          const data = await full.json();
          if (data?.audit) {
            lastSyncCompletedRef.current = Date.now();
            initDraft(transformServerAuditToLocalDraft(data));
          }
        }
      } catch { /* silent */ }
    };
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [auditId, initDraft]);
  useEffect(() => {
    const onHide = () => syncToDb(true, true);  // keepalive + force — safety net on exit
    const onVis = () => {
      if (document.visibilityState === "hidden") syncToDb(true, true);
      else if (document.visibilityState === "visible") refreshFromDb();
    };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) refreshFromDb(); };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [syncToDb, refreshFromDb]);

  // ── Section lock management ──────────────────────────────────────────────────
  const currentStepKey = draft ? getCurrentStepKey(pathname, draft.propertyType) : "";

  // Keep draft.currentStep in sync with actual navigation so "Resume Audit" lands on
  // the last step the auditor was working on.
  const prevStepRef = useRef("");
  useEffect(() => {
    if (!currentStepKey || currentStepKey === prevStepRef.current) return;
    prevStepRef.current = currentStepKey;
    if (draftRef.current && draftRef.current.currentStep !== currentStepKey) {
      updateDraft(auditId, { currentStep: currentStepKey });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepKey]);

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
              <Button size="sm" variant="outline" onClick={() => syncToDb(false, true)} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
          <StepNav steps={stepsWithHref} currentKey={currentStepKey} stepStatuses={stepStatuses} />
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-6 pb-24">
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
