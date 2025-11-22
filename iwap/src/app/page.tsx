"use client";

import { useEffect, useState } from "react";
import HomeDesktop from "@/components/home/HomeDesktop";
import HomeMobile from "@/components/home/HomeMobile";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function Home() {
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 650px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    setMounted(true);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    setIsThemeReady(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const shouldUseDarkTheme = isThemeReady && theme === "dark";

  return isMobile ? (
    <HomeMobile isDarkTheme={shouldUseDarkTheme} />
  ) : (
    <HomeDesktop isDarkTheme={shouldUseDarkTheme} />
  );
}
