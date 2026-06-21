import { NextRequest, NextResponse } from "next/server";
import { db, checklistTemplates, checklistItems } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const context = searchParams.get("context");
  const propertyType = searchParams.get("type");

  const whereCondition = context
    ? and(eq(checklistTemplates.isActive, true), eq(checklistTemplates.context, context))
    : eq(checklistTemplates.isActive, true);

  const templates = await db
    .select()
    .from(checklistTemplates)
    .where(whereCondition)
    .orderBy(asc(checklistTemplates.orderIndex));

  // Fetch items for each template
  const result = await Promise.all(
    templates.map(async (tmpl) => {
      const items = await db
        .select()
        .from(checklistItems)
        .where(
          and(
            eq(checklistItems.templateId, tmpl.id),
            eq(checklistItems.isActive, true)
          )
        )
        .orderBy(asc(checklistItems.orderIndex));
      return { ...tmpl, items };
    })
  );

  return NextResponse.json(result);
}
