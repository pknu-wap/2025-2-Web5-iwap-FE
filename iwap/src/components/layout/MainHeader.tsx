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
      className={`fixed top-0 left-0 z-50 flex h-[30px] w-full flex-col items-center justify-center text-black transition-colors duration-300 dark:text-neutral-100 md:h-[60px] ${
        isDark ? "bg-neutral-900" : "bg-white"
      }`}
    >
      <div className="relative flex w-full max-w-4xl items-center justify-center px-4">
        <Link href="/slides" className="select-none text-center">
          <h1 className="text-[21px] font-semibold md:text-2xl">!WAP</h1>
          <p className="hidden text-base font-extralight -translate-y-0.5 md:block">
            !nteractive Web Art Project
          </p>
        </Link>
      </div>
    </header>
  );
}
