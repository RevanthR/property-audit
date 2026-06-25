// Transforms the GET /api/audits/[id] response into a local AuditDraft
// so collaborating users can join an existing audit with full data.

import type { AuditDraft, ChecklistEntry } from "@/lib/store/audit";
import {
  HOSTEL_COMMON_AREAS,
  HOSTEL_MANPOWER,
  HOSTEL_EQUIPMENT,
  HOTEL_SECTIONS,
} from "@/lib/audit-config";

// Maps DB sectionKey → AuditDraft field name
const DB_SECTION_KEY_MAP: Record<string, keyof typeof HOTEL_SECTIONS> = {
  front_office: "frontOffice",
  housekeeping: "housekeeping",
  engineering: "engineering",
  food_beverage: "foodBeverage",
  property_management: "propertyManagement",
  security: "security",
  finance: "finance",
  hr: "humanResources",
  guest_experience: "guestExperience",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChecklist(items: any[]): ChecklistEntry[] {
  return items.map((c) => ({
    itemId: c.templateItemId ?? c.id,
    itemLabel: c.itemLabel,
    condition: c.condition ?? null,
    remarks: c.remarks ?? "",
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformServerAuditToLocalDraft(data: any): AuditDraft {
  const { audit, property, process, manpower, equipment, assetInventory, rooms, commonAreas, hotelSections } = data;
  const type: "hostel" | "hotel" = property.type;

  // Rooms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomsDraft = (rooms ?? []).map((r: any) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    savedToDb: true,
    checklist: mapChecklist(r.checklist ?? []),
  }));

  // Hostel: common areas
  const commonAreasDraft =
    (commonAreas ?? []).length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (commonAreas as any[]).map((a) => ({
          areaKey: a.areaKey,
          areaLabel: a.areaLabel,
          moduleType: a.moduleType as "remarks" | "checklist",
          remarks: a.remarks ?? "",
          checklist: mapChecklist(a.checklist ?? []),
        }))
      : HOSTEL_COMMON_AREAS.map((a) => ({
          areaKey: a.key,
          areaLabel: a.label,
          moduleType: a.type as "remarks" | "checklist",
          remarks: "",
          checklist: [],
        }));

  // Hostel: manpower (merge DB data with config labels)
  const manpowerDraft = HOSTEL_MANPOWER.map((m) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (manpower ?? []).find((r: any) => r.section === m.key);
    return { section: m.key, label: m.label, count: row?.count ?? null, remarks: row?.remarks ?? "" };
  });

  // Hostel: equipment
  const equipmentDraft = HOSTEL_EQUIPMENT.map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (equipment ?? []).find((r: any) => r.item === e.key);
    return {
      item: e.key,
      label: e.label,
      moduleType: e.type as "status" | "count",
      condition: row?.condition ?? null,
      count: row?.count ?? null,
      remarks: row?.remarks ?? "",
    };
  });

  // Hotel: group DB sections by sectionKey → draft field
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbSectionsByKey: Record<string, any[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (hotelSections ?? []) as any[]) {
    if (!dbSectionsByKey[s.sectionKey]) dbSectionsByKey[s.sectionKey] = [];
    dbSectionsByKey[s.sectionKey].push(s);
  }

  function buildHotelSection(dbKey: string, configKey: keyof typeof HOTEL_SECTIONS) {
    const dbRows = dbSectionsByKey[dbKey] ?? [];
    const config = HOTEL_SECTIONS[configKey];
    if (dbRows.length === 0) {
      // Not yet saved — initialise from config
      return config.map((s) => ({ ...s, remarks: "", checklist: [] }));
    }
    // Merge: for each config sub-area, find the DB row (to preserve remarks/checklist)
    return config.map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbRow = dbRows.find((r: any) => r.subAreaKey === s.subAreaKey);
      return {
        subAreaKey: s.subAreaKey,
        subAreaLabel: s.subAreaLabel,
        moduleType: s.moduleType,
        remarks: dbRow?.remarks ?? "",
        checklist: mapChecklist(dbRow?.checklist ?? []),
      };
    });
  }

  // Asset inventory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assetInventoryDraft = (assetInventory ?? []).map((a: any) => ({
    templateItemId: a.templateItemId ?? a.id,
    itemLabel: a.itemLabel,
    condition: a.condition ?? null,
    remarks: a.remarks ?? "",
  }));

  return {
    auditId: audit.id,
    propertyId: property.id,
    propertyName: property.name,
    propertyType: type,
    auditorName: audit.auditorName,
    auditDate: audit.auditDate,
    currentStep: audit.currentStep ?? (type === "hostel" ? "process" : "front_office"),
    assetInventory: assetInventoryDraft,
    process: {
      admissionsRemarks: process?.admissionsRemarks ?? "",
      paymentsRemarks: process?.paymentsRemarks ?? "",
    },
    rooms: roomsDraft,
    commonAreas: commonAreasDraft,
    manpower: manpowerDraft,
    equipment: equipmentDraft,
    frontOffice: buildHotelSection("front_office", "frontOffice"),
    housekeeping: buildHotelSection("housekeeping", "housekeeping"),
    engineering: buildHotelSection("engineering", "engineering"),
    foodBeverage: buildHotelSection("food_beverage", "foodBeverage"),
    propertyManagement: buildHotelSection("property_management", "propertyManagement"),
    security: buildHotelSection("security", "security"),
    finance: buildHotelSection("finance", "finance"),
    humanResources: buildHotelSection("hr", "humanResources"),
    guestExperience: buildHotelSection("guest_experience", "guestExperience"),
    version: audit.version ?? 0,
    lastSyncedAt: audit.updatedAt ? new Date(audit.updatedAt).toISOString() : null,
  };
}
