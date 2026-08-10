import { useEffect, useRef, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiagramPage } from "@/lib/diagram/model";

type Props = {
  pages: DiagramPage[];
  activePageId: string;
  onSelect: (id: string) => void;
  onInsert: (afterId?: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDeleteAll: () => void;
  className?: string;
};

export function PageTabs({
  pages,
  activePageId,
  onSelect,
  onInsert,
  onRename,
  onRemove,
  onDuplicate,
  onDeleteAll,
  className,
}: Props) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [globalMenu, setGlobalMenu] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuFor(null);
        setGlobalMenu(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex h-9 shrink-0 items-center gap-1 border-t border-[#cfd8e3] bg-[#eef2f7] px-2",
        className
      )}
    >
      <button
        type="button"
        className="flex size-6 items-center justify-center rounded hover:bg-white"
        title="Insert page"
        onClick={() => onInsert(activePageId)}
      >
        <Plus className="size-3.5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {pages.map((page) => (
          <div key={page.id} className="relative">
            {renaming === page.id ? (
              <input
                autoFocus
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onBlur={() => {
                  if (renameVal.trim()) onRename(page.id, renameVal.trim());
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (renameVal.trim()) onRename(page.id, renameVal.trim());
                    setRenaming(null);
                  }
                  if (e.key === "Escape") setRenaming(null);
                }}
                className="h-7 w-28 rounded border border-[#93c5fd] px-2 text-xs outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelect(page.id)}
                onDoubleClick={() => {
                  setRenaming(page.id);
                  setRenameVal(page.name);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuFor(page.id);
                  setGlobalMenu(false);
                }}
                className={cn(
                  "h-7 rounded-t px-3 text-xs",
                  page.id === activePageId
                    ? "bg-white font-medium text-[#0f172a] shadow-sm"
                    : "text-[#64748b] hover:bg-white/70"
                )}
              >
                {page.name}
              </button>
            )}

            {menuFor === page.id && (
              <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[180px] rounded border border-[#cfd8e3] bg-white py-1 shadow-lg">
                <CtxItem
                  label="Insert Page"
                  onClick={() => {
                    onInsert(page.id);
                    setMenuFor(null);
                  }}
                />
                <CtxItem
                  label="Rename Page…"
                  onClick={() => {
                    setRenaming(page.id);
                    setRenameVal(page.name);
                    setMenuFor(null);
                  }}
                />
                <CtxItem
                  label="Remove Page"
                  disabled={pages.length <= 1}
                  onClick={() => {
                    onRemove(page.id);
                    setMenuFor(null);
                  }}
                />
                <CtxItem
                  label="Duplicate Page"
                  onClick={() => {
                    onDuplicate(page.id);
                    setMenuFor(null);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="relative">
        <button
          type="button"
          className="flex size-6 items-center justify-center rounded hover:bg-white"
          onClick={() => {
            setGlobalMenu((v) => !v);
            setMenuFor(null);
          }}
        >
          <Menu className="size-3.5" />
        </button>
        {globalMenu && (
          <div className="absolute bottom-full right-0 z-50 mb-1 min-w-[180px] rounded border border-[#cfd8e3] bg-white py-1 shadow-lg">
            <CtxItem
              label="Sort Pages"
              onClick={() => {
                /* alphabetical via parent if needed — no-op UI for now */
                setGlobalMenu(false);
              }}
            />
            <CtxItem
              label="Delete All"
              disabled={pages.length <= 1}
              onClick={() => {
                onDeleteAll();
                setGlobalMenu(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CtxItem({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full px-3 py-1.5 text-left text-xs hover:bg-[#eff6ff] disabled:opacity-40"
    >
      {label}
    </button>
  );
}
