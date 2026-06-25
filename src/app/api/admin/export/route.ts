import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  db, audits, properties, auditProcess, auditManpower, auditEquipment,
  auditRooms, roomChecklistItems, auditCommonAreas, commonAreaChecklistItems,
  auditAssetInventory, auditHotelSections, hotelSectionChecklistItems,
} from "@/lib/db";

function cond(v: string | null | undefined) {
  if (!v) return "";
  return v === "ok" ? "Ok" : v === "not_ok" ? "Not Ok" : "N/A";
}

export async function GET() {
  // ── Fetch everything in parallel ──────────────────────────────────────────
  const [
    allAudits, allProperties, allProcess, allManpower, allEquipment,
    allRooms, allRoomItems, allAreas, allAreaItems,
    allAssets, allHotelSections, allHotelItems,
  ] = await Promise.all([
    db.select().from(audits),
    db.select().from(properties),
    db.select().from(auditProcess),
    db.select().from(auditManpower),
    db.select().from(auditEquipment),
    db.select().from(auditRooms),
    db.select().from(roomChecklistItems),
    db.select().from(auditCommonAreas),
    db.select().from(commonAreaChecklistItems),
    db.select().from(auditAssetInventory),
    db.select().from(auditHotelSections),
    db.select().from(hotelSectionChecklistItems),
  ]);

  // ── Index maps ─────────────────────────────────────────────────────────────
  const propById = Object.fromEntries(allProperties.map((p) => [p.id, p]));
  const processByAudit = Object.fromEntries(allProcess.map((p) => [p.auditId, p]));

  const manpowerByAudit: Record<string, typeof allManpower> = {};
  for (const m of allManpower) {
    (manpowerByAudit[m.auditId] ??= []).push(m);
  }

  const equipByAudit: Record<string, typeof allEquipment> = {};
  for (const e of allEquipment) {
    (equipByAudit[e.auditId] ??= []).push(e);
  }

  const roomsByAudit: Record<string, typeof allRooms> = {};
  for (const r of allRooms) {
    (roomsByAudit[r.auditId] ??= []).push(r);
  }

  const roomItemsByRoom: Record<string, typeof allRoomItems> = {};
  for (const i of allRoomItems) {
    (roomItemsByRoom[i.roomId] ??= []).push(i);
  }

  const areasByAudit: Record<string, typeof allAreas> = {};
  for (const a of allAreas) {
    (areasByAudit[a.auditId] ??= []).push(a);
  }

  const areaItemsByArea: Record<string, typeof allAreaItems> = {};
  for (const i of allAreaItems) {
    (areaItemsByArea[i.commonAreaId] ??= []).push(i);
  }

  const assetsByAudit: Record<string, typeof allAssets> = {};
  for (const a of allAssets) {
    (assetsByAudit[a.auditId] ??= []).push(a);
  }

  const hotelSectionsByAudit: Record<string, typeof allHotelSections> = {};
  for (const s of allHotelSections) {
    (hotelSectionsByAudit[s.auditId] ??= []).push(s);
  }

  const hotelItemsBySection: Record<string, typeof allHotelItems> = {};
  for (const i of allHotelItems) {
    (hotelItemsBySection[i.sectionId] ??= []).push(i);
  }

  // ── Sort audits: newest first ──────────────────────────────────────────────
  const sorted = [...allAudits].sort(
    (a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime()
  );

  // ── Sheet 1: Summary ───────────────────────────────────────────────────────
  const summaryRows = sorted.map((a) => {
    const p = propById[a.propertyId];
    return {
      "Property": p?.name ?? "",
      "Type": p?.type ?? "",
      "Location": p?.location ?? "",
      "Auditor": a.auditorName,
      "Date": a.auditDate,
      "Status": a.status === "submitted" ? "Submitted" : "Draft",
      "Completion %": a.completionPct,
    };
  });

  // ── Sheet 2: Process (hostel) ──────────────────────────────────────────────
  const processRows: object[] = [];
  for (const a of sorted) {
    const p = propById[a.propertyId];
    const proc = processByAudit[a.id];
    if (!proc) continue;
    processRows.push({
      "Property": p?.name ?? "",
      "Type": p?.type ?? "",
      "Auditor": a.auditorName,
      "Date": a.auditDate,
      "Admissions Remarks": proc.admissionsRemarks ?? "",
      "Payments Remarks": proc.paymentsRemarks ?? "",
    });
  }

  // ── Sheet 3: Rooms ─────────────────────────────────────────────────────────
  const roomRows: object[] = [];
  for (const a of sorted) {
    const p = propById[a.propertyId];
    const rooms = (roomsByAudit[a.id] ?? []).sort((x, y) =>
      x.roomNumber.localeCompare(y.roomNumber, undefined, { numeric: true, sensitivity: "base" })
    );
    for (const room of rooms) {
      const items = (roomItemsByRoom[room.id] ?? []);
      if (items.length === 0) {
        roomRows.push({
          "Property": p?.name ?? "",
          "Auditor": a.auditorName,
          "Date": a.auditDate,
          "Room": room.roomNumber,
          "Item": "",
          "Condition": "",
          "Remarks": "",
        });
      } else {
        for (const item of items) {
          roomRows.push({
            "Property": p?.name ?? "",
            "Auditor": a.auditorName,
            "Date": a.auditDate,
            "Room": room.roomNumber,
            "Item": item.itemLabel,
            "Condition": cond(item.condition),
            "Remarks": item.remarks ?? "",
          });
        }
      }
    }
  }

  // ── Sheet 4: Common Areas ──────────────────────────────────────────────────
  const areaRows: object[] = [];
  for (const a of sorted) {
    const p = propById[a.propertyId];
    const areas = areasByAudit[a.id] ?? [];
    for (const area of areas) {
      const items = areaItemsByArea[area.id] ?? [];
      if (items.length === 0) {
        areaRows.push({
          "Property": p?.name ?? "",
          "Auditor": a.auditorName,
          "Date": a.auditDate,
          "Area": area.areaLabel,
          "Module Type": area.moduleType,
          "Item": "",
          "Condition": "",
          "Remarks": area.remarks ?? "",
        });
      } else {
        for (const item of items) {
          areaRows.push({
            "Property": p?.name ?? "",
            "Auditor": a.auditorName,
            "Date": a.auditDate,
            "Area": area.areaLabel,
            "Module Type": area.moduleType,
            "Item": item.itemLabel,
            "Condition": cond(item.condition),
            "Remarks": item.remarks ?? "",
          });
        }
      }
    }
  }

  // ── Sheet 5: Manpower ──────────────────────────────────────────────────────
  const manpowerRows: object[] = [];
  for (const a of sorted) {
    const p = propById[a.propertyId];
    for (const m of manpowerByAudit[a.id] ?? []) {
      manpowerRows.push({
        "Property": p?.name ?? "",
        "Auditor": a.auditorName,
        "Date": a.auditDate,
        "Section": m.section,
        "Count": m.count ?? "",
        "Remarks": m.remarks ?? "",
      });
    }
  }

  // ── Sheet 6: Equipment ─────────────────────────────────────────────────────
  const equipRows: object[] = [];
  for (const a of sorted) {
    const p = propById[a.propertyId];
    for (const e of equipByAudit[a.id] ?? []) {
      equipRows.push({
        "Property": p?.name ?? "",
        "Auditor": a.auditorName,
        "Date": a.auditDate,
        "Item": e.item,
        "Condition": cond(e.condition),
        "Count": e.count ?? "",
        "Remarks": e.remarks ?? "",
      });
    }
  }

  // ── Sheet 7: Asset Inventory ───────────────────────────────────────────────
  const assetRows: object[] = [];
  for (const a of sorted) {
    const p = propById[a.propertyId];
    for (const asset of (assetsByAudit[a.id] ?? []).sort((x, y) => x.orderIndex - y.orderIndex)) {
      assetRows.push({
        "Property": p?.name ?? "",
        "Auditor": a.auditorName,
        "Date": a.auditDate,
        "Item": asset.itemLabel,
        "Condition": cond(asset.condition),
        "Remarks": asset.remarks ?? "",
      });
    }
  }

  // ── Sheet 8: Hotel Sections ────────────────────────────────────────────────
  const hotelRows: object[] = [];
  for (const a of sorted) {
    const p = propById[a.propertyId];
    const sections = hotelSectionsByAudit[a.id] ?? [];
    for (const section of sections) {
      const items = hotelItemsBySection[section.id] ?? [];
      if (items.length === 0) {
        hotelRows.push({
          "Property": p?.name ?? "",
          "Auditor": a.auditorName,
          "Date": a.auditDate,
          "Section": section.sectionLabel,
          "Sub-Area": section.subAreaLabel,
          "Module Type": section.moduleType,
          "Item": "",
          "Condition": "",
          "Remarks": section.remarks ?? "",
        });
      } else {
        for (const item of items) {
          hotelRows.push({
            "Property": p?.name ?? "",
            "Auditor": a.auditorName,
            "Date": a.auditDate,
            "Section": section.sectionLabel,
            "Sub-Area": section.subAreaLabel,
            "Module Type": section.moduleType,
            "Item": item.itemLabel,
            "Condition": cond(item.condition),
            "Remarks": item.remarks ?? "",
          });
        }
      }
    }
  }

  // ── Build workbook ─────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  function addSheet(name: string, rows: object[]) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  addSheet("Summary", summaryRows);
  addSheet("Process", processRows);
  addSheet("Rooms", roomRows);
  addSheet("Common Areas", areaRows);
  addSheet("Manpower", manpowerRows);
  addSheet("Equipment", equipRows);
  addSheet("Asset Inventory", assetRows);
  addSheet("Hotel Sections", hotelRows);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="audit-export-${date}.xlsx"`,
    },
  });
}
