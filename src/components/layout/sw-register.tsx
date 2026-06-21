"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // In development, unregister all SWs and clear their caches so stale
      // chunks don't break HMR (the SW would cache /_next/static files and
      // serve them after HMR rebuilds them, causing ChunkLoadErrors).
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed — still works without it
    });
  }, []);
  return null;
}
