"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
      <Image
        src="/images/home_background.jpg"
        alt="Background Light"
        fill
        priority
        className="object-cover dark:hidden"
      />
      <Image
        src="/images/home-black_background.jpg"
        alt="Background Dark"
        fill
        priority
        className="object-cover hidden dark:block"
      />

      {/* 
        전체 UI를 감싸는 컨테이너입니다. 
        이 컨테이너는 애니메이션이 없으며, 내부 요소들의 배치만 담당합니다.
      */}
      <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-center md:justify-start md:ml-[20vw] px-4 gap-8 z-20">
        
        {/* 1. 시각적 요소 컨테이너 (텍스트 + 버튼) */}
        {/* 이 div는 isHovered 상태에 따라 왼쪽으로 움직이는 애니메이션을 담당합니다. */}
        <div
          className={`flex flex-col md:flex-row items-center md:items-start md:gap-8 transition-transform duration-700 ease-out ${
            isOpen ? "-translate-x-20" : ""
          }`}
        >
          {/* 텍스트 부분 */}
          <div className="flex flex-col items-center md:items-start">
            <Image
              src="/images/home/wap.png"
              alt="images/home/wap"
              width={148}
              height={45}
              className="mb-4 md:mb-0 w-[148px] h-[45px] md:w-[148px] md:h-[45px] lg:w-[148px] lg:h-[45px] xl:w-[148px] xl:h-[45px]"
            />
            <h1
              ref={h1Ref}
              className="relative text-white text-center md:text-left whitespace-pre-line 
                       text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[128px] cursor-none"
              style={{
                fontFamily: "Pretendard",
                fontWeight: 700,
                letterSpacing: "-3.2px",
                WebkitMaskImage: `radial-gradient(40px at ${pos.x}px ${pos.y}px, transparent 10%, black 80%)`,
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskSize: "100% 100%",
                maskImage: `radial-gradient(40px at ${pos.x}px ${pos.y}px, transparent 10%, black 80%)`,
                maskRepeat: "no-repeat",
                maskSize: "100% 100%",
              }}
            >
              !nteractive<FadedLetters letters="eee" />
              {"\n"}
              Web<FadedLetters letters="bbb" />
              {"\n"}
              Art<FadedLetters letters="ttt" />
              {"\n"}
              Project<FadedLetters letters="ttt" />
            </h1>
          </div>
          
          {/* 시각적인 버튼 부분 */}
          <div className="relative w-[180px] h-[70px] md:w-[200px] md:h-[80px] flex items-center justify-center mt-[20px] md:mt-[450px]">
            <a>
              <button className="relative w-full h-full flex items-center justify-center gap-2 bg-transparent">
                {/* 선 SVG */}
                <svg
                    xmlns="http://www.w3.org/2000/svg" width="490" height="4"
                    viewBox="0 0 490 4" fill="none"
                  >
                    <path d="M490 2H-75" stroke={`url(#paint0_linear_${isHovered ? "hover" : "default"})`} strokeWidth="4"/>
                    <defs>
                      <linearGradient id="paint0_linear_default" x1="-75" y1="2.5" x2="490" y2="2.5" gradientUnits="userSpaceOnUse">
                        <stop stopColor="white" stopOpacity="0"/>
                        <stop offset="1" stopColor="white"/>
                      </linearGradient>
                      <linearGradient id="paint0_linear_hover" x1="-75" y1="2.5" x2="490" y2="2.5" gradientUnits="userSpaceOnUse">
                        <stop stopColor="white" stopOpacity="0"/>
                        <stop offset="1" stopColor="#926AC6"/>
                      </linearGradient>
                    </defs>
                  </svg>
                {/* 화살표 SVG */}
                {isHovered ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 70" fill="none" className="h-12 md:h-[68px]">
                    <path d="M2 2L36 35L2 68" stroke="#926AC6" strokeWidth="4"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 70" fill="none" className="h-12 md:h-[68px]">
                    <path d="M2 2L36 35L2 68" stroke="white" strokeWidth="4"/>
                  </svg>
                )}
              </button>
            </a>
          </div>
        </div>

        {/* 2. 투명한 마우스 호버 감지 영역 */}
        {/* 이 div는 눈에 보이지 않고 움직이지도 않습니다. 오직 마우스 이벤트 감지만을 위한 것입니다. */}
        {/* 시각적 요소와 분리되어 있기 때문에 떨림 현상이 발생하지 않습니다. */}
        <Link
          href="/slides"
          className="absolute w-[360px] h-[100px] mt-[20px] md:mt-[450px] cursor-pointer"
          style={{ 
            // md 이상일 때 텍스트 너비(대략 850px) + gap(32px) 만큼 오른쪽으로 이동
            transform: 'translateX(calc(850px + 32px))'
          }}
          onMouseEnter={() => {
            setIsOpen(true);
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            setIsOpen(false);
            setIsHovered(false);
          }}
        />
      </div>

      <div
        className={`absolute inset-y-0 right-0 bg-gradient-to-l from-white to-transparent transition-all duration-700 ease-out pointer-events-none z-10 ${
          isOpen ? "w-full" : "w-0"
        }`}
      />
    </main>
  );
}