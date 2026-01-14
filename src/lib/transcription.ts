// Real-time transcription using Deepgram
// This is a client-side hook for capturing audio and sending to Deepgram
// Supports both browser (limited) and Electron (full system audio) modes

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
  private socket: WebSocket | null = null;
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

      // Connect to Deepgram WebSocket
      this.setStatus("connecting");
      await this.connectWebSocket();
    } catch (error) {
      this.setStatus("error");
      this.config.onError(error as Error);
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

  private async connectWebSocket() {
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("Deepgram API key not configured. Add NEXT_PUBLIC_DEEPGRAM_API_KEY to your environment.");
    }

    const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&diarize=true&punctuate=true&interim_results=true`;

    // Track if we ever successfully connected
    let hasConnected = false;

    return new Promise<void>((resolve, reject) => {
      try {
        this.socket = new WebSocket(wsUrl, ["token", apiKey]);
      } catch (err) {
        reject(new Error("Failed to create WebSocket connection"));
        return;
      }

      // Set a timeout for initial connection
      const connectionTimeout = setTimeout(() => {
        if (!hasConnected) {
          this.socket?.close();
          reject(new Error("Connection timeout - check your Deepgram API key"));
        }
      }, 10000);

      this.socket.onopen = () => {
        hasConnected = true;
        clearTimeout(connectionTimeout);
        console.log("Deepgram connection opened");
        this.setStatus("connected");
        this.startRecording();
        resolve();
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel?.alternatives?.[0]) {
          const alt = data.channel.alternatives[0];
          const segment: TranscriptSegment = {
            text: alt.transcript,
            speaker: `Speaker ${alt.words?.[0]?.speaker || 0}`,
            timestamp: data.start || Date.now(),
            isFinal: data.is_final || false,
          };
          if (segment.text.trim()) {
            this.config.onTranscript(segment);
          }
        }
      };

      this.socket.onerror = (error) => {
        console.error("Deepgram WebSocket error:", error);
        clearTimeout(connectionTimeout);
        if (!hasConnected) {
          // Error before connection - likely auth failure
          this.setStatus("error");
          reject(new Error("Deepgram connection failed - verify your API key is valid"));
        } else {
          // Error after connection
          this.setStatus("error");
          this.config.onError(new Error("Transcription connection error"));
        }
      };

      this.socket.onclose = (event) => {
        console.log("Deepgram connection closed:", event.code, event.reason);
        clearTimeout(connectionTimeout);

        if (!hasConnected) {
          // Closed before connecting - this is an auth failure (code 1006)
          this.setStatus("error");
          let errorMessage = "Deepgram connection rejected";
          if (event.code === 1006) {
            errorMessage = "Deepgram API key invalid or expired. Check NEXT_PUBLIC_DEEPGRAM_API_KEY in your environment.";
          } else if (event.code === 1008) {
            errorMessage = "Deepgram policy violation - check API key permissions";
          } else if (event.reason) {
            errorMessage = `Deepgram: ${event.reason}`;
          }
          reject(new Error(errorMessage));
        } else if (this.status === "recording") {
          this.setStatus("stopped");
        }
      };
    });
  }

  private startRecording() {
    if (!this.combinedStream || !this.socket) return;

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

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(event.data);
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
    if (this.socket) {
      this.socket.close();
    }
    this.mediaRecorder = null;
    this.micStream = null;
    this.systemStream = null;
    this.combinedStream = null;
    this.socket = null;
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
