import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { ToolSelector } from "@/components/workspace/ToolSelector";
import { ToolWorkspace } from "@/components/workspace/ToolWorkspace";
import { getToolById } from "@/lib/design-tokens";

export const Workspace: React.FC = () => {
  const { tool: toolParam } = useParams<{ tool?: string }>();

  if (!toolParam) {
    return <ToolSelector />;
  }

  // A tool with its own `route` is not a queue job and ToolWorkspace can't run
  // it — it would upload the file and enqueue a tool the backend rejects. The
  // cards already link to the right place; this only catches a hand-typed or
  // bookmarked /workspace/<id>.
  const tool = getToolById(toolParam);
  if (tool?.route) {
    return <Navigate to={tool.route} replace />;
  }

  return <ToolWorkspace toolId={toolParam} />;
};

export default Workspace;
