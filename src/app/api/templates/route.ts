import { NextRequest, NextResponse } from "next/server";
import { db, checklistTemplates, checklistItems } from "@/lib/db";
import { eq, and, asc, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [template] = await db
    .insert(checklistTemplates)
    .values({
      propertyType: body.propertyType,
      context: body.context,
      name: body.name,
      moduleType: "checklist",
      orderIndex: body.orderIndex ?? 100,
      isActive: true,
    })
    .returning();
  return NextResponse.json({ ...template, items: [] });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const context = searchParams.get("context");

  const whereCondition = context
    ? and(eq(checklistTemplates.isActive, true), eq(checklistTemplates.context, context))
    : eq(checklistTemplates.isActive, true);

  const templates = await db
    .select()
    .from(checklistTemplates)
    .where(whereCondition)
    .orderBy(asc(checklistTemplates.orderIndex));

  if (!templates.length) return NextResponse.json([]);

  // Single bulk fetch instead of N+1
  const templateIds = templates.map((t) => t.id);
  const allItems = await db
    .select()
    .from(checklistItems)
    .where(and(inArray(checklistItems.templateId, templateIds), eq(checklistItems.isActive, true)))
    .orderBy(asc(checklistItems.orderIndex));

  const itemsByTemplate = Object.groupBy(allItems, (i) => i.templateId);

  return NextResponse.json(
    templates.map((t) => ({ ...t, items: itemsByTemplate[t.id] ?? [] }))
  );
}
