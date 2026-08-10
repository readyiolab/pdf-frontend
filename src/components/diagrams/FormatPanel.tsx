import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DiagramSettings } from "@/lib/diagram/model";
import type { SelectionInfo } from "./DiagramCanvas";
import { cn } from "@/lib/utils";
import type { CellStyle } from "@maxgraph/core";

type Props = {
  settings: DiagramSettings;
  onSettingsChange: (patch: Partial<DiagramSettings>) => void;
  selection: SelectionInfo | null;
  onApplyStyle: (patch: Partial<CellStyle>) => void;
  className?: string;
};

export function FormatPanel({
  settings,
  onSettingsChange,
  selection,
  onApplyStyle,
  className,
}: Props) {
  const style = selection?.style ?? {};

  return (
    <aside className={cn("flex h-full w-[260px] shrink-0 flex-col border-l border-[#cfd8e3] bg-[#f5f7fa]", className)}>
      <Tabs defaultValue="diagram" className="flex h-full flex-col">
        <TabsList className="mx-2 mt-2 grid h-8 grid-cols-2 rounded-md bg-[#e2e8f0]">
          <TabsTrigger value="diagram" className="text-xs">
            Diagram
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            Style
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagram" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">View</h3>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Grid</Label>
              <Switch
                checked={settings.grid !== false}
                onCheckedChange={(v) => onSettingsChange({ grid: v })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={50}
                value={settings.gridSize ?? 10}
                onChange={(e) => onSettingsChange({ gridSize: Number(e.target.value) || 10 })}
                className="h-8 w-20 rounded-md text-xs"
              />
              <span className="text-xs text-muted-foreground">pt</span>
              <Input
                type="color"
                value="#cfe2f5"
                disabled
                className="h-8 w-10 rounded-md p-1"
                title="Grid color"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Page View</Label>
              <Switch
                checked={settings.pageView !== false}
                onCheckedChange={(v) => onSettingsChange({ pageView: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Background</Label>
              <Input
                type="color"
                value={settings.background ?? "#ffffff"}
                onChange={(e) => onSettingsChange({ background: e.target.value })}
                className="h-8 w-12 rounded-md p-1"
              />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Options</h3>
            {(
              [
                ["connectionArrows", "Connection Arrows"],
                ["connectionPoints", "Connection Points"],
                ["guides", "Guides"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <Label className="text-xs">{label}</Label>
                <Switch
                  checked={settings[key] !== false}
                  onCheckedChange={(v) => onSettingsChange({ [key]: v })}
                />
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Paper Size</h3>
            <Select
              value={settings.paper ?? "a4-portrait"}
              onValueChange={(v) => onSettingsChange({ paper: v as DiagramSettings["paper"] })}
            >
              <SelectTrigger className="h-8 rounded-md text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4-portrait">A4 Portrait</SelectItem>
                <SelectItem value="a4-landscape">A4 Landscape</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-md text-xs"
              onClick={() =>
                onSettingsChange({
                  grid: true,
                  gridSize: 10,
                  pageView: true,
                  background: "#ffffff",
                  connectionArrows: true,
                  connectionPoints: true,
                  guides: true,
                  paper: "a4-portrait",
                })
              }
            >
              Clear Default Style
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="style" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {!selection ? (
            <p className="text-xs text-muted-foreground">Select a shape or connector to edit its style.</p>
          ) : (
            <>
              {selection.isVertex && (
                <>
                  <Field label="Fill">
                    <Input
                      type="color"
                      value={(style.fillColor as string) || "#dae8fc"}
                      onChange={(e) => onApplyStyle({ fillColor: e.target.value })}
                      className="h-8 w-full rounded-md p-1"
                    />
                  </Field>
                  <Field label="Line">
                    <Input
                      type="color"
                      value={(style.strokeColor as string) || "#6c8ebf"}
                      onChange={(e) => onApplyStyle({ strokeColor: e.target.value })}
                      className="h-8 w-full rounded-md p-1"
                    />
                  </Field>
                </>
              )}
              {selection.isEdge && (
                <Field label="Line">
                  <Input
                    type="color"
                    value={(style.strokeColor as string) || "#64748b"}
                    onChange={(e) => onApplyStyle({ strokeColor: e.target.value })}
                    className="h-8 w-full rounded-md p-1"
                  />
                </Field>
              )}
              <Field label="Stroke width">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={(style.strokeWidth as number) || 1.5}
                  onChange={(e) => onApplyStyle({ strokeWidth: Number(e.target.value) || 1 })}
                  className="h-8 rounded-md text-xs"
                />
              </Field>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Dashed</Label>
                <Switch
                  checked={Boolean(style.dashed)}
                  onCheckedChange={(v) => onApplyStyle({ dashed: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Shadow</Label>
                <Switch
                  checked={Boolean(style.shadow)}
                  onCheckedChange={(v) => onApplyStyle({ shadow: v })}
                />
              </div>
              <Field label="Opacity">
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={(style.opacity as number) ?? 100}
                  onChange={(e) => onApplyStyle({ opacity: Number(e.target.value) || 100 })}
                  className="h-8 rounded-md text-xs"
                />
              </Field>
              <Field label="Font size">
                <Input
                  type="number"
                  min={8}
                  max={48}
                  value={(style.fontSize as number) || 12}
                  onChange={(e) => onApplyStyle({ fontSize: Number(e.target.value) || 12 })}
                  className="h-8 rounded-md text-xs"
                />
              </Field>
              <Field label="Font color">
                <Input
                  type="color"
                  value={(style.fontColor as string) || "#333333"}
                  onChange={(e) => onApplyStyle({ fontColor: e.target.value })}
                  className="h-8 w-full rounded-md p-1"
                />
              </Field>
              {selection.isEdge && (
                <>
                  <Field label="End arrow">
                    <Select
                      value={(style.endArrow as string) || "classic"}
                      onValueChange={(v) => onApplyStyle({ endArrow: v === "none" ? undefined : v })}
                    >
                      <SelectTrigger className="h-8 rounded-md text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["classic", "block", "open", "oval", "diamond", "none"].map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Connector">
                    <Select
                      value={
                        String(style.edgeStyle || "").includes("orthogonal")
                          ? "orthogonal"
                          : String(style.edgeStyle || "").includes("elbow")
                            ? "elbow"
                            : "straight"
                      }
                      onValueChange={(v) =>
                        onApplyStyle({
                          edgeStyle:
                            v === "orthogonal"
                              ? "orthogonalEdgeStyle"
                              : v === "elbow"
                                ? "elbowEdgeStyle"
                                : "none",
                          curved: v === "curved",
                        })
                      }
                    >
                      <SelectTrigger className="h-8 rounded-md text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="orthogonal">Orthogonal</SelectItem>
                        <SelectItem value="straight">Straight</SelectItem>
                        <SelectItem value="elbow">Elbow</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
