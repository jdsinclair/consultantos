"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, ArrowLeft } from "lucide-react";

interface DuplicateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueHere: () => void;
  onGoBack: () => void;
  isRecording: boolean;
}

export function DuplicateSessionModal({
  open,
  onOpenChange,
  onContinueHere,
  onGoBack,
  isRecording,
}: DuplicateSessionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <DialogTitle>Session Already Open</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {isRecording ? (
              <>
                This session is currently being{" "}
                <span className="font-medium text-foreground">recorded</span> in
                another browser tab.
              </>
            ) : (
              <>
                This session is already open in another browser tab. Opening it
                here could cause conflicts.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
          <p className="font-medium text-foreground">
            {isRecording
              ? "To avoid recording conflicts:"
              : "To avoid data conflicts:"}
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>
                Look for the other tab in your browser&apos;s tab bar - it may
                show the session name
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>
                Use <kbd className="px-1.5 py-0.5 bg-background rounded border text-xs font-mono">Ctrl/Cmd + Shift + A</kbd> to search your tabs
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>
                Or close the other tab and continue here
              </span>
            </li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onGoBack}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button
            variant={isRecording ? "destructive" : "default"}
            onClick={onContinueHere}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {isRecording ? "Take Over Recording" : "Continue Here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
