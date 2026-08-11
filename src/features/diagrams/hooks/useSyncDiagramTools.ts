import { useEffect, type RefObject } from "react";
import type { DiagramCanvasHandle } from "@/components/diagrams/DiagramCanvas";
import { useDiagramTools } from "@/components/diagrams/DiagramToolsContext";

/** Pushes DiagramToolsContext drawing state into the imperative canvas. */
export function useSyncDiagramTools(canvasRef: RefObject<DiagramCanvasHandle | null>) {
  const tools = useDiagramTools();

  useEffect(() => {
    const tool = tools.activeTool;
    let mode: "select" | "pan" | "pen" | "brush" | "eraser" | "connector" | "arrow" | "shape-place" =
      "select";
    if (tool === "pencil") mode = "pen";
    else if (tool === "marker") mode = "brush";
    else if (
      tool === "pen" ||
      tool === "brush" ||
      tool === "eraser" ||
      tool === "connector" ||
      tool === "arrow" ||
      tool === "pan" ||
      tool === "shape-place"
    ) {
      mode = tool;
    }
    canvasRef.current?.setToolMode(mode);
    canvasRef.current?.setPendingShape(tools.pendingShape);
    if (tool === "pen" || tool === "pencil") {
      canvasRef.current?.setPenStyle({ ...tools.pen, brush: "pen" });
    } else if (tool === "brush" || tool === "marker") {
      canvasRef.current?.setPenStyle({ ...tools.brush, brush: "brush" });
    }
  }, [canvasRef, tools.activeTool, tools.pen, tools.brush, tools.pendingShape]);

  useEffect(() => {
    canvasRef.current?.setDefaultEdgeStyle(tools.connectorStyle);
  }, [canvasRef, tools.connectorStyle]);

  return tools;
}
