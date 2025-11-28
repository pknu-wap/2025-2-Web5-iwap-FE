"use client"; // [필수]

import { memo, useEffect, useRef } from "react";
import { WHITE_W, WHITE_H, BLACK_W, BLACK_H } from "./PianoLayout";
import { shadowOffsets } from "./Shadowoffsets";

function PianoKey({
  midi,
  type,
}: {
  midi: number;
  type: "white" | "black";
  // [수정] active props 제거 (자체적으로 관리)
}) {
  const isWhite = type === "white";
  const keyWidth = isWhite ? WHITE_W : BLACK_W;
  const keyHeight = isWhite ? WHITE_H : BLACK_H;
  
  // [추가] DOM 요소 직접 제어를 위한 Refs
  const keyRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // [핵심] 커스텀 이벤트 리스너: React 상태 변경 없이 DOM만 직접 조작
    const handlePianoEvent = (e: CustomEvent) => {
      if (e.detail.note === midi) {
        const isActive = e.detail.type === "on";
        
        // 1. 건반 색상 변경 (Fill)
        if (fillRef.current) {
          fillRef.current.style.fill = isActive 
            ? (isWhite ? "#B6C9E2" : "#97AED9") 
            : (isWhite ? "#FFFFFF" : "#000000");
        }

        // 2. 건반 눌림 효과 (Y축 이동)
        if (keyRef.current) {
          const yMove = isWhite ? "2px" : "3px";
          keyRef.current.style.transform = isActive ? `translateY(${yMove})` : "translateY(0)";
        }

        // 3. 파문 효과 (Ripple) & 글로우
        if (rippleRef.current) {
           if (isActive) rippleRef.current.classList.add("is-active");
           else rippleRef.current.classList.remove("is-active");
        }
        if (glowRef.current) {
           glowRef.current.style.opacity = isActive ? "0.5" : "1.0";
        }
      }
    };

    window.addEventListener("piano:event", handlePianoEvent as EventListener);
    return () => {
      window.removeEventListener("piano:event", handlePianoEvent as EventListener);
    };
  }, [midi, isWhite]);

  const wrapStyle = {
    width: `${keyWidth}px`,
    height: `${keyHeight}px`,
    overflow: "visible",
    transition: "transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)", // 부드러운 움직임
    willChange: "transform", // GPU 가속 힌트
  };

  const rippleCenter = {
    x: keyWidth / 2,
    y: keyHeight / 2,
  };

  return (
    <div
      ref={keyRef}
      aria-label={`m${midi}`}
      className={`relative group overflow-visible ${type === "black" ? "z-[30]" : "z-[10]"}`}
      style={wrapStyle}
    >
      {type === "white" ? (
        <>
          {/* 흰건반 */}
          <svg
            width={WHITE_W}
            height={WHITE_H}
            viewBox="0 0 85 186"
            fill="none"
            className="absolute bottom-0 left-0"
          >
            <g opacity="0.6" filter="url(#filter0_f_1207_690)">
              <circle
                cx="12.5"
                cy="12.5"
                r="12.5"
                transform="matrix(-1 0 0 1 55 61)"
                fill="url(#paint0_radial_1207_690)"
              />
            </g>
            <g filter="url(#filter1_dd_1207_690)">
              <rect
                ref={fillRef} // [연결]
                x="30"
                y="11"
                width="25"
                height="125"
                fill="#FFFFFF" // 초기값
                style={{ transition: "fill 0.1s ease-out" }}
              />
            </g>
          </svg>

          {/* 좌우 글로우 */}
          <div 
            ref={glowRef} // [연결]
            className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          >
            <div
              className="absolute left-0 top-0 h-full w-[6px]"
              style={{
                background: "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.20) 30%, #FFF 50%, rgba(255,255,255,0.20) 70%, rgba(255,255,255,0.00) 100%)",
                filter: "blur(20px)",
              }}
            />
            <div
              className="absolute right-0 top-0 h-full w-[6px]"
              style={{
                background: "linear-gradient(270deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.20) 30%, #FFF 50%, rgba(255,255,255,0.20) 70%, rgba(255,255,255,0.00) 100%)",
                filter: "blur(20px)",
              }}
            />
          </div>

          {shadowOffsets[midi] && (
            <div
              className="absolute pointer-events-none z-[20]"
              style={{
                left: `calc(50% + ${shadowOffsets[midi].x}px)`,
                bottom: 0,
                transform: `translate(-50%, ${shadowOffsets[midi].y}px)`,
                width: "25px",
                height: "284px",
                opacity: 0.2,
                background: "linear-gradient(180deg, rgba(255,255,255,0.00) 0%, #FFF 50.96%, rgba(255,255,255,0.00) 100%)",
              }}
            />
          )}

          <div className="absolute inset-0 pointer-events-none overflow-visible z-[60]">
            <div
              ref={rippleRef} // [연결]
              className="piano-key-ripple"
              style={{ left: rippleCenter.x, top: rippleCenter.y }}
            />
          </div>
        </>
      ) : (
        <>
          {/* 검은건반 */}
          <svg
            width={BLACK_W}
            height={BLACK_H}
            viewBox="0 0 35 87"
            fill="none"
            className="absolute left-0"
          >
            <g filter="url(#filter0_d_1273_506)">
              <rect
                ref={fillRef} // [연결]
                x="11"
                y="11"
                width="13"
                height="65"
                fill="#000000" // 초기값
                style={{ transition: "fill 0.1s ease-out" }}
              />
            </g>
          </svg>

          {/* 검은건반 글로우 */}
          <div 
             ref={glowRef} // [연결]
             className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          >
            <div
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{
                background: "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.25) 30%, #FFF 50%, rgba(255,255,255,0.25) 70%, rgba(255,255,255,0.00) 100%)",
                filter: "blur(15px)",
              }}
            />
            <div
              className="absolute right-0 top-0 h-full w-[3px]"
              style={{
                background: "linear-gradient(270deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.25) 30%, #FFF 50%, rgba(255,255,255,0.25) 70%, rgba(255,255,255,0.00) 100%)",
                filter: "blur(15px)",
              }}
            />
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-visible z-[60]">
            <div
              ref={rippleRef} // [연결]
              className="piano-key-ripple"
              style={{ left: rippleCenter.x, top: rippleCenter.y }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default memo(PianoKey);