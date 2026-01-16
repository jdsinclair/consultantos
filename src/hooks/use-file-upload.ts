"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";

interface UploadResult {
  source: {
    id: string;
    name: string;
    type: string;
    fileType: string | null;
    blobUrl: string | null;
    processingStatus: string;
    createdAt: string;
  };
  blobUrl: string;
}

interface TextExtractionInfo {
  fileName: string;
  fileSize: number;
  fileType: "pptx" | "docx";
}

interface UseFileUploadOptions {
  clientId: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
  /** Called before extracting text from large Office files. Return true to proceed, false to cancel. */
  onConfirmTextExtraction?: (info: TextExtractionInfo) => Promise<boolean>;
}

// Vercel serverless function body limit
const SERVERLESS_LIMIT = 4 * 1024 * 1024; // 4MB

// Extract text from PPTX file (it's a ZIP with XML inside)
async function extractPptxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const textParts: string[] = [];

  // PPTX slides are in ppt/slides/slide*.xml
  const slideFiles = Object.keys(zip.files)
    .filter((name) => name.match(/ppt\/slides\/slide\d+\.xml$/))
    .sort();

  for (const slidePath of slideFiles) {
    const content = await zip.files[slidePath].async("string");
    // Extract text from XML tags like <a:t>text</a:t>
    const matches = content.match(/<a:t>([^<]*)<\/a:t>/g);
    if (matches) {
      const slideText = matches
        .map((m) => m.replace(/<\/?a:t>/g, ""))
        .filter((t) => t.trim())
        .join(" ");
      if (slideText.trim()) {
        textParts.push(slideText);
      }
    }
  }

  return textParts.join("\n\n---\n\n");
}

// Extract text from DOCX file
async function extractDocxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const docFile = zip.files["word/document.xml"];

  if (!docFile) {
    throw new Error("Invalid DOCX file");
  }

  const content = await docFile.async("string");
  const matches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);

  if (matches) {
    return matches
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

export function useFileUpload({ clientId, onSuccess, onError, onConfirmTextExtraction }: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      // For large Office files, extract text and upload that instead
      if (file.size > SERVERLESS_LIMIT && (extension === "pptx" || extension === "docx")) {
        // Ask for confirmation before extracting (imagery will be lost)
        if (onConfirmTextExtraction) {
          const proceed = await onConfirmTextExtraction({
            fileName: file.name,
            fileSize: file.size,
            fileType: extension as "pptx" | "docx",
          });
          if (!proceed) {
            setUploading(false);
            return null; // User cancelled
          }
        }

        console.log(`Large ${extension} file detected, extracting text: ${file.name}`);
        setProgress(10);

        let extractedText: string;
        try {
          if (extension === "pptx") {
            extractedText = await extractPptxText(file);
          } else {
            extractedText = await extractDocxText(file);
          }
        } catch (e) {
          throw new Error(`Failed to extract text from ${extension.toUpperCase()}. Try a smaller file or paste the content manually.`);
        }

        if (!extractedText || extractedText.length < 50) {
          throw new Error(`Could not extract enough text from this ${extension.toUpperCase()}. Try pasting the content manually.`);
        }

        setProgress(50);

        // Create a text file with the extracted content
        const textBlob = new Blob([extractedText], { type: "text/plain" });
        const textFile = new File([textBlob], file.name.replace(/\.(pptx|docx)$/i, ".txt"), {
          type: "text/plain",
        });

        // Upload the text version
        const formData = new FormData();
        formData.append("file", textFile);
        formData.append("clientId", clientId);
        formData.append("originalName", file.name); // Keep track of original name

        setProgress(75);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Upload failed");
        }

        setProgress(100);
        const result: UploadResult = await res.json();
        onSuccess?.(result);
        return result;
      }

      // For other large files, show error with helpful message
      if (file.size > SERVERLESS_LIMIT) {
        throw new Error(
          `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
          `Maximum size is 4MB. For presentations and documents, try saving as PDF first, ` +
          `or paste the text content directly.`
        );
      }

      // Normal upload for files under the limit
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", clientId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const result: UploadResult = await res.json();
      onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Upload failed");
      onError?.(err);
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [clientId, onSuccess, onError, onConfirmTextExtraction]);

  return {
    uploadFile,
    uploading,
    progress,
  };
}
