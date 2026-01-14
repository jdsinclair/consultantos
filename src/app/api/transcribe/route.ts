import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 }
      );
    }

    // Send to Deepgram for transcription
    const audioBuffer = await audio.arrayBuffer();

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramKey}`,
          "Content-Type": audio.type,
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      throw new Error(`Deepgram error: ${response.status}`);
    }

    const data = await response.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    const words = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    // Group words by speaker
    const segments = groupWordsBySpeaker(words);

    return NextResponse.json({
      transcript,
      segments,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}

interface Word {
  word: string;
  start: number;
  end: number;
  speaker: number;
}

function groupWordsBySpeaker(words: Word[]) {
  const segments: { text: string; speaker: string; timestamp: number }[] = [];
  let currentSpeaker = -1;
  let currentText = "";
  let currentStart = 0;

  for (const word of words) {
    if (word.speaker !== currentSpeaker) {
      if (currentText) {
        segments.push({
          text: currentText.trim(),
          speaker: `Speaker ${currentSpeaker}`,
          timestamp: currentStart,
        });
      }
      currentSpeaker = word.speaker;
      currentText = word.word;
      currentStart = word.start;
    } else {
      currentText += " " + word.word;
    }
  }

  if (currentText) {
    segments.push({
      text: currentText.trim(),
      speaker: `Speaker ${currentSpeaker}`,
      timestamp: currentStart,
    });
  }

  return segments;
}
