"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HomeHeadline, desktopFadePalette } from "./HomeHeadline";

const headlineLetterClassName =
  "text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[128px]";

export default function HomeDesktop() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [buttonRect, setButtonRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, []);

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsOpen(true);
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsHovered(true);
    }

    setTimeout(() => {
      router.push("/slides");
    }, 700);
  };

  const h1Style: CSSProperties = {
    fontFamily: "Pretendard",
    fontWeight: 700,
    letterSpacing: "-3.2px",
  };

  return (
    <main className="relative w-full h-dvh overflow-hidden select-none">
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

      <div className="absolute inset-0 z-20 flex items-center justify-center -translate-y-5 px-6 sm:px-8 md:px-12">
        <div
          className={`flex w-full max-w-screen-xl 
            flex-col items-center gap-12
            sm:flex-row sm:items-end sm:justify-between
            transition-transform duration-800 ease-out ${
            isOpen ? "sm:-translate-x-10" : ""
          }`}
        >
          <div className="flex flex-col items-start">
            <Image
              src="/images/home/wap.svg"
              alt="images/home/wap"
              width={148}
              height={45}
              className="mb-4 h-auto w-[80px] md:h-[45px] md:w-[148px]"
            />
        <HomeHeadline
          className="text-left"
          style={h1Style}
          letterClassName={headlineLetterClassName}
          fadePalette={desktopFadePalette}
        />
      </div>

          <div
            ref={buttonRef}
            className="relative w-[240px] h-[70px] sm:w-[280px] sm:h-[80px] pointer-events-none self-center sm:self-end mb-2 lg:mb-10 flex-shrink-0"
          >
            <div className="absolute inset-0 flex items-center justify-center translate-y-7">
              <button className="relative flex items-center justify-center w-full h-full gap-2 bg-transparent">
                <svg className="w-full" height="4" viewBox="0 0 490 4" fill="none">
                  <path
                    d="M490 2H-75"
                    stroke={`url(#paint0_linear_${isHovered ? "hover" : "default"})`}
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
                {isHovered ? (
                  <svg viewBox="0 0 39 70" fill="none" className="h-10 md:h-[68px]">
                    <path d="M2 2L36 35L2 68" stroke="#926AC6" strokeWidth="4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 39 70" fill="none" className="h-10 md:h-[68px]">
                    <path d="M2 2L36 35L2 68" stroke="white" strokeWidth="4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {buttonRect && (
        <div
          className="absolute z-30"
          style={{
            top: `${buttonRect.top - 50}px`,
            height: `${buttonRect.height + 100}px`,
            left: `${buttonRect.left - 100}px`,
            width: `${buttonRect.width + 250}px`,
          }}
        >
          <Link
            href="/slides"
            className="absolute inset-0 cursor-pointer"
            onMouseEnter={() => {
              if (typeof window !== "undefined" && window.innerWidth >= 768) {
                setIsOpen(true);
                setIsHovered(true);
              }
            }}
            onMouseLeave={() => {
              if (typeof window !== "undefined" && window.innerWidth >= 768) {
                setIsOpen(false);
                setIsHovered(false);
              }
            }}
            onClick={handleLinkClick}
          />
        </div>
      )}

      <div
        className={`absolute inset-y-0 right-0 bg-gradient-to-l from-white to-transparent transition-all duration-700 ease-out pointer-events-none z-10 ${
          isOpen ? "w-[90vw]" : "w-0"
        }`}
      ></div>
    </main>
  );
}
