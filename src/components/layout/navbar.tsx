"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LayoutDashboard, Settings, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/store/session";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ...(user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Settings }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <Building2 className="h-5 w-5 text-blue-600" />
            <span className="hidden sm:inline">Property Audit</span>
            <span className="sm:hidden">PA</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden sm:block text-sm text-gray-500">
                {user.name}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>

            {/* Mobile menu toggle */}
            <button
              className="sm:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                pathname === href
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <div className="border-t border-gray-100 pt-2 mt-2">
            <p className="px-3 text-xs text-gray-400 mb-1">Signed in as {user?.name}</p>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
