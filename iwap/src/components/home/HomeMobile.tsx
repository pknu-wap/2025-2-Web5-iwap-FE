"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { defaultFadePalette } from "./HomeHeadline";

type Phase = "initial" | "animating" | "final";

const transitionDurationMs = 700;

type MobileHeadlineLine = {
  leadingFade?: string;
  core: string;
  trailingFade?: string;
  highlightIndices: number[];
};

const baseLetterClasses =
  "inline-flex items-end justify-center font-semibold transition-all duration-500 ease-out";
const headlineTextClasses =
  "text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[128px]";

const initialLines: MobileHeadlineLine[] = [
  {
    leadingFade: "iiii",
    core: "interactive",
    trailingFade: "eeee",
    highlightIndices: [0],
  },
  { core: "Web", trailingFade: "bbbb", highlightIndices: [0] },
  { leadingFade: "AAAAAA", core: "Art", highlightIndices: [0] },
  { core: "Project", trailingFade: "tttt", highlightIndices: [0] },
];

export default function HomeMobile() {
  const [phase, setPhase] = useState<Phase>("initial");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === "animating") {
      timerRef.current = setTimeout(() => {
        setPhase("final");
        timerRef.current = null;
      }, transitionDurationMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  const handleArrowClick = () => {
    if (phase !== "initial") return;
    setPhase("animating");
  };

  const fadePalette = useMemo(() => defaultFadePalette, []);
  const isFinal = phase === "final";

  const renderFadeSegment = (
    text: string | undefined,
    reverse: boolean,
    keyPrefix: string
  ) => {
    if (!text) return null;
    const palette = reverse ? [...fadePalette].reverse() : fadePalette;
    return Array.from(text).map((char, index) => {
      const paletteEntry = palette[index % palette.length];
      const shouldHide = phase !== "initial";
      const className = `${baseLetterClasses} ${headlineTextClasses} font-normal ${
        shouldHide ? "opacity-0 translate-y-2" : "opacity-100"
      }`;
      return (
        <span
          key={`${keyPrefix}${index}`}
          className={className}
          style={{
            color: paletteEntry.color,
            fontWeight: paletteEntry.weight,
            minWidth: "0.05ch",
          }}
        >
          {char}
        </span>
      );
    });
  };

  const renderCoreSegment = (
    text: string,
    highlightIndices: readonly number[],
    lineIndex: number
  ) => {
    return Array.from(text).map((char, index) => {
      const isHighlight = highlightIndices.includes(index);
      const identifierKey = `${lineIndex}-${index}`;
      const shouldFade = !isHighlight && phase !== "initial";
      const isTransformingI =
        isHighlight && lineIndex === 0 && char.toLowerCase() === "i";

      if (isTransformingI) {
        const rotateClass = phase !== "initial" ? "rotate-180" : "rotate-0";
        return (
          <span
            key={identifierKey}
            className={`${baseLetterClasses} ${headlineTextClasses} relative ${rotateClass}`}
            style={{ minWidth: "0.75ch", transformOrigin: "center bottom" }}
          >
            <span
              className={`absolute transition-opacity duration-500 ${
                phase !== "initial" ? "opacity-0" : "opacity-100"
              }`}
            >
              i
            </span>
            <span
              className={`transition-opacity duration-500 ${
                phase !== "initial" ? "opacity-100" : "opacity-0"
              }`}
            >
              !
            </span>
            <span className="opacity-0">!</span>
          </span>
        );
      }

      const className = `${baseLetterClasses} ${headlineTextClasses} ${
        shouldFade ? "opacity-0 translate-y-2" : "opacity-100"
      }`;

      return (
        <span
          key={identifierKey}
          className={className}
          style={{ color: "#ffffff", minWidth: "0.05ch" }}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <main className="relative h-dvh w-full select-none overflow-hidden">
      <Image
        src="/images/home_background.jpg"
        alt="Background"
        fill
        priority
        className="object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/15 to-white/70" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <div
          className={`space-y-3 pointer-events-none transition-opacity duration-500 ${
            isFinal ? "opacity-0" : "opacity-100"
          }`}
        >
          {initialLines.map((line, lineIndex) => (
            <div
              key={`${line.core}-${lineIndex}`}
              className="flex justify-center gap-[0.02em] leading-tight"
            >
              {renderFadeSegment(
                line.leadingFade,
                true,
                `lead-${lineIndex}-`
              )}
              {renderCoreSegment(
                line.core,
                line.highlightIndices,
                lineIndex
              )}
              {renderFadeSegment(
                line.trailingFade,
                false,
                `trail-${lineIndex}-`
              )}
            </div>
          ))}
        </div>

        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 transition-opacity duration-500 ${
            isFinal ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-col items-center gap-6 text-white">
            {["!", "W", "A", "P"].map((letter) => (
              <span
                key={letter}
                className="text-6xl font-bold tracking-[0.3em]"
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleArrowClick}
        disabled={phase !== "initial"}
        className={`absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-white transition-opacity duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
          phase === "initial" ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Reveal IWAP"
      >
        <span className="text-xs uppercase tracking-[0.4em]">Explore</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-500"
        >
          <path
            d="M12 5v14M5 12l7 7 7-7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </main>
  );
}
