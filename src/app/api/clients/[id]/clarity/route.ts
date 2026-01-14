import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getOrCreateClarityDocument,
  updateClarityDocument,
  addClaritySection,
  updatePositioningStatement,
} from "@/lib/db/clarity";
import { z } from "zod";

const updateSchema = z.object({
  niche: z.string().optional(),
  desiredOutcome: z.string().optional(),
  offer: z.string().optional(),
  whoWeAre: z.string().optional(),
  whatWeDo: z.string().optional(),
  howWeDoIt: z.string().optional(),
  ourWedge: z.string().optional(),
  whyPeopleLoveUs: z.string().optional(),
  howWeWillDie: z.string().optional(),
});

const sectionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  source: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const doc = await getOrCreateClarityDocument(params.id, user.id);
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get clarity document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updateSchema.parse(body);

    // If positioning components are provided, update statement too
    if (data.niche || data.desiredOutcome || data.offer) {
      const existing = await getOrCreateClarityDocument(params.id, user.id);
      const niche = data.niche || existing.niche || "[NICHE]";
      const desiredOutcome = data.desiredOutcome || existing.desiredOutcome || "[DESIRED OUTCOME]";
      const offer = data.offer || existing.offer || "[OFFER]";

      const doc = await updatePositioningStatement(
        params.id,
        user.id,
        niche,
        desiredOutcome,
        offer
      );

      // Update other fields too
      const { niche: _, desiredOutcome: __, offer: ___, ...otherFields } = data;
      if (Object.keys(otherFields).length > 0) {
        return NextResponse.json(
          await updateClarityDocument(params.id, user.id, otherFields)
        );
      }

      return NextResponse.json(doc);
    }

    const doc = await updateClarityDocument(params.id, user.id, data);
    return NextResponse.json(doc);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update clarity document" },
      { status: 500 }
    );
  }
}

// Add a locked-in section
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { title, content, source } = sectionSchema.parse(body);

    const doc = await addClaritySection(params.id, user.id, {
      id: crypto.randomUUID(),
      title,
      content,
      source,
      lockedAt: new Date().toISOString(),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to add section" },
      { status: 500 }
    );
  }
}
