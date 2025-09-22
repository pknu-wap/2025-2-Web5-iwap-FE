"use client";

import { useState, useEffect } from "react";
import "./globals.css";
import localFont from "next/font/local";

const Pretendard = localFont({
  src: [
    { path: "../../public/assets/Font/Pretendard/Pretendard-Thin.otf", weight: "100", style: "normal" },
    { path: "../../public/assets/Font/Pretendard/Pretendard-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/assets/Font/Pretendard/Pretendard-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/assets/Font/Pretendard/Pretendard-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/assets/Font/Pretendard/Pretendard-SemiBold.otf", weight: "600", style: "normal" },
    { path: "../../public/assets/Font/Pretendard/Pretendard-Bold.otf", weight: "700", style: "normal" },
  ],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <html lang="en">
      <body className={`relative ${Pretendard.className} bg-white text-black dark:bg-black dark:text-white`}>
        {children}

        {/* 다크모드 토글 버튼 */}
        <button
          onClick={() => setDark(!dark)}
          className="absolute bottom-4 right-4 px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-800 text-black dark:text-white z-30"
        >
          {dark ? "Light" : "Dark"}
        </button>
      </body>
    </html>
  );
}
