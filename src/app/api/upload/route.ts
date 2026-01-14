import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { createSource, updateSourceContent, setSourceError } from "@/lib/db/sources";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: "No client ID provided" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`${user.id}/${clientId}/${file.name}`, file, {
      access: "public",
    });

    // Determine file type
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const fileType = getFileType(extension);

    // Create source record
    const source = await createSource({
      clientId,
      userId: user.id,
      type: "document",
      name: file.name,
      blobUrl: blob.url,
      fileType,
      fileSize: file.size,
      processingStatus: "processing",
    });

    // Start async processing (text extraction)
    processDocument(source.id, user.id, blob.url, fileType).catch(console.error);

    return NextResponse.json({
      source,
      blobUrl: blob.url,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

function getFileType(extension: string): string {
  const typeMap: Record<string, string> = {
    pdf: "pdf",
    doc: "doc",
    docx: "docx",
    ppt: "ppt",
    pptx: "pptx",
    xls: "xls",
    xlsx: "xlsx",
    txt: "txt",
    md: "md",
    csv: "csv",
    json: "json",
  };
  return typeMap[extension] || "unknown";
}

async function processDocument(
  sourceId: string,
  userId: string,
  blobUrl: string,
  fileType: string
) {
  try {
    // Fetch the document
    const response = await fetch(blobUrl);
    const buffer = await response.arrayBuffer();

    let content = "";

    // Extract text based on file type
    switch (fileType) {
      case "pdf":
        // In production, use pdf-parse
        // For now, we'll mark it as needing processing
        content = "[PDF content - text extraction pending]";
        break;

      case "txt":
      case "md":
      case "csv":
      case "json":
        content = new TextDecoder().decode(buffer);
        break;

      case "docx":
        // Would use mammoth or similar
        content = "[DOCX content - text extraction pending]";
        break;

      case "pptx":
        // Would use pptx parser
        content = "[PPTX content - text extraction pending]";
        break;

      default:
        content = "[Unsupported file type]";
    }

    // Chunk content for RAG
    const chunks = chunkContent(content);

    // Update source with extracted content
    await updateSourceContent(sourceId, userId, content, chunks);
  } catch (error) {
    console.error("Document processing error:", error);
    await setSourceError(sourceId, userId, String(error));
  }
}

function chunkContent(content: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    chunks.push(content.slice(start, end));
    start = end - overlap;
  }

  return chunks;
}
