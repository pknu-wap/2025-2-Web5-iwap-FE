/**
 * @file 모든 페이지에 공통적으로 적용될 최상위 레이아웃 컴포넌트.
 *       전역 CSS, Pretendard 폰트, 공통 헤더 및 메인 콘텐츠 영역을 정의함.
 */
import "./globals.css";
import localFont from "next/font/local";

// Pretendard 폰트를 로컬 파일로부터 불러와 전역적으로 사용하도록 설정.
const Pretendard = localFont({
  src: "../../fonts/PretendardVariable.woff2",
  display: "swap", // 폰트 로딩 중 대체 텍스트를 먼저 보여주고, 로딩 완료 시 전환.
});

/**
 * 모든 페이지를 감싸는 루트 레이아웃.
 * @param {object} props - 컴포넌트 프로퍼티
 * @param {React.ReactNode} props.children - 이 레이아웃으로 감싸질 자식 페이지 컴포넌트들.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // HTML 문서의 기본 언어를 한국어로 설정.
    <html lang="ko">
      <body className={`relative ${Pretendard.className} text-black`}>
        {/* 모든 페이지 상단에 고정되는 공통 헤더 */}
        <header className="w-full h-[96px] bg-white flex flex-col items-center justify-center shadow-md fixed top-0 left-0 z-50">
          <h1 className="text-black text-3xl font-semibold">
            !WAP
          </h1>
          <p className="text-black text-base font-extralight">
            !nteractive Web Art Project
          </p>
        </header>
        
        {/* 
          실제 페이지 콘텐츠가 렌더링될 메인 영역.
          상단에 고정된 헤더의 높이(96px)만큼 상단 패딩을 주어 콘텐츠가 가려지지 않도록 함.
        */}
        <main className="pt-[96px]">
          {children}
        </main>
      </body>
    </html>
  );
}