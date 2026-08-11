import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Menu, Plus } from "lucide-react";
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
  onSort: () => void;
  onMove: (id: string, dir: "left" | "right") => void;
  onOpenInNewWindow: (id: string) => void;
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
  onSort,
  onMove,
  onOpenInNewWindow,
  className,
}: Props) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [globalMenu, setGlobalMenu] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [listSubFor, setListSubFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuFor(null);
        setGlobalMenu(false);
        setMoveOpen(false);
        setListSubFor(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const startRename = (page: DiagramPage) => {
    setRenaming(page.id);
    setRenameVal(page.name);
    setMenuFor(null);
    setGlobalMenu(false);
    setListSubFor(null);
  };

  const pageIndex = (id: string) => pages.findIndex((p) => p.id === id);

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
                onDoubleClick={() => startRename(page)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuFor(page.id);
                  setGlobalMenu(false);
                  setMoveOpen(false);
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
              <div
                className="absolute bottom-full left-0 z-50 mb-1 min-w-[200px] rounded border border-[#cfd8e3] bg-white py-1 shadow-lg"
                onMouseLeave={() => {
                  setMoveOpen(false);
                  setMenuFor(null);
                }}
              >
                <CtxItem
                  label="Insert Page"
                  onClick={() => {
                    onInsert(page.id);
                    setMenuFor(null);
                  }}
                />
                <CtxItem label="Rename Page…" onClick={() => startRename(page)} />
                <CtxItem
                  label="Remove Page"
                  disabled={pages.length <= 1}
                  onClick={() => {
                    onRemove(page.id);
                    setMenuFor(null);
                  }}
                />
                <div
                  className="relative"
                  onMouseLeave={() => setMoveOpen(false)}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#eff6ff]"
                    onMouseEnter={() => setMoveOpen(true)}
                    onClick={() => setMoveOpen((v) => !v)}
                  >
                    Move
                    <ChevronRight className="size-3.5 text-[#94a3b8]" />
                  </button>
                  {moveOpen && (
                    <div
                      className="absolute left-full top-0 z-50 ml-0.5 min-w-[140px] rounded border border-[#cfd8e3] bg-white py-1 shadow-lg"
                      onMouseEnter={() => setMoveOpen(true)}
                    >
                      <CtxItem
                        label="Move Left"
                        disabled={pageIndex(page.id) <= 0}
                        onClick={() => {
                          onMove(page.id, "left");
                          setMenuFor(null);
                          setMoveOpen(false);
                        }}
                      />
                      <CtxItem
                        label="Move Right"
                        disabled={pageIndex(page.id) >= pages.length - 1}
                        onClick={() => {
                          onMove(page.id, "right");
                          setMenuFor(null);
                          setMoveOpen(false);
                        }}
                      />
                    </div>
                  )}
                </div>
                <CtxItem
                  label="Duplicate Page"
                  onClick={() => {
                    onDuplicate(page.id);
                    setMenuFor(null);
                  }}
                />
                <div className="my-1 border-t border-[#e2e8f0]" />
                <CtxItem
                  label="Open in New Window"
                  onClick={() => {
                    onOpenInNewWindow(page.id);
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
            setListSubFor(null);
          }}
        >
          <Menu className="size-3.5" />
        </button>
        {globalMenu && (
          <div
            className="absolute bottom-full right-0 z-50 mb-1 min-w-[200px] rounded border border-[#cfd8e3] bg-white py-1 shadow-lg"
            onMouseLeave={() => {
              setListSubFor(null);
              setGlobalMenu(false);
            }}
          >
            <CtxItem
              label="Insert Page"
              onClick={() => {
                onInsert(activePageId);
                setGlobalMenu(false);
              }}
            />
            <div className="my-1 border-t border-[#e2e8f0]" />
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              Page List
            </p>
            {pages.map((page) => (
              <div
                key={page.id}
                className="relative"
                onMouseLeave={() => {
                  if (listSubFor === page.id) setListSubFor(null);
                }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#eff6ff]"
                  onClick={() => {
                    onSelect(page.id);
                    setGlobalMenu(false);
                  }}
                  onMouseEnter={() => setListSubFor(page.id)}
                >
                  <span className="flex size-3.5 shrink-0 items-center justify-center">
                    {page.id === activePageId && (
                      <Check className="size-3.5 text-[#2563eb]" strokeWidth={2.5} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{page.name}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-[#94a3b8]" />
                </button>
                {listSubFor === page.id && (
                  <div
                    className="absolute right-full top-0 z-50 mr-0.5 min-w-[180px] rounded border border-[#cfd8e3] bg-white py-1 shadow-lg"
                    onMouseEnter={() => setListSubFor(page.id)}
                  >
                    <CtxItem label="Rename Page…" onClick={() => startRename(page)} />
                    <CtxItem
                      label="Remove Page"
                      disabled={pages.length <= 1}
                      onClick={() => {
                        onRemove(page.id);
                        setGlobalMenu(false);
                      }}
                    />
                    <CtxItem
                      label="Move Left"
                      disabled={pageIndex(page.id) <= 0}
                      onClick={() => {
                        onMove(page.id, "left");
                        setGlobalMenu(false);
                      }}
                    />
                    <CtxItem
                      label="Move Right"
                      disabled={pageIndex(page.id) >= pages.length - 1}
                      onClick={() => {
                        onMove(page.id, "right");
                        setGlobalMenu(false);
                      }}
                    />
                    <CtxItem
                      label="Duplicate Page"
                      onClick={() => {
                        onDuplicate(page.id);
                        setGlobalMenu(false);
                      }}
                    />
                    <CtxItem
                      label="Open in New Window"
                      onClick={() => {
                        onOpenInNewWindow(page.id);
                        setGlobalMenu(false);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            <div className="my-1 border-t border-[#e2e8f0]" />
            <CtxItem
              label="Sort Pages"
              onClick={() => {
                onSort();
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
