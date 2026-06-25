"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronRight, Search, Trash2, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AuditRow {
  audit: { id: string; auditorName: string; auditDate: string; status: string; updatedAt: string };
  property: { id: string; name: string; type: string; location: string };
}

export default function AllAuditsPage() {
  return (
    <AuthGuard requireAdmin>
      <AllAudits />
    </AuthGuard>
  );
}

function AllAudits() {
  const router = useRouter();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    fetch("/api/audits")
      .then((r) => r.json())
      .then((data) => { setRows(data); setLoading(false); });
  }, []);

  const filtered = rows.filter(
    (r) =>
      r.property.name.toLowerCase().includes(search.toLowerCase()) ||
      r.audit.auditorName.toLowerCase().includes(search.toLowerCase())
  );

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

  const deleteTarget = rows.find((r) => r.audit.id === deleteId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Audits</h1>
            <p className="text-sm text-gray-500 mt-1">{rows.length} total audits</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-64 relative">
              <Input
                placeholder="Search property or auditor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export Excel"}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No audits found.</div>
          ) : (
            filtered.map((row) => (
              <div key={row.audit.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{row.property.name}</p>
                    <span className="text-xs text-gray-400 capitalize">({row.property.type})</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {row.audit.auditorName} · {formatDate(row.audit.auditDate)} · Updated {formatDate(row.audit.updatedAt)}
                  </p>
                </div>
                <Badge variant={row.audit.status === "submitted" ? "success" : "warning"}>
                  {row.audit.status === "submitted" ? "Submitted" : "Draft"}
                </Badge>
                <button
                  onClick={() => setDeleteId(row.audit.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
                  title="Delete audit"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (row.audit.status === "draft") {
                      const firstStep = row.property.type === "hostel" ? "process" : "hotel/front-office";
                      router.push(`/audit/${row.property.id}/${row.audit.id}/${firstStep}`);
                    } else {
                      router.push(`/reports/${row.audit.id}`);
                    }
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </main>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete audit?</DialogTitle>
            <DialogDescription>
              This will permanently delete the audit for{" "}
              <strong>{deleteTarget?.property.name}</strong> by{" "}
              <strong>{deleteTarget?.audit.auditorName}</strong> and all its data.
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
