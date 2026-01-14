import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Get available audio/video sources for capture
  getSystemAudioSources: () => ipcRenderer.invoke("get-system-audio-source"),

  // Get constraints for capturing system audio from a specific source
  captureSystemAudio: (sourceId: string) => ipcRenderer.invoke("capture-system-audio", sourceId),

  // Check if running in Electron
  isElectron: true,

  // Platform info
  platform: process.platform,
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI?: {
      getSystemAudioSources: () => Promise<
        Array<{
          id: string;
          name: string;
          thumbnail: string;
        }>
      >;
      captureSystemAudio: (sourceId: string) => Promise<{
        audio: MediaTrackConstraints;
        video: MediaTrackConstraints;
      }>;
      isElectron: boolean;
      platform: string;
    };
  }
}
