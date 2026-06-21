import { NextRequest, NextResponse } from "next/server";
import { db, checklistItems, checklistTemplates } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [item] = await db
    .insert(checklistItems)
    .values({
      templateId: id,
      itemLabel: body.itemLabel,
      moduleType: body.moduleType || "checklist",
      orderIndex: body.orderIndex || 0,
    })
    .returning();
  return NextResponse.json(item, { status: 201 });
}
