import {
  AtSign,
  Building2,
  CalendarDays,
  CaseSensitive,
  CheckSquare,
  ChevronDownSquare,
  CircleDot,
  Hash,
  Image,
  Paperclip,
  PenLine,
  Stamp,
  Type,
  User,
  type LucideIcon,
} from "lucide-react";
import type { SignFieldType } from "./types";

export interface FieldMeta {
  label: string;
  icon: LucideIcon;
  /** Grouping in the palette. */
  group: "signature" | "recipient" | "input";
  hint: string;
  /** When true, omit from the designer palette (type may still exist in data). */
  hidden?: boolean;
}

/**
 * Presentation metadata for each field type.
 *
 * Kept apart from the wire types so the contract mirror stays a plain data
 * contract with no React/lucide dependency — the backend copy of those types
 * must remain importable in Node.
 */
export const FIELD_META: Record<SignFieldType, FieldMeta> = {
  SIGNATURE: {
    label: "Signature",
    icon: PenLine,
    group: "signature",
    hint: "The recipient draws, types, or uploads their signature.",
  },
  INITIALS: {
    label: "Initials",
    icon: CaseSensitive,
    group: "signature",
    hint: "A short initials mark, typically used per page.",
  },
  STAMP: {
    label: "Stamp",
    icon: Stamp,
    group: "signature",
    hint: "A company seal or approval stamp image.",
  },
  NAME: {
    label: "Full name",
    icon: User,
    group: "recipient",
    hint: "Filled automatically from the recipient's name.",
  },
  EMAIL: {
    label: "Email",
    icon: AtSign,
    group: "recipient",
    hint: "Filled automatically from the recipient's email.",
  },
  COMPANY: {
    label: "Company",
    icon: Building2,
    group: "recipient",
    hint: "The recipient's organisation.",
  },
  DATE: {
    label: "Date signed",
    icon: CalendarDays,
    group: "recipient",
    hint: "Stamped with the date the recipient signs.",
  },
  TEXT: {
    label: "Text",
    icon: Type,
    group: "input",
    hint: "A free-text box the recipient fills in.",
  },
  NUMBER: {
    label: "Number",
    icon: Hash,
    group: "input",
    hint: "Numeric input with optional min/max.",
  },
  CHECKBOX: {
    label: "Checkbox",
    icon: CheckSquare,
    group: "input",
    hint: "A single tick box.",
  },
  RADIO: {
    label: "Radio",
    icon: CircleDot,
    group: "input",
    hint: "One choice from a set of options.",
  },
  DROPDOWN: {
    label: "Dropdown",
    icon: ChevronDownSquare,
    group: "input",
    hint: "A select list of predefined options.",
  },
  ATTACHMENT: {
    label: "Attachment",
    icon: Paperclip,
    group: "input",
    hint: "Asks the recipient to upload a supporting file.",
    /** Not offered in the palette until upload-to-S3 stamping ships. */
    hidden: true,
  },
  IMAGE: {
    label: "Image",
    icon: Image,
    group: "input",
    hint: "An image the recipient uploads.",
  },
};

export const FIELD_GROUPS: { id: FieldMeta["group"]; label: string }[] = [
  { id: "signature", label: "Signature" },
  { id: "recipient", label: "Recipient details" },
  { id: "input", label: "Inputs" },
];

/** Field types whose value we can prefill from the recipient record. */
export const AUTO_FILLED_FIELD_TYPES: SignFieldType[] = ["NAME", "EMAIL", "COMPANY", "DATE"];
