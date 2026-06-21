import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq, ilike } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Admin login: check name + PIN
  if (pin !== undefined) {
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (!admin || admin.pin !== String(pin)) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }

    return NextResponse.json({ id: admin.id, name: admin.name, role: "admin" });
  }

  // Auditor login: find or create by name
  const [existing] = await db
    .select()
    .from(users)
    .where(ilike(users.name, name.trim()))
    .limit(1);

  if (existing) {
    if (!existing.isActive) {
      return NextResponse.json({ error: "Account deactivated. Contact admin." }, { status: 403 });
    }
    return NextResponse.json({ id: existing.id, name: existing.name, role: existing.role });
  }

  // Create new auditor
  const [newUser] = await db
    .insert(users)
    .values({ name: name.trim(), role: "auditor" })
    .returning();

  return NextResponse.json({ id: newUser.id, name: newUser.name, role: newUser.role });
}
