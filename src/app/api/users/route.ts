import { NextRequest, NextResponse } from "next/server";
import { db, users, userProperties, properties } from "@/lib/db";
import { eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  const auditors = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      hasAllPropertiesAccess: users.hasAllPropertiesAccess,
      createdAt: users.createdAt,
    })
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, password } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!password || String(password).length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  const [user] = await db
    .insert(users)
    .values({
      name: name.trim(),
      role: "auditor",
      passwordHash,
      hasAllPropertiesAccess: true,
    })
    .returning({
      id: users.id,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      hasAllPropertiesAccess: users.hasAllPropertiesAccess,
      createdAt: users.createdAt,
    });

  return NextResponse.json({ ...user, properties: [] }, { status: 201 });
}
