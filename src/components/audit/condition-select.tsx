"use client";

import { cn } from "@/lib/utils";
import type { Condition } from "@/lib/store/audit";

interface ConditionSelectProps {
  value: Condition | null;
  onChange: (v: Condition) => void;
  disabled?: boolean;
}

const OPTIONS: { value: Condition; label: string; styles: string }[] = [
  {
    value: "ok",
    label: "Ok",
    styles:
      "border-green-300 text-green-700 bg-green-50 data-[selected=true]:bg-green-600 data-[selected=true]:text-white data-[selected=true]:border-green-600",
  },
  {
    value: "not_ok",
    label: "Not Ok",
    styles:
      "border-red-300 text-red-700 bg-red-50 data-[selected=true]:bg-red-600 data-[selected=true]:text-white data-[selected=true]:border-red-600",
  },
  {
    value: "not_available",
    label: "N/A",
    styles:
      "border-gray-300 text-gray-600 bg-gray-50 data-[selected=true]:bg-gray-500 data-[selected=true]:text-white data-[selected=true]:border-gray-500",
  },
];

export function ConditionSelect({ value, onChange, disabled }: ConditionSelectProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          data-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50",
            opt.styles
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
