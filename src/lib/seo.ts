/** Site origin for canonical / OG URLs. Override with VITE_SITE_URL in env. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://pdf.zuvigo.com"
).replace(/\/$/, "");

export const SITE_NAME = "PDFToolkit";

export interface SeoConfig {
  title: string;
  description: string;
  /** Path only, e.g. /desktop — used for canonical + og:url */
  path: string;
  /** Defaults to index,follow for public pages */
  robots?: string;
  ogType?: string;
  keywords?: string;
}

const DEFAULT_DESCRIPTION =
  "Convert, merge, split, protect, and organize PDF files online with PDFToolkit — and send documents for electronic signature with a full audit trail.";

export const DEFAULT_SEO: SeoConfig = {
  title: `${SITE_NAME} | PDF Tools & eSignatures`,
  description: DEFAULT_DESCRIPTION,
  path: "/",
  robots: "index, follow",
  ogType: "website",
  keywords:
    "PDF converter, merge PDF, split PDF, protect PDF, online PDF tools, PDF editor, eSign PDF, electronic signature",
};

/** Exact path → SEO. Longer / more specific paths win via lookup order below. */
const EXACT: Record<string, Omit<SeoConfig, "path">> = {
  "/": {
    title: `${SITE_NAME} | PDF Tools & eSignatures`,
    description: DEFAULT_DESCRIPTION,
    robots: "index, follow",
    keywords:
      "PDF tools, online PDF editor, merge PDF, eSign, electronic signature, PDF converter",
  },
  "/desktop": {
    title: `PDF Toolkit Desktop for Windows | ${SITE_NAME}`,
    description:
      "All your PDF tools in one Windows desktop app — fast, private, and offline-ready after license activation. Download PDF Toolkit by Zuvigo.",
    robots: "index, follow",
    keywords:
      "PDF desktop app, Windows PDF tools, offline PDF editor, PDF Toolkit download",
  },
  "/esign": {
    title: `eSign PDF Online — Legally Binding Signatures | ${SITE_NAME}`,
    description:
      "Send, sign, and verify PDFs with a full audit trail. Multi-recipient signing, private signer links, and a SHA-256 seal on every completed document.",
    robots: "index, follow",
    keywords:
      "eSign PDF, electronic signature, sign PDF online, audit trail, legally binding signature",
  },
  "/enterprise": {
    title: `Bring Your Own Cloud (BYOC) | ${SITE_NAME} Enterprise`,
    description:
      "Keep PDFs in your own AWS, Azure, R2, GCS, or MinIO bucket. Browser uploads go straight to your storage — we never keep the file bytes.",
    robots: "index, follow",
    keywords:
      "BYOC, bring your own cloud, enterprise PDF, AWS S3 PDF, Azure Blob PDF",
  },
  "/letters": {
    title: `Employee Letter Studio | ${SITE_NAME}`,
    description:
      "Create branded employee letters from Excel — validate, generate password-protected PDFs in bulk, and send from your Outlook or Gmail. AI assists, humans approve.",
    robots: "index, follow",
    keywords:
      "employee letter generator, HR letter Excel, bulk PDF letters, increment letter, salary revision letter",
  },
  "/workspace": {
    title: `PDF Workspace | ${SITE_NAME}`,
    description:
      "Open the PDFToolkit workspace to merge, split, compress, convert, protect, and more.",
    robots: "index, follow",
  },
  "/security": {
    title: `Security & Trust | ${SITE_NAME}`,
    description:
      "AES-256 encryption, TLS in transit, automated file purging, and cryptographically signed eSign audit trails.",
    robots: "index, follow",
  },
  "/developer": {
    title: `Developer API | ${SITE_NAME}`,
    description:
      "REST and webhook APIs for PDF conversion, eSign, OCR, and AI summaries. Integrate document workflows into your product.",
    robots: "index, follow",
  },
  "/api-docs": {
    title: `API Documentation | ${SITE_NAME}`,
    description:
      "PDFToolkit developer API docs — conversion, eSign, OCR, and AI endpoints.",
    robots: "index, follow",
  },
  "/blog": {
    title: `Engineering Blog | ${SITE_NAME}`,
    description:
      "Deep dives into PDF rendering, WebAssembly OCR, and document AI from the PDFToolkit engineering team.",
    robots: "index, follow",
  },
  "/about": {
    title: `About Us | ${SITE_NAME}`,
    description:
      "PDFToolkit builds fast, privacy-first document tools for modern business workflows.",
    robots: "index, follow",
  },
  "/privacy": {
    title: `Privacy Policy | ${SITE_NAME}`,
    description:
      "How PDFToolkit handles your data. We do not sell personal data or train public AI models on your documents.",
    robots: "index, follow",
  },
  "/terms": {
    title: `Terms of Service | ${SITE_NAME}`,
    description: "Terms of service for using PDFToolkit online tools and eSign.",
    robots: "index, follow",
  },
  "/gdpr": {
    title: `GDPR & Compliance | ${SITE_NAME}`,
    description:
      "PDFToolkit GDPR and compliance information for teams processing documents in regulated regions.",
    robots: "index, follow",
  },
  "/docs": {
    title: `Support & Documentation | ${SITE_NAME}`,
    description: "Help center and documentation for PDFToolkit tools, eSign, and enterprise features.",
    robots: "index, follow",
  },
  "/billing": {
    title: `Plans & Pricing | ${SITE_NAME}`,
    description: "PDFToolkit plans and pricing for individuals and teams.",
    robots: "noindex, nofollow",
  },
  "/login": {
    title: `Sign in | ${SITE_NAME}`,
    description: "Sign in to your PDFToolkit account.",
    robots: "noindex, nofollow",
  },
  "/register": {
    title: `Create account | ${SITE_NAME}`,
    description: "Create a PDFToolkit account to save history, eSign, and unlock AI tools.",
    robots: "noindex, nofollow",
  },
  "/verify-email": {
    title: `Verify email | ${SITE_NAME}`,
    description: "Verify your PDFToolkit email address.",
    robots: "noindex, nofollow",
  },
  "/history": {
    title: `Activity History | ${SITE_NAME}`,
    description: "View and download your recent PDFToolkit jobs.",
    robots: "noindex, nofollow",
  },
  "/profile": {
    title: `Profile | ${SITE_NAME}`,
    description: "Manage your PDFToolkit profile.",
    robots: "noindex, nofollow",
  },
  "/settings/cloud": {
    title: `Cloud Storage Settings | ${SITE_NAME}`,
    description: "Connect your own cloud storage for Enterprise BYOC.",
    robots: "noindex, nofollow",
  },
  "/sign": {
    title: `eSign Dashboard | ${SITE_NAME}`,
    description: "Manage documents for electronic signature.",
    robots: "noindex, nofollow",
  },
  "/ai/summarize": {
    title: `Summarize PDF | ${SITE_NAME}`,
    description: "Get an AI summary of any PDF in PDFToolkit.",
    robots: "noindex, nofollow",
  },
  "/ai/explain": {
    title: `Explain PDF | ${SITE_NAME}`,
    description: "Turn dense PDF content into plain language with PDFToolkit AI.",
    robots: "noindex, nofollow",
  },
  "/ai/chat": {
    title: `Chat with PDF | ${SITE_NAME}`,
    description: "Ask questions grounded in your PDF with PDFToolkit AI.",
    robots: "noindex, nofollow",
  },
};

const PRIVATE_PREFIXES = ["/sign/", "/s/", "/workspace/"] as const;

function titleForWorkspaceTool(toolId: string): string {
  const map: Record<string, string> = {
    merge: "Merge PDF",
    split: "Split PDF",
    compress: "Compress PDF",
    rotate: "Rotate PDF",
    protect: "Protect PDF",
    "jpg-to-pdf": "JPG to PDF",
    jpgToPdf: "JPG to PDF",
    "pdf-to-jpg": "PDF to JPG",
    pdfToJpg: "PDF to JPG",
    watermark: "Watermark PDF",
    officeConvert: "Office to PDF",
    ocr: "OCR PDF",
  };
  return map[toolId] ?? toolId.replace(/-/g, " ");
}

/** Resolve SEO for the current pathname (SPA). */
export function resolveSeo(pathname: string): SeoConfig {
  const path = pathname.replace(/\/$/, "") || "/";

  if (EXACT[path]) {
    return { path, ogType: "website", ...EXACT[path] };
  }

  // /workspace/:tool
  const workspaceMatch = path.match(/^\/workspace\/([^/]+)$/);
  if (workspaceMatch) {
    const toolName = titleForWorkspaceTool(workspaceMatch[1]);
    return {
      path,
      title: `${toolName} | ${SITE_NAME}`,
      description: `${toolName} online with PDFToolkit — fast, private PDF processing.`,
      robots: "index, follow",
      ogType: "website",
    };
  }

  // /sign/:id — private editor
  if (path.startsWith("/sign/")) {
    return {
      path,
      title: `Document editor | ${SITE_NAME}`,
      description: "Edit and send a PDF for signature.",
      robots: "noindex, nofollow",
      ogType: "website",
    };
  }

  // Public signer link — noindex (private tokens)
  if (path.startsWith("/s/")) {
    return {
      path,
      title: `Sign document | ${SITE_NAME}`,
      description: "Review and sign this document securely.",
      robots: "noindex, nofollow",
      ogType: "website",
    };
  }

  // Fallback: treat unknown private-looking paths as noindex
  const isPrivate = PRIVATE_PREFIXES.some((p) => path.startsWith(p));
  return {
    ...DEFAULT_SEO,
    path,
    title: `${SITE_NAME}`,
    robots: isPrivate ? "noindex, nofollow" : "index, follow",
  };
}

/** Public paths included in sitemap.xml */
export const SITEMAP_PATHS = [
  "/",
  "/desktop",
  "/esign",
  "/enterprise",
  "/letters",
  "/workspace",
  "/security",
  "/developer",
  "/blog",
  "/about",
  "/privacy",
  "/terms",
  "/gdpr",
  "/docs",
] as const;
