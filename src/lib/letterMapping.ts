/** Deterministic Excel-header → system-field mapping for Letter Studio. */

export const LETTER_SYSTEM_FIELDS = [
  "Employee_ID",
  "Employee_Name",
  "Employee_Email",
  "Designation",
  "Department",
  "Old_CTC",
  "New_CTC",
  "Increment_Percent",
  "Effective_Date",
  "PDF_Password",
  "Manager_Name",
] as const;

export type LetterSystemField = (typeof LETTER_SYSTEM_FIELDS)[number];

/** Lowercase and strip spaces / underscores / hyphens for fuzzy matching. */
export function normalizeHeader(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "");
}

const SYNONYMS: Record<string, LetterSystemField> = {
  employeeid: "Employee_ID",
  empid: "Employee_ID",
  empno: "Employee_ID",
  empnumber: "Employee_ID",
  staffid: "Employee_ID",
  staffno: "Employee_ID",
  employeecode: "Employee_ID",
  employeename: "Employee_Name",
  empname: "Employee_Name",
  name: "Employee_Name",
  fullname: "Employee_Name",
  employeefullname: "Employee_Name",
  employeeemail: "Employee_Email",
  empemail: "Employee_Email",
  email: "Employee_Email",
  emailid: "Employee_Email",
  mail: "Employee_Email",
  emailaddress: "Employee_Email",
  designation: "Designation",
  role: "Designation",
  title: "Designation",
  jobtitle: "Designation",
  department: "Department",
  dept: "Department",
  oldctc: "Old_CTC",
  currentctc: "Old_CTC",
  previousctc: "Old_CTC",
  ctcold: "Old_CTC",
  oldsalary: "Old_CTC",
  newctc: "New_CTC",
  revisedctc: "New_CTC",
  ctcnew: "New_CTC",
  newsalary: "New_CTC",
  incrementpercent: "Increment_Percent",
  incrementpct: "Increment_Percent",
  hike: "Increment_Percent",
  hikepct: "Increment_Percent",
  hikepercent: "Increment_Percent",
  increment: "Increment_Percent",
  effectivedate: "Effective_Date",
  effectivefrom: "Effective_Date",
  wef: "Effective_Date",
  effectivedt: "Effective_Date",
  pdfpassword: "PDF_Password",
  password: "PDF_Password",
  pwd: "PDF_Password",
  managername: "Manager_Name",
  manager: "Manager_Name",
  reportingmanager: "Manager_Name",
  rmname: "Manager_Name",
};

export type MappingSource = "exact" | "auto" | "ai" | "";

export type AutoMapResult = {
  mapping: Record<string, string>;
  sources: Record<string, MappingSource>;
  mappedCount: number;
};

/**
 * Map Excel headers to system fields without AI.
 * Exact name wins, then normalized name, then synonym table.
 * Never maps the same system field twice.
 */
export function autoMapHeaders(
  headers: string[],
  systemFields: string[] = [...LETTER_SYSTEM_FIELDS]
): AutoMapResult {
  const mapping: Record<string, string> = {};
  const sources: Record<string, MappingSource> = {};
  const used = new Set<string>();
  const fieldByNorm = new Map(
    systemFields.map((f) => [normalizeHeader(f), f] as const)
  );

  for (const h of headers) {
    mapping[h] = "";
    sources[h] = "";
  }

  // Pass 1: exact match
  for (const h of headers) {
    if (systemFields.includes(h) && !used.has(h)) {
      mapping[h] = h;
      sources[h] = "exact";
      used.add(h);
    }
  }

  // Pass 2: normalized / synonym
  for (const h of headers) {
    if (mapping[h]) continue;
    const n = normalizeHeader(h);
    const hit = fieldByNorm.get(n) || SYNONYMS[n];
    if (hit && systemFields.includes(hit) && !used.has(hit)) {
      mapping[h] = hit;
      sources[h] = "auto";
      used.add(hit);
    }
  }

  return {
    mapping,
    sources,
    mappedCount: Object.values(mapping).filter(Boolean).length,
  };
}

/** Required fields that must be mapped before validate can succeed. */
export const REQUIRED_MAP_FIELDS = [
  "Employee_ID",
  "Employee_Name",
  "Effective_Date",
] as const;

export function unmappedRequired(mapping: Record<string, string>): string[] {
  const mapped = new Set(Object.values(mapping).filter(Boolean));
  return REQUIRED_MAP_FIELDS.filter((f) => !mapped.has(f));
}

/** Chunked ArrayBuffer → base64 without quadratic string concat. */
export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export const ISSUE_LABELS: Record<string, string> = {
  BLANK_EMPLOYEE_ID: "Employee ID is empty",
  DUPLICATE_EMPLOYEE_ID: "Duplicate Employee ID",
  BLANK_EMPLOYEE_NAME: "Employee name is empty",
  INVALID_EMAIL: "Email format is invalid",
  EMAIL_REQUIRED_FOR_SEND: "Email is needed because you chose to send letters",
  MISSING_TEMPLATE_FIELD: "Your letter uses a field that has no data",
  INVALID_NEW_CTC: "New CTC is missing or not a number",
  BLANK_EFFECTIVE_DATE: "Effective date is empty",
  BLANK_OLD_CTC: "Old CTC is empty (optional)",
  BLANK_PDF_PASSWORD: "No PDF password (optional)",
};
