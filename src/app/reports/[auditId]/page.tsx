"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type Condition = "ok" | "not_ok" | "not_available" | null;

interface ChecklistItemDB { itemLabel: string; condition: Condition; remarks: string; }
interface RoomDB { id: string; roomNumber: string; checklist: ChecklistItemDB[]; }
interface CommonAreaDB { areaKey: string; areaLabel: string; moduleType: string; remarks: string; checklist: ChecklistItemDB[]; }
interface HotelSectionDB { sectionKey: string; sectionLabel: string; subAreaKey: string; subAreaLabel: string; moduleType: string; remarks: string; checklist: ChecklistItemDB[]; }
interface ManpowerDB { section: string; count: number | null; remarks: string; }
interface EquipmentDB { item: string; condition: Condition; count: number | null; remarks: string; }
interface AuditDB {
  audit: { id: string; auditorName: string; auditDate: string; status: string; };
  process: { admissionsRemarks: string; paymentsRemarks: string; } | null;
  manpower: ManpowerDB[];
  equipment: EquipmentDB[];
  rooms: RoomDB[];
  commonAreas: CommonAreaDB[];
  hotelSections: HotelSectionDB[];
}

export default function ReportPage({ params }: { params: Promise<{ auditId: string }> }) {
  return (
    <AuthGuard>
      <Report params={params} />
    </AuthGuard>
  );
}

function Report({ params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<AuditDB | null>(null);
  const [property, setProperty] = useState<{ name: string; type: string; location: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/audits/${auditId}`)
      .then((r) => r.json())
      .then(async (audit) => {
        setData(audit);
        const propRes = await fetch(`/api/properties/${audit.audit.propertyId ?? ""}`);
        if (propRes.ok) setProperty(await propRes.json());
        setLoading(false);
      });
  }, [auditId]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/${auditId}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${property?.name?.replace(/\s+/g, "-") ?? auditId}-${data?.audit.auditDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Report downloaded", variant: "success" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) return null;
  const isHostel = property?.type === "hostel";

  const allRoomItems = data.rooms.flatMap((r) => r.checklist);
  const roomNotOk = allRoomItems.filter((c) => c.condition === "not_ok");

  // Group hotel sections
  const hotelBySection = data.hotelSections.reduce<Record<string, HotelSectionDB[]>>((acc, s) => {
    if (!acc[s.sectionKey]) acc[s.sectionKey] = [];
    acc[s.sectionKey].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{property?.name}</h1>
              <p className="text-sm text-gray-500">
                {formatDate(data.audit.auditDate)} · {data.audit.auditorName} ·{" "}
                <Badge variant={data.audit.status === "submitted" ? "success" : "warning"}>
                  {data.audit.status}
                </Badge>
              </p>
            </div>
          </div>
          <Button onClick={downloadPdf} disabled={downloading} variant="outline">
            <Download className="h-4 w-4" />
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>

        {/* Critical issues banner */}
        {roomNotOk.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800 mb-2">{roomNotOk.length} Critical Issues Found</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {roomNotOk.map((item, i) => (
                <div key={i} className="text-sm text-red-700">
                  • {item.itemLabel}{item.remarks ? `: ${item.remarks}` : ""}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rooms */}
        {data.rooms.length > 0 && (
          <ReportSection title={`Rooms (${data.rooms.length})`}>
            {data.rooms.map((room) => {
              const issues = room.checklist.filter((c) => c.condition === "not_ok");
              const ok = room.checklist.filter((c) => c.condition === "ok").length;
              return (
                <div key={room.id} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-800">Room {room.roomNumber}</h4>
                    <span className="text-xs text-gray-400">{ok}/{room.checklist.length} ok</span>
                    {issues.length > 0 && <Badge variant="destructive">{issues.length} issue{issues.length > 1 ? "s" : ""}</Badge>}
                  </div>
                  {issues.length > 0 && (
                    <div className="space-y-1 ml-2">
                      {issues.map((item, i) => (
                        <div key={i} className="text-sm text-red-700 flex items-start gap-1.5">
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{item.itemLabel}{item.remarks ? ` — ${item.remarks}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {issues.length === 0 && (
                    <p className="text-sm text-green-600 flex items-center gap-1 ml-2">
                      <CheckCircle className="h-3.5 w-3.5" /> All items ok
                    </p>
                  )}
                </div>
              );
            })}
          </ReportSection>
        )}

        {/* Hostel-specific sections */}
        {isHostel && (
          <>
            {data.process && (
              <ReportSection title="Process">
                <RemarksRow label="Admissions" value={data.process.admissionsRemarks} />
                <RemarksRow label="Payments" value={data.process.paymentsRemarks} />
              </ReportSection>
            )}

            {data.commonAreas.length > 0 && (
              <ReportSection title="Property Management">
                {data.commonAreas.map((area) => (
                  <div key={area.areaKey} className="mb-3 last:mb-0">
                    <p className="font-medium text-gray-700 text-sm mb-1">{area.areaLabel}</p>
                    {area.moduleType === "remarks" ? (
                      <p className="text-sm text-gray-600 ml-2">{area.remarks || <span className="text-gray-300">—</span>}</p>
                    ) : (
                      <ChecklistTable items={area.checklist} />
                    )}
                  </div>
                ))}
              </ReportSection>
            )}

            {data.manpower.length > 0 && (
              <ReportSection title="Manpower">
                {data.manpower.map((m) => (
                  <div key={m.section} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0 text-sm">
                    <span className="flex-1 text-gray-600 capitalize">{m.section.replace(/_/g, " ")}</span>
                    <span className="font-medium">{m.count !== null ? `${m.count} staff` : "—"}</span>
                    {m.remarks && <span className="text-gray-400 text-xs">{m.remarks}</span>}
                  </div>
                ))}
              </ReportSection>
            )}

            {data.equipment.length > 0 && (
              <ReportSection title="Equipment">
                {data.equipment.map((e) => (
                  <div key={e.item} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0 text-sm">
                    <span className="flex-1 text-gray-600 capitalize">{e.item.replace(/_/g, " ")}</span>
                    <ConditionBadge condition={e.condition} count={e.count} />
                    {e.remarks && <span className="text-gray-400 text-xs">{e.remarks}</span>}
                  </div>
                ))}
              </ReportSection>
            )}
          </>
        )}

        {/* Hotel sections */}
        {!isHostel && Object.entries(hotelBySection).map(([sectionKey, subAreas]) => (
          <ReportSection key={sectionKey} title={subAreas[0]?.sectionLabel || sectionKey}>
            {subAreas.map((sub) => (
              <div key={sub.subAreaKey} className="mb-3 last:mb-0">
                <p className="font-medium text-gray-700 text-sm mb-1">{sub.subAreaLabel}</p>
                {sub.moduleType === "remarks" ? (
                  <p className="text-sm text-gray-600 ml-2">{sub.remarks || <span className="text-gray-300">—</span>}</p>
                ) : (
                  <ChecklistTable items={sub.checklist} />
                )}
              </div>
            ))}
          </ReportSection>
        ))}
      </main>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RemarksRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-sm text-gray-800 ml-2 mt-0.5">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

function ChecklistTable({ items }: { items: ChecklistItemDB[] }) {
  if (!items.length) return <p className="text-xs text-gray-300 ml-2">No checklist items.</p>;
  return (
    <div className="space-y-1 ml-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm py-0.5">
          <ConditionIcon condition={item.condition} />
          <span className={item.condition === "not_ok" ? "text-red-700" : "text-gray-700"}>{item.itemLabel}</span>
          {item.remarks && <span className="text-gray-400 text-xs ml-auto">— {item.remarks}</span>}
        </div>
      ))}
    </div>
  );
}

function ConditionIcon({ condition }: { condition: Condition }) {
  if (condition === "ok") return <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />;
  if (condition === "not_ok") return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />;
  if (condition === "not_available") return <MinusCircle className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-0.5" />;
  return <MinusCircle className="h-3.5 w-3.5 text-gray-200 shrink-0 mt-0.5" />;
}

function ConditionBadge({ condition, count }: { condition: Condition; count: number | null }) {
  if (count !== null) return <span className="font-medium">{count}</span>;
  if (condition === "ok") return <Badge variant="success">Ok</Badge>;
  if (condition === "not_ok") return <Badge variant="destructive">Not Ok</Badge>;
  if (condition === "not_available") return <Badge variant="secondary">N/A</Badge>;
  return <span className="text-gray-300">—</span>;
}
