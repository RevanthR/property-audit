"use client";

import { useState, useRef } from "react";
import { Plus, X } from "lucide-react";

interface Props {
  onAdd: (label: string) => void;
  placeholder?: string;
}

export function AddChecklistItemInline({ onAdd, placeholder = "Type item and press Enter..." }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function expand() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    const label = value.trim();
    if (!label) return;
    onAdd(label);
    setValue("");
    // Stay open so the user can add multiple items back-to-back
    inputRef.current?.focus();
  }

  function dismiss() {
    setOpen(false);
    setValue("");
  }

  if (!open) {
    return (
      <button
        onClick={expand}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-gray-200 hover:border-blue-300 transition-colors mt-2"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        Add item
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") dismiss();
        }}
        placeholder={placeholder}
        className="flex-1 text-sm border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        onClick={commit}
        disabled={!value.trim()}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        Add
      </button>
      <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
