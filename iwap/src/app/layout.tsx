// layout.tsx
"use client";

import "./globals.css";
import localFont from "next/font/local";
import { usePathname } from "next/navigation";
import "@/components/lightswind.css";
import Link from "next/link";
import { useEffect, useState } from "react";

const Pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [forceHideHeader, setForceHideHeader] = useState(false);
  const showHeader = pathname !== "/" && !forceHideHeader;

  // 스크롤 제어
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    // 📍 /this-is-for-u 페이지만 스크롤 허용
    if (pathname === "/this-is-for-u") {
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
  }, [pathname]);

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

  return (
    <html lang="ko">
      <body className={`relative overflow-x-hidden ${Pretendard.className} text-black`}>
        {showHeader && (
          <header className="w-full h-[30px] md:h-[60px] bg-white flex md:flex flex-col items-center justify-center fixed top-0 left-0 z-50">
            <Link href="/" className="select-none text-center">
              <h1 className="text-black text-[21px] md:text-2xl font-semibold">!WAP</h1>
              <p className="hidden md:block text-black text-base font-extralight -translate-y-0.5">
                !nteractive Web Art Project
              </p>
            </Link>
          </header>
        )}

        <main
          className={
            showHeader
              ? "pt-[30px] md:pt-[60px] min-h-dvh"
              : "min-h-dvh"
          }
        >
          {children}
        </main>
      </body>
    </html>
  );
}
