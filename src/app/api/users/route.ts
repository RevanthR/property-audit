import { NextRequest, NextResponse } from "next/server";
import { db, users, userProperties, properties } from "@/lib/db";
import { eq, ne } from "drizzle-orm";

export async function GET() {
  const auditors = await db
    .select()
    .from(users)
    .where(ne(users.role, "admin"))
    .orderBy(users.name);

  const withProperties = await Promise.all(
    auditors.map(async (u) => {
      const assignments = await db
        .select({ property: properties })
        .from(userProperties)
        .innerJoin(properties, eq(userProperties.propertyId, properties.id))
        .where(eq(userProperties.userId, u.id));
      return { ...u, properties: assignments.map((a) => a.property) };
    })
  );

  return NextResponse.json(withProperties);
}
