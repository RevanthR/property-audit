import { NextRequest, NextResponse } from "next/server";
import { db, checklistTemplates } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const allowed = ["moduleType", "name", "orderIndex", "isActive"] as const;
  const updates: Partial<typeof body> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(checklistTemplates)
    .set(updates)
    .where(eq(checklistTemplates.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json(updated);
}
