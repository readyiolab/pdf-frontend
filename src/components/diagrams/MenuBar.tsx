import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MenuItem =
  | { type: "item"; label: string; shortcut?: string; disabled?: boolean; onClick?: () => void }
  | { type: "sep" };

type MenuDef = { id: string; label: string; items: MenuItem[] };

type Props = {
  menus: MenuDef[];
  className?: string;
};

export function MenuBar({ menus, className }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative flex items-center gap-0.5 text-[12px]", className)}>
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            type="button"
            className={cn(
              "rounded px-2 py-0.5 hover:bg-[#e2e8f0]",
              openId === menu.id && "bg-[#e2e8f0]"
            )}
            onClick={() => setOpenId((v) => (v === menu.id ? null : menu.id))}
            onMouseEnter={() => {
              if (openId) setOpenId(menu.id);
            }}
          >
            {menu.label}
          </button>
          {openId === menu.id && (
            <div className="absolute left-0 top-full z-50 mt-0.5 min-w-[220px] rounded border border-[#cfd8e3] bg-white py-1 shadow-lg">
              {menu.items.map((item, i) =>
                item.type === "sep" ? (
                  <div key={`sep-${i}`} className="my-1 border-t border-[#e2e8f0]" />
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    className="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left hover:bg-[#eff6ff] disabled:opacity-40"
                    onClick={() => {
                      item.onClick?.();
                      setOpenId(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[10px] text-[#94a3b8]">{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
