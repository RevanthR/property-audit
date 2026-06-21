import { NextRequest, NextResponse } from "next/server";
import { db, audits, auditProcess, auditManpower, auditEquipment, auditRooms, roomChecklistItems, auditCommonAreas, commonAreaChecklistItems, auditHotelSections, hotelSectionChecklistItems } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [audit] = await db.select().from(audits).where(eq(audits.id, id));
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [process] = await db.select().from(auditProcess).where(eq(auditProcess.auditId, id));
  const manpower = await db.select().from(auditManpower).where(eq(auditManpower.auditId, id));
  const equipment = await db.select().from(auditEquipment).where(eq(auditEquipment.auditId, id));

  const rooms = await db.select().from(auditRooms).where(eq(auditRooms.auditId, id));
  const roomItems = rooms.length
    ? await db.select().from(roomChecklistItems).where(eq(roomChecklistItems.roomId, rooms[0].id))
    : [];

  const roomsWithItems = await Promise.all(
    rooms.map(async (room) => {
      const items = await db.select().from(roomChecklistItems).where(eq(roomChecklistItems.roomId, room.id));
      return { ...room, checklist: items };
    })
  );

  const commonAreas = await db.select().from(auditCommonAreas).where(eq(auditCommonAreas.auditId, id));
  const commonAreasWithItems = await Promise.all(
    commonAreas.map(async (area) => {
      const items = await db.select().from(commonAreaChecklistItems).where(eq(commonAreaChecklistItems.commonAreaId, area.id));
      return { ...area, checklist: items };
    })
  );

  const hotelSections = await db.select().from(auditHotelSections).where(eq(auditHotelSections.auditId, id));
  const hotelSectionsWithItems = await Promise.all(
    hotelSections.map(async (section) => {
      const items = await db.select().from(hotelSectionChecklistItems).where(eq(hotelSectionChecklistItems.sectionId, section.id));
      return { ...section, checklist: items };
    })
  );

  return NextResponse.json({
    audit,
    process: process || null,
    manpower,
    equipment,
    rooms: roomsWithItems,
    commonAreas: commonAreasWithItems,
    hotelSections: hotelSectionsWithItems,
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
