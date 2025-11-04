"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeProvider";

export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative h-8 w-16 rounded-full bg-black/5 transition-colors duration-300 hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20 ${className}`}
      aria-label="Toggle dark mode"
    >
      <span
        className={`absolute top-1 left-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 dark:bg-neutral-500 ${
          isDark ? "translate-x-8" : "translate-x-0"
        }`}
      >
        {mounted ? (
          isDark ? (
            <MoonIcon className="h-4 w-4 text-yellow-300" />
          ) : (
            <SunIcon className="h-4 w-4 text-yellow-500" />
          )
        ) : null}
      </span>
    </button>
  );
}

const SunIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 4.5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1Zm0 17.5a1 1 0 0 1-1-1V19a1 1 0 0 1 2 0v2a1 1 0 0 1-1 1ZM5.636 6.05a1 1 0 0 1-1.414 0L3.11 4.939a1 1 0 0 1 1.414-1.414L5.636 4.636a1 1 0 0 1 0 1.414Zm13.253 13.253a1 1 0 0 1-1.414 0l-1.111-1.111a1 1 0 1 1 1.414-1.414l1.111 1.111a1 1 0 0 1 0 1.414ZM4.5 13H2a1 1 0 1 1 0-2h2.5a1 1 0 0 1 0 2Zm18 0H20a1 1 0 0 1 0-2h2.5a1 1 0 0 1 0 2ZM5.636 17.95 4.525 19.06a1 1 0 1 1-1.414-1.414l1.11-1.111a1 1 0 1 1 1.415 1.414Zm13.253-13.253-1.111 1.11a1 1 0 0 1-1.414-1.414l1.111-1.11a1 1 0 0 1 1.414 1.414ZM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
  </svg>
);

const MoonIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M21.752 15.002a.75.75 0 0 0-.917-.773 7.5 7.5 0 0 1-9.064-9.064.75.75 0 0 0-.917-.918 9 9 0 1 0 10.898 10.899c.078-.29-.12-.607-.4-.644Z" />
  </svg>
);
