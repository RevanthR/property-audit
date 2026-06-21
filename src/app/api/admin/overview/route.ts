import { NextResponse } from "next/server";
import { db, audits, properties, users } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      audit: audits,
      property: properties,
    })
    .from(audits)
    .innerJoin(properties, eq(audits.propertyId, properties.id))
    .orderBy(desc(audits.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
