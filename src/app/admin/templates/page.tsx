"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
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
  propertyType: string;
  items: ChecklistItem[];
}

const CONTEXT_LABELS: Record<string, string> = {
  room_hostel: "Hostel Room Checklist",
  room_hotel: "Hotel Room Checklist",
  kitchen: "Kitchen Checklist",
};

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        // Group by context → show unique context groups
        const mainContexts = ["room_hostel", "room_hotel", "kitchen"];
        setTemplates(data.filter((t: Template) => mainContexts.some((c) => t.context.startsWith(c.split("_")[0]))));
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
  }

  async function removeItem(templateId: string, itemId: string) {
    await fetch(`/api/templates/items/${itemId}`, { method: "DELETE" });
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, items: t.items.filter((i) => i.id !== itemId) }
          : t
      )
    );
    toast({ title: "Item removed", variant: "success" });
  }

  async function updateItemLabel(templateId: string, item: ChecklistItem, label: string) {
    await fetch(`/api/templates/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemLabel: label }),
    });
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, items: t.items.map((i) => i.id === item.id ? { ...i, itemLabel: label } : i) }
          : t
      )
    );
  }

  // Group templates by context prefix
  const byContext = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const ctx = t.context.startsWith("room_hostel") ? "room_hostel"
      : t.context.startsWith("room_hotel") ? "room_hotel"
      : "kitchen";
    if (!acc[ctx]) acc[ctx] = [];
    acc[ctx].push(t);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit checklist items. Changes apply to new audits only — existing audits keep their original items.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />)}</div>
        ) : (
          Object.entries(byContext).map(([ctx, tmpls]) => (
            <div key={ctx}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {CONTEXT_LABELS[ctx] || ctx}
              </h2>
              <div className="space-y-3">
                {tmpls.map((tmpl) => (
                  <Card key={tmpl.id}>
                    <CardHeader className="pb-2">
                      <button
                        onClick={() => toggle(tmpl.id)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <CardTitle className="text-sm">{tmpl.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{tmpl.items.length} items</Badge>
                          {expanded.has(tmpl.id) ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>
                    </CardHeader>

                    {expanded.has(tmpl.id) && (
                      <CardContent className="pt-0 space-y-2">
                        {tmpl.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 group">
                            <GripVertical className="h-4 w-4 text-gray-200 shrink-0" />
                            <input
                              className="flex-1 text-sm border border-transparent rounded px-2 py-1 hover:border-gray-200 focus:border-blue-400 focus:outline-none bg-transparent"
                              defaultValue={item.itemLabel}
                              onBlur={(e) => {
                                if (e.target.value !== item.itemLabel) {
                                  updateItemLabel(tmpl.id, item, e.target.value);
                                }
                              }}
                            />
                            <button
                              onClick={() => removeItem(tmpl.id, item.id)}
                              className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}

                        {/* Add new item */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <Input
                            placeholder="Add new item..."
                            value={newItem[tmpl.id] || ""}
                            onChange={(e) => setNewItem((prev) => ({ ...prev, [tmpl.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && addItem(tmpl.id)}
                            className="text-sm"
                          />
                          <Button size="sm" onClick={() => addItem(tmpl.id)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
