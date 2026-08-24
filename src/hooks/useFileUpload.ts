import { useState, useCallback } from "react";
import { apiService } from "@/services/api";

interface UseFileUploadResult {
  files: File[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (index: number) => void;
  moveFile: (index: number, direction: "up" | "down") => void;
  reorderFiles: (newOrder: File[]) => void;
  clearFiles: () => void;
  uploadAll: (onProgress?: (fileIndex: number, percent: number) => void) => Promise<string[]>;
  isUploading: boolean;
  uploadProgress: Map<number, number>;
}

export function useFileUpload(multiple: boolean = false): UseFileUploadResult {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, number>>(new Map());

  const addFiles = useCallback((newFiles: File[]) => {
    if (multiple) {
      setFiles((prev) => [...prev, ...newFiles]);
    } else {
      setFiles([newFiles[0]]);
    }
  }, [multiple]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((index: number, direction: "up" | "down") => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newFiles.length) {
        [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      }
      return newFiles;
    });
  }, []);

  const reorderFiles = useCallback((newOrder: File[]) => {
    setFiles(newOrder);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setUploadProgress(new Map());
  }, []);

  const uploadAll = useCallback(async (
    onProgress?: (fileIndex: number, percent: number) => void
  ): Promise<string[]> => {
    setIsUploading(true);
    // Result slots are pre-sized so parallel completions can't scramble the
    // order — tools like Merge depend on keys matching the on-screen order.
    const uploadedKeys: string[] = new Array(files.length);

    const report = (i: number, percent: number) => {
      setUploadProgress((prev) => new Map(prev).set(i, percent));
      onProgress?.(i, percent);
    };

    try {
      // Batch-presign small files in one API call; large files use multipart per file.
      const smallIndexes: number[] = [];
      const largeIndexes: number[] = [];
      files.forEach((f, i) => {
        if (f.size >= apiService.MULTIPART_THRESHOLD) largeIndexes.push(i);
        else smallIndexes.push(i);
      });

      if (smallIndexes.length === 1) {
        const i = smallIndexes[0];
        report(i, 0);
        uploadedKeys[i] = await apiService.uploadFileDirect(files[i], (pct) => report(i, pct));
      } else if (smallIndexes.length > 1) {
        const batch = await apiService.getPresignedUrlBatch(
          smallIndexes.map((i) => ({
            fileName: files[i].name,
            contentType: files[i].type || "application/pdf",
            fileSize: files[i].size,
          }))
        );

        const CONCURRENCY = 3;
        let next = 0;
        const workers = Array.from(
          { length: Math.min(CONCURRENCY, smallIndexes.length) },
          async () => {
            while (next < smallIndexes.length) {
              const slot = next++;
              const i = smallIndexes[slot];
              const presign = batch.uploads[slot];
              report(i, 0);
              await apiService.uploadFileToS3(files[i], presign.uploadUrl, (pct) => report(i, pct));
              report(i, 100);
              uploadedKeys[i] = presign.fileKey;
            }
          }
        );
        await Promise.all(workers);
      }

      // Multipart large files (sequential across files, parallel parts inside).
      for (const i of largeIndexes) {
        report(i, 0);
        uploadedKeys[i] = await apiService.uploadFileDirect(files[i], (pct) => report(i, pct));
      }

      return uploadedKeys;
    } finally {
      setIsUploading(false);
    }
  }, [files]);

  return {
    files,
    addFiles,
    removeFile,
    moveFile,
    reorderFiles,
    clearFiles,
    uploadAll,
    isUploading,
    uploadProgress,
  };
}
