import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [updated] = await db
    .update(users)
    .set({ isActive: body.isActive })
    .where(eq(users.id, id))
    .returning();
  return NextResponse.json(updated);
}
