import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TOOLS, TOOL_CATEGORIES, getToolRoute, type ToolConfig } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  Search,
  Star,
  LayoutGrid,
  List,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Button } from "../ui/button";

export const ToolSelector: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteTools, setFavoriteTools] = useState<string[]>(["summarize", "merge", "compress"]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavoriteTools((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredTools = TOOLS.filter((tool) => {
    const matchesCategory =
      activeCategory === "All" || tool.categories.includes(activeCategory);
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = !favoritesOnly || favoriteTools.includes(tool.id);
    return matchesCategory && matchesSearch && matchesFav;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Workspace Toolkit
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {TOOLS.length} Tools
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Every PDF tool you need
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Merge, compress, convert, protect, and more — pick a tool and start in seconds.
          </p>
        </div>

        {/* Action Controls: Search & Favorites */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all",
              favoritesOnly
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-card text-muted-foreground border-border/80 hover:bg-muted"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", favoritesOnly && "fill-amber-500 text-amber-500")} />
            Favorites
          </button>

          <div className="flex items-center p-1 rounded-xl border bg-card">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "grid" ? "bg-muted text-foreground font-bold" : "text-muted-foreground"
              )}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "list" ? "bg-muted text-foreground font-bold" : "text-muted-foreground"
              )}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Unified Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
          {TOOL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px] md:min-w-[280px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
          />
        </div>

      </div>

      {/* Tools Grid / List View */}
      {filteredTools.length > 0 ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "flex flex-col gap-3"
          )}
        >
          {filteredTools.map((tool, i) => {
            const Icon = tool.icon;
            const isFav = favoriteTools.includes(tool.id);
            const isAi =
              tool.id === "summarize" ||
              tool.id === "chatpdf" ||
              tool.id === "explain" ||
              tool.id === "ocr";

            if (viewMode === "list") {
              return (
                <div
                  key={tool.id}
                  onClick={() => navigate(getToolRoute(tool))}
                  className="group flex items-center justify-between p-3.5 rounded-2xl border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-sm hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", tool.accent)}>
                      <Icon className={cn("h-4 w-4", tool.accentText)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {tool.name}
                        </h3>
                        {isAi && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded-full bg-fuchsia-500/10 text-fuchsia-500">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 font-normal">{tool.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => toggleFavorite(tool.id, e)}
                      className="p-1 rounded-lg text-muted-foreground/40 hover:text-amber-500"
                    >
                      <Star className={cn("h-4 w-4", isFav && "fill-amber-500 text-amber-500")} />
                    </button>
                    <Button size="sm" variant="ghost" className="text-xs font-bold text-primary">
                      Launch <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <ToolCard
                key={tool.id}
                tool={tool}
                index={i}
                isFav={isFav}
                onToggleFav={(e) => toggleFavorite(tool.id, e)}
                onClick={() => navigate(getToolRoute(tool))}
              />
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border bg-card">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground">No matching tools found</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">Try adjusting your search terms or category filter.</p>
          <Button size="sm" onClick={() => { setActiveCategory("All"); setSearchQuery(""); setFavoritesOnly(false); }}>
            Reset Filters
          </Button>
        </div>
      )}

    </div>
  );
};

interface ToolCardProps {
  tool: ToolConfig;
  index: number;
  isFav: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, index, isFav, onToggleFav, onClick }) => {
  const Icon = tool.icon;
  const isAi =
    tool.id === "summarize" ||
    tool.id === "chatpdf" ||
    tool.id === "explain" ||
    tool.id === "ocr";
  const featured = tool.id === "esign";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition-all duration-300 animate-fade-in-up hover:-translate-y-1 hover:shadow-xl",
        featured
          ? "border-blue-200 bg-gradient-to-br from-blue-50/80 via-card to-sky-50/50 hover:border-blue-300 hover:shadow-blue-600/10"
          : "border-border/80 bg-card hover:border-primary/35"
      )}
      style={{ animationDelay: `${index * 25}ms` }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          tool.gradient
        )}
      />

      <div className="relative">
        <div className="mb-3.5 flex items-center justify-between">
          <div
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105",
              tool.accent
            )}
          >
            <Icon className={cn("h-5 w-5", tool.accentText)} />
          </div>

          <div className="flex items-center gap-1">
            {featured && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Popular
              </span>
            )}
            <div
              onClick={onToggleFav}
              className="rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:text-amber-500"
            >
              <Star className={cn("h-4 w-4", isFav && "fill-amber-500 text-amber-500")} />
            </div>
          </div>
        </div>

        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {tool.name}
          </h3>
          {isAi && (
            <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-fuchsia-600">
              AI
            </span>
          )}
        </div>

        <p className="line-clamp-2 text-[12px] font-normal leading-relaxed text-muted-foreground">
          {tool.desc}
        </p>
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-border/60 pt-3.5 text-[11px] font-medium text-muted-foreground">
        <span>{tool.categories[1]}</span>
        <span className="flex items-center gap-0.5 font-semibold text-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
};
