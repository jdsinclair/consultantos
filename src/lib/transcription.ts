// Real-time transcription using Deepgram
// This is a client-side hook for capturing audio and sending to Deepgram

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
   */
  async start(source: AudioSource = "microphone") {
    try {
      this.setStatus("requesting_permissions");

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
        // Get system audio via screen share
        // This requires user to share a tab/window with audio
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

    this.socket = new WebSocket(wsUrl, ["token", apiKey]);

    this.socket.onopen = () => {
      console.log("Deepgram connection opened");
      this.setStatus("connected");
      this.startRecording();
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
      console.error("Deepgram error:", error);
      this.setStatus("error");
      this.config.onError(new Error("Transcription connection error"));
    };

    this.socket.onclose = (event) => {
      console.log("Deepgram connection closed:", event.code, event.reason);
      if (this.status === "recording") {
        this.setStatus("stopped");
      }
    };
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
