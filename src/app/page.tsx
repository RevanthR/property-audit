"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2, Hotel, Home, Plus, ChevronRight, Calendar, Clock, Search, X } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { useAuditStore } from "@/lib/store/audit";
import { useShallow } from "zustand/react/shallow";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Property {
  id: string;
  name: string;
  type: "hostel" | "hotel";
  location: string;
}

interface AuditRow {
  audit: {
    id: string;
    propertyId: string;
    auditorName: string;
    auditDate: string;
    status: "draft" | "submitted";
    updatedAt: string;
  };
  property: Property;
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

function Dashboard() {
  const { user } = useSession();
  const router = useRouter();
  const localDrafts = useAuditStore(useShallow((s) => Object.values(s.drafts).filter((d) => d.propertyId)));
  const [properties, setProperties] = useState<Property[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`/api/properties?userId=${user.id}&role=${user.role}&allAccess=${user.hasAllPropertiesAccess}`).then((r) => r.json()),
      fetch("/api/audits").then((r) => r.json()),
    ]).then(([props, audits]) => {
      setProperties(Array.isArray(props) ? props : []);
      setRecentAudits(Array.isArray(audits) ? audits.slice(0, 10) : []);
      setLoading(false);
    });
  }, [user]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => q ? properties.filter((p) => p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)) : properties,
    [properties, q]
  );

  const hostels = filtered.filter((p) => p.type === "hostel");
  const hotels = filtered.filter((p) => p.type === "hotel");

  // Map draft by propertyId for O(1) lookup
  const draftByProperty = useMemo(
    () => Object.fromEntries(localDrafts.map((d) => [d.propertyId, d])),
    [localDrafts]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Good {greeting()}, {user?.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? "Loading properties…" : `${properties.length} propert${properties.length === 1 ? "y" : "ies"}`}
            </p>
          </div>
          {user?.role === "admin" && (
            <Button onClick={() => router.push("/admin/properties")} size="sm">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          )}
        </div>

        {/* Resume drafts banner */}
        {localDrafts.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 flex-1">
                <strong>{localDrafts.length}</strong> audit{localDrafts.length > 1 ? "s" : ""} in progress — saved on this device
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {localDrafts.map((d) => {
                const firstStep = d.propertyType === "hostel" ? "process" : "hotel/front-office";
                return (
                  <Button
                    key={d.auditId}
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/audit/${d.propertyId}/${d.auditId}/${firstStep}`)}
                    className="text-amber-700 border-amber-300 bg-white hover:bg-amber-50"
                  >
                    Resume: {d.propertyName}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        {!loading && properties.length > 4 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search properties by name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-xl bg-gray-200 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {q ? (
              <>
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No properties match &quot;{search}&quot;</p>
                <button onClick={() => setSearch("")} className="text-xs text-blue-500 mt-2 hover:underline">Clear search</button>
              </>
            ) : (
              <>
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No properties assigned yet.</p>
                {user?.role !== "admin" && <p className="text-xs mt-1">Ask your admin to assign properties to you.</p>}
              </>
            )}
          </div>
        ) : (
          <>
            {q && (
              <p className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;{search}&quot;</p>
            )}

            {hostels.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Home className="h-3.5 w-3.5" /> Hostels · {hostels.length}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hostels.map((p) => (
                    <PropertyCard key={p.id} property={p} recentAudits={recentAudits} localDraft={draftByProperty[p.id]} />
                  ))}
                </div>
              </section>
            )}

            {hotels.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Hotel className="h-3.5 w-3.5" /> Hotels · {hotels.length}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotels.map((p) => (
                    <PropertyCard key={p.id} property={p} recentAudits={recentAudits} localDraft={draftByProperty[p.id]} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Recent Audits — only show when no active search */}
        {!q && recentAudits.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent Audits</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {recentAudits.map((row) => (
                <RecentAuditRow key={row.audit.id} row={row} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function PropertyCard({
  property,
  recentAudits,
  localDraft,
}: {
  property: Property;
  recentAudits: AuditRow[];
  localDraft?: ReturnType<typeof useAuditStore.getState>["drafts"][string];
}) {
  const router = useRouter();
  const lastAudit = recentAudits.find((r) => r.property.id === property.id);
  const hasDraft = !!localDraft;

  const handleStart = useCallback(
    () => {
      if (hasDraft) {
        const firstStep = localDraft!.propertyType === "hostel" ? "process" : "hotel/front-office";
        router.push(`/audit/${property.id}/${localDraft!.auditId}/${firstStep}`);
      } else {
        router.push(`/audit/${property.id}/start`);
      }
    },
    [hasDraft, localDraft, property.id, router]
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{property.name}</CardTitle>
            <CardDescription className="truncate">{property.location}</CardDescription>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            property.type === "hostel" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          }`}>
            {property.type === "hostel" ? "Hostel" : "Hotel"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {hasDraft ? (
          <div className="flex items-center gap-2 text-xs text-amber-600 mb-3">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">Audit in progress</span>
          </div>
        ) : lastAudit ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Calendar className="h-3.5 w-3.5" />
            <span>Last: {formatDate(lastAudit.audit.auditDate)}</span>
            <Badge variant={lastAudit.audit.status === "submitted" ? "success" : "warning"} className="ml-auto">
              {lastAudit.audit.status === "submitted" ? "Done" : "Draft"}
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mb-3">No audits yet</p>
        )}
        <div className="flex gap-2">
          <Button size="sm" className={`flex-1 ${hasDraft ? "bg-amber-500 hover:bg-amber-600" : ""}`} onClick={handleStart}>
            {hasDraft ? "Resume Audit" : "Start Audit"}
          </Button>
          {lastAudit && !hasDraft && (
            <Button size="sm" variant="outline" onClick={() => router.push(`/reports/${lastAudit.audit.id}`)}>
              Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentAuditRow({ row }: { row: AuditRow }) {
  const router = useRouter();
  const firstStep = row.property.type === "hostel" ? "process" : "hotel/front-office";
  const target = row.audit.status === "submitted"
    ? `/reports/${row.audit.id}`
    : `/audit/${row.property.id}/${row.audit.id}/${firstStep}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{row.property.name}</p>
        <p className="text-xs text-gray-400">{row.audit.auditorName} · {formatDate(row.audit.auditDate)}</p>
      </div>
      <Badge variant={row.audit.status === "submitted" ? "success" : "warning"}>
        {row.audit.status === "submitted" ? "Submitted" : "Draft"}
      </Badge>
      <Button size="icon" variant="ghost" onClick={() => router.push(target)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
