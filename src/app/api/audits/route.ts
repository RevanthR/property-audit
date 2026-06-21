import { NextRequest, NextResponse } from "next/server";
import { db, audits, properties } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const status = searchParams.get("status") as "draft" | "submitted" | null;

  const conditions = [];
  if (propertyId) conditions.push(eq(audits.propertyId, propertyId));
  if (status) conditions.push(eq(audits.status, status));

  const rows = await db
    .select({ audit: audits, property: properties })
    .from(audits)
    .innerJoin(properties, eq(audits.propertyId, properties.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(audits.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Enforce one active audit per property — return existing draft if one exists
  const [existing] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.propertyId, body.propertyId), eq(audits.status, "draft")))
    .limit(1);

  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

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
