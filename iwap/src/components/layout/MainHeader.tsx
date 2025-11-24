"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";

export default function MainHeader() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

  return (
    <header
      className={`fixed top-0 left-0 z-50 flex h-[30px] w-full flex-col items-center justify-center transition-colors duration-300 md:h-[60px] ${
        isDark ? "bg-neutral-900 text-neutral-100" : "bg-white text-black"
      }`}
    >
      <div className="relative flex w-full max-w-4xl items-center justify-center px-4">
        <Link href="/slides" className="select-none text-center">
          <h1 className={`text-[21px] font-semibold md:text-2xl ${isDark ? "text-neutral-100" : "text-black"}`}>!WAP</h1>
          <p className={`hidden text-base font-extralight -translate-y-0.5 md:block ${isDark ? "text-neutral-100" : "text-black"}`}>
            !nteractive Web Art Project
          </p>
        </Link>
      </div>
    </header>
  );
}
