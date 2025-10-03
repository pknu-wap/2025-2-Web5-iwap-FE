// "use client"; // 1. "use client" 삭제
// import { useState, useEffect } from "react"; // 2. useState, useEffect import 삭제
import "./globals.css";
import localFont from "next/font/local";

const Pretendard = localFont({
  src: "../../fonts/PretendardVariable.woff2",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 2. useState, useEffect 로직 전체 삭제

  return (
    <html lang="en">
      <body className={`relative ${Pretendard.className} text-black`}>
        <header className="w-full h-[96px] bg-white flex flex-col items-center justify-center shadow-md fixed top-0 left-0 z-50">
          <h1 className="justify-start text-black text-3xl font-semibold font-['Pretendard']">
            !WAP
          </h1>
          <p className="justify-start text-black text-base font-extralight font-['Pretendard']">
            !nteractive Web Art Project
          </p>
        </header>

        <main className="pt-[96px]">{children}</main>
      </body>
    </html>
  );
}