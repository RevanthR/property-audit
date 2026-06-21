"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { User, Power, Building2, Plus, X, Eye, EyeOff, UserPlus, Globe } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface PropertyMini { id: string; name: string; type: string; }
interface Auditor {
  id: string;
  name: string;
  isActive: boolean;
  hasAllPropertiesAccess: boolean;
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

  // Create user dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { setCreateError("Name is required"); return; }
    if (newPassword.length < 4) { setCreateError("Password must be at least 4 characters"); return; }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Failed to create user"); return; }
      // Deduplicate in case the list already contains this user (e.g. from a prior stale state)
      setAuditors((prev) => [data, ...prev.filter((a) => a.id !== data.id)]);
      setShowCreate(false);
      setNewName("");
      setNewPassword("");
      toast({ title: `User "${data.name}" created`, variant: "success" });
    } finally {
      setCreating(false);
    }
  }

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users & Access</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create auditor accounts. All new users get access to all properties.
            </p>
          </div>
          <Button onClick={() => { setShowCreate(true); setCreateError(""); }}>
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />)}</div>
        ) : auditors.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No auditors yet. Click &quot;Add User&quot; to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditors.map((u) => (
              <Card key={u.id} className={u.isActive ? "" : "opacity-60"}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                      {u.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                      <p className="text-xs text-gray-400">
                        {u.hasAllPropertiesAccess ? "All properties" : `${u.properties.length} properties assigned`}
                      </p>
                    </div>
                    {u.hasAllPropertiesAccess && (
                      <Badge className="bg-green-100 text-green-700 border-0 gap-1 shrink-0">
                        <Globe className="h-3 w-3" /> All Properties
                      </Badge>
                    )}
                    <Badge variant={u.isActive ? "success" : "secondary"} className="shrink-0">
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {!u.hasAllPropertiesAccess && (
                      <Button size="sm" variant="outline" onClick={() => setAssignTarget(u)}>
                        <Building2 className="h-3.5 w-3.5" /> Manage
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => toggleActive(u)} title={u.isActive ? "Deactivate" : "Activate"}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                  {!u.hasAllPropertiesAccess && u.properties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
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

      {/* Create user dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setNewName(""); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Auditor Account</DialogTitle>
            <DialogDescription>
              The new user will log in with this name and password. They get access to all properties.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createUser} className="mt-4 space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Rahul Kumar"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div className="relative">
              <Input
                label="Password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Min 4 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {createError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign properties dialog (for users without all-access) */}
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
