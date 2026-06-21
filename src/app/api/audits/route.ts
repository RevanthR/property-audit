import { NextRequest, NextResponse } from "next/server";
import { db, audits, properties } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const auditorName = searchParams.get("auditorName");

  let query = db
    .select({ audit: audits, property: properties })
    .from(audits)
    .innerJoin(properties, eq(audits.propertyId, properties.id))
    .orderBy(desc(audits.updatedAt));

  if (propertyId) {
    query = query.where(eq(audits.propertyId, propertyId)) as typeof query;
  }

  const rows = await query;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [audit] = await db
    .insert(audits)
    .values({
      propertyId: body.propertyId,
      auditorName: body.auditorName,
      auditDate: body.auditDate,
      status: "draft",
      currentStep: body.propertyType === "hostel" ? "process" : "front_office",
    })
    .returning();
  return NextResponse.json(audit, { status: 201 });
}
