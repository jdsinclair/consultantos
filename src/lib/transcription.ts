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
}

export class RealtimeTranscription {
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private config: TranscriptionConfig;

  constructor(config: TranscriptionConfig) {
    this.config = config;
  }

  async start() {
    try {
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      // Connect to Deepgram WebSocket
      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      if (!apiKey) {
        throw new Error("Deepgram API key not configured");
      }

      const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&diarize=true&punctuate=true`;

      this.socket = new WebSocket(wsUrl, ["token", apiKey]);

      this.socket.onopen = () => {
        console.log("Deepgram connection opened");
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
        this.config.onError(new Error("Transcription connection error"));
      };

      this.socket.onclose = () => {
        console.log("Deepgram connection closed");
      };
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  private startRecording() {
    if (!this.stream || !this.socket) return;

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: "audio/webm",
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(event.data);
      }
    };

    this.mediaRecorder.start(250); // Send audio every 250ms
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.socket) {
      this.socket.close();
    }
    this.mediaRecorder = null;
    this.stream = null;
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
