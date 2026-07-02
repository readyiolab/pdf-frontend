import React from "react";
import { useParams } from "react-router-dom";
import { ToolSelector } from "@/components/workspace/ToolSelector";
import { ToolWorkspace } from "@/components/workspace/ToolWorkspace";

export const Workspace: React.FC = () => {
  const { tool: toolParam } = useParams<{ tool?: string }>();

  if (!toolParam) {
    return <ToolSelector />;
  }

  return <ToolWorkspace toolId={toolParam} />;
};

export default Workspace;
