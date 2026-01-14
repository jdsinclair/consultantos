import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { createSource, updateSourceContent, setSourceError } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";
import pdf from "pdf-parse";

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

    // Start async processing (text extraction + embeddings)
    processDocument(source.id, clientId, user.id, blob.url, fileType, file).catch(console.error);

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
  clientId: string,
  userId: string,
  blobUrl: string,
  fileType: string,
  file: File
) {
  try {
    let content = "";

    // Extract text based on file type
    switch (fileType) {
      case "pdf":
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const data = await pdf(buffer);
          content = data.text || "";

          // Clean up the text
          content = content
            .replace(/\r\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        } catch (pdfError) {
          console.error("PDF parsing error:", pdfError);
          content = "[Error extracting PDF content]";
        }
        break;

      case "txt":
      case "md":
        content = await file.text();
        break;

      case "csv":
        content = await file.text();
        // Convert CSV to more readable format
        content = `[CSV Data]\n${content}`;
        break;

      case "json":
        const jsonText = await file.text();
        try {
          const parsed = JSON.parse(jsonText);
          content = JSON.stringify(parsed, null, 2);
        } catch {
          content = jsonText;
        }
        break;

      case "docx":
        // For DOCX, we extract as much as we can from the raw XML
        // A proper solution would use mammoth.js
        try {
          const arrayBuffer = await file.arrayBuffer();
          const text = new TextDecoder().decode(arrayBuffer);
          // Extract text between XML tags - basic extraction
          const textContent = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
          if (textContent) {
            content = textContent
              .map(t => t.replace(/<[^>]+>/g, ""))
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
          } else {
            content = "[DOCX content - could not extract text]";
          }
        } catch {
          content = "[DOCX content - extraction failed]";
        }
        break;

      default:
        // Try to read as text
        try {
          content = await file.text();
        } catch {
          content = "[Unsupported file type - could not extract content]";
        }
    }

    // Update source with extracted content
    await updateSourceContent(sourceId, userId, content);

    // Generate embeddings for RAG
    if (content && !content.startsWith("[")) {
      await processSourceEmbeddings(sourceId, clientId, userId, content, {
        type: 'document',
        fileType,
        fileName: file.name,
      });
    }
  } catch (error) {
    console.error("Document processing error:", error);
    await setSourceError(sourceId, userId, String(error));
  }
}

