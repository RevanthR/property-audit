"use client";

import { AlertTriangle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface SectionConflictDialogProps {
  open: boolean;
  lockedBy: string;
  sectionLabel: string;
  onTakeover: () => void;
  onDismiss: () => void;
}

export function SectionConflictDialog({
  open,
  lockedBy,
  sectionLabel,
  onTakeover,
  onDismiss,
}: SectionConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Section in use</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                <strong>{lockedBy}</strong> is currently editing <strong>{sectionLabel}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-gray-600 mt-1">
          If you both edit this section at the same time, the last save wins. You can take over or choose a different section.
        </p>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onDismiss}>
            Pick another section
          </Button>
          <Button className="flex-1" onClick={onTakeover}>
            <UserCheck className="h-4 w-4" />
            Take over
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
