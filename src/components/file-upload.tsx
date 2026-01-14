"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  clientId: string;
  onUploadComplete?: (source: unknown) => void;
}

interface UploadingFile {
  file: File;
  status: "uploading" | "complete" | "error";
  progress: number;
  error?: string;
}

export function FileUpload({ clientId, onUploadComplete }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onUploadComplete?.(data.source);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        file,
        status: "uploading" as const,
        progress: 0,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        try {
          await uploadFile(file);
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file ? { ...f, status: "complete", progress: 100 } : f
            )
          );
        } catch (error) {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, status: "error", error: "Upload failed" }
                : f
            )
          );
        }
      }

      // Clear completed files after 3 seconds
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.status === "uploading"));
      }, 3000);
    },
    [clientId, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "text/csv": [".csv"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        {isDragActive ? (
          <p className="text-sm text-primary">Drop files here...</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, PPTX, TXT, MD, CSV, Images
            </p>
          </>
        )}
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-accent/30"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">{f.file.name}</span>
              {f.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {f.status === "complete" && (
                <Check className="h-4 w-4 text-green-500" />
              )}
              {f.status === "error" && (
                <X className="h-4 w-4 text-red-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
