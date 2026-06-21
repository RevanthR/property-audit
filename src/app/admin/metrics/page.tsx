"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart2, Building2, TrendingUp, AlertTriangle, Users,
  CheckCircle2, Clock, ChevronRight, Wrench, Zap, ArrowLeft,
  ThumbsDown, Info,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Summary {
  total_audits: number;
  submitted: number;
  in_progress: number;
  avg_completion: number;
  overdue: number;
}

interface PropertyHealth {
  property_id: string;
  property_name: string;
  property_type: "hostel" | "hotel";
  audit_id: string;
  audit_date: string;
  status: "draft" | "submitted";
  completion_pct: number;
  auditor_name: string;
  issueCount: number;
}

interface IssueRow {
  item_label: string;
  area_label?: string;
  section_label?: string;
  sub_area_label?: string;
  total_checked: number;
  not_ok_count: number;
  fail_pct: number;
}

interface ManpowerRow {
  section: string;
  avg_count: number;
  min_count: number;
  max_count: number;
  audit_count: number;
}

interface EquipmentRow {
  item: string;
  ok_count: number;
  not_ok_count: number;
  na_count: number;
  avg_count: number;
  audit_count: number;
}

interface TrendRow {
  month: string;
  total: number;
  submitted: number;
  avg_completion: number;
}

interface MetricsData {
  summary: Summary;
  propertyHealth: PropertyHealth[];
  roomIssues: IssueRow[];
  kitchenIssues: IssueRow[];
  hotelIssues: IssueRow[];
  manpower: ManpowerRow[];
  equipment: EquipmentRow[];
  trend: TrendRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MANPOWER_LABELS: Record<string, string> = {
  housekeeping: "Housekeeping",
  security: "Security",
  maintenance: "Maintenance",
  front_office: "Front Office",
  laundry: "Laundry",
  kitchen: "Kitchen",
  management: "Management",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  motors: "Motors (Tank)",
  vehicles: "Vehicles",
  washing_machines: "Washing Machines",
};

function BarRow({ label, value, max, color = "bg-blue-500", suffix = "" }: {
  label: string; value: number; max: number; color?: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-gray-700 w-40 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-0">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-900 w-14 text-right shrink-0">
        {value}{suffix}
      </span>
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, sub, color,
}: { icon: React.ElementType; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? "—"}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  return (
    <AuthGuard requireAdmin>
      <MetricsDashboard />
    </AuthGuard>
  );
}

function MetricsDashboard() {
  const [range, setRange] = useState<"30" | "90" | "all">("90");
  const [tab, setTab] = useState<"overview" | "issues" | "manpower">("overview");
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/metrics?range=${range}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [range]);

  const s = data?.summary;
  const totalIssues = (data?.roomIssues ?? []).reduce((a, r) => a + r.not_ok_count, 0)
    + (data?.kitchenIssues ?? []).reduce((a, r) => a + r.not_ok_count, 0)
    + (data?.hotelIssues ?? []).reduce((a, r) => a + r.not_ok_count, 0);

  // Combine all issues into one sorted list
  const allIssues: (IssueRow & { source: string })[] = [
    ...(data?.roomIssues ?? []).map((r) => ({ ...r, source: "Rooms" })),
    ...(data?.kitchenIssues ?? []).map((r) => ({ ...r, source: r.area_label ?? "Common Area" })),
    ...(data?.hotelIssues ?? []).map((r) => ({ ...r, source: `${r.section_label} › ${r.sub_area_label}` })),
  ].sort((a, b) => b.not_ok_count - a.not_ok_count).slice(0, 15);

  const maxIssues = allIssues[0]?.not_ok_count ?? 1;
  const maxTrend = Math.max(...(data?.trend ?? []).map((t) => t.total), 1);

  // Property health sorted worst completion first
  const sortedProperties = [...(data?.propertyHealth ?? [])].sort(
    (a, b) => a.completion_pct - b.completion_pct
  );

  // Top 3 actionable insights
  const insights: string[] = [];
  if (allIssues.length > 0) {
    insights.push(`"${allIssues[0].item_label}" is the most common issue (${allIssues[0].not_ok_count} failures across all audits)`);
  }
  const worstProperty = sortedProperties.find((p) => p.status === "submitted");
  if (worstProperty) {
    insights.push(`${worstProperty.property_name} has the lowest completion at ${worstProperty.completion_pct}% — consider a follow-up`);
  }
  const worstEquipment = [...(data?.equipment ?? [])].sort((a, b) => b.not_ok_count - a.not_ok_count)[0];
  if (worstEquipment?.not_ok_count > 0) {
    insights.push(`${EQUIPMENT_LABELS[worstEquipment.item] ?? worstEquipment.item} reported as "Not OK" in ${worstEquipment.not_ok_count} audits — maintenance needed`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-blue-600" /> Audit Analytics
              </h1>
              <p className="text-sm text-gray-500">Decision metrics from all submitted audits</p>
            </div>
          </div>
          {/* Range selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["30", "90", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r === "all" ? "All time" : `${r}d`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <SummaryCard icon={BarChart2} label="Total Audits" value={s?.total_audits ?? 0} color="bg-blue-100 text-blue-600" />
              <SummaryCard icon={CheckCircle2} label="Submitted" value={s?.submitted ?? 0} color="bg-green-100 text-green-600" />
              <SummaryCard icon={Clock} label="In Progress" value={s?.in_progress ?? 0} color="bg-amber-100 text-amber-600" />
              <SummaryCard
                icon={TrendingUp}
                label="Avg Completion"
                value={`${s?.avg_completion ?? 0}%`}
                color="bg-purple-100 text-purple-600"
              />
              <SummaryCard
                icon={AlertTriangle}
                label="Issues Found"
                value={totalIssues}
                sub="across submitted audits"
                color="bg-red-100 text-red-600"
              />
            </div>

            {/* Insights banner */}
            {insights.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">Key Insights</p>
                    <ul className="space-y-1">
                      {insights.map((ins, i) => (
                        <li key={i} className="text-sm text-blue-700">• {ins}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
              <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
              <TabButton active={tab === "issues"} onClick={() => setTab("issues")}>Issues</TabButton>
              <TabButton active={tab === "manpower"} onClick={() => setTab("manpower")}>Manpower & Equipment</TabButton>
            </div>

            {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
            {tab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* Property Health table — 3 cols wide */}
                <Card className="lg:col-span-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Property Health
                      <span className="ml-auto text-xs text-gray-400 font-normal">Sorted by completion ↑</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sortedProperties.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No audits in this period</p>
                    ) : (
                      <div className="space-y-1">
                        {sortedProperties.map((p) => (
                          <Link
                            key={p.property_id}
                            href={`/audit/${p.property_id}/${p.audit_id}/review`}
                            className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Building2 className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-gray-900 truncate">{p.property_name}</p>
                                <Badge
                                  variant={p.status === "submitted" ? "default" : "secondary"}
                                  className="text-xs py-0 h-4 shrink-0"
                                >
                                  {p.status === "submitted" ? "Done" : "Draft"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      p.completion_pct >= 80 ? "bg-green-500"
                                        : p.completion_pct >= 50 ? "bg-amber-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${p.completion_pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-7 text-right shrink-0">{p.completion_pct}%</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {p.issueCount > 0 && (
                                <span className="text-xs text-red-500 font-medium flex items-center gap-0.5">
                                  <ThumbsDown className="h-3 w-3" />{p.issueCount}
                                </span>
                              )}
                              <p className="text-xs text-gray-400">{formatDate(p.audit_date)}</p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Right column — 2 cols wide */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Monthly trend */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        Audit Trend (6 months)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(data?.trend ?? []).length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
                      ) : (
                        <div className="space-y-1">
                          {(data?.trend ?? []).map((t) => (
                            <div key={t.month} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-12 shrink-0">{t.month}</span>
                              <div className="flex-1 flex gap-0.5">
                                <div
                                  className="bg-blue-500 h-5 rounded-sm transition-all flex items-center justify-end pr-1"
                                  style={{ width: `${(t.submitted / maxTrend) * 100}%`, minWidth: t.submitted > 0 ? "24px" : "0" }}
                                >
                                  {t.submitted > 0 && <span className="text-xs text-white font-medium">{t.submitted}</span>}
                                </div>
                                {t.total - t.submitted > 0 && (
                                  <div
                                    className="bg-amber-300 h-5 rounded-sm"
                                    style={{ width: `${((t.total - t.submitted) / maxTrend) * 100}%` }}
                                    title={`${t.total - t.submitted} in progress`}
                                  />
                                )}
                              </div>
                              <span className="text-xs text-gray-400 w-10 text-right shrink-0">
                                {t.avg_completion}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                          <span className="text-xs text-gray-500">Submitted</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm bg-amber-300" />
                          <span className="text-xs text-gray-500">In Progress</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Overdue alerts */}
                  {(s?.overdue ?? 0) > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-red-800">
                              {s?.overdue} audit{(s?.overdue ?? 0) > 1 ? "s" : ""} overdue
                            </p>
                            <p className="text-xs text-red-600">Draft with no activity for 24h+</p>
                          </div>
                        </div>
                        <Link href="/admin/audits" className="mt-3 block">
                          <button className="text-xs text-red-700 hover:text-red-900 font-medium flex items-center gap-1">
                            View overdue audits <ChevronRight className="h-3 w-3" />
                          </button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* ── ISSUES TAB ────────────────────────────────────────────────── */}
            {tab === "issues" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Combined issue hotspots */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                      Top Failing Items (all submitted audits)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allIssues.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No checklist issues recorded yet</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {allIssues.map((issue, i) => (
                          <div key={i} className="py-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="text-sm font-medium text-gray-900 truncate">{issue.item_label}</p>
                                <p className="text-xs text-gray-400">{issue.source}</p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                issue.fail_pct >= 50 ? "bg-red-100 text-red-700"
                                  : issue.fail_pct >= 25 ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {issue.fail_pct}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    issue.fail_pct >= 50 ? "bg-red-500"
                                      : issue.fail_pct >= 25 ? "bg-amber-500" : "bg-yellow-400"
                                  }`}
                                  style={{ width: `${(issue.not_ok_count / maxIssues) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-24 text-right shrink-0">
                                {issue.not_ok_count}/{issue.total_checked} audits
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Breakdown by category */}
                <div className="space-y-5">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Section</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {[
                        { label: "Rooms", count: (data?.roomIssues ?? []).reduce((a, r) => a + r.not_ok_count, 0), color: "bg-blue-500" },
                        { label: "Kitchen / Areas", count: (data?.kitchenIssues ?? []).reduce((a, r) => a + r.not_ok_count, 0), color: "bg-orange-500" },
                        { label: "Hotel Sections", count: (data?.hotelIssues ?? []).reduce((a, r) => a + r.not_ok_count, 0), color: "bg-purple-500" },
                      ].map((sec) => (
                        <BarRow
                          key={sec.label}
                          label={sec.label}
                          value={sec.count}
                          max={totalIssues || 1}
                          color={sec.color}
                          suffix=" issues"
                        />
                      ))}
                    </CardContent>
                  </Card>

                  {/* Decision prompts */}
                  <Card className="bg-gray-900 text-white border-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-300">Decision Prompts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.map((ins, i) => (
                        <div key={i} className="flex gap-2">
                          <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm text-gray-300 leading-snug">{ins}</p>
                        </div>
                      ))}
                      {insights.length === 0 && (
                        <p className="text-sm text-gray-500">Submit more audits to generate insights.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ── MANPOWER & EQUIPMENT TAB ──────────────────────────────────── */}
            {tab === "manpower" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Manpower */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Manpower — Average Headcounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(data?.manpower ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No manpower data in submitted hostel audits</p>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="grid grid-cols-[1fr_60px_60px_60px_80px] text-xs text-gray-400 font-medium pb-2 border-b border-gray-100">
                          <span>Section</span>
                          <span className="text-center">Min</span>
                          <span className="text-center">Avg</span>
                          <span className="text-center">Max</span>
                          <span className="text-center">Audits</span>
                        </div>
                        {(data?.manpower ?? []).map((m) => (
                          <div
                            key={m.section}
                            className="grid grid-cols-[1fr_60px_60px_60px_80px] py-2.5 text-sm border-b border-gray-50 last:border-0"
                          >
                            <span className="text-gray-900 font-medium">
                              {MANPOWER_LABELS[m.section] ?? m.section}
                            </span>
                            <span className="text-center text-gray-500">{m.min_count ?? "—"}</span>
                            <span className="text-center font-semibold text-gray-900">{m.avg_count ?? "—"}</span>
                            <span className="text-center text-gray-500">{m.max_count ?? "—"}</span>
                            <span className="text-center text-gray-400">{m.audit_count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                      From hostel submitted audits in this period. Use avg vs max to identify understaffed properties.
                    </p>
                  </CardContent>
                </Card>

                {/* Equipment */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-orange-600" />
                      Equipment Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(data?.equipment ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No equipment data in submitted audits</p>
                    ) : (
                      <div className="space-y-4">
                        {(data?.equipment ?? []).map((eq) => {
                          const total = eq.ok_count + eq.not_ok_count + eq.na_count;
                          return (
                            <div key={eq.item}>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-sm font-medium text-gray-900">
                                  {EQUIPMENT_LABELS[eq.item] ?? eq.item}
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                  {eq.not_ok_count > 0 && (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                      {eq.not_ok_count} failing
                                    </span>
                                  )}
                                  {eq.avg_count != null && eq.avg_count > 0 && (
                                    <span className="text-gray-400">avg {eq.avg_count} units</span>
                                  )}
                                </div>
                              </div>
                              {total > 0 && (
                                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                                  {eq.ok_count > 0 && (
                                    <div
                                      className="bg-green-500 h-full"
                                      style={{ width: `${(eq.ok_count / total) * 100}%` }}
                                      title={`OK: ${eq.ok_count}`}
                                    />
                                  )}
                                  {eq.not_ok_count > 0 && (
                                    <div
                                      className="bg-red-500 h-full"
                                      style={{ width: `${(eq.not_ok_count / total) * 100}%` }}
                                      title={`Not OK: ${eq.not_ok_count}`}
                                    />
                                  )}
                                  {eq.na_count > 0 && (
                                    <div
                                      className="bg-gray-300 h-full"
                                      style={{ width: `${(eq.na_count / total) * 100}%` }}
                                      title={`N/A: ${eq.na_count}`}
                                    />
                                  )}
                                </div>
                              )}
                              <div className="flex gap-3 mt-1">
                                <span className="text-xs text-green-600">{eq.ok_count} OK</span>
                                <span className="text-xs text-red-500">{eq.not_ok_count} Not OK</span>
                                <span className="text-xs text-gray-400">{eq.na_count} N/A</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Red bars = maintenance action required across multiple properties
                    </p>
                  </CardContent>
                </Card>

                {/* Manpower recommendation card */}
                {(data?.manpower ?? []).length > 0 && (() => {
                  const lowest = [...(data?.manpower ?? [])].sort((a, b) => (a.avg_count ?? 0) - (b.avg_count ?? 0))[0];
                  return (
                    <Card className="lg:col-span-2 border-blue-200 bg-blue-50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-start gap-3">
                          <Users className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-blue-900">Staffing Recommendation</p>
                            <p className="text-sm text-blue-700 mt-0.5">
                              {MANPOWER_LABELS[lowest.section] ?? lowest.section} has the lowest average headcount
                              ({lowest.avg_count ?? 0} avg, {lowest.min_count ?? 0} min across properties).
                              Properties with fewer than {lowest.min_count ?? 0} staff in this role may need reinforcement.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
