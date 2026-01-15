// Real-time transcription using Deepgram SDK
// This is a client-side hook for capturing audio and sending to Deepgram
// Supports both browser (limited) and Electron (full system audio) modes

import { createClient, LiveTranscriptionEvents, LiveClient } from "@deepgram/sdk";

export interface TranscriptSegment {
  text: string;
  speaker: string;
  timestamp: number;
  isFinal: boolean;
}

export interface TranscriptionConfig {
  onTranscript: (segment: TranscriptSegment) => void;
  onError: (error: Error) => void;
  onStreamReady?: (stream: MediaStream) => void;
  onStatusChange?: (status: TranscriptionStatus) => void;
}

export type TranscriptionStatus =
  | "idle"
  | "requesting_permissions"
  | "connecting"
  | "connected"
  | "recording"
  | "error"
  | "stopped";

export type AudioSource = "microphone" | "system" | "both";

// Check if running in Electron
export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI?.isElectron;
}

// Get available audio sources (only works in Electron)
export async function getAudioSources(): Promise<Array<{ id: string; name: string; thumbnail: string }>> {
  if (!isElectron()) return [];
  return window.electronAPI!.getSystemAudioSources();
}

export class RealtimeTranscription {
  private connection: LiveClient | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private config: TranscriptionConfig;
  private status: TranscriptionStatus = "idle";

  constructor(config: TranscriptionConfig) {
    this.config = config;
  }

  private setStatus(status: TranscriptionStatus) {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  getStatus(): TranscriptionStatus {
    return this.status;
  }

  getStream(): MediaStream | null {
    return this.combinedStream || this.micStream;
  }

  /**
   * Start transcription with specified audio source
   * @param source - "microphone" for mic only, "system" for screen share audio, "both" for mixed
   * @param electronSourceId - Optional: specific source ID when running in Electron
   */
  async start(source: AudioSource = "microphone", electronSourceId?: string) {
    try {
      this.setStatus("requesting_permissions");

      // Check if running in Electron for enhanced system audio capture
      const inElectron = isElectron();

      if (source === "microphone" || source === "both") {
        // Get microphone access
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      }

      if (source === "system" || source === "both") {
        if (inElectron && electronSourceId) {
          // Electron mode: Use desktopCapturer for true system audio
          try {
            const constraints = await window.electronAPI!.captureSystemAudio(electronSourceId);
            // In Electron, getUserMedia can capture desktop audio with these constraints
            this.systemStream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);

            // We get both audio and video tracks, stop video
            this.systemStream.getVideoTracks().forEach(track => track.stop());

            if (this.systemStream.getAudioTracks().length === 0) {
              throw new Error("No audio track captured from system");
            }
            console.log("Electron: System audio captured successfully");
          } catch (err) {
            console.error("Electron system audio capture failed:", err);
            if (source === "system") throw err;
          }
        } else {
          // Browser mode: Use getDisplayMedia (requires user to share screen with audio)
          try {
            this.systemStream = await navigator.mediaDevices.getDisplayMedia({
              video: true, // Required, but we'll ignore it
              audio: {
                // @ts-expect-error - Chrome-specific audio constraints
                suppressLocalAudioPlayback: false,
              },
            });

            // Stop the video track - we only want audio
            this.systemStream.getVideoTracks().forEach(track => track.stop());

            // Check if we got audio
            if (this.systemStream.getAudioTracks().length === 0) {
              console.warn("No system audio captured - user may not have selected 'Share audio'");
              if (source === "system") {
                throw new Error("No system audio captured. Make sure to check 'Share audio' when sharing.");
              }
            }
          } catch (err) {
            if (source === "system") throw err;
            // For "both" mode, continue with just mic if system audio fails
            console.warn("System audio capture failed, continuing with microphone only:", err);
          }
        }
      }

      // Combine streams if we have both
      if (this.micStream && this.systemStream?.getAudioTracks().length) {
        this.combinedStream = this.mixAudioStreams(this.micStream, this.systemStream);
      } else {
        this.combinedStream = this.micStream || this.systemStream || null;
      }

      if (!this.combinedStream) {
        throw new Error("No audio stream available");
      }

      // Notify that stream is ready (for visualization)
      this.config.onStreamReady?.(this.combinedStream);

      // Connect to Deepgram using SDK
      this.setStatus("connecting");
      await this.connectDeepgram();
    } catch (error) {
      this.setStatus("error");
      this.config.onError(error as Error);
      throw error;
    }
  }

  private mixAudioStreams(stream1: MediaStream, stream2: MediaStream): MediaStream {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // Connect first stream
    const source1 = audioContext.createMediaStreamSource(stream1);
    source1.connect(destination);

    // Connect second stream
    const source2 = audioContext.createMediaStreamSource(stream2);
    source2.connect(destination);

    return destination.stream;
  }

  private async connectDeepgram() {
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

    // Debug: log key info (not the full key for security)
    console.log("Deepgram key check:", {
      exists: !!apiKey,
      length: apiKey?.length,
      prefix: apiKey?.substring(0, 8) + "...",
    });

    if (!apiKey) {
      throw new Error("Deepgram API key not configured. Add NEXT_PUBLIC_DEEPGRAM_API_KEY to your environment.");
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const deepgram = createClient(apiKey);

        this.connection = deepgram.listen.live({
          model: "nova-2",
          language: "en",
          smart_format: true,
          diarize: true,
          punctuate: true,
          interim_results: true,
          endpointing: 300,
        });

        // Set a timeout for initial connection
        const connectionTimeout = setTimeout(() => {
          console.error("Deepgram connection timeout");
          this.connection?.finish();
          reject(new Error("Connection timeout - check your Deepgram API key"));
        }, 15000);

        this.connection.on(LiveTranscriptionEvents.Open, () => {
          clearTimeout(connectionTimeout);
          console.log("Deepgram connection opened via SDK");
          this.setStatus("connected");
          this.startRecording();
          resolve();
        });

        this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          if (data.channel?.alternatives?.[0]) {
            const alt = data.channel.alternatives[0];
            const words = alt.words || [];
            const speakers = new Set(words.map((w: { speaker?: number }) => w.speaker).filter((s: number | undefined) => s !== undefined));
            const speaker = speakers.size > 0 ? `Speaker ${words[0]?.speaker ?? 0}` : "Speaker 0";

            const segment: TranscriptSegment = {
              text: alt.transcript,
              speaker,
              timestamp: data.start || Date.now(),
              isFinal: data.is_final || false,
            };
            if (segment.text.trim()) {
              this.config.onTranscript(segment);
            }
          }
        });

        this.connection.on(LiveTranscriptionEvents.Error, (err) => {
          clearTimeout(connectionTimeout);
          console.error("Deepgram SDK error:", err);
          this.setStatus("error");

          const errorMessage = err?.message || "Deepgram connection error";
          if (errorMessage.includes("401") || errorMessage.includes("auth")) {
            reject(new Error("Deepgram API key invalid or expired"));
          } else {
            reject(new Error(errorMessage));
          }
        });

        this.connection.on(LiveTranscriptionEvents.Close, () => {
          console.log("Deepgram connection closed");
          if (this.status === "recording") {
            this.setStatus("stopped");
          }
        });

      } catch (err) {
        console.error("Failed to create Deepgram client:", err);
        reject(new Error("Failed to initialize Deepgram SDK"));
      }
    });
  }

  private startRecording() {
    if (!this.combinedStream || !this.connection) return;

    this.setStatus("recording");

    // Try to use a compatible mime type
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

    this.mediaRecorder = new MediaRecorder(this.combinedStream, {
      mimeType,
    });

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.connection) {
        // Convert Blob to ArrayBuffer and send
        const buffer = await event.data.arrayBuffer();
        this.connection.send(buffer);
      }
    };

    this.mediaRecorder.start(250); // Send audio every 250ms
  }

  stop() {
    this.setStatus("stopped");

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
    }
    if (this.systemStream) {
      this.systemStream.getTracks().forEach((track) => track.stop());
    }
    if (this.connection) {
      this.connection.finish();
    }
    this.mediaRecorder = null;
    this.micStream = null;
    this.systemStream = null;
    this.combinedStream = null;
    this.connection = null;
  }
}

// Alternative: Upload audio file for transcription
export async function transcribeAudioFile(
  file: File
): Promise<{ transcript: string; segments: TranscriptSegment[] }> {
  const formData = new FormData();
  formData.append("audio", file);

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Transcription failed");
  }

  return response.json();
}
