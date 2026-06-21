import { NextRequest, NextResponse } from "next/server";
import { db, sectionLocks, audits } from "@/lib/db";
import { and, eq, gt } from "drizzle-orm";

const LOCK_TTL_MS = 60_000; // lock expires after 60s of no heartbeat

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: auditId } = await params;
  const { sectionKey, userId, userName, force = false } = await req.json();

  if (!sectionKey || !userId || !userName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const freshThreshold = new Date(Date.now() - LOCK_TTL_MS);

  // Check for an existing fresh lock held by someone else
  const [existing] = await db
    .select()
    .from(sectionLocks)
    .where(and(eq(sectionLocks.auditId, auditId), eq(sectionLocks.sectionKey, sectionKey)));

  const isFreshForeignLock =
    existing &&
    existing.userId !== userId &&
    existing.lockedAt > freshThreshold;

  if (isFreshForeignLock && !force) {
    return NextResponse.json({
      acquired: false,
      lockedBy: existing.userName,
      lockedAt: existing.lockedAt,
    });
  }

  // Upsert: insert or refresh timestamp (takeover or heartbeat)
  await db
    .insert(sectionLocks)
    .values({ auditId, sectionKey, userId, userName, lockedAt: new Date() })
    .onConflictDoUpdate({
      target: [sectionLocks.auditId, sectionLocks.sectionKey],
      set: { userId, userName, lockedAt: new Date() },
    });

  return NextResponse.json({ acquired: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: auditId } = await params;
  const { sectionKey, userId } = await req.json();

  if (!sectionKey || !userId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Only release if this user holds the lock
  await db
    .delete(sectionLocks)
    .where(
      and(
        eq(sectionLocks.auditId, auditId),
        eq(sectionLocks.sectionKey, sectionKey),
        eq(sectionLocks.userId, userId)
      )
    );

  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: auditId } = await params;
  const freshThreshold = new Date(Date.now() - LOCK_TTL_MS);

  const locks = await db
    .select()
    .from(sectionLocks)
    .where(and(eq(sectionLocks.auditId, auditId), gt(sectionLocks.lockedAt, freshThreshold)));

  return NextResponse.json(locks);
}
