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

    const uploadOne = async (i: number) => {
      const file = files[i];
      setUploadProgress((prev) => new Map(prev).set(i, 0));

      const presign = await apiService.getPresignedUrl(
        file.name,
        file.type || "application/pdf",
        file.size
      );

      await apiService.uploadFileToS3(file, presign.uploadUrl, (percent) => {
        setUploadProgress((prev) => new Map(prev).set(i, percent));
        onProgress?.(i, percent);
      });

      setUploadProgress((prev) => new Map(prev).set(i, 100));
      uploadedKeys[i] = presign.fileKey;
    };

    try {
      // Upload up to 3 files at a time instead of strictly one-after-another.
      const CONCURRENCY = 3;
      let nextIndex = 0;
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, files.length) },
        async () => {
          while (nextIndex < files.length) {
            const i = nextIndex++;
            await uploadOne(i);
          }
        }
      );
      await Promise.all(workers);

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
