"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check, AlertCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  key: string;
  label: string;
  href: string;
}

export type StepStatus = "done" | "error" | "in-progress" | "untouched";

interface StepNavProps {
  steps: Step[];
  currentKey: string;
  stepStatuses: Record<string, StepStatus>;
}

export function StepNav({ steps, currentKey, stepStatuses }: StepNavProps) {
  const navRef = useRef<HTMLElement>(null);

  // Scroll the active step into view on mobile when the step changes
  useEffect(() => {
    if (!navRef.current) return;
    const active = navRef.current.querySelector<HTMLElement>("[data-current]");
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [currentKey]);

  return (
    <nav ref={navRef} className="overflow-x-auto py-1">
      <ol className="flex items-center gap-0 min-w-max">
        {steps.map((step, i) => {
          const status = stepStatuses[step.key] ?? "untouched";
          const isCurrent = step.key === currentKey;

          return (
            <li key={step.key} className="flex items-center" {...(isCurrent ? { "data-current": "" } : {})}>
              <Link href={step.href} className="flex flex-col items-center group">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    status === "done" && !isCurrent && "border-green-500 bg-green-500 text-white",
                    status === "error" && !isCurrent && "border-red-500 bg-red-50 text-red-600",
                    status === "in-progress" && !isCurrent && "border-blue-300 bg-blue-50 text-blue-600",
                    status === "untouched" && !isCurrent && "border-gray-200 bg-white text-gray-400",
                    isCurrent && status === "done" && "border-green-500 bg-green-500 text-white ring-2 ring-green-200 ring-offset-1",
                    isCurrent && status === "error" && "border-red-500 bg-red-500 text-white ring-2 ring-red-200 ring-offset-1",
                    isCurrent && status !== "done" && status !== "error" && "border-blue-600 bg-blue-600 text-white ring-2 ring-blue-200 ring-offset-1",
                    "group-hover:scale-110 transition-transform"
                  )}
                >
                  {status === "done" ? (
                    <Check className="h-4 w-4" />
                  ) : status === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : status === "untouched" ? (
                    <span>{i + 1}</span>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1 text-[10px] font-medium whitespace-nowrap",
                    isCurrent && "text-blue-600",
                    !isCurrent && status === "done" && "text-green-600",
                    !isCurrent && status === "error" && "text-red-500",
                    !isCurrent && (status === "untouched" || status === "in-progress") && "text-gray-400"
                  )}
                >
                  {step.label}
                </span>
              </Link>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-6 mx-1 mb-4",
                    status === "done" ? "bg-green-300" : "bg-gray-200"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
