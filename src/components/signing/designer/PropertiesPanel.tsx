import { Copy, Lock, LockOpen, MousePointerClick, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_META } from "@/lib/signing/fieldMeta";
import type { SignFieldConfig, SignRecipient } from "@/lib/signing/types";
import type { DesignerField } from "./useFieldDesigner";

interface PropertiesPanelProps {
  selected: DesignerField[];
  recipients: SignRecipient[];
  readOnly: boolean;
  onUpdate: (id: string, patch: Partial<DesignerField>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
}

/** Field types that accept a list of choices. */
const OPTION_TYPES = new Set(["DROPDOWN", "RADIO"]);
/** Field types that render user-supplied text and therefore have font controls. */
const TEXT_TYPES = new Set(["TEXT", "NUMBER", "NAME", "EMAIL", "COMPANY", "DATE", "DROPDOWN"]);

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "31/12/2026" },
  { value: "MM/DD/YYYY", label: "12/31/2026" },
  { value: "YYYY-MM-DD", label: "2026-12-31" },
  { value: "D MMMM YYYY", label: "31 December 2026" },
  // Date + time in the signer's local zone (IST). Stamped from the actual
  // moment of signing, server-side — the signer can't alter it.
  { value: "DD/MM/YYYY HH:mm", label: "31/12/2026 14:46 IST" },
  { value: "D MMMM YYYY, h:mm A", label: "31 December 2026, 2:46 PM IST" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Right-hand inspector for the current selection.
 *
 * Multi-select intentionally exposes only the properties that are safe to apply
 * in bulk (recipient, required, lock). Editing a placeholder or a default value
 * across a mixed selection of a checkbox and a date field is meaningless, so
 * those controls appear for a single selection only.
 */
export function PropertiesPanel({
  selected,
  recipients,
  readOnly,
  onUpdate,
  onDuplicate,
  onDelete,
  onToggleLock,
}: PropertiesPanelProps) {
  if (selected.length === 0) {
    return (
      <aside className="flex w-64 shrink-0 flex-col items-center justify-center gap-3 border-l border-border bg-card p-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
          <MousePointerClick className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">No field selected</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Select a field on the page to edit its properties, or drag a new one from the left.
          </p>
        </div>
      </aside>
    );
  }

  const isMulti = selected.length > 1;
  const field = selected[0];
  const meta = FIELD_META[field.type];
  const anyUnlocked = selected.some((f) => !f.locked);

  const patchConfig = (patch: Partial<SignFieldConfig>) => {
    for (const f of selected) {
      onUpdate(f.id, { config: { ...f.config, ...patch } });
    }
  };

  const patchAll = (patch: Partial<DesignerField>) => {
    for (const f of selected) onUpdate(f.id, patch);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border bg-card" aria-label="Field properties">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <meta.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="truncate text-xs font-semibold">
          {isMulti ? `${selected.length} fields selected` : meta.label}
        </p>
      </div>

      <div className="flex-1 space-y-4 p-3">
        {/* --- Assignment --- */}
        <div>
          <SectionLabel>Assigned to</SectionLabel>
          <Select
            value={field.recipientId ?? "unassigned"}
            onValueChange={(v) => patchAll({ recipientId: v === "unassigned" ? null : v })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <span className="flex items-center gap-2">
                  <Unlink className="size-3 text-muted-foreground" />
                  Unassigned
                </span>
              </SelectItem>
              {recipients.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="truncate">{r.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!field.recipientId && (
            <p className="mt-1.5 text-[11px] leading-tight text-amber-600 dark:text-amber-500">
              Unassigned fields are skipped — nobody will be asked to fill this in.
            </p>
          )}
        </div>

        {!isMulti && (
          <div>
            <Label htmlFor="field-label" className="mb-1.5 text-xs">
              Label
            </Label>
            <Input
              id="field-label"
              value={field.label}
              onChange={(e) => onUpdate(field.id, { label: e.target.value })}
              disabled={readOnly}
              className="h-8 text-xs"
              placeholder={meta.label}
            />
          </div>
        )}

        <Separator />

        {/* --- Behaviour --- */}
        <div className="space-y-2.5">
          <SectionLabel>Behaviour</SectionLabel>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="field-required" className="text-xs font-normal">
              Required
            </Label>
            <Switch
              id="field-required"
              checked={selected.every((f) => f.required)}
              onCheckedChange={(v) => patchAll({ required: v })}
              disabled={readOnly}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="field-locked" className="text-xs font-normal">
              Locked
            </Label>
            <Switch
              id="field-locked"
              checked={selected.every((f) => f.locked)}
              onCheckedChange={onToggleLock}
              disabled={readOnly}
            />
          </div>
        </div>

        {!isMulti && !readOnly && (
          <>
            <Separator />

            {/* --- Content --- */}
            {field.type !== "CHECKBOX" && field.type !== "SIGNATURE" && field.type !== "INITIALS" && (
              <div className="space-y-2.5">
                <SectionLabel>Content</SectionLabel>

                {TEXT_TYPES.has(field.type) && (
                  <div>
                    <Label htmlFor="field-placeholder" className="mb-1.5 text-xs font-normal">
                      Placeholder
                    </Label>
                    <Input
                      id="field-placeholder"
                      value={field.config.placeholder ?? ""}
                      onChange={(e) => patchConfig({ placeholder: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="Shown when empty"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="field-default" className="mb-1.5 text-xs font-normal">
                    Default value
                  </Label>
                  <Input
                    id="field-default"
                    value={field.config.defaultValue ?? ""}
                    onChange={(e) => patchConfig({ defaultValue: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                {OPTION_TYPES.has(field.type) && (
                  <div>
                    <Label htmlFor="field-options" className="mb-1.5 text-xs font-normal">
                      Options
                    </Label>
                    <Textarea
                      id="field-options"
                      // One per line is the least fiddly way to edit a short
                      // list — comma separation breaks on options containing commas.
                      value={(field.config.options ?? []).join("\n")}
                      onChange={(e) =>
                        patchConfig({
                          options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="min-h-16 text-xs"
                      placeholder="One option per line"
                    />
                  </div>
                )}

                {field.type === "DATE" && (
                  <div>
                    <Label className="mb-1.5 text-xs font-normal">Date format</Label>
                    <Select
                      value={field.config.dateFormat ?? "DD/MM/YYYY"}
                      onValueChange={(v) => patchConfig({ dateFormat: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* --- Validation --- */}
            {(field.type === "TEXT" || field.type === "NUMBER") && (
              <>
                <Separator />
                <div className="space-y-2.5">
                  <SectionLabel>Validation</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="v-min" className="mb-1.5 text-xs font-normal">
                        {field.type === "NUMBER" ? "Min" : "Min length"}
                      </Label>
                      <Input
                        id="v-min"
                        type="number"
                        value={
                          (field.type === "NUMBER"
                            ? field.config.validation?.min
                            : field.config.validation?.minLength) ?? ""
                        }
                        onChange={(e) => {
                          // Empty means "no constraint" — storing 0 would
                          // silently impose one.
                          const n = e.target.value === "" ? undefined : Number(e.target.value);
                          patchConfig({
                            validation: {
                              ...field.config.validation,
                              ...(field.type === "NUMBER" ? { min: n } : { minLength: n }),
                            },
                          });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="v-max" className="mb-1.5 text-xs font-normal">
                        {field.type === "NUMBER" ? "Max" : "Max length"}
                      </Label>
                      <Input
                        id="v-max"
                        type="number"
                        value={
                          (field.type === "NUMBER"
                            ? field.config.validation?.max
                            : field.config.validation?.maxLength) ?? ""
                        }
                        onChange={(e) => {
                          const n = e.target.value === "" ? undefined : Number(e.target.value);
                          patchConfig({
                            validation: {
                              ...field.config.validation,
                              ...(field.type === "NUMBER" ? { max: n } : { maxLength: n }),
                            },
                          });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  {field.type === "TEXT" && (
                    <div>
                      <Label htmlFor="v-pattern" className="mb-1.5 text-xs font-normal">
                        Pattern
                      </Label>
                      <Input
                        id="v-pattern"
                        value={field.config.validation?.pattern ?? ""}
                        onChange={(e) =>
                          patchConfig({
                            validation: { ...field.config.validation, pattern: e.target.value || undefined },
                          })
                        }
                        className="h-8 font-mono text-xs"
                        placeholder="email · phone · or regex"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* --- Appearance --- */}
            <Separator />
            <div className="space-y-2.5">
              <SectionLabel>Appearance</SectionLabel>

              {TEXT_TYPES.has(field.type) && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="f-size" className="mb-1.5 text-xs font-normal">
                        Font size
                      </Label>
                      <Input
                        id="f-size"
                        type="number"
                        min={4}
                        max={96}
                        value={field.config.font?.size ?? 11}
                        onChange={(e) =>
                          patchConfig({ font: { ...field.config.font, size: Number(e.target.value) } })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="f-color" className="mb-1.5 text-xs font-normal">
                        Text colour
                      </Label>
                      <Input
                        id="f-color"
                        type="color"
                        value={field.config.font?.color ?? "#111827"}
                        onChange={(e) =>
                          patchConfig({ font: { ...field.config.font, color: e.target.value } })
                        }
                        className="h-8 cursor-pointer p-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 text-xs font-normal">Alignment</Label>
                    <Select
                      value={field.config.font?.align ?? "left"}
                      onValueChange={(v) =>
                        patchConfig({ font: { ...field.config.font, align: v as "left" | "center" | "right" } })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Centre</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <Label className="mb-1.5 text-xs font-normal">Border</Label>
                <Select
                  value={field.config.border?.style ?? "solid"}
                  onValueChange={(v) =>
                    patchConfig({ border: { ...field.config.border, style: v as "solid" | "dashed" | "none" } })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* --- Actions --- */}
      {!readOnly && (
        <div className="sticky bottom-0 flex gap-1.5 border-t border-border bg-card p-2">
          <Button variant="outline" size="sm" onClick={onDuplicate} className="flex-1">
            <Copy />
            Duplicate
          </Button>
          <Button variant="outline" size="icon-sm" onClick={onToggleLock} aria-label={anyUnlocked ? "Lock" : "Unlock"}>
            {anyUnlocked ? <Lock /> : <LockOpen />}
          </Button>
          <Button variant="destructive" size="icon-sm" onClick={onDelete} aria-label="Delete field">
            <Trash2 />
          </Button>
        </div>
      )}
    </aside>
  );
}
