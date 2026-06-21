"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  key: string;
  label: string;
  href: string;
}

interface StepNavProps {
  steps: Step[];
  currentKey: string;
  completedKeys: string[];
}

export function StepNav({ steps, currentKey, completedKeys }: StepNavProps) {
  return (
    <nav className="overflow-x-auto">
      <ol className="flex items-center gap-0 min-w-max">
        {steps.map((step, i) => {
          const isDone = completedKeys.includes(step.key);
          const isCurrent = step.key === currentKey;
          return (
            <li key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isDone && "border-green-500 bg-green-500 text-white",
                    isCurrent && !isDone && "border-blue-600 bg-blue-600 text-white",
                    !isDone && !isCurrent && "border-gray-300 bg-white text-gray-400"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "mt-1 text-[10px] font-medium whitespace-nowrap",
                    isCurrent && "text-blue-600",
                    isDone && !isCurrent && "text-green-600",
                    !isCurrent && !isDone && "text-gray-400"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mx-1 mb-4",
                    isDone ? "bg-green-400" : "bg-gray-200"
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
