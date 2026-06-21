"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { User, Power, Building2, Plus, X } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface PropertyMini { id: string; name: string; type: string; }
interface Auditor {
  id: string;
  name: string;
  isActive: boolean;
  properties: PropertyMini[];
}

export default function UsersPage() {
  return (
    <AuthGuard requireAdmin>
      <Users />
    </AuthGuard>
  );
}

function Users() {
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [allProperties, setAllProperties] = useState<PropertyMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState<Auditor | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/properties?role=admin").then((r) => r.json()),
    ]).then(([users, props]) => {
      setAuditors(users);
      setAllProperties(props);
      setLoading(false);
    });
  }, []);

  async function toggleActive(u: Auditor) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    setAuditors((prev) => prev.map((a) => a.id === u.id ? { ...a, isActive: !a.isActive } : a));
    toast({ title: `User ${u.isActive ? "deactivated" : "activated"}`, variant: "success" });
  }

  async function assignProperty(userId: string, propertyId: string) {
    await fetch(`/api/users/${userId}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });
    const prop = allProperties.find((p) => p.id === propertyId)!;
    setAuditors((prev) =>
      prev.map((a) =>
        a.id === userId && !a.properties.some((p) => p.id === propertyId)
          ? { ...a, properties: [...a.properties, prop] }
          : a
      )
    );
    // Update assignTarget
    setAssignTarget((t) =>
      t && t.id === userId
        ? { ...t, properties: t.properties.some((p) => p.id === propertyId) ? t.properties : [...t.properties, prop] }
        : t
    );
  }

  async function removeProperty(userId: string, propertyId: string) {
    await fetch(`/api/users/${userId}/properties`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });
    setAuditors((prev) =>
      prev.map((a) =>
        a.id === userId ? { ...a, properties: a.properties.filter((p) => p.id !== propertyId) } : a
      )
    );
    setAssignTarget((t) =>
      t && t.id === userId ? { ...t, properties: t.properties.filter((p) => p.id !== propertyId) } : t
    );
  }

  const unassignedProperties = assignTarget
    ? allProperties.filter((p) => !assignTarget.properties.some((ap) => ap.id === p.id))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Access</h1>
          <p className="text-sm text-gray-500 mt-1">
            Auditors are created automatically when they first log in. Assign properties below.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />)}</div>
        ) : auditors.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No auditors yet. They&apos;ll appear here when they first log in.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditors.map((u) => (
              <Card key={u.id} className={u.isActive ? "" : "opacity-60"}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {u.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.properties.length} properties assigned</p>
                    </div>
                    <Badge variant={u.isActive ? "success" : "secondary"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setAssignTarget(u)}>
                      <Building2 className="h-3.5 w-3.5" /> Manage
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleActive(u)}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                  {u.properties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {u.properties.map((p) => (
                        <Badge key={p.id} variant="outline" className="text-xs">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Assign properties dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Properties — {assignTarget?.name}</DialogTitle>
            <DialogDescription>Add or remove property access for this auditor.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {assignTarget?.properties.length === 0 ? (
              <p className="text-sm text-gray-400">No properties assigned yet.</p>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Assigned</p>
                <div className="space-y-1">
                  {assignTarget?.properties.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm py-1">
                      <span className="flex-1">{p.name}</span>
                      <button onClick={() => removeProperty(assignTarget.id, p.id)} className="text-gray-300 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unassignedProperties.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Add Property</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {unassignedProperties.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => assignProperty(assignTarget!.id, p.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-blue-500" />
                      <span>{p.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs capitalize">{p.type}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
