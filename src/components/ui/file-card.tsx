import React from "react";
import { FileText, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/design-tokens";

interface FileCardProps {
  file: File;
  index: number;
  preview?: string;
  pageCount?: number;
  uploadProgress?: number;
  isUploading?: boolean;
  showDragHandle?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  dragHandleProps?: Record<string, unknown>;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  index,
  preview,
  pageCount,
  uploadProgress,
  isUploading = false,
  showDragHandle = false,
  onRemove,
  disabled = false,
  className,
  dragHandleProps,
}) => {
  const isPdf = file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        disabled && "opacity-60",
        className
      )}
    >
      {/* Drag handle */}
      {showDragHandle && (
        <button
          type="button"
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-muted transition-colors touch-none"
          aria-label="Drag to reorder"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Thumbnail */}
      <div className="relative flex-shrink-0 h-12 w-12 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
        {preview ? (
          <img
            src={preview}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileText className={cn(
            "h-5 w-5",
            isPdf ? "text-red-500" : isImage ? "text-pink-500" : "text-muted-foreground"
          )} />
        )}

        {/* Upload progress overlay */}
        {isUploading && uploadProgress !== undefined && uploadProgress < 100 && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">{uploadProgress}%</span>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground font-medium">
            {formatFileSize(file.size)}
          </span>
          {pageCount !== undefined && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
            </>
          )}
        </div>

        {/* Upload progress bar */}
        {isUploading && uploadProgress !== undefined && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Index badge */}
      <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
        {index + 1}
      </span>

      {/* Remove button */}
      {onRemove && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
          aria-label={`Remove ${file.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
