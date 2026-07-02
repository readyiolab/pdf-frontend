import {
  Scissors,
  GitMerge,
  Minimize,
  RotateCw,
  Lock,
  ImagePlus,
  Images,
  Bookmark,
  FileSpreadsheet,
  ScanText,
  type LucideIcon,
} from "lucide-react";

// ─── Tool Configuration ─────────────────────────────────────────────────────

export interface ToolConfig {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  accent: string;       // Tailwind bg color for icon container
  accentText: string;   // Tailwind text color for icon
  gradient: string;     // Gradient for card hover/background
  accept: string;       // File input accept string
  multiple: boolean;    // Whether multiple files are allowed
  categories: string[];
}

export const TOOLS: ToolConfig[] = [
  {
    id: "merge",
    name: "Merge PDF",
    desc: "Combine PDFs in the order you want with the easiest PDF merger available.",
    icon: GitMerge,
    accent: "bg-red-50 dark:bg-red-950/30",
    accentText: "text-red-500",
    gradient: "from-red-500/10 to-red-500/5",
    accept: ".pdf",
    multiple: true,
    categories: ["All", "Organize PDF"],
  },
  {
    id: "split",
    name: "Split PDF",
    desc: "Separate one page or a whole set for easy conversion into independent PDF files.",
    icon: Scissors,
    accent: "bg-orange-50 dark:bg-orange-950/30",
    accentText: "text-orange-500",
    gradient: "from-orange-500/10 to-orange-500/5",
    accept: ".pdf",
    multiple: false,
    categories: ["All", "Organize PDF"],
  },
  {
    id: "compress",
    name: "Compress PDF",
    desc: "Reduce file size while optimizing for maximal PDF quality.",
    icon: Minimize,
    accent: "bg-emerald-50 dark:bg-emerald-950/30",
    accentText: "text-emerald-500",
    gradient: "from-emerald-500/10 to-emerald-500/5",
    accept: ".pdf",
    multiple: false,
    categories: ["All", "Optimize PDF"],
  },
  {
    id: "rotate",
    name: "Rotate PDF",
    desc: "Rotate your PDFs pages in the direction you require.",
    icon: RotateCw,
    accent: "bg-amber-50 dark:bg-amber-950/30",
    accentText: "text-amber-500",
    gradient: "from-amber-500/10 to-amber-500/5",
    accept: ".pdf",
    multiple: false,
    categories: ["All", "Organize PDF"],
  },
  {
    id: "protect",
    name: "Protect PDF",
    desc: "Secure files with strong passwords and access restrictions.",
    icon: Lock,
    accent: "bg-rose-50 dark:bg-rose-950/30",
    accentText: "text-rose-500",
    gradient: "from-rose-500/10 to-rose-500/5",
    accept: ".pdf",
    multiple: false,
    categories: ["All", "PDF Security"],
  },
  {
    id: "jpgToPdf",
    name: "JPG to PDF",
    desc: "Convert images like JPG, PNG, and WebP into clean PDFs.",
    icon: ImagePlus,
    accent: "bg-pink-50 dark:bg-pink-950/30",
    accentText: "text-pink-500",
    gradient: "from-pink-500/10 to-pink-500/5",
    accept: "image/jpeg,image/png,image/webp",
    multiple: true,
    categories: ["All", "Convert PDF"],
  },
  {
    id: "pdfToJpg",
    name: "PDF to JPG",
    desc: "Extract all pages of a PDF as individual JPG images.",
    icon: Images,
    accent: "bg-purple-50 dark:bg-purple-950/30",
    accentText: "text-purple-500",
    gradient: "from-purple-500/10 to-purple-500/5",
    accept: ".pdf",
    multiple: false,
    categories: ["All", "Convert PDF"],
  },
  {
    id: "watermark",
    name: "Watermark PDF",
    desc: "Stamp an image or text overlay onto your PDF document.",
    icon: Bookmark,
    accent: "bg-violet-50 dark:bg-violet-950/30",
    accentText: "text-violet-500",
    gradient: "from-violet-500/10 to-violet-500/5",
    accept: ".pdf",
    multiple: false,
    categories: ["All", "Edit PDF"],
  },
  {
    id: "officeConvert",
    name: "Office to PDF",
    desc: "Convert Microsoft Word, Excel, and PowerPoint into PDFs.",
    icon: FileSpreadsheet,
    accent: "bg-teal-50 dark:bg-teal-950/30",
    accentText: "text-teal-500",
    gradient: "from-teal-500/10 to-teal-500/5",
    accept: ".docx,.pptx,.xlsx",
    multiple: false,
    categories: ["All", "Convert PDF"],
  },
  {
    id: "ocr",
    name: "OCR PDF",
    desc: "Convert scanned non-selectable PDFs into searchable text documents.",
    icon: ScanText,
    accent: "bg-sky-50 dark:bg-sky-950/30",
    accentText: "text-sky-500",
    gradient: "from-sky-500/10 to-sky-500/5",
    accept: ".pdf",
    multiple: false,
    categories: ["All", "Convert PDF", "PDF Intelligence"],
  },
];

export const TOOL_CATEGORIES = [
  "All",
  "Organize PDF",
  "Optimize PDF",
  "Convert PDF",
  "Edit PDF",
  "PDF Security",
  "PDF Intelligence",
];

export function getToolById(id: string): ToolConfig | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function getToolTitle(tool: string): string {
  const found = TOOLS.find((t) => t.id === tool);
  return found ? found.name : tool;
}

// ─── File Helpers ────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatFilenameFromKey(key: string): string {
  if (!key) return "";
  const parts = key.split("/");
  const filename = parts[parts.length - 1];
  const uuidMatch = filename.indexOf("_");
  if (uuidMatch !== -1) {
    return filename.substring(uuidMatch + 1);
  }
  return filename;
}

// ─── Processing Steps ────────────────────────────────────────────────────────

export type ProcessingStep = "idle" | "upload" | "queue" | "poll" | "done" | "failed";

export const PROCESSING_STEPS = [
  { key: "upload" as const, label: "Uploading", desc: "Uploading files to cloud" },
  { key: "queue" as const, label: "Queueing", desc: "Creating processing job" },
  { key: "poll" as const, label: "Processing", desc: "Processing your files" },
  { key: "done" as const, label: "Complete", desc: "Download ready" },
];

// ─── API Constants ───────────────────────────────────────────────────────────

export const S3_BASE_URL = "https://igrowbig.blr1.digitaloceanspaces.com";
export const MAX_POLL_ATTEMPTS = 60;
export const POLL_INTERVAL_MS = 1200;
