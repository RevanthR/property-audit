"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Building2, Calendar, User, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { useAuditStore } from "@/lib/store/audit";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HOSTEL_COMMON_AREAS, HOSTEL_MANPOWER, HOSTEL_EQUIPMENT, HOTEL_SECTIONS } from "@/lib/audit-config";

interface Property {
  id: string;
  name: string;
  type: "hostel" | "hotel";
  location: string;
}

export default function AuditStartPage({ params }: { params: Promise<{ propertyId: string }> }) {
  return (
    <AuthGuard>
      <AuditStart params={params} />
    </AuthGuard>
  );
}

function AuditStart({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = use(params);
  const { user } = useSession();
  const router = useRouter();
  const { initDraft } = useAuditStore();

  const [property, setProperty] = useState<Property | null>(null);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split("T")[0]);
  const [auditorName, setAuditorName] = useState(user?.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/properties/${propertyId}`)
      .then((r) => r.json())
      .then(setProperty);
  }, [propertyId]);

  useEffect(() => {
    if (user) setAuditorName(user.name);
  }, [user]);

  async function handleStart() {
    if (!auditorName.trim()) { setError("Auditor name is required."); return; }
    if (!auditDate) { setError("Audit date is required."); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          auditorName: auditorName.trim(),
          auditDate,
          propertyType: property!.type,
        }),
      });
      const audit = await res.json();

      // Initialize local draft with all sections pre-populated
      initDraft(buildDraft(audit.id, property!, auditorName, auditDate));

      const firstStep = property!.type === "hostel" ? "process" : "hotel/front-office";
      router.push(`/audit/${propertyId}/${audit.id}/${firstStep}`);
    } catch {
      setError("Failed to start audit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 block">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Start Audit</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in the details to begin the audit</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>{property.name}</CardTitle>
                <p className="text-sm text-gray-500">{property.location} · {property.type === "hostel" ? "Hostel" : "Hotel"}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Auditor</p>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-800">{auditorName}</span>
              </div>
            </div>

            <div className="relative">
              <Input
                label="Date of Audit"
                type="date"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
              <Calendar className="absolute right-3 top-8 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">This audit will cover:</p>
              {property.type === "hostel" ? (
                <ul className="space-y-0.5 ml-2">
                  <li>• Process (Admissions, Payments)</li>
                  <li>• Maintenance (Rooms + 10 Common Areas)</li>
                  <li>• Manpower (4 categories)</li>
                  <li>• Equipment (Motors, Vehicles, Washing Machines)</li>
                </ul>
              ) : (
                <ul className="space-y-0.5 ml-2">
                  <li>• Front Office Operations</li>
                  <li>• Guest Rooms (detailed checklist)</li>
                  <li>• Housekeeping, Engineering, F&B</li>
                  <li>• Property Management, Security, Finance, HR</li>
                  <li>• Guest Experience</li>
                </ul>
              )}
            </div>

            <Button className="w-full" onClick={handleStart} disabled={loading}>
              {loading ? "Starting..." : "Begin Audit"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function buildDraft(auditId: string, property: Property, auditorName: string, auditDate: string) {
  return {
    auditId,
    propertyId: property.id,
    propertyName: property.name,
    propertyType: property.type,
    auditorName,
    auditDate,
    currentStep: property.type === "hostel" ? "process" : "front_office",
    process: { admissionsRemarks: "", paymentsRemarks: "" },
    rooms: [],
    commonAreas: HOSTEL_COMMON_AREAS.map((a) => ({
      areaKey: a.key,
      areaLabel: a.label,
      moduleType: a.type as "remarks" | "checklist",
      remarks: "",
      checklist: [],
    })),
    manpower: HOSTEL_MANPOWER.map((m) => ({
      section: m.key,
      label: m.label,
      count: null,
      remarks: "",
    })),
    equipment: HOSTEL_EQUIPMENT.map((e) => ({
      item: e.key,
      label: e.label,
      moduleType: e.type as "status" | "count",
      condition: null,
      count: null,
      remarks: "",
    })),
    frontOffice: HOTEL_SECTIONS.frontOffice.map((s) => ({ ...s, remarks: "", checklist: [] })),
    housekeeping: HOTEL_SECTIONS.housekeeping.map((s) => ({ ...s, remarks: "", checklist: [] })),
    engineering: HOTEL_SECTIONS.engineering.map((s) => ({ ...s, remarks: "", checklist: [] })),
    foodBeverage: HOTEL_SECTIONS.foodBeverage.map((s) => ({ ...s, remarks: "", checklist: [] })),
    propertyManagement: HOTEL_SECTIONS.propertyManagement.map((s) => ({ ...s, remarks: "", checklist: [] })),
    security: HOTEL_SECTIONS.security.map((s) => ({ ...s, remarks: "", checklist: [] })),
    finance: HOTEL_SECTIONS.finance.map((s) => ({ ...s, remarks: "", checklist: [] })),
    humanResources: HOTEL_SECTIONS.humanResources.map((s) => ({ ...s, remarks: "", checklist: [] })),
    guestExperience: HOTEL_SECTIONS.guestExperience.map((s) => ({ ...s, remarks: "", checklist: [] })),
    lastSyncedAt: null,
  };
}
