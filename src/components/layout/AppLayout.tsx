import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";

export const AppLayout: React.FC = () => {
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isEsignEditor = /^\/sign\/[^/]+$/.test(location.pathname);
  const isAiStudio = location.pathname.startsWith("/ai/");
  const isToolStudio = /^\/workspace\/[^/]+$/.test(location.pathname);
  const isFullBleed = isHome || isEsignEditor || isAiStudio || isToolStudio;
  const hideChrome = isEsignEditor;
  const hideFooter = isEsignEditor || isAiStudio || isToolStudio;

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col text-foreground transition-colors duration-300",
        isHome ? "bg-[#F7F9FC]" : "bg-background"
      )}
    >
      {!isHome && !isAiStudio && !isToolStudio && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -top-[8%] left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.12_255/0.18),transparent_70%)] blur-2xl" />
          <div className="absolute top-[45%] -right-[10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,oklch(0.8_0.06_230/0.12),transparent_70%)] blur-2xl" />
          <div className="absolute bottom-[10%] -left-[8%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,oklch(0.85_0.04_250/0.15),transparent_70%)] blur-2xl" />
        </div>
      )}

      {!hideChrome && <Navbar />}

      <div className={cn("mx-auto flex w-full flex-1", isFullBleed ? "max-w-none" : "max-w-[1600px]")}>
        <main className="flex min-w-0 flex-1 flex-col">
          <div
            className={
              isFullBleed
                ? "flex min-h-0 w-full flex-1"
                : "mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 md:px-8 lg:px-10"
            }
          >
            <Outlet />
          </div>

          {!hideFooter && <Footer />}
        </main>
      </div>
    </div>
  );
};
