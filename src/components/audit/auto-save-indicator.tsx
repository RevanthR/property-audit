"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoSaveIndicatorProps {
  lastSyncedAt: string | null;
  isSaving?: boolean;
}

export function AutoSaveIndicator({ lastSyncedAt, isSaving }: AutoSaveIndicatorProps) {
  const [label, setLabel] = useState("Not saved");

  useEffect(() => {
    if (!lastSyncedAt) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 1000);
      if (diff < 5) setLabel("Saved just now");
      else if (diff < 60) setLabel(`Saved ${diff}s ago`);
      else setLabel(`Saved ${Math.floor(diff / 60)}m ago`);
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, [lastSyncedAt]);

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", lastSyncedAt ? "text-gray-400" : "text-gray-300")}>
      {isSaving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
      ) : lastSyncedAt ? (
        <Cloud className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <CloudOff className="h-3.5 w-3.5" />
      )}
      <span>{isSaving ? "Saving..." : lastSyncedAt ? label : "Draft (not synced)"}</span>
    </div>
  );
}
