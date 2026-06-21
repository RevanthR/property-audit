"use client";

import { memo, useState, useEffect, useRef } from "react";
import { ConditionSelect } from "./condition-select";
import { Textarea } from "@/components/ui/textarea";
import type { ChecklistEntry, Condition } from "@/lib/store/audit";
import { cn } from "@/lib/utils";

interface ChecklistItemRowProps {
  item: ChecklistEntry;
  onChange: (updated: ChecklistEntry) => void;
  showError?: boolean;
}

function ChecklistItemRowInner({ item, onChange, showError }: ChecklistItemRowProps) {
  const needsRemarks = item.condition === "not_ok";
  const hasRemarkError = showError && needsRemarks && !item.remarks.trim();

  // Local state for remarks — debounce before writing to Zustand
  const [localRemarks, setLocalRemarks] = useState(item.remarks);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keep local in sync if parent resets the item (e.g. on load)
  useEffect(() => {
    setLocalRemarks(item.remarks);
  }, [item.itemId]);

  function handleRemarksChange(value: string) {
    setLocalRemarks(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...item, remarks: value });
    }, 300);
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        item.condition === "not_ok" && "border-red-200 bg-red-50/30",
        item.condition === "ok" && "border-green-200 bg-green-50/20",
        item.condition === "not_available" && "border-gray-200 bg-gray-50/30",
        !item.condition && "border-gray-200 bg-white"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="flex-1 text-sm text-gray-800 font-medium">{item.itemLabel}</span>
        <ConditionSelect
          value={item.condition}
          onChange={(v: Condition) => onChange({ ...item, condition: v })}
        />
      </div>

      {needsRemarks && (
        <Textarea
          placeholder="Remarks (required)"
          value={localRemarks}
          required
          onChange={(e) => handleRemarksChange(e.target.value)}
          error={hasRemarkError ? "Remarks are required when condition is Not Ok" : undefined}
          rows={2}
          className="text-sm"
        />
      )}

      {!needsRemarks && item.condition && (
        <Textarea
          placeholder="Optional remarks..."
          value={localRemarks}
          onChange={(e) => handleRemarksChange(e.target.value)}
          rows={1}
          className="text-sm"
        />
      )}
    </div>
  );
}

export const ChecklistItemRow = memo(ChecklistItemRowInner);
