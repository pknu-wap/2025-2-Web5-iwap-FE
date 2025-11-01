"use client";

import { useRef, useState, useEffect } from "react";
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

  // 시각적 버튼의 위치와 크기를 저장할 state
  const [buttonRect, setButtonRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  // 시각적 버튼을 가리킬 ref
  const buttonRef = useRef<HTMLDivElement>(null);

  // 위치를 계산하고 업데이트하는 함수
  const handleResize = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  useEffect(() => {
    // --- 1. 초기 위치 설정 ---
    // 컴포넌트가 마운트될 때 한 번 실행하여 초기 위치를 잡습니다.
    handleResize();

    // --- 2. 리사이즈 이벤트 리스너 등록 ---
    // window 객체에 'resize' 이벤트가 발생할 때마다 handleResize 함수를 호출합니다.
    window.addEventListener("resize", handleResize);

    // --- 3. 클린업 함수 ---
    // 컴포넌트가 언마운트될 때(사라질 때) 이벤트 리스너를 제거합니다.
    // 이를 통해 메모리 누수를 방지할 수 있습니다.
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []); // 의존성 배열은 비워두어 마운트/언마운트 시에만 실행되도록 합니다.

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

      {/* padding 설정 컨테이너 */}
      <div className="absolute inset-0 z-20 flex items-center justify-center -translate-y-5 px-6 sm:px-8 md:px-12">
        
        {/* 애니메이션 그룹 */}
        <div
           className={`flex w-full max-w-screen-xl 
            flex-col items-center gap-12                  /* 모바일 기본: 세로, 가운데 정렬 */
            sm:flex-row sm:items-end sm:justify-between   /* sm 이상: 가로, 하단 정렬, 양쪽 끝 정렬 */
            transition-transform duration-700 ease-out ${
            isOpen ? "sm:-translate-x-10" : ""            /* 가로 이동은 sm 이상에서만 적용 */
          }`}
        >
          {/* 텍스트 블록 (그룹 좌측) */}
          <div className="flex flex-col items-start">
            <Image src="/images/home/wap.svg" alt="images/home/wap" width={148} height={45} className="w-[148px] h-[45px] mb-4" />
            <h1
              ref={h1Ref}
              className="relative text-white text-left whitespace-pre-line text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[128px] cursor-default pb-2"
              style={{
                fontFamily: "Pretendard",
                fontWeight: 700,
                letterSpacing: "-3.2px",
                WebkitMaskImage: `radial-gradient(40px at ${pos.x}px ${pos.y}px, transparent 10%, black 80%)`,
                maskImage: `radial-gradient(40px at ${pos.x}px ${pos.y}px, transparent 10%, black 80%)`,
              }}
            >
              !nteractive<FadedLetters letters="eee" />{"\n"}
              Web<FadedLetters letters="bbb" />{"\n"}
              Art<FadedLetters letters="ttt" />{"\n"}
              Project<FadedLetters letters="ttt" />
            </h1>
          </div>

          {/* 시각적 버튼 (그룹 우측) */}
          <div
            ref={buttonRef}
            className="relative w-[240px] h-[70px] sm:w-[280px] sm:h-[80px] pointer-events-none self-center sm:self-end mb-2 lg:mb-10 flex-shrink-0" // flex-shrink-0 추가로 버튼이 찌그러지는 것을 방지
          >
            <div className="absolute inset-0 flex items-center justify-center translate-y-7">
              <button className="relative flex items-center justify-center w-full h-full gap-2 bg-transparent">
                <svg className="w-full" height="4" viewBox="0 0 490 4" fill="none">
                  <path d="M490 2H-75" stroke={`url(#paint0_linear_${isHovered ? "hover" : "default"})`} strokeWidth="4" />
                  <defs>
                    <linearGradient id="paint0_linear_default" x1="-75" y1="2.5" x2="490" y2="2.5" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="white" /></linearGradient>
                    <linearGradient id="paint0_linear_hover" x1="-75" y1="2.5" x2="490" y2="2.5" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="#926AC6" /></linearGradient>
                  </defs>
                </svg>
                {isHovered ? <svg viewBox="0 0 39 70" fill="none" className="h-10 md:h-[68px]"><path d="M2 2L36 35L2 68" stroke="#926AC6" strokeWidth="4" /></svg> : <svg viewBox="0 0 39 70" fill="none" className="h-10 md:h-[68px]"><path d="M2 2L36 35L2 68" stroke="white" strokeWidth="4" /></svg>}
              </button>
            </div>
          </div>
        </div>
      </div>

      
      {/* 고정된 호버 인식 및 링크 영역 */}
      {buttonRect && (
        <div
          className="absolute z-30"
          style={{
            // state에 저장된 값으로 위치와 크기 설정
            // 호버 영역에 페더 영역 추가
            top: `${buttonRect.top - 50}px`,         // 세로 시작점
            height: `${buttonRect.height + 100}px`,  // 세로 높이

            left: `${buttonRect.left - 100}px`,      // 가로 시작점
            width: `${buttonRect.width + 250}px`,    // 가로 너비
          }}
        >
          <Link
            href="/slides"
            className="absolute inset-0 cursor-pointer"
            onMouseEnter={() => { setIsOpen(true); setIsHovered(true); }}
            onMouseLeave={() => { setIsOpen(false); setIsHovered(false); }}
            onClick={handleLinkClick}
          />
        </div>
      )}

      {/* 페이지 전환 효과를 위한 그라데이션 오버레이 */}
      <div className={`absolute inset-y-0 right-0 bg-gradient-to-l from-white to-transparent transition-all duration-700 ease-out pointer-events-none z-10 ${isOpen ? "w-full" : "w-0"}`}></div>
    </main>
  );
}