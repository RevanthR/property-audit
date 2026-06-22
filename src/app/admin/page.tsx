"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users, ListChecks, ClipboardList, CheckCircle2, Clock, AlertCircle, TrendingUp, ChevronRight, Calendar, BarChart2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

interface AuditRow {
  audit: {
    id: string;
    auditorName: string;
    auditDate: string;
    status: "draft" | "submitted";
    completionPct: number;
    createdAt: string;
    updatedAt: string;
  };
  property: {
    id: string;
    name: string;
    type: "hostel" | "hotel";
    location: string;
  };
}

const ADMIN_SECTIONS = [
  { href: "/admin/properties", icon: Building2, title: "Properties", description: "Add, edit, or deactivate properties.", color: "bg-blue-100 text-blue-600" },
  { href: "/admin/users", icon: Users, title: "Users & Access", description: "Create auditor accounts and manage access.", color: "bg-purple-100 text-purple-600" },
  { href: "/admin/templates", icon: ListChecks, title: "Checklist Templates", description: "Edit checklist items for all audit sections.", color: "bg-green-100 text-green-600" },
  { href: "/admin/audits", icon: ClipboardList, title: "All Audits", description: "View and manage all audits across every property.", color: "bg-orange-100 text-orange-600" },
  { href: "/admin/metrics", icon: BarChart2, title: "Analytics", description: "Issue hotspots, manpower trends, and decision metrics.", color: "bg-indigo-100 text-indigo-600" },
];

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminDashboard />
    </AuthGuard>
  );
}

function AdminDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "submitted">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/audits/${deleteId}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.audit.id !== deleteId));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((data) => { setRows(data); setLoading(false); });
  }, []);

  const now = Date.now();
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const thisMonth = rows.filter((r) => new Date(r.audit.createdAt).getTime() >= thisMonthStart);
  const complete = rows.filter((r) => r.audit.status === "submitted");
  const inProgress = rows.filter((r) => r.audit.status === "draft" && r.audit.completionPct > 0);
  const overdue = rows.filter((r) => r.audit.status === "draft" && now - new Date(r.audit.updatedAt).getTime() > 24 * 60 * 60 * 1000);

  const filtered = rows.filter((r) => {
    const matchSearch = !search || r.property.name.toLowerCase().includes(search.toLowerCase()) || r.audit.auditorName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.audit.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-sm text-gray-500 mt-1">All audits, completion status, and quick navigation</p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ADMIN_SECTIONS.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-4 pb-4">
                  <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${s.color}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{s.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard icon={<TrendingUp className="h-5 w-5 text-blue-600" />} label="This Month" value={thisMonth.length} color="bg-blue-50" />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Completed" value={complete.length} color="bg-green-50" />
          <SummaryCard icon={<Clock className="h-5 w-5 text-yellow-600" />} label="In Progress" value={inProgress.length} color="bg-yellow-50" />
          <SummaryCard icon={<AlertCircle className="h-5 w-5 text-red-600" />} label="Overdue (>24h)" value={overdue.length} color="bg-red-50" />
        </div>

        {/* Audit table */}
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Input
              placeholder="Search property or auditor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs text-sm"
            />
            <div className="flex gap-1">
              {(["all", "draft", "submitted"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {s === "all" ? "All" : s === "draft" ? "Draft" : "Submitted"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-200 animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No audits found.</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Property</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Auditor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(({ audit, property }) => (
                    <tr
                      key={audit.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        if (audit.status === "draft") {
                          const firstStep = property.type === "hostel" ? "process" : "hotel/front-office";
                          router.push(`/audit/${property.id}/${audit.id}/${firstStep}`);
                        } else {
                          router.push(`/reports/${audit.id}`);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[160px]">{property.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{property.type}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{audit.auditorName}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(audit.auditDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full min-w-[60px]">
                            <div
                              className={`h-1.5 rounded-full transition-all ${audit.completionPct >= 100 ? "bg-green-500" : audit.completionPct > 0 ? "bg-blue-500" : "bg-gray-200"}`}
                              style={{ width: `${audit.completionPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{audit.completionPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={audit.status === "submitted" ? "success" : "warning"}>
                          {audit.status === "submitted" ? "Done" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 flex items-center gap-1 justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(audit.id); }}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="Delete audit"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete audit?</DialogTitle>
            <DialogDescription>
              This will permanently delete the audit for{" "}
              <strong>{rows.find((r) => r.audit.id === deleteId)?.property.name}</strong> and all its data.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-medium text-gray-600">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
