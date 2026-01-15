"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
  variant?: "bars" | "waveform" | "dots";
  className?: string;
  barCount?: number;
}

export function AudioVisualizer({
  stream,
  isActive,
  variant = "bars",
  className,
  barCount = 32,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataArrayRef = useRef<any>(null);

  useEffect(() => {
    if (!stream || !isActive) {
      // Clear canvas when not active
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const audioContext = new AudioContext();
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);

    analyzerRef.current = analyzer;
    dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      if (!analyzerRef.current || !dataArrayRef.current) return;

      analyzerRef.current.getByteFrequencyData(dataArrayRef.current);

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const dataArray = dataArrayRef.current;
      if (variant === "bars") {
        drawBars(ctx, dataArray, width, height, barCount);
      } else if (variant === "waveform") {
        drawWaveform(ctx, dataArray, width, height);
      } else if (variant === "dots") {
        drawDots(ctx, dataArray, width, height, barCount);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [stream, isActive, variant, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full", className)}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  width: number,
  height: number,
  barCount: number
) {
  const barWidth = width / barCount - 2;
  const step = Math.floor(dataArray.length / barCount);

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step];
    const barHeight = (value / 255) * height * 0.9;
    const x = i * (barWidth + 2);
    const y = (height - barHeight) / 2;

    // Create gradient for each bar - use actual colors (Canvas doesn't support CSS variables)
    const gradient = ctx.createLinearGradient(x, y + barHeight, x, y);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.6)"); // blue-500 at 60%
    gradient.addColorStop(1, "rgb(59, 130, 246)"); // blue-500

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 2);
    ctx.fill();
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  width: number,
  height: number
) {
  ctx.beginPath();
  ctx.strokeStyle = "rgb(59, 130, 246)"; // blue-500
  ctx.lineWidth = 2;

  const sliceWidth = width / dataArray.length;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 255;
    const y = height / 2 + (v - 0.5) * height * 0.8;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.stroke();
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  width: number,
  height: number,
  dotCount: number
) {
  const step = Math.floor(dataArray.length / dotCount);
  const spacing = width / dotCount;

  for (let i = 0; i < dotCount; i++) {
    const value = dataArray[i * step];
    const radius = Math.max(2, (value / 255) * 12);
    const x = i * spacing + spacing / 2;
    const y = height / 2;

    const alpha = 0.4 + (value / 255) * 0.6;
    ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`; // blue-500 with dynamic alpha
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Simple level indicator component (non-canvas alternative)
interface AudioLevelProps {
  stream: MediaStream | null;
  isActive: boolean;
  className?: string;
}

export function AudioLevel({ stream, isActive, className }: AudioLevelProps) {
  const [level, setLevel] = useState(0);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream || !isActive) {
      setLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);

    analyzerRef.current = analyzer;
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    const updateLevel = () => {
      if (!analyzerRef.current) return;

      analyzerRef.current.getByteFrequencyData(dataArray);

      // Calculate average level
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const avg = sum / dataArray.length;
      setLevel(avg / 255);

      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [stream, isActive]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-75",
            level > i * 0.2
              ? "bg-primary"
              : "bg-muted"
          )}
          style={{
            height: `${12 + i * 4}px`,
          }}
        />
      ))}
    </div>
  );
}
