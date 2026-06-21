"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Power, Building2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface Property {
  id: string;
  name: string;
  type: "hostel" | "hotel";
  location: string;
  isActive: boolean;
}

export default function PropertiesPage() {
  return (
    <AuthGuard requireAdmin>
      <Properties />
    </AuthGuard>
  );
}

function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState({ name: "", type: "hostel" as "hostel" | "hotel", location: "" });

  useEffect(() => {
    fetch("/api/properties?role=admin")
      .then((r) => r.json())
      .then((data) => { setProperties(data); setLoading(false); });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", type: "hostel", location: "" });
    setShowDialog(true);
  }

  function openEdit(p: Property) {
    setEditing(p);
    setForm({ name: p.name, type: p.type, location: p.location });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.location.trim()) return;
    if (editing) {
      const res = await fetch(`/api/properties/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setProperties((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
      toast({ title: "Property updated", variant: "success" });
    } else {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      setProperties((prev) => [...prev, created]);
      toast({ title: "Property added", variant: "success" });
    }
    setShowDialog(false);
  }

  async function toggleActive(p: Property) {
    const res = await fetch(`/api/properties/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const updated = await res.json();
    setProperties((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    toast({ title: `Property ${updated.isActive ? "activated" : "deactivated"}`, variant: "success" });
  }

  const hostels = properties.filter((p) => p.type === "hostel");
  const hotels = properties.filter((p) => p.type === "hotel");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-sm text-gray-500 mt-1">{properties.length} total</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Property
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />)}</div>
        ) : (
          <>
            <PropertyGroup title="Hostels" properties={hostels} onEdit={openEdit} onToggle={toggleActive} />
            <PropertyGroup title="Hotels" properties={hotels} onEdit={openEdit} onToggle={toggleActive} />
          </>
        )}
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Property" : "Add Property"}</DialogTitle>
            <DialogDescription>Fill in the property details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input label="Property Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Tulip @nest" />
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "hostel" | "hotel" }))}>
              <SelectTrigger label="Type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hostel">Hostel</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
              </SelectContent>
            </Select>
            <Input label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Madhapur" />
            <Button className="w-full" onClick={handleSave}>{editing ? "Update" : "Add Property"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyGroup({
  title,
  properties,
  onEdit,
  onToggle,
}: {
  title: string;
  properties: Property[];
  onEdit: (p: Property) => void;
  onToggle: (p: Property) => void;
}) {
  if (!properties.length) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">
        {properties.map((p) => (
          <Card key={p.id} className={p.isActive ? "" : "opacity-60"}>
            <CardContent className="flex items-center gap-3 py-3">
              <Building2 className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.location}</p>
              </div>
              <Badge variant={p.isActive ? "success" : "secondary"}>
                {p.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button size="icon" variant="ghost" onClick={() => onEdit(p)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onToggle(p)}>
                <Power className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
