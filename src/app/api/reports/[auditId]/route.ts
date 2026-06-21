import { NextRequest, NextResponse } from "next/server";
import { db, audits, properties, auditProcess, auditManpower, auditEquipment, auditRooms, roomChecklistItems, auditCommonAreas, commonAreaChecklistItems, auditHotelSections, hotelSectionChecklistItems } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await params;

  // Fetch all data
  const [audit] = await db.select().from(audits).where(eq(audits.id, auditId));
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [property] = await db.select().from(properties).where(eq(properties.id, audit.propertyId));
  const [process] = await db.select().from(auditProcess).where(eq(auditProcess.auditId, auditId));
  const manpower = await db.select().from(auditManpower).where(eq(auditManpower.auditId, auditId));
  const equipment = await db.select().from(auditEquipment).where(eq(auditEquipment.auditId, auditId));
  const rooms = await db.select().from(auditRooms).where(eq(auditRooms.auditId, auditId));
  const roomsWithItems = await Promise.all(
    rooms.map(async (room) => {
      const items = await db.select().from(roomChecklistItems).where(eq(roomChecklistItems.roomId, room.id));
      return { ...room, checklist: items };
    })
  );
  const commonAreas = await db.select().from(auditCommonAreas).where(eq(auditCommonAreas.auditId, auditId));
  const commonAreasWithItems = await Promise.all(
    commonAreas.map(async (area) => {
      const items = await db.select().from(commonAreaChecklistItems).where(eq(commonAreaChecklistItems.commonAreaId, area.id));
      return { ...area, checklist: items };
    })
  );
  const hotelSections = await db.select().from(auditHotelSections).where(eq(auditHotelSections.auditId, auditId));
  const hotelSectionsWithItems = await Promise.all(
    hotelSections.map(async (section) => {
      const items = await db.select().from(hotelSectionChecklistItems).where(eq(hotelSectionChecklistItems.sectionId, section.id));
      return { ...section, checklist: items };
    })
  );

  // Build HTML report for PDF
  const reportData = {
    audit, property, process: process || null,
    manpower, equipment,
    rooms: roomsWithItems,
    commonAreas: commonAreasWithItems,
    hotelSections: hotelSectionsWithItems,
  };

  // Generate HTML that the browser can print as PDF
  const html = generateReportHtml(reportData);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

function generateReportHtml(data: {
  audit: { auditorName: string; auditDate: string; status: string };
  property: { name: string; type: string; location: string } | undefined;
  process: { admissionsRemarks: string | null; paymentsRemarks: string | null } | null;
  manpower: { section: string; count: number | null; remarks: string | null }[];
  equipment: { item: string; condition: string | null; count: number | null; remarks: string | null }[];
  rooms: { roomNumber: string; checklist: { itemLabel: string; condition: string | null; remarks: string | null }[] }[];
  commonAreas: { areaLabel: string; moduleType: string; remarks: string | null; checklist: { itemLabel: string; condition: string | null; remarks: string | null }[] }[];
  hotelSections: { sectionLabel: string; subAreaLabel: string; moduleType: string; remarks: string | null; checklist: { itemLabel: string; condition: string | null; remarks: string | null }[] }[];
}) {
  const { audit, property, process, manpower, equipment, rooms, commonAreas, hotelSections } = data;
  const condIcon = (c: string | null) => c === "ok" ? "✓" : c === "not_ok" ? "✗" : "—";
  const condColor = (c: string | null) => c === "ok" ? "#16a34a" : c === "not_ok" ? "#dc2626" : "#9ca3af";

  const roomsHtml = rooms.map((room) => {
    const issues = room.checklist.filter((c) => c.condition === "not_ok");
    const ok = room.checklist.filter((c) => c.condition === "ok").length;
    return `
      <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f3f4f6">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <strong>Room ${room.roomNumber}</strong>
          <span style="color:#6b7280;font-size:12px">${ok}/${room.checklist.length} ok</span>
          ${issues.length > 0 ? `<span style="color:#dc2626;font-size:12px">${issues.length} issue(s)</span>` : ""}
        </div>
        ${room.checklist.map((item) => `
          <div style="display:flex;gap:8px;padding:2px 0;font-size:13px">
            <span style="color:${condColor(item.condition)};font-weight:bold;width:16px">${condIcon(item.condition)}</span>
            <span style="${item.condition === "not_ok" ? "color:#dc2626" : "color:#374151"}">${item.itemLabel}</span>
            ${item.remarks ? `<span style="color:#9ca3af;margin-left:auto">— ${item.remarks}</span>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  }).join("");

  const commonAreasHtml = commonAreas.map((area) => `
    <div style="margin-bottom:12px">
      <strong style="font-size:13px">${area.areaLabel}</strong>
      ${area.moduleType === "remarks"
        ? `<p style="color:#374151;font-size:13px;margin:4px 0 0 8px">${area.remarks || "—"}</p>`
        : area.checklist.map((item) => `
          <div style="display:flex;gap:8px;padding:2px 8px;font-size:13px">
            <span style="color:${condColor(item.condition)};font-weight:bold">${condIcon(item.condition)}</span>
            <span>${item.itemLabel}</span>
            ${item.remarks ? `<span style="color:#9ca3af">— ${item.remarks}</span>` : ""}
          </div>
        `).join("")
      }
    </div>
  `).join("");

  const hotelBySection = hotelSections.reduce<Record<string, typeof hotelSections>>((acc, s) => {
    if (!acc[s.sectionLabel]) acc[s.sectionLabel] = [];
    acc[s.sectionLabel].push(s);
    return acc;
  }, {});

  const hotelHtml = Object.entries(hotelBySection).map(([sectionLabel, subAreas]) => `
    <div style="margin-bottom:20px">
      <h3 style="font-size:14px;color:#1f2937;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb">${sectionLabel}</h3>
      ${subAreas.map((sub) => `
        <div style="margin-bottom:10px">
          <strong style="font-size:12px;color:#4b5563">${sub.subAreaLabel}</strong>
          ${sub.moduleType === "remarks"
            ? `<p style="color:#374151;font-size:13px;margin:4px 0 0 8px">${sub.remarks || "—"}</p>`
            : sub.checklist.map((item) => `
              <div style="display:flex;gap:8px;padding:2px 8px;font-size:13px">
                <span style="color:${condColor(item.condition)};font-weight:bold">${condIcon(item.condition)}</span>
                <span>${item.itemLabel}</span>
                ${item.remarks ? `<span style="color:#9ca3af">— ${item.remarks}</span>` : ""}
              </div>
            `).join("")
          }
        </div>
      `).join("")}
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Audit Report — ${property?.name}</title>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 32px; color: #111827; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; color: #1f2937; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${property?.name || "Property"} — Audit Report</h1>
  <div class="meta">
    ${property?.location} · ${property?.type} ·
    Auditor: ${audit.auditorName} ·
    Date: ${new Date(audit.auditDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ·
    Status: ${audit.status}
  </div>

  ${rooms.length > 0 ? `<h2>Rooms (${rooms.length})</h2>${roomsHtml}` : ""}

  ${process ? `
    <h2>Process</h2>
    <p><strong>Admissions:</strong> ${process.admissionsRemarks || "—"}</p>
    <p><strong>Payments:</strong> ${process.paymentsRemarks || "—"}</p>
  ` : ""}

  ${commonAreas.length > 0 ? `<h2>Property Management</h2>${commonAreasHtml}` : ""}

  ${manpower.length > 0 ? `
    <h2>Manpower</h2>
    ${manpower.map((m) => `
      <div style="display:flex;gap:8px;padding:4px 0;font-size:13px;border-bottom:1px solid #f9fafb">
        <span style="flex:1;text-transform:capitalize">${m.section.replace(/_/g, " ")}</span>
        <span><strong>${m.count !== null ? m.count + " staff" : "—"}</strong></span>
        ${m.remarks ? `<span style="color:#9ca3af">${m.remarks}</span>` : ""}
      </div>
    `).join("")}
  ` : ""}

  ${equipment.length > 0 ? `
    <h2>Equipment</h2>
    ${equipment.map((e) => `
      <div style="display:flex;gap:8px;padding:4px 0;font-size:13px;border-bottom:1px solid #f9fafb">
        <span style="flex:1;text-transform:capitalize">${e.item.replace(/_/g, " ")}</span>
        <span style="color:${condColor(e.condition)};font-weight:bold">${e.count !== null ? e.count : condIcon(e.condition)}</span>
        ${e.remarks ? `<span style="color:#9ca3af">${e.remarks}</span>` : ""}
      </div>
    `).join("")}
  ` : ""}

  ${hotelSections.length > 0 ? hotelHtml : ""}

  <p style="margin-top:48px;color:#9ca3af;font-size:11px">Generated on ${new Date().toLocaleString("en-IN")} · Property Audit System</p>
</body>
</html>`;
}
