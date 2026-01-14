import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSources, createSource } from "@/lib/db/sources";
import { z } from "zod";

const createSourceSchema = z.object({
  type: z.enum(["document", "website", "repo", "folder", "recording", "local_folder"]),
  name: z.string().min(1),
  url: z.string().url().optional(),
  localPath: z.string().optional(),
  blobUrl: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const sources = await getSources(params.id, user.id);
    return NextResponse.json(sources);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createSourceSchema.parse(body);

    const source = await createSource({
      ...data,
      clientId: params.id,
      userId: user.id,
      processingStatus: "pending",
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
  }
}
