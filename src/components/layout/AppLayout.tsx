import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const AppLayout: React.FC = () => {
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isEsignEditor = /^\/sign\/[^/]+$/.test(location.pathname);
  const isFullBleed = isHome || isEsignEditor;

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-[8%] left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.12_255/0.18),transparent_70%)] blur-2xl" />
        <div className="absolute top-[45%] -right-[10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,oklch(0.8_0.06_230/0.12),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-[10%] -left-[8%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,oklch(0.85_0.04_250/0.15),transparent_70%)] blur-2xl" />
      </div>

      {!isEsignEditor && <Navbar />}

      <div className={`flex flex-1 mx-auto w-full ${isEsignEditor ? "max-w-none" : "max-w-[1600px]"}`}>
        <main className="flex-1 flex flex-col min-w-0">
          <div
            className={
              isFullBleed
                ? "flex-1 w-full min-h-0"
                : "flex-1 px-4 py-8 sm:px-6 md:px-8 lg:px-10 max-w-7xl mx-auto w-full"
            }
          >
            <Outlet />
          </div>

          {!isEsignEditor && <Footer />}
        </main>
      </div>
    </div>
  );
};
