"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Hotel, Home, Plus, ChevronRight, Calendar, Clock } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { useAuditStore } from "@/lib/store/audit";
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
  const { drafts } = useAuditStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`/api/properties?userId=${user.id}&role=${user.role}`).then((r) => r.json()),
      fetch("/api/audits").then((r) => r.json()),
    ]).then(([props, audits]) => {
      setProperties(props);
      setRecentAudits(audits.slice(0, 10));
      setLoading(false);
    });
  }, [user]);

  const hostels = properties.filter((p) => p.type === "hostel");
  const hotels = properties.filter((p) => p.type === "hotel");
  const localDrafts = Object.values(drafts).filter((d) => d.propertyId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Good {greeting()}, {user?.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{properties.length} properties assigned</p>
          </div>
          {user?.role === "admin" && (
            <Button onClick={() => router.push("/admin/properties")} size="sm">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          )}
        </div>

        {/* Local drafts banner */}
        {localDrafts.length > 0 && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 flex flex-wrap items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 flex-1">
              You have <strong>{localDrafts.length}</strong> unsaved draft{localDrafts.length > 1 ? "s" : ""} saved locally.
            </p>
            {localDrafts.slice(0, 2).map((d) => {
              const firstStep = d.propertyType === "hostel" ? "process" : "hotel/front-office";
              return (
                <Button
                  key={d.auditId}
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/audit/${d.propertyId}/${d.auditId}/${firstStep}`)}
                  className="text-yellow-700 border-yellow-300"
                >
                  Resume — {d.propertyName}
                </Button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {hostels.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Home className="h-4 w-4" /> Hostels ({hostels.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hostels.map((p) => (
                    <PropertyCard key={p.id} property={p} recentAudits={recentAudits} />
                  ))}
                </div>
              </section>
            )}

            {hotels.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Hotel className="h-4 w-4" /> Hotels ({hotels.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotels.map((p) => (
                    <PropertyCard key={p.id} property={p} recentAudits={recentAudits} />
                  ))}
                </div>
              </section>
            )}

            {properties.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No properties assigned yet.</p>
                {user?.role !== "admin" && (
                  <p className="text-xs mt-1">Ask your admin to assign properties to you.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Recent Audits */}
        {recentAudits.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Recent Audits
            </h2>
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

function PropertyCard({ property, recentAudits }: { property: Property; recentAudits: AuditRow[] }) {
  const router = useRouter();
  const lastAudit = recentAudits.find((r) => r.property.id === property.id);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-default">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{property.name}</CardTitle>
            <CardDescription>{property.location}</CardDescription>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              property.type === "hostel"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {property.type === "hostel" ? "Hostel" : "Hotel"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {lastAudit ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Calendar className="h-3.5 w-3.5" />
            <span>Last: {formatDate(lastAudit.audit.auditDate)}</span>
            <Badge
              variant={lastAudit.audit.status === "submitted" ? "success" : "warning"}
              className="ml-auto"
            >
              {lastAudit.audit.status === "submitted" ? "Done" : "Draft"}
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mb-3">No audits yet</p>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => router.push(`/audit/${property.id}/start`)}>
            Start Audit
          </Button>
          {lastAudit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/reports/${lastAudit.audit.id}`)}
            >
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
  const target =
    row.audit.status === "submitted"
      ? `/reports/${row.audit.id}`
      : `/audit/${row.property.id}/${row.audit.id}/${firstStep}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{row.property.name}</p>
        <p className="text-xs text-gray-400">
          {row.audit.auditorName} · {formatDate(row.audit.auditDate)}
        </p>
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
