import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useJobProcessor } from "@/hooks/useJobProcessor";
import { usePdfPreviews, loadPdfJs } from "@/hooks/usePdfPreviews";
import { useFileThumbnails } from "@/hooks/useFileThumbnails";
import { getToolById, formatFileSize } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { FileDropzone } from "@/components/ui/file-dropzone";
import { FileCard } from "@/components/ui/file-card";
import { ProcessingStepper } from "@/components/ui/processing-stepper";
import { Progress } from "@/components/ui/progress";
import { SuccessScreen } from "@/components/ui/success-screen";
import { ErrorScreen } from "@/components/ui/error-screen";
import { Spinner } from "@/components/ui/spinner";
import { AuthModal } from "@/components/auth/AuthModal";
import { PageZoomModal } from "@/components/workspace/PageZoomModal";
import { Button } from "@/components/ui/button";

import { SplitSettings } from "./tools/SplitSettings";
import { CompressSettings } from "./tools/CompressSettings";
import { RotateSettings } from "./tools/RotateSettings";
import { ProtectSettings } from "./tools/ProtectSettings";
import { WatermarkSettings } from "./tools/WatermarkSettings";
import { ConvertSettings } from "./tools/ConvertSettings";
import { OcrSettings } from "./tools/OcrSettings";

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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ChevronRight,
  Plus,
  FileText,
  UploadCloud,
  PanelLeft,
  PanelRight,
  X,
  Lock,
} from "lucide-react";

interface ToolWorkspaceProps {
  toolId: string;
}

type MobilePane = "doc" | "controls";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

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
        variant="grid"
        onRemove={onRemove}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
        disabled={disabled}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

const WATERMARK_POS: Record<string, string> = {
  center: "items-center justify-center",
  top: "items-start justify-center p-6",
  bottom: "items-end justify-center p-6",
  left: "items-center justify-start p-6",
  right: "items-center justify-end p-6",
  "top-left": "items-start justify-start p-6",
  "top-right": "items-start justify-end p-6",
  "bottom-left": "items-end justify-start p-6",
  "bottom-right": "items-end justify-end p-6",
};

export const ToolWorkspace: React.FC<ToolWorkspaceProps> = ({ toolId }) => {
  const tool = getToolById(toolId);
  const { token, refreshProfile } = useAuth();

  const fileUpload = useFileUpload(tool?.multiple ?? false);
  const jobProcessor = useJobProcessor();
  const firstFile = fileUpload.files.length === 1 ? fileUpload.files[0] : null;
  const pdfPreviews = usePdfPreviews(firstFile);
  const fileThumbnails = useFileThumbnails(fileUpload.files);

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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>("controls");
  const [singlePdfUrl, setSinglePdfUrl] = useState<string | null>(null);

  useEffect(() => {
    fileUpload.clearFiles();
    jobProcessor.reset();
  }, [toolId]);

  useEffect(() => {
    loadPdfJs().catch(() => {});
  }, []);

  // Live iframe preview for a single PDF when the tool isn't rotate/watermark
  // (those keep canvas thumbs so we can overlay transforms / ghost text).
  const useIframePreview =
    fileUpload.files.length === 1 &&
    !!firstFile?.name.toLowerCase().endsWith(".pdf") &&
    toolId !== "rotate" &&
    toolId !== "watermark";

  useEffect(() => {
    if (!useIframePreview || !firstFile) {
      setSinglePdfUrl(null);
      return;
    }
    const url = URL.createObjectURL(firstFile);
    setSinglePdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [useIframePreview, firstFile]);

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
      fileUpload.reorderFiles(arrayMove([...fileUpload.files], oldIndex, newIndex));
    }
  };

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

  const runProcessing = async () => {
    try {
      jobProcessor.reset();
      const uploadedKeys = await fileUpload.uploadAll();
      await jobProcessor.processFiles(toolId, uploadedKeys, buildOptions());
      await refreshProfile();
      toast.success("Processing complete! Your file has been downloaded.");
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    }
  };

  const handleProcess = async () => {
    if (fileUpload.files.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    await runProcessing();
  };

  const handleAuthSuccess = async () => {
    setAuthModalOpen(false);
    await runProcessing();
  };

  const handleReset = () => {
    fileUpload.clearFiles();
    jobProcessor.reset();
  };

  const isProcessing = fileUpload.isUploading || jobProcessor.isProcessing;
  const currentStep = fileUpload.isUploading ? ("upload" as const) : jobProcessor.step;

  if (!tool) {
    return (
      <div className="mx-auto w-full max-w-lg p-6">
        <ErrorScreen
          title="Tool Not Found"
          message="The requested tool does not exist. Please select a valid tool from the workspace."
          onGoBack={() => (window.location.href = "/workspace")}
        />
      </div>
    );
  }

  const Icon = tool.icon;

  if (jobProcessor.step === "done") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 items-center p-6">
        <SuccessScreen
          fileName={jobProcessor.job?.outputFile?.split("/").pop()}
          onDownload={() => jobProcessor.downloadResult()}
          onProcessAnother={handleReset}
        />
      </div>
    );
  }

  if (jobProcessor.step === "failed") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 items-center p-6">
        <ErrorScreen
          message={jobProcessor.error || "An unknown error occurred."}
          onRetry={() => runProcessing()}
          onGoBack={handleReset}
        />
      </div>
    );
  }

  if (fileUpload.files.length === 0 && !isProcessing) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10 animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className={cn("mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl", tool.accent)}>
            <Icon className={cn("h-7 w-7", tool.accentText)} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{tool.name}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{tool.desc}</p>
          <p className="mt-3 text-xs font-medium text-muted-foreground/80">
            Live studio — document on one side, controls on the other
          </p>
        </div>
        <FileDropzone
          accept={tool.accept}
          multiple={tool.multiple}
          onFiles={fileUpload.addFiles}
          toolName={tool.name.replace(" PDF", "").replace(" to ", " ")}
          className="min-h-[240px] w-full"
        />
      </div>
    );
  }

  const addMoreFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = tool.accept;
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) fileUpload.addFiles(files);
    };
    input.click();
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden sm:h-[calc(100dvh-4rem)]">
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-2 py-1.5 md:hidden">
        <button
          type="button"
          onClick={() => setMobilePane("doc")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
            mobilePane === "doc" ? "bg-muted text-foreground" : "text-muted-foreground"
          )}
        >
          <PanelLeft className="size-3.5" />
          Document
        </button>
        <button
          type="button"
          onClick={() => setMobilePane("controls")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
            mobilePane === "controls" ? "bg-muted text-foreground" : "text-muted-foreground"
          )}
        >
          <PanelRight className="size-3.5" />
          Controls
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── Document stage ─────────────────────────────────────────────── */}
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-r border-border bg-[#1a1a1a] md:flex md:w-[52%] lg:w-[55%]",
            mobilePane === "doc" ? "flex" : "hidden"
          )}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#202c33] px-3 py-2.5 text-white">
            <Icon className="size-4 shrink-0 text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {fileUpload.files.length === 1
                  ? fileUpload.files[0].name
                  : `${fileUpload.files.length} files · ${tool.name}`}
              </p>
              <p className="text-[11px] text-white/50">
                {fileUpload.files.length === 1
                  ? `${formatFileSize(fileUpload.files[0].size)}${
                      pdfPreviews.pageCount > 0 ? ` · ${pdfPreviews.pageCount} pages` : ""
                    }`
                  : "Drag to reorder on the stage"}
              </p>
            </div>
            {!isProcessing && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleReset}
                className="text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Clear files"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto bg-[#0b141a]">
            {isProcessing && (
              <div className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#202c33]/95 p-3 backdrop-blur">
                <ProcessingStepper currentStep={currentStep} />
                {jobProcessor.step !== "idle" && jobProcessor.progress > 0 && (
                  <div className="mt-3 flex flex-col gap-1">
                    <Progress value={jobProcessor.progress} />
                    <span className="text-right text-[11px] font-medium tabular-nums text-white/50">
                      {jobProcessor.progress}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Single PDF — iframe studio */}
            {useIframePreview && singlePdfUrl && (
              <div className="relative h-full min-h-[320px]">
                <iframe
                  title={fileUpload.files[0].name}
                  src={`${singlePdfUrl}#view=FitH`}
                  className="h-full w-full border-0 bg-white"
                />
                {toolId === "protect" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                    <div className="flex items-center gap-2 rounded-2xl bg-black/70 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                      <Lock className="size-4 text-amber-300" />
                      Password protection preview
                    </div>
                  </div>
                )}
                {toolId === "compress" && (
                  <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                    Quality · {compressQuality}
                  </div>
                )}
              </div>
            )}

            {/* Single PDF — canvas thumbs (rotate / watermark live overlays) */}
            {fileUpload.files.length === 1 &&
              fileUpload.files[0].name.toLowerCase().endsWith(".pdf") &&
              !useIframePreview && (
                <div className="space-y-3 p-4">
                  {pdfPreviews.isLoading ? (
                    <div className="flex flex-col items-center gap-3 py-16">
                      <Spinner className="h-6 w-6 text-emerald-400" />
                      <span className="text-xs font-medium text-white/50">Opening document…</span>
                    </div>
                  ) : pdfPreviews.previews.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => pdfPreviews.previews[0] && setZoomIndex(0)}
                        className="group relative mx-auto flex min-h-[280px] w-full max-w-xl items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 sm:min-h-[360px]"
                      >
                        {pdfPreviews.previews[0] && (
                          <div className="relative">
                            <img
                              src={pdfPreviews.previews[0]}
                              alt="Page 1"
                              className="max-h-[360px] max-w-full rounded-lg bg-white object-contain shadow-sm"
                              style={
                                toolId === "rotate"
                                  ? { transform: `rotate(${rotateAngle}deg)`, transition: "transform 0.3s" }
                                  : undefined
                              }
                            />
                            {toolId === "watermark" && (
                              <div
                                className={cn(
                                  "pointer-events-none absolute inset-0 flex",
                                  WATERMARK_POS[watermarkPosition] ?? WATERMARK_POS.center
                                )}
                              >
                                <span
                                  className="select-none font-bold uppercase tracking-widest text-red-600"
                                  style={{
                                    fontSize: `${Math.min(parseInt(watermarkFontSize, 10) || 48, 72) * 0.45}px`,
                                    opacity: parseFloat(watermarkOpacity) || 0.3,
                                    transform: "rotate(-28deg)",
                                  }}
                                >
                                  {watermarkText || "WATERMARK"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                      {pdfPreviews.previews.length > 1 && (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                          {pdfPreviews.previews.map((previewUrl, idx) => {
                            if (idx === 0) return null;
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => previewUrl && setZoomIndex(idx)}
                                disabled={!previewUrl}
                                className="relative aspect-[3/4] rounded-lg border border-white/10 bg-white/5 p-1.5"
                              >
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt={`Page ${idx + 1}`}
                                    className="h-full w-full rounded object-contain bg-white"
                                    style={
                                      toolId === "rotate"
                                        ? {
                                            transform: `rotate(${rotateAngle}deg)`,
                                            transition: "transform 0.3s",
                                          }
                                        : undefined
                                    }
                                  />
                                ) : (
                                  <div className="h-full w-full animate-pulse bg-white/10" />
                                )}
                                <span className="mt-1 block text-center text-[10px] font-semibold text-white/50">
                                  {idx + 1}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-16">
                      <FileText className="h-10 w-10 text-white/20" />
                      <span className="text-xs text-white/40">Preview not available</span>
                    </div>
                  )}
                </div>
              )}

            {/* Multi-file / non-PDF stage */}
            {(fileUpload.files.length > 1 ||
              (fileUpload.files.length === 1 &&
                !fileUpload.files[0].name.toLowerCase().endsWith(".pdf"))) && (
              <div className="p-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fileIds} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {fileUpload.files.map((file, i) => (
                        <SortableFileItem
                          key={fileIds[i]}
                          id={fileIds[i]}
                          file={file}
                          index={i}
                          preview={fileThumbnails[i]}
                          uploadProgress={fileUpload.uploadProgress.get(i)}
                          isUploading={fileUpload.isUploading}
                          onRemove={() => fileUpload.removeFile(i)}
                          disabled={isProcessing}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {tool.multiple && !isProcessing && (
                  <button
                    type="button"
                    onClick={addMoreFiles}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 px-4 py-3 text-xs font-medium text-white/50 transition hover:border-emerald-500/40 hover:bg-white/5 hover:text-white/80"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Drop more files or click to browse
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Controls pane (chat-composer energy) ───────────────────────── */}
        <section
          className={cn(
            "relative min-h-0 w-full flex-1 flex-col md:flex md:max-w-md lg:max-w-lg",
            mobilePane === "controls" ? "flex" : "hidden"
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-55 dark:opacity-40"
            style={{
              backgroundColor: "#efeae2",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 dark:bg-[#0b141a]/92" aria-hidden />

          <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border/60 bg-[#f0f2f5] px-3 py-2.5 dark:bg-[#202c33]">
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", tool.accent)}>
              <Icon className={cn("size-4", tool.accentText)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{tool.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {isProcessing ? "Working on your file…" : "Tune options · run when ready"}
              </p>
            </div>
            {tool.multiple && !isProcessing && (
              <Button variant="ghost" size="sm" onClick={addMoreFiles} className="h-8 gap-1 text-xs">
                <Plus className="size-3.5" />
                Add
              </Button>
            )}
          </header>

          <div className="relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
            <div className="rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-[#202c33]/95">
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
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Drag cards on the document stage to set merge order. Files join top-to-bottom, left-to-right.
                </p>
              )}
              {!["split", "compress", "rotate", "protect", "watermark", "pdfToJpg", "jpgToPdf", "officeConvert", "ocr", "merge"].includes(
                toolId
              ) && (
                <p className="text-sm text-muted-foreground">No extra options — hit run when you&apos;re ready.</p>
              )}
            </div>

            {(toolId === "rotate" || toolId === "watermark") && (
              <div className="rounded-2xl bg-[#d9fdd3]/80 px-3 py-2 text-xs text-slate-800 dark:bg-emerald-900/40 dark:text-emerald-100">
                Changes preview live on the left — unique to this studio.
              </div>
            )}
          </div>

          <div className="relative z-10 flex shrink-0 border-t border-border/50 bg-[#f0f2f5] px-3 py-2.5 dark:bg-[#202c33]">
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing || fileUpload.files.length === 0}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold shadow-sm transition-all active:scale-[0.98]",
                "bg-emerald-600 text-white hover:bg-emerald-700",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
              )}
            >
              {isProcessing ? (
                currentStep === "upload" ? (
                  "Uploading…"
                ) : currentStep === "queue" ? (
                  "Queued…"
                ) : (
                  "Processing…"
                )
              ) : (
                <>
                  {tool.name}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <PageZoomModal
        pages={pdfPreviews.previews}
        activeIndex={zoomIndex}
        onOpenChange={setZoomIndex}
      />
    </div>
  );
};
