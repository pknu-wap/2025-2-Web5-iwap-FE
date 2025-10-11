// layout.tsx
"use client";

import "./globals.css";
import localFont from "next/font/local";
import { usePathname } from "next/navigation";

const Pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 현재 경로 가져오기
  const pathname = usePathname();
  // 메인 페이지가 아닌 경우 헤더 표시
  const showHeader = pathname !== '/';

  return (
    <html lang="ko">
      <body className={`relative ${Pretendard.className} text-black`}>
        
        {/* (메인페이지가 아닌 경우) 모바일(기본)에서는 숨기고, md 사이즈 이상일 때만 flex로 표시 */}
        {showHeader && (
          <header className="hidden w-full h-[96px] bg-white md:flex flex-col items-center justify-center fixed top-0 left-0 z-50">
            <h1 className="text-black text-3xl font-semibold">
              !WAP
            </h1>
            <p className="text-black text-base font-extralight">
              !nteractive Web Art Project
            </p>
          </header>
        )}
        
        {/* (메인페이지가 아닌 경우) md 사이즈 이상일 때만 헤더 높이만큼 상단 패딩 적용 */}
        <main className={showHeader ? "md:pt-[96px]" : ""}>
          {children}
        </main>
      </body>
    </html>
  );
}