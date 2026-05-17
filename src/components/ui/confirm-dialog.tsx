"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// ConfirmDialog — a controlled confirmation modal for destructive/normal actions
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the open state should change (e.g., on close or cancel). */
  onOpenChange: (open: boolean) => void;
  /** Dialog heading. */
  title: string;
  /** Explanatory text below the heading. */
  description: string;
  /** Called when the user clicks the confirm button. Dialog does NOT auto-close — caller must set open={false}. */
  onConfirm: () => void;
  /** Called when the user clicks cancel. Defaults to closing the dialog. */
  onCancel?: () => void;
  /** Visual style: "default" uses primary button, "destructive" uses red. */
  variant?: "default" | "destructive";
  /** Text for the confirm button. Default: "Confirm" */
  confirmLabel?: string;
  /** Text for the cancel button. Default: "Cancel" */
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  variant = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";

  const handleCancel = (): void => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = (): void => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isDestructive && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
