"use client";

import { memo, useEffect, useRef } from "react";
import { WHITE_W, WHITE_H, BLACK_W, BLACK_H } from "./PianoLayout";
import { shadowOffsets } from "./Shadowoffsets";

function PianoKey({
  midi,
  type,
}: {
  midi: number;
  type: "white" | "black";
}) {
  const isWhite = type === "white";
  const keyWidth = isWhite ? WHITE_W : BLACK_W;
  const keyHeight = isWhite ? WHITE_H : BLACK_H;
  
  const keyRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePianoEvent = (e: CustomEvent) => {
      if (e.detail.note === midi) {
        const isActive = e.detail.type === "on";
        
        if (fillRef.current) {
          fillRef.current.style.fill = isActive 
            ? (isWhite ? "#B6C9E2" : "#97AED9") 
            : (isWhite ? "#FFFFFF" : "#000000");
        }

        if (keyRef.current) {
          const yMove = isWhite ? "2px" : "3px";
          keyRef.current.style.transform = isActive ? `translateY(${yMove})` : "translateY(0)";
        }

        if (rippleRef.current) {
           if (isActive) rippleRef.current.classList.add("is-active");
           else rippleRef.current.classList.remove("is-active");
        }
        if (glowRef.current) {
           // Opacity 조정
           glowRef.current.style.opacity = isActive ? "0.6" : "1.0";
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
    transition: "transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)",
    willChange: "transform",
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
          {/* 흰건반 배경 Shadow */}
          <div
            className="absolute rounded-[1px]"
            style={{
              left: "30px",
              top: "11px",
              width: "25px",
              height: "125px",
              boxShadow: "0px 0px 10px 1px rgba(0,0,0,0.4), 0px 20px 30px 1px rgba(255,255,255,0.25)",
              backgroundColor: "#FFFFFF",
              zIndex: 0,
            }}
          />

          {/* 흰건반 SVG */}
          <svg
            width={WHITE_W}
            height={WHITE_H}
            viewBox="0 0 85 186"
            fill="none"
            className="absolute bottom-0 left-0 z-[1]"
          >
            <g opacity="0.6" style={{ filter: "blur(4px)" }}>
              <circle
                cx="12.5"
                cy="12.5"
                r="12.5"
                transform="matrix(-1 0 0 1 55 61)"
                fill="url(#paint0_radial_1207_690)"
              />
            </g>
            <g>
              <rect
                ref={fillRef}
                x="30"
                y="11"
                width="25"
                height="125"
                fill="#FFFFFF"
                style={{ transition: "fill 0.1s ease-out" }}
              />
            </g>
          </svg>

          {/* 흰건반 글로우 */}
          <div 
            ref={glowRef}
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
              ref={rippleRef}
              className="piano-key-ripple"
              style={{ left: rippleCenter.x, top: rippleCenter.y }}
            />
          </div>
        </>
      ) : (
        <>
          {/* 검은건반 배경 Shadow (top: 11px) */}
          <div
            className="absolute rounded-[1px]"
            style={{
              left: "11px",
              top: "11px",
              width: "13px",
              height: "65px",
              boxShadow: "0px 0px 10px 1px rgba(0,0,0,0.4)",
              backgroundColor: "#000000",
              zIndex: 0,
            }}
          />

          {/* 검은건반 SVG */}
          {/* [수정 포인트] preserveAspectRatio 추가하여 상단 정렬 강제 */}
          <svg
            width={BLACK_W}
            height={BLACK_H}
            viewBox="0 0 35 87"
            preserveAspectRatio="xMinYMin meet"
            fill="none"
            className="absolute left-0 z-[1]"
          >
            <g>
              <rect
                ref={fillRef}
                x="11"
                y="11"
                width="13"
                height="65"
                fill="#000000"
                style={{ transition: "fill 0.1s ease-out" }}
              />
            </g>
          </svg>

          {/* 검은건반 글로우 */}
          <div 
             ref={glowRef}
             className="absolute pointer-events-none transition-opacity duration-150"
             style={{
               left: '-10px', right: '-10px', top: '-15px', bottom: '-10px',
               zIndex: 2,
             }}
          >
            <div
              className="absolute left-1/2 top-0 h-full w-[20px] -translate-x-1/2"
              style={{
                background: "radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)",
                filter: "blur(8px)",
              }}
            />
            <div
              className="absolute left-[10px] top-[10px] bottom-[10px] w-[2px]"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)",
                filter: "blur(4px)",
              }}
            />
            <div
              className="absolute right-[10px] top-[10px] bottom-[10px] w-[2px]"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)",
                filter: "blur(4px)",
              }}
            />
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-visible z-[60]">
            <div
              ref={rippleRef}
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