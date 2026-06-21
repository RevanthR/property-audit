import { NextRequest, NextResponse } from "next/server";
import { db, checklistItems } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const body = await req.json();
  const [updated] = await db
    .update(checklistItems)
    .set({
      itemLabel: body.itemLabel,
      moduleType: body.moduleType,
      orderIndex: body.orderIndex,
      isActive: body.isActive,
    })
    .where(eq(checklistItems.id, itemId))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  await db.update(checklistItems).set({ isActive: false }).where(eq(checklistItems.id, itemId));
  return NextResponse.json({ ok: true });
}
