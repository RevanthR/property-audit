import type { AuditDraft } from "@/lib/store/audit";

export interface StepCompletion {
  pct: number;      // 0-100
  hasErrors: boolean; // not_ok items without remarks
  touched: boolean;   // any data at all
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function checklistPct(items: Array<{ condition: string | null; remarks: string }>): StepCompletion {
  if (!items.length) return { pct: 0, hasErrors: false, touched: false };
  let filled = 0;
  let errors = 0;
  for (const item of items) {
    if (item.condition) {
      filled++;
      if (item.condition === "not_ok" && !item.remarks?.trim()) errors++;
    }
  }
  return {
    pct: Math.round((filled / items.length) * 100),
    hasErrors: errors > 0,
    touched: filled > 0,
  };
}

// ── Per-step computations ─────────────────────────────────────────────────────

export function computeStepCompletions(draft: AuditDraft): Record<string, StepCompletion> {
  if (draft.propertyType === "hostel") {
    return computeHostelSteps(draft);
  }
  return computeHotelSteps(draft);
}

function computeHostelSteps(draft: AuditDraft): Record<string, StepCompletion> {
  // Process
  const admFilled = !!draft.process.admissionsRemarks?.trim();
  const payFilled = !!draft.process.paymentsRemarks?.trim();
  const processPct = ((admFilled ? 1 : 0) + (payFilled ? 1 : 0)) * 50;
  const process: StepCompletion = { pct: processPct, hasErrors: false, touched: admFilled || payFilled };

  // Rooms
  let roomsResult: StepCompletion;
  if (!draft.rooms.length) {
    roomsResult = { pct: 0, hasErrors: false, touched: false };
  } else {
    const allItems = draft.rooms.flatMap((r) => r.checklist);
    roomsResult = checklistPct(allItems);
  }

  // Common areas (property)
  let areaFilled = 0, areaErrors = 0, areaTouched = 0, areaTotal = 0;
  for (const area of draft.commonAreas) {
    if (area.moduleType === "checklist") {
      const r = checklistPct(area.checklist);
      areaTotal += 100;
      areaFilled += r.pct;
      if (r.hasErrors) areaErrors++;
      if (r.touched) areaTouched++;
    } else {
      areaTotal += 100;
      if (area.remarks?.trim()) { areaFilled += 100; areaTouched++; }
    }
  }
  const property: StepCompletion = {
    pct: areaTotal > 0 ? Math.round(areaFilled / areaTotal * 100) : 0,
    hasErrors: areaErrors > 0,
    touched: areaTouched > 0,
  };

  // Manpower (4 sections, count is mandatory)
  const mpFilled = draft.manpower.filter((m) => m.count !== null && m.count !== undefined).length;
  const mpTotal = draft.manpower.length || 4;
  const manpower: StepCompletion = {
    pct: Math.round((mpFilled / mpTotal) * 100),
    hasErrors: false,
    touched: mpFilled > 0,
  };

  // Equipment
  const eqFilled = draft.equipment.filter((e) => e.condition !== null || e.count !== null).length;
  const eqTotal = draft.equipment.length || 3;
  const equipment: StepCompletion = {
    pct: Math.round((eqFilled / eqTotal) * 100),
    hasErrors: false,
    touched: eqFilled > 0,
  };

  return { process, rooms: roomsResult, property, manpower, equipment };
}

function computeHotelSteps(draft: AuditDraft): Record<string, StepCompletion> {
  function sectionCompletion(subAreas: AuditDraft["frontOffice"]): StepCompletion {
    if (!subAreas.length) return { pct: 0, hasErrors: false, touched: false };
    let filled = 0, errors = 0, touched = 0;
    for (const sub of subAreas) {
      if (sub.moduleType === "checklist") {
        const r = checklistPct(sub.checklist);
        if (r.touched) touched++;
        if (r.pct === 100 && !r.hasErrors) filled++;
        if (r.hasErrors) errors++;
      } else {
        if (sub.remarks?.trim()) { filled++; touched++; }
      }
    }
    return {
      pct: Math.round((filled / subAreas.length) * 100),
      hasErrors: errors > 0,
      touched: touched > 0,
    };
  }

  // Guest rooms uses same checklist logic as hostel
  let roomsResult: StepCompletion;
  if (!draft.rooms.length) {
    roomsResult = { pct: 0, hasErrors: false, touched: false };
  } else {
    const allItems = draft.rooms.flatMap((r) => r.checklist);
    roomsResult = checklistPct(allItems);
  }

  return {
    front_office: sectionCompletion(draft.frontOffice),
    guest_rooms: roomsResult,
    housekeeping: sectionCompletion(draft.housekeeping),
    engineering: sectionCompletion(draft.engineering),
    food_beverage: sectionCompletion(draft.foodBeverage),
    property_mgmt: sectionCompletion(draft.propertyManagement),
    security: sectionCompletion(draft.security),
    finance: sectionCompletion(draft.finance),
    hr: sectionCompletion(draft.humanResources),
    guest_exp: sectionCompletion(draft.guestExperience),
  };
}

// ── Overall completion % ──────────────────────────────────────────────────────

export function computeOverallPct(draft: AuditDraft): number {
  const steps = computeStepCompletions(draft);
  const values = Object.values(steps);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, s) => sum + s.pct, 0) / values.length);
}

// ── Submit readiness (all mandatory fields filled, no errors) ─────────────────

export function isReadyToSubmit(draft: AuditDraft): { ready: boolean; issues: string[] } {
  const steps = computeStepCompletions(draft);
  const issues: string[] = [];

  for (const [key, step] of Object.entries(steps)) {
    if (step.hasErrors) issues.push(`${key}: some "Not Ok" items are missing remarks`);
    if (step.pct < 100) issues.push(`${key}: incomplete (${step.pct}% done)`);
  }

  return { ready: issues.length === 0, issues };
}
