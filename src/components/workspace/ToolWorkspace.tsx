import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useJobProcessor } from "@/hooks/useJobProcessor";
import { usePdfPreviews } from "@/hooks/usePdfPreviews";
import { getToolById, formatFileSize } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// UI Components
import { FileDropzone } from "@/components/ui/file-dropzone";
import { FileCard } from "@/components/ui/file-card";
import { ProcessingStepper } from "@/components/ui/processing-stepper";
import { SuccessScreen } from "@/components/ui/success-screen";
import { ErrorScreen } from "@/components/ui/error-screen";
import { Spinner } from "@/components/ui/spinner";

// Tool settings
import { SplitSettings } from "./tools/SplitSettings";
import { CompressSettings } from "./tools/CompressSettings";
import { RotateSettings } from "./tools/RotateSettings";
import { ProtectSettings } from "./tools/ProtectSettings";
import { WatermarkSettings } from "./tools/WatermarkSettings";
import { ConvertSettings } from "./tools/ConvertSettings";
import { OcrSettings } from "./tools/OcrSettings";

// DnD
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ChevronRight,
  Plus,
  FileText,
  UploadCloud,
} from "lucide-react";

interface ToolWorkspaceProps {
  toolId: string;
}

// ─── Sortable File Item ──────────────────────────────────────────────────────

interface SortableFileItemProps {
  id: string;
  file: File;
  index: number;
  preview?: string;
  uploadProgress?: number;
  isUploading?: boolean;
  onRemove: () => void;
  disabled: boolean;
}

const SortableFileItem: React.FC<SortableFileItemProps> = ({
  id,
  file,
  index,
  preview,
  onRemove,
  uploadProgress,
  isUploading,
  disabled,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <FileCard
        file={file}
        index={index}
        preview={preview}
        showDragHandle
        onRemove={onRemove}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
        disabled={disabled}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const ToolWorkspace: React.FC<ToolWorkspaceProps> = ({ toolId }) => {
  const tool = getToolById(toolId);
  const { token, refreshProfile } = useAuth();

  const fileUpload = useFileUpload(tool?.multiple ?? false);
  const jobProcessor = useJobProcessor();
  const firstFile = fileUpload.files.length === 1 ? fileUpload.files[0] : null;
  const pdfPreviews = usePdfPreviews(firstFile);

  // Image previews for jpgToPdf tool
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (fileUpload.files.length > 0 && (toolId === "jpgToPdf" || fileUpload.files[0]?.type?.startsWith("image/"))) {
      const urls = fileUpload.files.map((file) => URL.createObjectURL(file));
      setImagePreviews(urls);
      return () => urls.forEach((url) => URL.revokeObjectURL(url));
    } else {
      setImagePreviews([]);
    }
  }, [fileUpload.files, toolId]);

  // Tool-specific options state
  const [splitOptions, setSplitOptions] = useState<Record<string, any>>({ ranges: ["1-2"] });
  const [compressQuality, setCompressQuality] = useState("medium");
  const [rotateAngle, setRotateAngle] = useState("90");
  const [rotatePages, setRotatePages] = useState("");
  const [protectUserPwd, setProtectUserPwd] = useState("");
  const [protectOwnerPwd, setProtectOwnerPwd] = useState("");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkFontSize, setWatermarkFontSize] = useState("48");
  const [watermarkOpacity, setWatermarkOpacity] = useState("0.3");
  const [watermarkPosition, setWatermarkPosition] = useState("center");
  const [pdfToJpgDpi, setPdfToJpgDpi] = useState("150");
  const [ocrLanguages, setOcrLanguages] = useState("eng");

  // Reset when tool changes
  useEffect(() => {
    fileUpload.clearFiles();
    jobProcessor.reset();
    setImagePreviews([]);
  }, [toolId]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fileIds = useMemo(
    () => fileUpload.files.map((f, i) => `file-${i}-${f.name}`),
    [fileUpload.files]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fileIds.indexOf(active.id as string);
      const newIndex = fileIds.indexOf(over.id as string);
      const newFiles = arrayMove([...fileUpload.files], oldIndex, newIndex);
      fileUpload.reorderFiles(newFiles);
    }
  };

  // Build tool options for API
  const buildOptions = (): Record<string, any> => {
    switch (toolId) {
      case "split":
        return splitOptions;
      case "merge":
        return { order: fileUpload.files.map((_, i) => i) };
      case "compress":
        return { quality: compressQuality };
      case "rotate":
        return {
          angle: parseInt(rotateAngle, 10),
          pages: rotatePages
            ? rotatePages.split(",").map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n))
            : [],
        };
      case "protect":
        return {
          userPassword: protectUserPwd || undefined,
          ownerPassword: protectOwnerPwd || undefined,
        };
      case "watermark":
        return {
          text: watermarkText,
          fontSize: parseInt(watermarkFontSize, 10),
          opacity: parseFloat(watermarkOpacity),
          position: watermarkPosition,
        };
      case "pdfToJpg":
        return { dpi: parseInt(pdfToJpgDpi, 10) };
      case "officeConvert":
        return { direction: "to-pdf" };
      case "ocr":
        return { languages: ocrLanguages.split(",").map((l) => l.trim()) };
      default:
        return {};
    }
  };

  // Execute processing pipeline
  const handleProcess = async () => {
    if (!token) {
      toast.error("Please sign in or create a guest session to process files.");
      return;
    }
    if (fileUpload.files.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }

    try {
      // 1. Upload files
      jobProcessor.reset();
      const uploadedKeys = await fileUpload.uploadAll();

      // 2. Process
      const options = buildOptions();
      await jobProcessor.processFiles(toolId, uploadedKeys, options);

      // 3. Refresh profile for usage counts
      await refreshProfile();
      toast.success("Processing complete! Your file has been downloaded.");
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    }
  };

  const handleReset = () => {
    fileUpload.clearFiles();
    jobProcessor.reset();
  };

  const isProcessing = fileUpload.isUploading || jobProcessor.isProcessing;
  const currentStep = fileUpload.isUploading ? "upload" as const : jobProcessor.step;

  if (!tool) {
    return (
      <ErrorScreen
        title="Tool Not Found"
        message="The requested tool does not exist. Please select a valid tool from the workspace."
        onGoBack={() => window.location.href = "/workspace"}
      />
    );
  }

  // ─── Success State ────────────────────────────────────────────────────────

  if (jobProcessor.step === "done") {
    return (
      <div className="max-w-lg mx-auto">
        <SuccessScreen
          fileName={jobProcessor.job?.outputFile?.split("/").pop()}
          onDownload={() => jobProcessor.downloadResult()}
          onProcessAnother={handleReset}
        />
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────

  if (jobProcessor.step === "failed") {
    return (
      <div className="max-w-lg mx-auto">
        <ErrorScreen
          message={jobProcessor.error || "An unknown error occurred."}
          onRetry={handleReset}
          onGoBack={() => window.location.href = "/workspace"}
        />
      </div>
    );
  }

  // ─── Empty State (No Files) ───────────────────────────────────────────────

  if (fileUpload.files.length === 0 && !isProcessing) {
    const Icon = tool.icon;
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] max-w-2xl mx-auto animate-fade-in-up">
        {/* Tool header */}
        <div className="text-center mb-8">
          <div className={cn(
            "inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4",
            tool.accent
          )}>
            <Icon className={cn("h-7 w-7", tool.accentText)} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {tool.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {tool.desc}
          </p>
        </div>

        {/* Dropzone */}
        <FileDropzone
          accept={tool.accept}
          multiple={tool.multiple}
          onFiles={fileUpload.addFiles}
          toolName={tool.name.replace(" PDF", "").replace(" to ", " ")}
          className="w-full min-h-[240px]"
        />
      </div>
    );
  }

  // ─── Files Selected — Main Workspace ──────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-14rem)] animate-fade-in">
      {/* LEFT: File Preview & Processing Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Processing stepper */}
        {isProcessing && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm animate-fade-in-down">
            <ProcessingStepper currentStep={currentStep} />
          </div>
        )}

        {/* File list / preview area */}
        <div className="flex-1 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {fileUpload.files.length === 1 ? "Document Preview" : `${fileUpload.files.length} Files Selected`}
            </h3>
            {tool.multiple && !isProcessing && (
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = tool.accept;
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || []);
                    if (files.length > 0) fileUpload.addFiles(files);
                  };
                  input.click();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Files
              </button>
            )}
          </div>

          {/* Single PDF preview */}
          {fileUpload.files.length === 1 && fileUpload.files[0].name.toLowerCase().endsWith(".pdf") && (
            <div className="space-y-4">
              {/* File info bar */}
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{fileUpload.files[0].name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                  {formatFileSize(fileUpload.files[0].size)}
                  {pdfPreviews.pageCount > 0 && ` • ${pdfPreviews.pageCount} pages`}
                </span>
              </div>

              {/* Page thumbnails */}
              {pdfPreviews.isLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Spinner className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Generating previews...</span>
                </div>
              ) : pdfPreviews.previews.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {pdfPreviews.previews.map((previewUrl, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl border bg-muted/30 p-2 aspect-[3/4] flex flex-col transition-all duration-200 hover:shadow-md hover:border-primary/20"
                    >
                      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-white dark:bg-background">
                        <img
                          src={previewUrl}
                          alt={`Page ${idx + 1}`}
                          className="max-h-full max-w-full object-contain"
                          style={toolId === "rotate" ? { transform: `rotate(${rotateAngle}deg)`, transition: "transform 0.3s" } : undefined}
                        />
                      </div>
                      <span className="text-center text-[10px] font-semibold text-muted-foreground mt-1.5">
                        Page {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <FileText className="h-10 w-10 text-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground">Preview not available</span>
                </div>
              )}
            </div>
          )}

          {/* Multi-file list with DnD */}
          {(fileUpload.files.length > 1 || (fileUpload.files.length === 1 && !fileUpload.files[0].name.toLowerCase().endsWith(".pdf"))) && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={fileIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {fileUpload.files.map((file, i) => (
                    <SortableFileItem
                      key={fileIds[i]}
                      id={fileIds[i]}
                      file={file}
                      index={i}
                      preview={imagePreviews[i]}
                      uploadProgress={fileUpload.uploadProgress.get(i)}
                      isUploading={fileUpload.isUploading}
                      onRemove={() => fileUpload.removeFile(i)}
                      disabled={isProcessing}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Drop zone for adding more files */}
          {tool.multiple && !isProcessing && (
            <div
              className="mt-3 rounded-xl border-2 border-dashed border-border hover:border-primary/30 p-4 flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = tool.accept;
                input.multiple = true;
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  if (files.length > 0) fileUpload.addFiles(files);
                };
                input.click();
              }}
            >
              <UploadCloud className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">
                Drop more files here or click to browse
              </span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Settings Panel */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm flex-1 flex flex-col">
          {/* Settings header */}
          <div className="flex items-center gap-2 border-b pb-3 mb-4">
            {(() => {
              const Icon = tool.icon;
              return <Icon className={cn("h-4 w-4", tool.accentText)} />;
            })()}
            <h2 className="text-sm font-bold text-foreground">{tool.name} Settings</h2>
          </div>

          {/* Dynamic settings */}
          <div className="flex-1 overflow-y-auto">
            {toolId === "split" && (
              <SplitSettings
                onOptionsChange={setSplitOptions}
                disabled={isProcessing}
                pageCount={pdfPreviews.pageCount || undefined}
              />
            )}
            {toolId === "compress" && (
              <CompressSettings
                value={compressQuality}
                onChange={setCompressQuality}
                disabled={isProcessing}
              />
            )}
            {toolId === "rotate" && (
              <RotateSettings
                angle={rotateAngle}
                pages={rotatePages}
                onAngleChange={setRotateAngle}
                onPagesChange={setRotatePages}
                disabled={isProcessing}
              />
            )}
            {toolId === "protect" && (
              <ProtectSettings
                userPassword={protectUserPwd}
                ownerPassword={protectOwnerPwd}
                onUserPasswordChange={setProtectUserPwd}
                onOwnerPasswordChange={setProtectOwnerPwd}
                disabled={isProcessing}
              />
            )}
            {toolId === "watermark" && (
              <WatermarkSettings
                text={watermarkText}
                fontSize={watermarkFontSize}
                opacity={watermarkOpacity}
                position={watermarkPosition}
                onTextChange={setWatermarkText}
                onFontSizeChange={setWatermarkFontSize}
                onOpacityChange={setWatermarkOpacity}
                onPositionChange={setWatermarkPosition}
                disabled={isProcessing}
              />
            )}
            {(toolId === "pdfToJpg" || toolId === "jpgToPdf" || toolId === "officeConvert") && (
              <ConvertSettings
                tool={toolId}
                dpi={pdfToJpgDpi}
                onDpiChange={setPdfToJpgDpi}
                disabled={isProcessing}
              />
            )}
            {toolId === "ocr" && (
              <OcrSettings
                languages={ocrLanguages}
                onLanguagesChange={setOcrLanguages}
                disabled={isProcessing}
              />
            )}
            {toolId === "merge" && (
              <div className="rounded-xl border bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Drag and drop to reorder files. Files will be merged in the order shown.
                </p>
              </div>
            )}
          </div>

          {/* Process button */}
          <div className="pt-4 mt-4 border-t">
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing || fileUpload.files.length === 0}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-bold shadow-sm transition-all active:scale-[0.98]",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              {isProcessing ? (
                <>
                  <Spinner className="h-4 w-4 text-primary-foreground" />
                  {currentStep === "upload" ? "Uploading..." : currentStep === "queue" ? "Queueing..." : "Processing..."}
                </>
              ) : (
                <>
                  {tool.name}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
