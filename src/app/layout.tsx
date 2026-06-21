import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";

export const metadata: Metadata = {
  title: "Property Audit | @nest",
  description: "Audit management for @nest properties",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Property Audit" },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50 antialiased">
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
