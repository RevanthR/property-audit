import { NextRequest, NextResponse } from "next/server";
import { db, userProperties } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { propertyId } = await req.json();
  await db.insert(userProperties).values({ userId: id, propertyId }).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { propertyId } = await req.json();
  await db.delete(userProperties).where(
    and(eq(userProperties.userId, id), eq(userProperties.propertyId, propertyId))
  );
  return NextResponse.json({ ok: true });
}
