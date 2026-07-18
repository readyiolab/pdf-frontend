import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_META } from "@/lib/signing/fieldMeta";
import type { SignViewField, SignViewParticipant } from "@/services/publicSigningApi";

interface SignFieldOverlayProps {
  pageNumber: number;
  fields: SignViewField[];
  participants: SignViewParticipant[];
  values: Record<string, string>;
  /** The field the "next" button is currently pointing at. */
  focusedFieldId: string | null;
  pageWidth: number;
  pageHeight: number;
  readOnly: boolean;
  onFieldClick: (field: SignViewField) => void;
}

const IMAGE_FIELDS = new Set(["SIGNATURE", "INITIALS", "STAMP", "IMAGE"]);

/**
 * The interactive layer over one page during signing.
 *
 * Two populations of field live here and must look different at a glance:
 * the signer's own (actionable, tinted in their colour, clickable) and everyone
 * else's (context only, muted, inert). Conflating them is how signers end up
 * confused about what is being asked of them.
 */
export function SignFieldOverlay({
  pageNumber,
  fields,
  participants,
  values,
  focusedFieldId,
  pageWidth,
  pageHeight,
  readOnly,
  onFieldClick,
}: SignFieldOverlayProps) {
  return (
    <div className="absolute inset-0">
      {fields
        .filter((f) => f.page === pageNumber)
        .map((field) => {
          const meta = FIELD_META[field.type];
          const Icon = meta.icon;
          const owner = participants.find((p) => p.id === field.recipientId);
          const value = values[field.id] ?? field.value ?? "";
          const isFilled = Boolean(value);
          const isImage = IMAGE_FIELDS.has(field.type);
          const isFocused = focusedFieldId === field.id;

          // Someone else's field: show what they entered, but never invite
          // interaction. Signing is per-person.
          if (!field.isMine) {
            return (
              <div
                key={field.id}
                className="absolute flex items-center justify-center overflow-hidden rounded-sm"
                style={{
                  left: `${field.x * 100}%`,
                  top: `${field.y * 100}%`,
                  width: `${field.width * 100}%`,
                  height: `${field.height * 100}%`,
                  backgroundColor: isFilled ? "transparent" : `${owner?.color ?? "#94a3b8"}0f`,
                  border: isFilled ? "none" : `1px dashed ${owner?.color ?? "#94a3b8"}55`,
                }}
                aria-hidden="true"
              >
                {isFilled &&
                  (isImage ? (
                    <img src={value} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span
                      className="truncate px-0.5 text-slate-900"
                      style={{ fontSize: Math.max(pageHeight * field.height * 0.6, 6) }}
                    >
                      {value}
                    </span>
                  ))}
              </div>
            );
          }

          return (
            <button
              key={field.id}
              type="button"
              disabled={readOnly}
              onClick={() => onFieldClick(field)}
              aria-label={`${meta.label}${field.required ? ", required" : ", optional"}${isFilled ? ", completed" : ", not yet filled"}`}
              className={cn(
                "group absolute flex items-center justify-center overflow-hidden rounded-sm transition-all",
                !readOnly && "cursor-pointer",
                // A pulsing ring on the field the signer is being sent to. This is
                // the single most useful affordance in the whole page — on a
                // 40-page contract, "where do I sign" is the entire question.
                isFocused && "z-20 ring-2 ring-offset-2 ring-primary animate-pulse-ring",
                !isFilled && !readOnly && "hover:brightness-95"
              )}
              style={{
                left: `${field.x * 100}%`,
                top: `${field.y * 100}%`,
                width: `${field.width * 100}%`,
                height: `${field.height * 100}%`,
                backgroundColor: isFilled ? "transparent" : `${field.isMine ? "#2563eb" : "#94a3b8"}1f`,
                border: isFilled ? "none" : `2px solid ${owner?.color ?? "#2563eb"}`,
              }}
            >
              {isFilled ? (
                isImage ? (
                  <img src={value} alt="Your signature" className="h-full w-full object-contain" />
                ) : (
                  <span
                    className="truncate px-0.5 text-slate-900"
                    style={{ fontSize: Math.max(pageHeight * field.height * 0.6, 6) }}
                  >
                    {value}
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1 truncate px-1 text-[10px] font-semibold" style={{ color: owner?.color }}>
                  <Icon className="size-3 shrink-0" />
                  {/* Below ~70px the label and icon collide; the icon alone still reads. */}
                  {pageWidth * field.width > 70 && <span className="truncate">{field.label || meta.label}</span>}
                </span>
              )}

              {isFilled && (
                <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                  <Check className="size-2 text-white" strokeWidth={4} />
                </span>
              )}
              {!isFilled && field.required && (
                <span className="absolute -right-0.5 -top-0.5 text-[10px] font-bold leading-none text-destructive">*</span>
              )}
            </button>
          );
        })}
    </div>
  );
}
