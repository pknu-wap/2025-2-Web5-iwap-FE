"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import MainHeader from "@/components/layout/MainHeader";
import FloatingThemeToggle from "@/components/layout/FloatingThemeToggle";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [forceHideHeader, setForceHideHeader] = useState(false);
  const [forceHideThemeToggle, setForceHideThemeToggle] = useState(false);
  const isLanding = (pathname || "").toLowerCase() === "/landing";
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const showHeader = pathname !== "/" && !forceHideHeader && !isMobileLandscape;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", update);
    else mq.addListener(update as any);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", update);
      else mq.removeListener(update as any);
    };
  }, []);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isLanding) {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
      return;
    }

    if (isMobile) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    }
  }, [isLanding]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ hidden: boolean }>;
      setForceHideHeader(Boolean(customEvent.detail?.hidden));
    };

    window.addEventListener("iwap:toggle-header", handler as EventListener);
    return () => {
      window.removeEventListener("iwap:toggle-header", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ hidden: boolean }>;
      setForceHideThemeToggle(Boolean(customEvent.detail?.hidden));
    };

    window.addEventListener("iwap:toggle-theme-btn", handler as EventListener);
    return () => {
      window.removeEventListener("iwap:toggle-theme-btn", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobileLandscape(w > h && w < 1024);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  return (
    <ThemeProvider>
      {showHeader && <MainHeader />}

      {!isMobileLandscape && !forceHideThemeToggle && <FloatingThemeToggle />}

      <main
        className={
          isLanding
            ? (showHeader
                ? "min-h-screen overflow-x-hidden pt-[30px] md:pt-[60px]"
                : "min-h-screen overflow-x-hidden")
            : showHeader
            ? "fixed inset-0 top-[30px] h-dvh overflow-hidden pt-0 md:top-[60px] md:pt-0"
            : "h-dvh overflow-hidden"
        }
      >
        {children}
      </main>
    </ThemeProvider>
  );
}
