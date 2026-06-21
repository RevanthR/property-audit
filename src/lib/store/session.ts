"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionUser {
  id: string;
  name: string;
  role: "admin" | "auditor";
}

interface SessionStore {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
}

export const useSession = create<SessionStore>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: "pa-session" }
  )
);
