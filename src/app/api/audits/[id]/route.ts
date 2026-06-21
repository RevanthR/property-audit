import { NextRequest, NextResponse } from "next/server";
import { db, audits, auditProcess, auditManpower, auditEquipment, auditRooms, roomChecklistItems, auditCommonAreas, commonAreaChecklistItems, auditHotelSections, hotelSectionChecklistItems } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [audit] = await db.select().from(audits).where(eq(audits.id, id));
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch all top-level collections in parallel
  const [processRows, manpower, equipment, rooms, commonAreas, hotelSections] = await Promise.all([
    db.select().from(auditProcess).where(eq(auditProcess.auditId, id)),
    db.select().from(auditManpower).where(eq(auditManpower.auditId, id)),
    db.select().from(auditEquipment).where(eq(auditEquipment.auditId, id)),
    db.select().from(auditRooms).where(eq(auditRooms.auditId, id)),
    db.select().from(auditCommonAreas).where(eq(auditCommonAreas.auditId, id)),
    db.select().from(auditHotelSections).where(eq(auditHotelSections.auditId, id)),
  ]);

  // Bulk-fetch all checklist items in 3 queries instead of N+1
  const roomIds = rooms.map((r) => r.id);
  const areaIds = commonAreas.map((a) => a.id);
  const sectionIds = hotelSections.map((s) => s.id);

  const [allRoomItems, allAreaItems, allSectionItems] = await Promise.all([
    roomIds.length ? db.select().from(roomChecklistItems).where(inArray(roomChecklistItems.roomId, roomIds)) : [],
    areaIds.length ? db.select().from(commonAreaChecklistItems).where(inArray(commonAreaChecklistItems.commonAreaId, areaIds)) : [],
    sectionIds.length ? db.select().from(hotelSectionChecklistItems).where(inArray(hotelSectionChecklistItems.sectionId, sectionIds)) : [],
  ]);

  // Group items by parent ID in memory
  const roomItemsByRoom = Object.groupBy(allRoomItems, (i) => i.roomId);
  const areaItemsByArea = Object.groupBy(allAreaItems, (i) => i.commonAreaId);
  const sectionItemsBySection = Object.groupBy(allSectionItems, (i) => i.sectionId);

  return NextResponse.json({
    audit,
    process: processRows[0] || null,
    manpower,
    equipment,
    rooms: rooms.map((r) => ({ ...r, checklist: roomItemsByRoom[r.id] ?? [] })),
    commonAreas: commonAreas.map((a) => ({ ...a, checklist: areaItemsByArea[a.id] ?? [] })),
    hotelSections: hotelSections.map((s) => ({ ...s, checklist: sectionItemsBySection[s.id] ?? [] })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const [updated] = await db
    .update(audits)
    .set({
      status: body.status,
      currentStep: body.currentStep,
      updatedAt: new Date(),
    })
    .where(eq(audits.id, id))
    .returning();

  return NextResponse.json(updated);
}
