import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "90";

  // Build a concrete ISO cutoff date so Neon gets a plain string parameter (no INTERVAL needed)
  let cutoff: string | null = null;
  if (range !== "all") {
    const days = Math.max(1, parseInt(range, 10));
    const d = new Date();
    d.setDate(d.getDate() - days);
    cutoff = d.toISOString();
  }

  // Reusable where-clause fragment for each query
  const W = (alias = "a") => cutoff
    ? sql.raw(`${alias}.created_at >= '${cutoff}'`)
    : sql.raw("TRUE");

  // ── Batch 1: summary + property health + trend (lightweight) ──────────────
  const [summaryRows, propertyHealthRows, trendRows] = await Promise.all([

    db.execute(sql`
      SELECT
        COUNT(*)::int                                                             AS total_audits,
        COUNT(*) FILTER (WHERE status = 'submitted')::int                        AS submitted,
        COUNT(*) FILTER (WHERE status = 'draft')::int                            AS in_progress,
        ROUND(AVG(completion_pct))::int                                          AS avg_completion,
        COUNT(*) FILTER (
          WHERE status = 'draft' AND updated_at < NOW() - INTERVAL '24 hours'
        )::int                                                                    AS overdue
      FROM audits a
      WHERE ${W()}
    `),

    db.execute(sql`
      SELECT DISTINCT ON (a.property_id)
        a.property_id,
        p.name        AS property_name,
        p.type        AS property_type,
        a.id          AS audit_id,
        a.audit_date,
        a.status,
        a.completion_pct,
        a.auditor_name,
        a.updated_at
      FROM audits a
      JOIN properties p ON a.property_id = p.id
      WHERE ${W()}
      ORDER BY a.property_id, a.updated_at DESC
    `),

    db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
        DATE_TRUNC('month', created_at)                    AS month_date,
        COUNT(*)::int                                       AS total,
        COUNT(*) FILTER (WHERE status = 'submitted')::int  AS submitted,
        ROUND(AVG(completion_pct))::int                    AS avg_completion
      FROM audits
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month_date ASC
    `),
  ]);

  // ── Batch 2: checklist issues (heavier joins) ──────────────────────────────
  const [roomIssuesRows, kitchenIssuesRows, hotelIssuesRows] = await Promise.all([

    db.execute(sql`
      SELECT
        rci.item_label,
        COUNT(*)::int                                                     AS total_checked,
        COUNT(*) FILTER (WHERE rci.condition = 'not_ok')::int            AS not_ok_count,
        ROUND(
          COUNT(*) FILTER (WHERE rci.condition = 'not_ok') * 100.0
          / NULLIF(COUNT(*), 0)
        )::int                                                            AS fail_pct
      FROM room_checklist_items rci
      JOIN audit_rooms ar ON rci.room_id  = ar.id
      JOIN audits a       ON ar.audit_id  = a.id
      WHERE ${W()} AND a.status = 'submitted' AND rci.condition IS NOT NULL
      GROUP BY rci.item_label
      HAVING COUNT(*) FILTER (WHERE rci.condition = 'not_ok') > 0
      ORDER BY not_ok_count DESC
      LIMIT 15
    `),

    db.execute(sql`
      SELECT
        ca.area_label,
        ci.item_label,
        COUNT(*)::int                                                     AS total_checked,
        COUNT(*) FILTER (WHERE ci.condition = 'not_ok')::int             AS not_ok_count,
        ROUND(
          COUNT(*) FILTER (WHERE ci.condition = 'not_ok') * 100.0
          / NULLIF(COUNT(*), 0)
        )::int                                                            AS fail_pct
      FROM common_area_checklist_items ci
      JOIN audit_common_areas ca ON ci.common_area_id = ca.id
      JOIN audits a              ON ca.audit_id       = a.id
      WHERE ${W()} AND a.status = 'submitted' AND ci.condition IS NOT NULL
      GROUP BY ca.area_label, ci.item_label
      HAVING COUNT(*) FILTER (WHERE ci.condition = 'not_ok') > 0
      ORDER BY not_ok_count DESC
      LIMIT 15
    `),

    db.execute(sql`
      SELECT
        hs.section_label,
        hs.sub_area_label,
        ci.item_label,
        COUNT(*)::int                                                     AS total_checked,
        COUNT(*) FILTER (WHERE ci.condition = 'not_ok')::int             AS not_ok_count,
        ROUND(
          COUNT(*) FILTER (WHERE ci.condition = 'not_ok') * 100.0
          / NULLIF(COUNT(*), 0)
        )::int                                                            AS fail_pct
      FROM hotel_section_checklist_items ci
      JOIN audit_hotel_sections hs ON ci.section_id = hs.id
      JOIN audits a                ON hs.audit_id   = a.id
      WHERE ${W()} AND a.status = 'submitted' AND ci.condition IS NOT NULL
      GROUP BY hs.section_label, hs.sub_area_label, ci.item_label
      HAVING COUNT(*) FILTER (WHERE ci.condition = 'not_ok') > 0
      ORDER BY not_ok_count DESC
      LIMIT 15
    `),
  ]);

  // ── Batch 3: operational data + issues-per-property ───────────────────────
  const [manpowerRows, equipmentRows, issuesByPropertyRows] = await Promise.all([

    db.execute(sql`
      SELECT
        am.section,
        ROUND(AVG(am.count))::int  AS avg_count,
        MIN(am.count)::int         AS min_count,
        MAX(am.count)::int         AS max_count,
        COUNT(DISTINCT a.id)::int  AS audit_count
      FROM audit_manpower am
      JOIN audits a ON am.audit_id = a.id
      WHERE ${W()} AND a.status = 'submitted' AND am.count IS NOT NULL
      GROUP BY am.section
      ORDER BY am.section
    `),

    db.execute(sql`
      SELECT
        ae.item,
        COUNT(*) FILTER (WHERE ae.condition = 'ok')::int            AS ok_count,
        COUNT(*) FILTER (WHERE ae.condition = 'not_ok')::int        AS not_ok_count,
        COUNT(*) FILTER (WHERE ae.condition = 'not_available')::int AS na_count,
        ROUND(AVG(ae.count))::int                                   AS avg_count,
        COUNT(DISTINCT a.id)::int                                   AS audit_count
      FROM audit_equipment ae
      JOIN audits a ON ae.audit_id = a.id
      WHERE ${W()} AND a.status = 'submitted'
      GROUP BY ae.item
      ORDER BY ae.item
    `),

    db.execute(sql`
      SELECT
        a.property_id,
        COUNT(*) FILTER (WHERE rci.condition = 'not_ok')::int AS room_issues
      FROM audits a
      JOIN audit_rooms ar           ON ar.audit_id  = a.id
      JOIN room_checklist_items rci ON rci.room_id  = ar.id
      WHERE ${W()} AND a.status = 'submitted'
      GROUP BY a.property_id
    `),
  ]);

  // Build issue map for property health
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issueMap: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of issuesByPropertyRows.rows as any[]) {
    issueMap[r.property_id] = (r.room_issues ?? 0);
  }

  return NextResponse.json({
    summary: summaryRows.rows[0] ?? {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    propertyHealth: (propertyHealthRows.rows as any[]).map((r) => ({
      ...r,
      issueCount: issueMap[r.property_id] ?? 0,
    })),
    roomIssues: roomIssuesRows.rows,
    kitchenIssues: kitchenIssuesRows.rows,
    hotelIssues: hotelIssuesRows.rows,
    manpower: manpowerRows.rows,
    equipment: equipmentRows.rows,
    trend: trendRows.rows,
  });
}
