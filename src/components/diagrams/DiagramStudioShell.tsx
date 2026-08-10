import { NavLink, Outlet } from "react-router-dom";
import { LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/diagrams", label: "My diagrams", icon: LayoutGrid, end: true },
  { to: "/diagrams/new", label: "New", icon: Plus, end: true },
];

export function DiagramStudioShell() {
  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-[#f7f9fc]">
      <aside className="hidden w-14 shrink-0 flex-col border-r border-[#e2e8f0] bg-white py-3 md:flex">
        <div className="mb-4 flex justify-center">
          <div className="flex size-8 items-center justify-center rounded-md bg-[#f97316] text-xs font-bold text-white">
            D
          </div>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  "flex size-10 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9]",
                  isActive && "bg-[#eff6ff] text-[#1d4ed8]"
                )
              }
            >
              <item.icon className="size-4" />
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
