"use client";

import Link from "next/link";
import { Building2, Users, ListChecks, ClipboardList } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ADMIN_SECTIONS = [
  {
    href: "/admin/properties",
    icon: Building2,
    title: "Properties",
    description: "Add, edit, or deactivate properties. Manage hostel and hotel listings.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    href: "/admin/users",
    icon: Users,
    title: "Users & Access",
    description: "Manage auditor accounts and assign them to specific properties.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    href: "/admin/templates",
    icon: ListChecks,
    title: "Checklist Templates",
    description: "Edit checklist items for rooms, kitchen, and other audit sections.",
    color: "bg-green-100 text-green-600",
  },
  {
    href: "/admin/audits",
    icon: ClipboardList,
    title: "All Audits",
    description: "View and manage all audits across every property.",
    color: "bg-orange-100 text-orange-600",
  },
];

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">Manage properties, users, and audit templates</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ADMIN_SECTIONS.map((s) => (
              <Link key={s.href} href={s.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-2 ${s.color}`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{s.title}</CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
