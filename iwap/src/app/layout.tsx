"use client";

import "./globals.css";
import Link from "next/link";
import localFont from "next/font/local";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ThemeToggle from "@/components/ui/ThemeToggle";

const Pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [forceHideHeader, setForceHideHeader] = useState(false);
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
    <html lang="ko">
      <body
        className={`relative overflow-x-hidden bg-white text-black transition-colors duration-300 dark:bg-neutral-900 dark:text-neutral-100 ${Pretendard.className}`}
      >
        <ThemeProvider>
          {showHeader && (
            <header className="fixed top-0 left-0 z-50 flex h-[30px] w-full flex-col items-center justify-center bg-white text-black transition-colors duration-300 dark:bg-neutral-900 dark:text-neutral-100 md:h-[60px]">
              <div className="relative flex w-full max-w-4xl items-center justify-center px-4">
                <Link href="/slides" className="select-none text-center">
                  <h1 className="text-[21px] font-semibold md:text-2xl">!WAP</h1>
                  <p className="hidden text-base font-extralight -translate-y-0.5 md:block">
                    !nteractive Web Art Project
                  </p>
                </Link>
              </div>
            </header>
          )}

          {!isMobileLandscape && (
            <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
              <ThemeToggle className="scale-90 md:scale-100 shadow-lg shadow-black/10 dark:shadow-none" />
            </div>
          )}

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
      </body>
    </html>
  );
}
