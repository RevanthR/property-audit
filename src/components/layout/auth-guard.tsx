"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/store/session";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin }: AuthGuardProps) {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireAdmin && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, requireAdmin, router]);

  if (!user) return null;
  if (requireAdmin && user.role !== "admin") return null;

  return <>{children}</>;
}
