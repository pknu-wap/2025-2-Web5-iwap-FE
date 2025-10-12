"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation"; // next/navigation에서 useRouter를 가져옵니다.

const fadeStyles = [
  { color: "rgba(255,255,255,0.70)", weight: 500 },
  { color: "rgba(255,255,255,0.50)", weight: 300 },
  { color: "rgba(255,255,255,0.30)", weight: 100 },
];

function FadedLetters({ letters }: { letters: string }) {
  return (
    <>
      {letters.split("").map((char, i) => (
        <span
          key={i}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[128px]"
          style={{
            color: fadeStyles[i % fadeStyles.length].color,
            fontWeight: fadeStyles[i % fadeStyles.length].weight,
            fontFamily: "Pretendard",
            letterSpacing: "-3.2px",
          }}
        >
          {char}
        </span>
      ))}
    </>
  );
}

export default function Home() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const router = useRouter(); // useRouter 훅을 사용합니다.

  // 페이지 이동을 처리하는 함수
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // 기본 링크 이동 동작을 막습니다.
    setIsOpen(true); // 애니메이션 상태를 활성화합니다.
    setIsHovered(true); // 호버 상태를 활성화하여 시각적 효과를 줍니다.

    // 700ms(애니메이션 시간) 후에 페이지를 이동시킵니다.
    setTimeout(() => {
      router.push("/slides");
    }, 700);
  };

  return (
    <main
      className="relative w-full h-dvh overflow-hidden select-none"
      onMouseMove={(e) => {
        if (!h1Ref.current) return;
        const rect = h1Ref.current.getBoundingClientRect();
        setPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
    >
      {/* 배경 이미지 */}
      <Image src="/images/home_background.jpg" alt="Background Light" fill priority className="object-cover dark:hidden" />
      <Image src="/images/home-black_background.jpg" alt="Background Dark" fill priority className="object-cover hidden dark:block" />

      {/* 1. 텍스트 컨테이너 */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center -translate-y-5 px-4 sm:flex-row sm:justify-start sm:ml-[15vw] md:ml-[20vw]">
        <div
          className={`transition-transform duration-700 ease-out ${
            isOpen ? "sm:-translate-x-20" : ""
          }`}
        >
          <div className="flex flex-col items-center sm:items-start">
            <Image src="/images/home/wap.png" alt="images/home/wap" width={148} height={45} className="w-[148px] h-[45px] mb-4 sm:mb-0" />
            <h1 ref={h1Ref} className="relative text-white text-center sm:text-left whitespace-pre-line text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[128px] cursor-default pb-2" style={{ fontFamily: "Pretendard", fontWeight: 700, letterSpacing: "-3.2px", WebkitMaskImage: `radial-gradient(40px at ${pos.x}px ${pos.y}px, transparent 10%, black 80%)`, maskImage: `radial-gradient(40px at ${pos.x}px ${pos.y}px, transparent 10%, black 80%)`}}>
              !nteractive<FadedLetters letters="eee" />{"\n"}
              Web<FadedLetters letters="bbb" />{"\n"}
              Art<FadedLetters letters="ttt" />{"\n"}
              Project<FadedLetters letters="ttt" />
            </h1>
          </div>
        </div>
      </div>
      
      {/* 2. 버튼 컨테이너 */}
      <div 
        className="absolute z-30
                   w-[240px] h-[70px] left-1/2 -translate-x-1/2 top-1/2 translate-y-[180px] /* 모바일 세로 */
                   sm:w-[280px] sm:h-[80px] sm:left-auto sm:top-auto sm:right-10 sm:bottom-8 sm:translate-x-0 sm:translate-y-0 /* 모바일 가로 & 태블릿 */
                   lg:right-40 lg:bottom-30 /* 데스크톱 */"
      >
        {/* 시각적 버튼 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="relative flex items-center justify-center w-full h-full gap-2 bg-transparent pointer-events-none">
            <svg className="w-full" height="4" viewBox="0 0 490 4" fill="none">
              <path d="M490 2H-75" stroke={`url(#paint0_linear_${isHovered ? "hover" : "default"})`} strokeWidth="4"/>
              <defs>
                <linearGradient id="paint0_linear_default" x1="-75" y1="2.5" x2="490" y2="2.5" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0"/><stop offset="1" stopColor="white"/></linearGradient>
                <linearGradient id="paint0_linear_hover" x1="-75" y1="2.5" x2="490" y2="2.5" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0"/><stop offset="1" stopColor="#926AC6"/></linearGradient>
              </defs>
            </svg>
            {/* 화살표 SVG 크기 반응형으로 수정 */}
            {isHovered ? <svg viewBox="0 0 39 70" fill="none" className="h-10 md:h-[68px]"><path d="M2 2L36 35L2 68" stroke="#926AC6" strokeWidth="4"/></svg> : <svg viewBox="0 0 39 70" fill="none" className="h-10 md:h-[68px]"><path d="M2 2L36 35L2 68" stroke="white" strokeWidth="4"/></svg>}
          </button>
        </div>

        {/* 투명한 링크 영역 */}
        <Link
          href="/slides"
          className="absolute inset-0 cursor-pointer"
          onMouseEnter={() => { setIsOpen(true); setIsHovered(true); }}
          onMouseLeave={() => { setIsOpen(false); setIsHovered(false); }}
          onClick={handleLinkClick} // onClick 이벤트 핸들러를 추가합니다.
        />
      </div>

      {/* 페이지 전환 효과를 위한 그라데이션 오버레이 */}
      <div className={`absolute inset-y-0 right-0 bg-gradient-to-l from-white to-transparent transition-all duration-700 ease-out pointer-events-none z-10 ${isOpen ? "w-full" : "w-0"}`}></div>
    </main>
  );
}