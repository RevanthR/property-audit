import { NextRequest, NextResponse } from "next/server";
import { db, properties, userProperties, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const role = searchParams.get("role");

  // Admins see all active properties
  if (role === "admin") {
    const all = await db
      .select()
      .from(properties)
      .where(eq(properties.isActive, true))
      .orderBy(properties.type, properties.name);
    return NextResponse.json(all);
  }

  // Auditors see only assigned properties
  if (!userId) return NextResponse.json([]);
  const assigned = await db
    .select({ property: properties })
    .from(userProperties)
    .innerJoin(properties, eq(userProperties.propertyId, properties.id))
    .where(
      and(eq(userProperties.userId, userId), eq(properties.isActive, true))
    );

  return NextResponse.json(assigned.map((r) => r.property));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [property] = await db
    .insert(properties)
    .values({
      name: body.name,
      type: body.type,
      location: body.location,
    })
    .returning();
  return NextResponse.json(property, { status: 201 });
}
