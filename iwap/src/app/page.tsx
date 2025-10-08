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
      className="relative h-screen w-full overflow-hidden"
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

      {/* 텍스트 + 버튼 묶음 */}
      <div
        className={`absolute inset-0 flex flex-col md:flex-row items-center justify-center md:justify-start md:ml-[20vw] px-4 gap-8 transition-transform duration-700 ease-out z-20 ${
          isOpen ? "-translate-x-20" : ""
        }`}
      >
        <div className="flex flex-col items-center md:items-start">
          <Image
            src="/images/home/wap.png"
            alt="images/home/wap"
            width={148}
            height={45}
            className="mb-4 md:mb-0 w-[148px] h-[45px] md:w-[148px] md:h-[45px] lg:w-[148px] lg:h-[45px] xl:w-[148px] xl:h-[45px]"
          />

          {/* 텍스트 */}
          <h1
            ref={h1Ref}
            className="relative text-white text-center md:text-left whitespace-pre-line 
                     text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[128px]"
            style={{
              fontFamily: "Pretendard",
              fontWeight: 700,
              letterSpacing: "-3.2px",
              WebkitMaskImage: `radial-gradient(35px at ${pos.x}px ${pos.y}px, transparent 0%, black 80%)`,
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "100% 100%",
              maskImage: `radial-gradient(35px at ${pos.x}px ${pos.y}px, transparent 0%, black 80%)`,
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

        {/* 버튼 */}
        <div
          className="relative w-[180px] h-[70px] md:w-[200px] md:h-[80px] flex items-center justify-center"
          onMouseEnter={() => {
            setIsOpen(true);
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            setIsOpen(false);
            setIsHovered(false);
          }}
        >
          <Link href="/slides">
            <button className="relative w-full h-full flex items-center justify-center gap-2 bg-transparent translate-y-[215px]">
              {/* 선 */}
              {isHovered ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="490"
                  height="4"
                  viewBox="0 0 490 4"
                  fill="none"
                >
                  <path
                    d="M490 2H-75"
                    stroke="url(#paint0_linear_hover)"
                    strokeWidth="4"
                  />
                  <defs>
                    <linearGradient
                      id="paint0_linear_hover"
                      x1="-75"
                      y1="2.5"
                      x2="490"
                      y2="2.5"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="white" stopOpacity="0" />
                      <stop offset="1" stopColor="#926AC6" />
                    </linearGradient>
                  </defs>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="490"
                  height="4"
                  viewBox="0 0 490 4"
                  fill="none"
                >
                  <path
                    d="M490 2H-75"
                    stroke="url(#paint0_linear_default)"
                    strokeWidth="4"
                  />
                  <defs>
                    <linearGradient
                      id="paint0_linear_default"
                      x1="-75"
                      y1="2.5"
                      x2="490"
                      y2="2.5"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="white" stopOpacity="0" />
                      <stop offset="1" stopColor="white" />
                    </linearGradient>
                  </defs>
                </svg>
              )}

              {/* 화살표 */}
              {isHovered ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 39 70"
                  fill="none"
                  className="h-12 md:h-[68px]"
                >
                  <path
                    d="M2 2L36 35L2 68"
                    stroke="#926AC6"
                    strokeWidth="4"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 39 70"
                  fill="none"
                  className="h-12 md:h-[68px]"
                >
                  <path d="M2 2L36 35L2 68" stroke="white" strokeWidth="4" />
                </svg>
              )}
            </button>
          </Link>
        </div>
      </div>

      {/* 흰 패널 */}
      <div
        className={`absolute inset-y-0 right-0 bg-gradient-to-l from-white to-transparent transition-all duration-700 ease-out pointer-events-none z-10 ${
          isOpen ? "w-full" : "w-0"
        }`}
      />
    </main>
  );
}