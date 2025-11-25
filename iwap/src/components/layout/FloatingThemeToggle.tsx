"use client";

import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";

export default function FloatingThemeToggle() {
  const { theme } = useTheme();

  const isDark = theme === "dark";

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
      <ThemeToggle
        className={`scale-90 md:scale-100 ${
          isDark ? "shadow-none" : "shadow-lg shadow-black/10"
        }`}
      />
    </div>
  );
}
