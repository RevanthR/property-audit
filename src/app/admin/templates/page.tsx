"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ListChecks, MessageSquare, Hash, Building, Hotel } from "lucide-react";
import { toast } from "@/components/ui/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Section definitions ───────────────────────────────────────────────────────

const HOSTEL_SECTIONS: { groupKey: string; label: string; contextPrefix: string }[] = [
  { groupKey: "__hostel_room",  label: "Room Checklist",     contextPrefix: "room_hostel" },
  { groupKey: "__kitchen",      label: "Kitchen Checklist",  contextPrefix: "kitchen" },
  { groupKey: "__asset_hostel", label: "Asset Inventory",    contextPrefix: "asset_inventory_hostel" },
];

const HOTEL_SECTIONS_LIST: { groupKey: string; label: string; contextPrefix: string }[] = [
  { groupKey: "__hotel_room",          label: "Room Checklist",        contextPrefix: "room_hotel" },
  { groupKey: "hotel_front_office",    label: "Front Office",          contextPrefix: "hotel_front_office" },
  { groupKey: "hotel_housekeeping",    label: "Housekeeping",          contextPrefix: "hotel_housekeeping" },
  { groupKey: "hotel_engineering",     label: "Engineering",           contextPrefix: "hotel_engineering" },
  { groupKey: "hotel_food_beverage",   label: "Food & Beverage",       contextPrefix: "hotel_food_beverage" },
  { groupKey: "hotel_property_mgmt",   label: "Property Management",   contextPrefix: "hotel_property_mgmt" },
  { groupKey: "hotel_security",        label: "Security",              contextPrefix: "hotel_security" },
  { groupKey: "hotel_finance",         label: "Finance",               contextPrefix: "hotel_finance" },
  { groupKey: "hotel_hr",              label: "Human Resources",       contextPrefix: "hotel_hr" },
  { groupKey: "hotel_guest_experience",label: "Guest Experience",      contextPrefix: "hotel_guest_experience" },
  { groupKey: "__asset_hotel",         label: "Asset Inventory",       contextPrefix: "asset_inventory_hotel" },
];

// All sections that can be created on-demand by the admin.
// Each hotel section maps to a context that the audit form will load from.
const INITIALIZABLE: Record<string, { context: string; propertyType: string; name: string }> = {
  "__asset_hostel":          { context: "asset_inventory_hostel", propertyType: "hostel", name: "Hostel Asset Inventory" },
  "__asset_hotel":           { context: "asset_inventory_hotel",  propertyType: "hotel",  name: "Hotel Asset Inventory"  },
  "hotel_front_office":      { context: "hotel_front_office",     propertyType: "hotel",  name: "Front Office Checklist"        },
  "hotel_housekeeping":      { context: "hotel_housekeeping",     propertyType: "hotel",  name: "Housekeeping Checklist"         },
  "hotel_engineering":       { context: "hotel_engineering",      propertyType: "hotel",  name: "Engineering Checklist"          },
  "hotel_food_beverage":     { context: "hotel_food_beverage",    propertyType: "hotel",  name: "Food & Beverage Checklist"      },
  "hotel_property_mgmt":     { context: "hotel_property_mgmt",    propertyType: "hotel",  name: "Property Management Checklist"  },
  "hotel_security":          { context: "hotel_security",         propertyType: "hotel",  name: "Security Checklist"             },
  "hotel_finance":           { context: "hotel_finance",          propertyType: "hotel",  name: "Finance Checklist"              },
  "hotel_hr":                { context: "hotel_hr",               propertyType: "hotel",  name: "Human Resources Checklist"      },
  "hotel_guest_experience":  { context: "hotel_guest_experience", propertyType: "hotel",  name: "Guest Experience Checklist"     },
  "__hotel_room":            { context: "room_hotel",             propertyType: "hotel",  name: "Hotel Room Checklist"           },
  "__hostel_room":           { context: "room_hostel",            propertyType: "hostel", name: "Hostel Room Checklist"          },
  "__kitchen":               { context: "kitchen",                propertyType: "hostel", name: "Kitchen Checklist"              },
};

function getGroupKey(context: string): string {
  if (context === "room_hostel") return "__hostel_room";
  if (context === "room_hotel")  return "__hotel_room";
  if (context === "asset_inventory_hostel") return "__asset_hostel";
  if (context === "asset_inventory_hotel")  return "__asset_hotel";
  if (context === "kitchen" || context.startsWith("kitchen_")) return "__kitchen";
  for (const sec of HOTEL_SECTIONS_LIST) {
    if (context.startsWith(sec.contextPrefix)) return sec.groupKey;
  }
  return "__other";
}

const MODULE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  checklist: { icon: <ListChecks className="h-3 w-3" />, label: "Checklist", color: "bg-blue-100 text-blue-700" },
  remarks:   { icon: <MessageSquare className="h-3 w-3" />, label: "Remarks", color: "bg-gray-100 text-gray-600" },
  count:     { icon: <Hash className="h-3 w-3" />, label: "Count", color: "bg-orange-100 text-orange-700" },
  status:    { icon: <ListChecks className="h-3 w-3" />, label: "Status", color: "bg-purple-100 text-purple-700" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  return (
    <AuthGuard requireAdmin>
      <Templates />
    </AuthGuard>
  );
}

function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"hostel" | "hotel">("hostel");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [initializing, setInitializing] = useState<Set<string>>(new Set());
  const [changingType, setChangingType] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data: Template[]) => { setTemplates(data); setLoading(false); });
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function initializeSection(groupKey: string) {
    const def = INITIALIZABLE[groupKey];
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

  async function updateModuleType(templateId: string, moduleType: string) {
    setChangingType((s) => new Set(s).add(templateId));
    try {
      await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleType }),
      });
      setTemplates((prev) =>
        prev.map((t) => t.id === templateId ? { ...t, moduleType } : t)
      );
      toast({ title: "Type updated", variant: "success" });
    } finally {
      setChangingType((s) => { const n = new Set(s); n.delete(templateId); return n; });
    }
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
      setTemplates((prev) => prev.map((t) => t.id === templateId ? { ...t, items: [...t.items, item] } : t));
      setNewItem((prev) => ({ ...prev, [templateId]: "" }));
      toast({ title: "Item added", variant: "success" });
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(templateId); return n; });
    }
  }

  async function removeItem(templateId: string, itemId: string) {
    await fetch(`/api/templates/items/${itemId}`, { method: "DELETE" });
    setTemplates((prev) => prev.map((t) => t.id === templateId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t));
    toast({ title: "Item removed", variant: "success" });
  }

  async function updateItemLabel(templateId: string, item: ChecklistItem, label: string) {
    if (!label.trim() || label === item.itemLabel) return;
    await fetch(`/api/templates/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemLabel: label }),
    });
    setTemplates((prev) => prev.map((t) =>
      t.id === templateId ? { ...t, items: t.items.map((i) => (i.id === item.id ? { ...i, itemLabel: label } : i)) } : t
    ));
  }

  // Group all templates by section key
  const groups = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const key = getGroupKey(t.context);
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const activeSections = tab === "hostel" ? HOSTEL_SECTIONS : HOTEL_SECTIONS_LIST;

  // Count items per tab for the badge
  const hostelCount = HOSTEL_SECTIONS.reduce((n, s) => n + (groups[s.groupKey]?.reduce((m, t) => m + t.items.length, 0) ?? 0), 0);
  const hotelCount  = HOTEL_SECTIONS_LIST.reduce((n, s) => n + (groups[s.groupKey]?.reduce((m, t) => m + t.items.length, 0) ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage checklist items for each audit section. Changes apply to new audits only.
          </p>
        </div>

        {/* Hostel / Hotel tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setTab("hostel")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "hostel"
                ? "bg-green-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Building className="h-4 w-4" />
            Hostel
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === "hostel" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {hostelCount}
            </span>
          </button>
          <button
            onClick={() => setTab("hotel")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "hotel"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Hotel className="h-4 w-4" />
            Hotel
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === "hotel" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {hotelCount}
            </span>
          </button>
        </div>

        {/* Sections */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-200 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {activeSections.map((sec) => {
              const sectionTemplates = groups[sec.groupKey] ?? [];
              const isInitializable = sec.groupKey in INITIALIZABLE;
              const isEmpty = sectionTemplates.length === 0;
              const accentColor = tab === "hostel" ? "text-green-700" : "text-blue-700";
              const borderColor = tab === "hostel" ? "border-l-green-500" : "border-l-blue-500";

              return (
                <section key={sec.groupKey}>
                  <div className={`flex items-center gap-2 mb-3 pl-3 border-l-2 ${borderColor}`}>
                    <h2 className={`text-sm font-semibold ${accentColor} uppercase tracking-wide`}>
                      {sec.label}
                    </h2>
                    {!isEmpty && (
                      <span className="text-xs text-gray-400">
                        ({sectionTemplates.reduce((n, t) => n + t.items.length, 0)} items)
                      </span>
                    )}
                  </div>

                  {/* Empty state — show Create button for any initializable section */}
                  {isInitializable && isEmpty && (
                    <Card className="border-dashed border-gray-300 bg-gray-50">
                      <CardContent className="py-5 flex flex-col items-center gap-3 text-center">
                        <p className="text-sm text-gray-500">
                          No checklist created yet for this section.
                        </p>
                        <button
                          onClick={() => initializeSection(sec.groupKey)}
                          disabled={initializing.has(sec.groupKey)}
                          className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors ${
                            tab === "hostel" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {initializing.has(sec.groupKey) ? "Creating…" : `+ Create ${sec.label} Checklist`}
                        </button>
                      </CardContent>
                    </Card>
                  )}

                  {!isEmpty && (
                    <div className="space-y-2">
                      {sectionTemplates.map((tmpl) => {
                        const isChecklist = tmpl.moduleType === "checklist";
                        const isOpen = expanded.has(tmpl.id);
                        const mtConfig = MODULE_TYPE_CONFIG[tmpl.moduleType] ?? MODULE_TYPE_CONFIG.remarks;
                        const isBusy = changingType.has(tmpl.id);

                        return (
                          <Card key={tmpl.id} className="overflow-hidden">
                            <CardHeader className="py-3 px-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CardTitle className="text-sm font-medium truncate">{tmpl.name}</CardTitle>

                                  {/* Inline moduleType selector — styled as a pill */}
                                  <div className="relative shrink-0">
                                    <select
                                      value={tmpl.moduleType}
                                      disabled={isBusy}
                                      onChange={(e) => updateModuleType(tmpl.id, e.target.value)}
                                      className={`appearance-none cursor-pointer rounded-full pl-6 pr-5 py-0.5 text-[11px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 disabled:opacity-50 ${mtConfig.color}`}
                                      title="Change section type"
                                    >
                                      <option value="checklist">Checklist</option>
                                      <option value="remarks">Remarks</option>
                                      <option value="count">Count</option>
                                      <option value="status">Status</option>
                                    </select>
                                    {/* icon overlay — purely visual, sits on top of the select */}
                                    <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2">
                                      {isBusy
                                        ? <span className="inline-block h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                                        : mtConfig.icon}
                                    </span>
                                    <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-60">
                                      <ChevronDown className="h-2.5 w-2.5" />
                                    </span>
                                  </div>
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
                                  <span className="text-xs text-gray-400 shrink-0 italic">
                                    {tmpl.moduleType === "remarks" ? "Free text" : tmpl.moduleType === "count" ? "Numeric input" : "Status field"}
                                  </span>
                                )}
                              </div>
                            </CardHeader>

                            {isChecklist && isOpen && (
                              <CardContent className="pt-0 pb-4 px-4 border-t border-gray-100">
                                {tmpl.items.length === 0 ? (
                                  <p className="text-xs text-gray-400 py-3 text-center">No items yet — add your first item below</p>
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
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
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
                                    <Plus className="h-4 w-4" />Add
                                  </Button>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
