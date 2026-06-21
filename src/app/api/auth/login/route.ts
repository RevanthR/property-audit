import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { name, pin, password } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Admin login: name + PIN
  if (pin !== undefined) {
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (!admin || admin.pin !== String(pin)) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }

    return NextResponse.json({
      id: admin.id,
      name: admin.name,
      role: "admin",
      hasAllPropertiesAccess: true,
    });
  }

  // Auditor login: name + password (must be pre-created by admin)
  const [user] = await db
    .select()
    .from(users)
    .where(ilike(users.name, name.trim()))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "No account found. Ask your admin to create one." }, { status: 401 });
  }

  if (!user.isActive) {
    return NextResponse.json({ error: "Account deactivated. Contact admin." }, { status: 403 });
  }

  if (!user.passwordHash) {
    return NextResponse.json({ error: "Password not set. Ask admin to set your password." }, { status: 401 });
  }

  const valid = await bcrypt.compare(String(password ?? ""), user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    hasAllPropertiesAccess: user.hasAllPropertiesAccess,
  });
}
