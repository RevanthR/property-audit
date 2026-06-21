"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { create } from "zustand";

// ─── Toast store ─────────────────────────────────────────────────────────────

type ToastVariant = "default" | "success" | "destructive";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (t: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (t) =>
    set((s) => ({
      toasts: [...s.toasts, { ...t, id: Math.random().toString(36).slice(2) }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(t: Omit<ToastItem, "id">) {
  useToastStore.getState().addToast(t);
}

// ─── Toaster component ────────────────────────────────────────────────────────

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open
          onOpenChange={(open) => !open && removeToast(t.id)}
          className={cn(
            "fixed bottom-4 right-4 z-[100] flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-4 shadow-lg",
            t.variant === "destructive" && "border-red-200 bg-red-50",
            t.variant === "success" && "border-green-200 bg-green-50"
          )}
        >
          {t.variant === "success" && <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
          {t.variant === "destructive" && <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
          {(!t.variant || t.variant === "default") && <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <ToastPrimitive.Title className="text-sm font-semibold text-gray-900">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="mt-0.5 text-xs text-gray-500">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close
            onClick={() => removeToast(t.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  );
}
