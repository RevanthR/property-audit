import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { AuditDraft } from "@/lib/store/audit";

// Upsert helper for audit_process
async function saveProcess(auditId: string, draft: AuditDraft) {
  const [existing] = await db.select().from(schema.auditProcess).where(eq(schema.auditProcess.auditId, auditId));
  if (existing) {
    await db.update(schema.auditProcess)
      .set({ admissionsRemarks: draft.process.admissionsRemarks, paymentsRemarks: draft.process.paymentsRemarks, updatedAt: new Date() })
      .where(eq(schema.auditProcess.auditId, auditId));
  } else {
    await db.insert(schema.auditProcess).values({
      auditId, admissionsRemarks: draft.process.admissionsRemarks, paymentsRemarks: draft.process.paymentsRemarks,
    });
  }
}

// Upsert manpower (delete + re-insert)
async function saveManpower(auditId: string, draft: AuditDraft) {
  await db.delete(schema.auditManpower).where(eq(schema.auditManpower.auditId, auditId));
  if (draft.manpower.length) {
    await db.insert(schema.auditManpower).values(
      draft.manpower.map((m) => ({
        auditId, section: m.section, count: m.count ?? null, remarks: m.remarks,
      }))
    );
  }
}

// Upsert equipment
async function saveEquipment(auditId: string, draft: AuditDraft) {
  await db.delete(schema.auditEquipment).where(eq(schema.auditEquipment.auditId, auditId));
  if (draft.equipment.length) {
    await db.insert(schema.auditEquipment).values(
      draft.equipment.map((e) => ({
        auditId, item: e.item, condition: e.condition ?? null, count: e.count ?? null, remarks: e.remarks,
      }))
    );
  }
}

// Upsert rooms + checklist
async function saveRooms(auditId: string, draft: AuditDraft) {
  // Get existing DB room IDs
  const existingRooms = await db.select().from(schema.auditRooms).where(eq(schema.auditRooms.auditId, auditId));
  const existingIds = new Set(existingRooms.map((r) => r.id));
  const draftIds = new Set(draft.rooms.map((r) => r.id));

  // Delete rooms removed in draft
  for (const r of existingRooms) {
    if (!draftIds.has(r.id)) {
      await db.delete(schema.auditRooms).where(eq(schema.auditRooms.id, r.id));
    }
  }

  // Upsert each draft room
  for (const room of draft.rooms) {
    if (existingIds.has(room.id)) {
      await db.update(schema.auditRooms)
        .set({ roomNumber: room.roomNumber, updatedAt: new Date() })
        .where(eq(schema.auditRooms.id, room.id));
    } else {
      await db.insert(schema.auditRooms).values({ id: room.id, auditId, roomNumber: room.roomNumber });
    }

    // Replace checklist items for this room
    await db.delete(schema.roomChecklistItems).where(eq(schema.roomChecklistItems.roomId, room.id));
    if (room.checklist.length) {
      await db.insert(schema.roomChecklistItems).values(
        room.checklist.map((item) => ({
          roomId: room.id,
          templateItemId: null,
          itemLabel: item.itemLabel,
          condition: item.condition ?? null,
          remarks: item.remarks,
        }))
      );
    }
  }
}

// Upsert common areas
async function saveCommonAreas(auditId: string, draft: AuditDraft) {
  const existing = await db.select().from(schema.auditCommonAreas).where(eq(schema.auditCommonAreas.auditId, auditId));
  const existingByKey = Object.fromEntries(existing.map((a) => [a.areaKey, a]));

  for (const area of draft.commonAreas) {
    let areaId: string;
    if (existingByKey[area.areaKey]) {
      areaId = existingByKey[area.areaKey].id;
      await db.update(schema.auditCommonAreas)
        .set({ remarks: area.remarks, updatedAt: new Date() })
        .where(eq(schema.auditCommonAreas.id, areaId));
    } else {
      const [inserted] = await db.insert(schema.auditCommonAreas).values({
        auditId, areaKey: area.areaKey, areaLabel: area.areaLabel,
        moduleType: area.moduleType, remarks: area.remarks,
      }).returning();
      areaId = inserted.id;
    }

    // Replace checklist for this area
    await db.delete(schema.commonAreaChecklistItems).where(eq(schema.commonAreaChecklistItems.commonAreaId, areaId));
    if (area.checklist.length) {
      await db.insert(schema.commonAreaChecklistItems).values(
        area.checklist.map((item) => ({
          commonAreaId: areaId, itemLabel: item.itemLabel,
          condition: item.condition ?? null, remarks: item.remarks,
        }))
      );
    }
  }
}

// Upsert hotel sections
async function saveHotelSections(auditId: string, draft: AuditDraft) {
  const sectionMap: Record<string, { key: string; label: string; subAreas: typeof draft.frontOffice }> = {
    front_office: { key: "front_office", label: "Front Office Operations", subAreas: draft.frontOffice },
    housekeeping: { key: "housekeeping", label: "Housekeeping", subAreas: draft.housekeeping },
    engineering: { key: "engineering", label: "Engineering & Maintenance", subAreas: draft.engineering },
    food_beverage: { key: "food_beverage", label: "Food & Beverage", subAreas: draft.foodBeverage },
    property_management: { key: "property_management", label: "Property Management", subAreas: draft.propertyManagement },
    security: { key: "security", label: "Security & Safety", subAreas: draft.security },
    finance: { key: "finance", label: "Finance & Compliance", subAreas: draft.finance },
    hr: { key: "hr", label: "Human Resources", subAreas: draft.humanResources },
    guest_experience: { key: "guest_experience", label: "Guest Experience", subAreas: draft.guestExperience },
  };

  const existing = await db.select().from(schema.auditHotelSections).where(eq(schema.auditHotelSections.auditId, auditId));
  const existingByKey = Object.fromEntries(existing.map((s) => [`${s.sectionKey}_${s.subAreaKey}`, s]));

  for (const [, section] of Object.entries(sectionMap)) {
    for (const sub of section.subAreas) {
      const compositeKey = `${section.key}_${sub.subAreaKey}`;
      let sectionId: string;

      if (existingByKey[compositeKey]) {
        sectionId = existingByKey[compositeKey].id;
        await db.update(schema.auditHotelSections)
          .set({ remarks: sub.remarks, updatedAt: new Date() })
          .where(eq(schema.auditHotelSections.id, sectionId));
      } else {
        const [inserted] = await db.insert(schema.auditHotelSections).values({
          auditId, sectionKey: section.key, sectionLabel: section.label,
          subAreaKey: sub.subAreaKey, subAreaLabel: sub.subAreaLabel,
          moduleType: sub.moduleType, remarks: sub.remarks,
        }).returning();
        sectionId = inserted.id;
      }

      // Replace checklist
      await db.delete(schema.hotelSectionChecklistItems).where(eq(schema.hotelSectionChecklistItems.sectionId, sectionId));
      if (sub.checklist.length) {
        await db.insert(schema.hotelSectionChecklistItems).values(
          sub.checklist.map((item) => ({
            sectionId, itemLabel: item.itemLabel,
            condition: item.condition ?? null, remarks: item.remarks,
          }))
        );
      }
    }
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft: AuditDraft = await req.json();

  // Update audit metadata
  await db.update(schema.audits)
    .set({ currentStep: draft.currentStep, updatedAt: new Date() })
    .where(eq(schema.audits.id, id));

  const type = draft.propertyType;

  if (type === "hostel") {
    await saveProcess(id, draft);
    await saveManpower(id, draft);
    await saveEquipment(id, draft);
    await saveCommonAreas(id, draft);
  } else {
    await saveHotelSections(id, draft);
  }

  // Rooms are shared
  await saveRooms(id, draft);

  return NextResponse.json({ ok: true, syncedAt: new Date().toISOString() });
}
