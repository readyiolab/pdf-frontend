import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TOOLS, TOOL_CATEGORIES, type ToolConfig } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export const ToolSelector: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredTools = TOOLS.filter((tool) =>
    tool.categories.includes(activeCategory)
  );

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Select a PDF Tool
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Choose from our premium suite of PDF tools to edit, compress, convert, or protect your documents.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {TOOL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer",
              activeCategory === cat
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTools.map((tool, i) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            index={i}
            onClick={() => navigate(`/workspace/${tool.id}`)}
          />
        ))}
      </div>
    </div>
  );
};

interface ToolCardProps {
  tool: ToolConfig;
  index: number;
  onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, index, onClick }) => {
  const Icon = tool.icon;

  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Hover gradient overlay */}
      <div className={cn(
        "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
        tool.gradient
      )} />

      <div className="relative">
        <div className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3 transition-transform duration-300 group-hover:scale-110",
          tool.accent
        )}>
          <Icon className={cn("h-5 w-5", tool.accentText)} />
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
          {tool.name}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {tool.desc}
        </p>
      </div>
    </button>
  );
};
