import type { RefObject, ReactNode } from "react";
import type { CellStyle } from "@maxgraph/core";
import {
  DiagramCanvas,
  type DiagramCanvasHandle,
  type SelectionInfo,
} from "@/components/diagrams/DiagramCanvas";
import { ShapePanel } from "@/components/diagrams/ShapePanel";
import { FormatPanel } from "@/components/diagrams/FormatPanel";
import { ToolRail } from "@/components/diagrams/ToolRail";
import { PageTabs } from "@/components/diagrams/PageTabs";
import { SelectionToolbar } from "@/components/diagrams/SelectionToolbar";
import { PresentBar } from "@/components/diagrams/PresentBar";
import { useDiagramToolsOptional } from "@/components/diagrams/DiagramToolsContext";
import type { DiagramPage, DiagramSettings } from "@/lib/diagram/model";
import type { ShapeDef } from "@/lib/diagram/shapes";
import type { ComponentProps } from "react";

export type DiagramWorkspaceProps = {
  canvasRef: RefObject<DiagramCanvasHandle | null>;
  settings: DiagramSettings;
  readOnly?: boolean;
  onDirty: () => void;
  onGraphReady?: () => void;
  pages: DiagramPage[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onInsertPage?: (afterId?: string) => void;
  onRenamePage?: (id: string, name: string) => void;
  onRemovePage?: (id: string) => void;
  onDuplicatePage?: (id: string) => void;
  onDeleteAllPages?: () => void;
  onSortPages?: () => void;
  onMovePage?: (id: string, dir: "left" | "right") => void;
  onOpenInNewWindow?: (id: string) => void;
  shapesPanelOpen: boolean;
  formatPanelOpen: boolean;
  onToggleShapesPanel: () => void;
  onToggleFormatPanel: () => void;
  selection: SelectionInfo | null;
  selBounds: { x: number; y: number; w: number; h: number } | null;
  onSelectionChange: (info: SelectionInfo | null) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onApplySettings: (patch: Partial<DiagramSettings>) => void;
  onApplyStyle: (patch: Partial<CellStyle>) => void;
  onThemeChange: (themeId: string) => void;
  onPageSetup?: () => void;
  toolRail: Omit<
    ComponentProps<typeof ToolRail>,
    "zoom" | "onZoomChange" | "onZoomIn" | "onZoomOut" | "onToggleLeftPanel" | "onToggleFormatPanel" | "onToggleShapesPanel"
  >;
  onDropShape: (e: React.DragEvent) => void;
  presentOpen?: boolean;
  presentPlaying?: boolean;
  presentSpeed?: number;
  onPresentPlay?: () => void;
  onPresentPause?: () => void;
  onPresentRestart?: () => void;
  onPresentStep?: () => void;
  onPresentStepBack?: () => void;
  onPresentSpeed?: (s: number) => void;
  onPresentExit?: () => void;
  onSelectionAiEdit?: (action: string, text?: string) => void;
  sidePanels?: ReactNode;
  showAdvancedPageTabs?: boolean;
};

export function DiagramWorkspace({
  canvasRef,
  settings,
  readOnly = false,
  onDirty,
  onGraphReady,
  pages,
  activePageId,
  onSelectPage,
  onInsertPage,
  onRenamePage,
  onRemovePage,
  onDuplicatePage,
  onDeleteAllPages,
  onSortPages,
  onMovePage,
  onOpenInNewWindow,
  shapesPanelOpen,
  formatPanelOpen,
  onToggleShapesPanel,
  onToggleFormatPanel,
  selection,
  selBounds,
  onSelectionChange,
  zoom,
  onZoomChange,
  onApplySettings,
  onApplyStyle,
  onThemeChange,
  onPageSetup,
  toolRail,
  onDropShape,
  presentOpen = false,
  presentPlaying = false,
  presentSpeed = 1,
  onPresentPlay,
  onPresentPause,
  onPresentRestart,
  onPresentStep,
  onPresentStepBack,
  onPresentSpeed,
  onPresentExit,
  onSelectionAiEdit,
  sidePanels,
  showAdvancedPageTabs: _showAdvancedPageTabs = true,
}: DiagramWorkspaceProps) {
  const tools = useDiagramToolsOptional();

  const pickShape = (shape: ShapeDef) => {
    tools?.setPendingShape(shape.shape);
    tools?.setDrawingTool("shape-place");
  };

  return (
    <>
      <ToolRail
        {...toolRail}
        zoom={zoom}
        onZoomChange={(z) => {
          canvasRef.current?.setZoom(z);
          onZoomChange(z);
        }}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onToggleLeftPanel={onToggleShapesPanel}
        onToggleFormatPanel={onToggleFormatPanel}
        onToggleShapesPanel={onToggleShapesPanel}
      />

      <div className="flex min-h-0 flex-1">
        {shapesPanelOpen && !readOnly ? <ShapePanel onPickShape={pickShape} /> : null}
        <div
          className="relative min-w-0 flex-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropShape}
        >
          <DiagramCanvas
            ref={canvasRef}
            settings={settings}
            readOnly={readOnly}
            onDirty={onDirty}
            onGraphReady={onGraphReady}
            onSelectionChange={onSelectionChange}
            onZoomChange={onZoomChange}
            onShapePlaced={() => {
              tools?.setDrawingTool("select");
              tools?.setPendingShape(null);
              onDirty();
            }}
          />

          {!readOnly ? (
            <SelectionToolbar
              visible={Boolean(selection?.cells.length && selBounds && !presentOpen)}
              x={(selBounds?.x ?? 0) + (selBounds?.w ?? 0) / 2}
              y={selBounds?.y ?? 0}
              onConnect={() => {
                tools?.setDrawingTool("connector");
                canvasRef.current?.setToolMode("connector");
              }}
              onDuplicate={() => canvasRef.current?.duplicate()}
              onStyle={onToggleFormatPanel}
              onAiAction={(action, text) => onSelectionAiEdit?.(action, text)}
              onDelete={() => canvasRef.current?.deleteSelection()}
              onLock={() => canvasRef.current?.lockSelection(true)}
              onGroup={() => canvasRef.current?.groupSelection()}
            />
          ) : null}

          {presentOpen ? (
            <PresentBar
              playing={presentPlaying}
              speed={presentSpeed}
              onPlay={() => onPresentPlay?.()}
              onPause={() => onPresentPause?.()}
              onRestart={() => onPresentRestart?.()}
              onStep={() => onPresentStep?.()}
              onStepBack={() => onPresentStepBack?.()}
              onSpeed={(s) => onPresentSpeed?.(s)}
              onExit={() => onPresentExit?.()}
            />
          ) : null}
        </div>

        {formatPanelOpen && !readOnly ? (
          <FormatPanel
            settings={settings}
            onSettingsChange={onApplySettings}
            selection={selection}
            onApplyStyle={onApplyStyle}
            onOpenPageSetup={onPageSetup}
            onThemeChange={onThemeChange}
          />
        ) : null}

        {sidePanels}
      </div>

      <PageTabs
        pages={pages}
        activePageId={activePageId}
        onSelect={onSelectPage}
        onInsert={onInsertPage ?? (() => undefined)}
        onRename={onRenamePage ?? (() => undefined)}
        onRemove={onRemovePage ?? (() => undefined)}
        onDuplicate={onDuplicatePage ?? (() => undefined)}
        onDeleteAll={onDeleteAllPages ?? (() => undefined)}
        onSort={onSortPages ?? (() => undefined)}
        onMove={onMovePage ?? (() => undefined)}
        onOpenInNewWindow={onOpenInNewWindow ?? (() => undefined)}
      />
    </>
  );
}
