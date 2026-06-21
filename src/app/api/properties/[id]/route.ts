import { NextRequest, NextResponse } from "next/server";
import { db, properties } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [property] = await db.select().from(properties).where(eq(properties.id, id));
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(property);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [updated] = await db
    .update(properties)
    .set({ name: body.name, location: body.location, isActive: body.isActive })
    .where(eq(properties.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.update(properties).set({ isActive: false }).where(eq(properties.id, id));
  return NextResponse.json({ ok: true });
}
