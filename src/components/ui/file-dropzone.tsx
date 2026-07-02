import React, { useCallback, useState, useRef } from "react";
import { UploadCloud, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  maxSizeMB?: number;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  toolName?: string;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept,
  multiple = false,
  maxSizeMB,
  onFiles,
  disabled = false,
  toolName = "PDF",
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFiles(multiple ? files : [files[0]]);
    }
  }, [disabled, multiple, onFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFiles(multiple ? files : [files[0]]);
      // Reset input to allow re-selecting same file
      e.target.value = "";
    }
  }, [multiple, onFiles]);

  const isImageTool = accept.includes("image");
  const Icon = isImageTool ? ImageIcon : FileText;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
        isDragOver
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/40 hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label={`Upload ${toolName} files`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center gap-4 py-12 px-8 text-center">
        {/* Animated icon */}
        <div className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
          isDragOver
            ? "bg-primary/10 scale-110"
            : "bg-muted group-hover:bg-primary/10 group-hover:scale-105"
        )}>
          {isDragOver ? (
            <UploadCloud className="h-8 w-8 text-primary animate-pulse" />
          ) : (
            <Icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>

        {/* Main CTA */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {isDragOver ? (
              "Drop files here"
            ) : (
              <>
                <span className="text-primary font-bold">Click to upload</span>
                {" "}or drag and drop
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {isImageTool ? "JPG, PNG, or WebP" : accept === ".pdf" ? "PDF files only" : accept.replace(/\./g, "").toUpperCase() + " files"}
            {multiple && " • Multiple files supported"}
            {maxSizeMB && ` • Max ${maxSizeMB}MB per file`}
          </p>
        </div>

        {/* Browse button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          disabled={disabled}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          <UploadCloud className="h-4 w-4" />
          Select {toolName} {multiple ? "Files" : "File"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
        aria-hidden="true"
      />
    </div>
  );
};
