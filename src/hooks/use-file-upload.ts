"use client";

import { useState, useCallback } from "react";
import { upload } from "@vercel/blob/client";

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

interface UseFileUploadOptions {
  clientId: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

// Files larger than 4MB should use client-side upload
const CLIENT_UPLOAD_THRESHOLD = 4 * 1024 * 1024;

export function useFileUpload({ clientId, onSuccess, onError }: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      let blobUrl: string;

      if (file.size > CLIENT_UPLOAD_THRESHOLD) {
        // Large file: use client-side direct upload to Vercel Blob
        console.log(`Using client-side upload for large file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload/client",
        });

        // Progress tracking not supported by Vercel Blob SDK
        setProgress(100);

        blobUrl = blob.url;

        // Now process the uploaded file
        const processRes = await fetch("/api/upload/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl,
            clientId,
            fileName: file.name,
            fileSize: file.size,
          }),
        });

        if (!processRes.ok) {
          const error = await processRes.json();
          throw new Error(error.error || "Processing failed");
        }

        const result: UploadResult = await processRes.json();
        onSuccess?.(result);
        return result;
      } else {
        // Small file: use traditional server upload
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
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Upload failed");
      onError?.(err);
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [clientId, onSuccess, onError]);

  return {
    uploadFile,
    uploading,
    progress,
  };
}
