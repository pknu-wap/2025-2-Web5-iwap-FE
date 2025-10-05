// layout.tsx

import "./globals.css";
import localFont from "next/font/local";

const Pretendard = localFont({
  src: "../../fonts/PretendardVariable.woff2",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`relative ${Pretendard.className} text-black`}>
        {/* [수정] 모바일(기본)에서는 숨기고, md 사이즈 이상일 때만 flex로 표시 */}
        <header className="hidden w-full h-[96px] bg-white md:flex flex-col items-center justify-center shadow-md fixed top-0 left-0 z-50">
          <h1 className="text-black text-3xl font-semibold">
            !WAP
          </h1>
          <p className="text-black text-base font-extralight">
            !nteractive Web Art Project
          </p>
        </header>
        
        {/* [수정] md 사이즈 이상일 때만 헤더 높이만큼 상단 패딩 적용 */}
        <main className="md:pt-[96px]">
          {children}
        </main>
      </body>
    </html>
  );
}