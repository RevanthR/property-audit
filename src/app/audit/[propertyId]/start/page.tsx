"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Building2, Calendar, User, ArrowRight, Users, Clock } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { useAuditStore } from "@/lib/store/audit";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HOSTEL_COMMON_AREAS, HOSTEL_MANPOWER, HOSTEL_EQUIPMENT, HOTEL_SECTIONS } from "@/lib/audit-config";
import { formatDate } from "@/lib/utils";

interface Property {
  id: string;
  name: string;
  type: "hostel" | "hotel";
  location: string;
}

interface ExistingAudit {
  id: string;
  auditorName: string;
  auditDate: string;
  completionPct: number;
  currentStep: string;
}

// Maps the DB currentStep key to its URL path segment
const STEP_TO_URL: Record<string, string> = {
  process: "process",
  rooms: "maintenance/rooms",
  guest_rooms: "maintenance/rooms",
  property: "maintenance/property",
  manpower: "manpower",
  equipment: "equipment",
  assets: "assets",
  review: "review",
  front_office: "hotel/front-office",
  housekeeping: "hotel/housekeeping",
  engineering: "hotel/engineering",
  food_beverage: "hotel/food-beverage",
  property_mgmt: "hotel/property-management",
  security: "hotel/security",
  finance: "hotel/finance",
  hr: "hotel/hr",
  guest_exp: "hotel/guest-experience",
};

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
  const [existingAudit, setExistingAudit] = useState<ExistingAudit | null | undefined>(undefined); // undefined = loading
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load property info and check for existing draft audit in parallel
    Promise.all([
      fetch(`/api/properties/${propertyId}`).then((r) => r.json()),
      fetch(`/api/audits?propertyId=${propertyId}&status=draft`).then((r) => r.json()),
    ]).then(([prop, rows]) => {
      setProperty(prop);
      setExistingAudit(rows.length > 0 ? rows[0].audit : null);
    });
  }, [propertyId]);

  async function handleJoin() {
    if (!existingAudit || !property) return;
    // Navigate to the step the auditor was last on; fall back to the first step if unknown
    const defaultStep = property.type === "hostel" ? "process" : "hotel/front-office";
    const stepPath = STEP_TO_URL[existingAudit.currentStep] ?? defaultStep;
    router.push(`/audit/${propertyId}/${existingAudit.id}/${stepPath}`);
  }

  async function handleStart() {
    if (!property) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          auditorName: user?.name ?? "Unknown",
          auditDate,
          propertyType: property.type,
        }),
      });
      const audit = await res.json();

      if (res.status === 201) {
        // New audit — initialize a fresh local draft
        initDraft(buildDraft(audit.id, property, user?.name ?? "Unknown", auditDate));
      }
      // If an existing draft was returned (200), don't overwrite it with an empty buildDraft.
      // The layout will fetch the real data from DB and populate the local draft.

      const stepPath = STEP_TO_URL[audit.currentStep] ?? (property.type === "hostel" ? "process" : "hotel/front-office");
      router.push(`/audit/${propertyId}/${audit.id}/${stepPath}`);
    } catch {
      setError("Failed to start audit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isLoading = !property || existingAudit === undefined;

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">
            {existingAudit ? "Audit in Progress" : "Start Audit"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {existingAudit
              ? "An audit is already ongoing for this property. Join it to collaborate."
              : "Fill in the details to begin the audit"}
          </p>
        </div>

        {/* Property info */}
        <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-white rounded-xl border border-gray-200">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{property.name}</p>
            <p className="text-sm text-gray-500">{property.location} · {property.type === "hostel" ? "Hostel" : "Hotel"}</p>
          </div>
        </div>

        {/* CASE A: Existing draft audit — show join UI */}
        {existingAudit && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <Users className="h-4 w-4" /> Ongoing Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5 text-sm text-amber-900">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 opacity-60" />
                  <span>Started by <strong>{existingAudit.auditorName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 opacity-60" />
                  <span>Date: <strong>{formatDate(existingAudit.auditDate)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 opacity-60" />
                  <span>Completion: <strong>{existingAudit.completionPct}%</strong></span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-amber-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${existingAudit.completionPct}%` }}
                />
              </div>

              <p className="text-xs text-amber-700">
                You can work on any section. If someone else is editing the same section, you&apos;ll get a warning.
              </p>

              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 flex-1">Joining as <strong>{user?.name}</strong></p>
                <Button onClick={handleJoin} className="bg-amber-600 hover:bg-amber-700">
                  Join Audit <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CASE B: No existing audit — show start form */}
        {!existingAudit && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              {/* Auditor display — not editable (name comes from login) */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Auditor</p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-800">{user?.name}</span>
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

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">This audit will cover:</p>
                {property.type === "hostel" ? (
                  <ul className="space-y-0.5 ml-2">
                    <li>• Process (Admissions, Payments)</li>
                    <li>• Maintenance (Rooms + Common Areas)</li>
                    <li>• Manpower (4 categories)</li>
                    <li>• Equipment (Motors, Vehicles, Washing Machines)</li>
                  </ul>
                ) : (
                  <ul className="space-y-0.5 ml-2">
                    <li>• Front Office, Guest Rooms, Housekeeping</li>
                    <li>• Engineering, F&B, Property Management</li>
                    <li>• Security, Finance, HR, Guest Experience</li>
                  </ul>
                )}
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <Button className="w-full" onClick={handleStart} disabled={loading}>
                {loading ? "Starting…" : "Begin Audit"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
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
    assetInventory: [],
    process: { admissionsRemarks: "", paymentsRemarks: "" },
    rooms: [],
    commonAreas: HOSTEL_COMMON_AREAS.map((a) => ({
      areaKey: a.key, areaLabel: a.label, moduleType: a.type as "remarks" | "checklist", remarks: "", checklist: [],
    })),
    manpower: HOSTEL_MANPOWER.map((m) => ({ section: m.key, label: m.label, count: null, remarks: "" })),
    equipment: HOSTEL_EQUIPMENT.map((e) => ({
      item: e.key, label: e.label, moduleType: e.type as "status" | "count", condition: null, count: null, remarks: "",
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
    version: 0,
    lastSyncedAt: null,
  };
}
