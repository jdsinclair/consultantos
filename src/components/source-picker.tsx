"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Monitor, AppWindow } from "lucide-react";
import { getAudioSources, isElectron } from "@/lib/transcription";

interface AudioSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface SourcePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sourceId: string) => void;
}

export function SourcePicker({ open, onClose, onSelect }: SourcePickerProps) {
  const [sources, setSources] = useState<AudioSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open && isElectron()) {
      setLoading(true);
      getAudioSources().then((sources) => {
        setSources(sources);
        setLoading(false);
      });
    }
  }, [open]);

  const handleSelect = () => {
    if (selectedId) {
      onSelect(selectedId);
      onClose();
    }
  };

  // Filter to show screens first, then windows
  const screens = sources.filter(
    (s) => s.name.includes("Screen") || s.name.includes("Display") || s.name.includes("Entire")
  );
  const windows = sources.filter(
    (s) => !s.name.includes("Screen") && !s.name.includes("Display") && !s.name.includes("Entire")
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Select Audio Source
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Select the window or screen to capture audio from. For Zoom calls, select the Zoom
              window to capture both sides of the conversation.
            </p>

            {/* Screens */}
            {screens.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Screens (captures all audio)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {screens.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => setSelectedId(source.id)}
                      className={`relative rounded-lg border-2 p-2 text-left transition-all hover:border-primary ${
                        selectedId === source.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="w-full h-24 object-cover rounded bg-muted"
                      />
                      <p className="mt-2 text-sm font-medium truncate">{source.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Windows */}
            {windows.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AppWindow className="h-4 w-4" />
                  Application Windows
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {windows.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => setSelectedId(source.id)}
                      className={`relative rounded-lg border-2 p-2 text-left transition-all hover:border-primary ${
                        selectedId === source.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <img
                        src={source.thumbnail}
                        alt={source.name}
                        className="w-full h-20 object-cover rounded bg-muted"
                      />
                      <p className="mt-2 text-xs font-medium truncate">{source.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sources.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                No audio sources available
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSelect} disabled={!selectedId}>
                Start Recording
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if we're in Electron
export function useIsElectron() {
  const [inElectron, setInElectron] = useState(false);

  useEffect(() => {
    setInElectron(isElectron());
  }, []);

  return inElectron;
}
