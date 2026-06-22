"use client";

import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ListChecks, MessageSquare, Hash } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ChecklistItem {
  id: string;
  itemLabel: string;
  moduleType: string;
  orderIndex: number;
  isActive: boolean;
}

interface Template {
  id: string;
  name: string;
  context: string;
  moduleType: string;
  items: ChecklistItem[];
}

// Maps context prefix → display group label
const HOTEL_SECTION_PREFIXES: Record<string, string> = {
  hotel_front_office: "Front Office",
  hotel_housekeeping: "Housekeeping",
  hotel_engineering: "Engineering",
  hotel_food_beverage: "Food & Beverage",
  hotel_property_mgmt: "Property Management",
  hotel_security: "Security",
  hotel_finance: "Finance",
  hotel_hr: "Human Resources",
  hotel_guest_experience: "Guest Experience",
};

function getGroupKey(context: string): string {
  if (context === "room_hostel") return "__hostel_room";
  if (context === "room_hotel") return "__hotel_room";
  if (context === "kitchen" || context.startsWith("kitchen_")) return "__kitchen";
  if (context === "asset_inventory_hostel") return "__asset_hostel";
  if (context === "asset_inventory_hotel") return "__asset_hotel";
  for (const prefix of Object.keys(HOTEL_SECTION_PREFIXES)) {
    if (context.startsWith(prefix)) return prefix;
  }
  return "__other";
}

function getGroupLabel(key: string): string {
  if (key === "__hostel_room") return "Hostel Room Checklist";
  if (key === "__hotel_room") return "Hotel Room Checklist";
  if (key === "__kitchen") return "Kitchen Checklist";
  if (key === "__asset_hostel") return "Hostel Asset Inventory";
  if (key === "__asset_hotel") return "Hotel Asset Inventory";
  if (key === "__other") return "Other";
  return HOTEL_SECTION_PREFIXES[key] ?? key;
}

const MODULE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  checklist: { icon: <ListChecks className="h-3 w-3" />, label: "Checklist", color: "bg-blue-100 text-blue-700" },
  remarks:   { icon: <MessageSquare className="h-3 w-3" />, label: "Remarks", color: "bg-gray-100 text-gray-600" },
  count:     { icon: <Hash className="h-3 w-3" />, label: "Count", color: "bg-orange-100 text-orange-700" },
  status:    { icon: <ListChecks className="h-3 w-3" />, label: "Status", color: "bg-purple-100 text-purple-700" },
};

export default function TemplatesPage() {
  return (
    <AuthGuard requireAdmin>
      <Templates />
    </AuthGuard>
  );
}

// Asset inventory sections that must always be visible even before template records exist
const ASSET_SECTIONS: Record<string, { groupKey: string; context: string; propertyType: string; name: string }> = {
  "__asset_hostel": { groupKey: "__asset_hostel", context: "asset_inventory_hostel", propertyType: "hostel", name: "Hostel Asset Inventory" },
  "__asset_hotel":  { groupKey: "__asset_hotel",  context: "asset_inventory_hotel",  propertyType: "hotel",  name: "Hotel Asset Inventory"  },
};

function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [initializing, setInitializing] = useState<Set<string>>(new Set());

  async function initializeSection(groupKey: string) {
    const def = ASSET_SECTIONS[groupKey];
    if (!def) return;
    setInitializing((s) => new Set(s).add(groupKey));
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyType: def.propertyType, context: def.context, name: def.name }),
      });
      const tmpl: Template = await res.json();
      setTemplates((prev) => [...prev, tmpl]);
    } finally {
      setInitializing((s) => { const n = new Set(s); n.delete(groupKey); return n; });
    }
  }

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data: Template[]) => {
        setTemplates(data);
        setLoading(false);
      });
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function addItem(templateId: string) {
    const label = newItem[templateId]?.trim();
    if (!label) return;
    setSaving((s) => new Set(s).add(templateId));
    try {
      const res = await fetch(`/api/templates/${templateId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemLabel: label, moduleType: "checklist", orderIndex: 9999 }),
      });
      const item = await res.json();
      setTemplates((prev) =>
        prev.map((t) => t.id === templateId ? { ...t, items: [...t.items, item] } : t)
      );
      setNewItem((prev) => ({ ...prev, [templateId]: "" }));
      toast({ title: "Item added", variant: "success" });
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(templateId); return n; });
    }
  }

  async function removeItem(templateId: string, itemId: string) {
    await fetch(`/api/templates/items/${itemId}`, { method: "DELETE" });
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t
      )
    );
    toast({ title: "Item removed", variant: "success" });
  }

  async function updateItemLabel(templateId: string, item: ChecklistItem, label: string) {
    if (!label.trim() || label === item.itemLabel) return;
    await fetch(`/api/templates/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemLabel: label }),
    });
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, items: t.items.map((i) => (i.id === item.id ? { ...i, itemLabel: label } : i)) }
          : t
      )
    );
  }

  // Group templates by section
  const groups = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const key = getGroupKey(t.context);
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  // Asset inventory sections always appear even before DB records exist
  const orderedKeys = [
    "__hostel_room",
    "__hotel_room",
    "__kitchen",
    "__asset_hostel",  // always shown
    "__asset_hotel",   // always shown
    ...Object.keys(HOTEL_SECTION_PREFIXES),
    "__other",
  ].filter((k) => k in ASSET_SECTIONS || groups[k]?.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage checklist items for each audit section. Changes apply to new audits only.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          orderedKeys.map((groupKey) => (
            <section key={groupKey}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                {getGroupLabel(groupKey)}
              </h2>

              {/* Empty state for asset inventory sections — show Initialize button */}
              {groupKey in ASSET_SECTIONS && !groups[groupKey]?.length && (
                <Card className="border-dashed border-gray-300 bg-gray-50">
                  <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-gray-500">
                      No checklist items yet. Initialize this section to start adding assets.
                    </p>
                    <button
                      onClick={() => initializeSection(groupKey)}
                      disabled={initializing.has(groupKey)}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {initializing.has(groupKey) ? "Initializing…" : `Initialize ${getGroupLabel(groupKey)}`}
                    </button>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {(groups[groupKey] ?? []).map((tmpl) => {
                  const isChecklist = tmpl.moduleType === "checklist";
                  const isOpen = expanded.has(tmpl.id);
                  const mtConfig = MODULE_TYPE_CONFIG[tmpl.moduleType] ?? MODULE_TYPE_CONFIG.remarks;

                  return (
                    <Card key={tmpl.id} className="overflow-hidden">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <CardTitle className="text-sm font-medium truncate">{tmpl.name}</CardTitle>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${mtConfig.color}`}>
                              {mtConfig.icon}
                              {mtConfig.label}
                            </span>
                          </div>

                          {isChecklist && (
                            <button
                              onClick={() => toggle(tmpl.id)}
                              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0"
                            >
                              <span>{tmpl.items.length} items</span>
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}

                          {!isChecklist && (
                            <span className="text-xs text-gray-400 shrink-0">No checklist items</span>
                          )}
                        </div>
                      </CardHeader>

                      {isChecklist && isOpen && (
                        <CardContent className="pt-0 pb-4 px-4 border-t border-gray-100">
                          {tmpl.items.length === 0 ? (
                            <p className="text-xs text-gray-400 py-3 text-center">
                              No items yet — add your first item below
                            </p>
                          ) : (
                            <ul className="space-y-1 py-2">
                              {tmpl.items.map((item, idx) => (
                                <li key={item.id} className="flex items-center gap-2 group">
                                  <span className="text-xs text-gray-300 w-5 text-right shrink-0">{idx + 1}.</span>
                                  <GripVertical className="h-4 w-4 text-gray-200 shrink-0" />
                                  <input
                                    className="flex-1 text-sm border border-transparent rounded px-2 py-1 hover:border-gray-200 focus:border-blue-400 focus:outline-none bg-transparent"
                                    defaultValue={item.itemLabel}
                                    onBlur={(e) => updateItemLabel(tmpl.id, item, e.target.value)}
                                  />
                                  <button
                                    onClick={() => removeItem(tmpl.id, item.id)}
                                    className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    title="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Add new item */}
                          <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
                            <Input
                              placeholder="Type item name and press Enter or click +"
                              value={newItem[tmpl.id] || ""}
                              onChange={(e) => setNewItem((prev) => ({ ...prev, [tmpl.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && addItem(tmpl.id)}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => addItem(tmpl.id)}
                              disabled={saving.has(tmpl.id) || !newItem[tmpl.id]?.trim()}
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
