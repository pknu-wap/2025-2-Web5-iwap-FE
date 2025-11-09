"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { defaultFadePalette } from "./HomeHeadline";

type Phase = "initial" | "animating" | "final";
type FinalLayout = "vertical" | "horizontal";

const transitionDurationMs = 1200;
const horizontalHoldMs = 1000; // hold time after horizontal layout
const flyOutDurationMs = 900; // flight duration before navigating

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

// Anchor final positions from the TOP of the container (px) so
// the letters don't drift vertically with varying aspect ratios.
// This is the initial vertical stack.
const finalLetterTargets: Record<number, { x: number; top: number }> = {
  0: { x: -13, top: -40 },
  1: { x: -13, top: 58 },
  2: { x: -10, top: 118 },
  3: { x: -9, top: 178 },
};

// Horizontal layout targets for IWAP (same top, spaced x)
const horizontalTargets: Record<number, { x: number; top: number }> = {
  0: { x: -55, top: -40 },
  1: { x: -20, top: 0 },
  2: { x: 20, top: 0 },
  3: { x: 52, top: 0 },
};

type HomeMobileProps = {
  isDarkTheme: boolean;
};

export default function HomeMobile({ isDarkTheme }: HomeMobileProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("initial");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alignTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shouldDetachHighlights, setShouldDetachHighlights] = useState(false);
  const [centerHighlights, setCenterHighlights] = useState(false);
  const [finalLayout, setFinalLayout] = useState<FinalLayout>("vertical");
  const [leaving, setLeaving] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightLayouts, setHighlightLayouts] = useState<
    Record<string, { top: number; left: number }>
  >({});
  const linesContainerRef = useRef<HTMLDivElement | null>(null);
  const highlightRefs = useRef<Record<string, HTMLSpanElement | null>>({});

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

  // After the first animation reaches final, keep vertical for ~2s then switch to horizontal
  useEffect(() => {
    if (phase !== "final") return;
    alignTimerRef.current = setTimeout(() => {
      setFinalLayout("horizontal");
      alignTimerRef.current = null;
    }, 1000);
    return () => {
      if (alignTimerRef.current) {
        clearTimeout(alignTimerRef.current);
        alignTimerRef.current = null;
      }
    };
  }, [phase]);

  // After we become horizontal, wait ~1s, then fly out and navigate to /slides
  useEffect(() => {
    if (phase !== "final" || finalLayout !== "horizontal") return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setLeaving(true);
      leaveTimerRef.current = null;
      setTimeout(() => {
        router.push("/slides");
      }, flyOutDurationMs);
    }, horizontalHoldMs);

    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
    };
  }, [phase, finalLayout, router]);

  useLayoutEffect(() => {
    if (phase !== "animating") return;

    const container = linesContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const layouts: Record<string, { top: number; left: number }> = {};

    Object.entries(highlightRefs.current).forEach(([key, element]) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      layouts[key] = {
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left,
      };
    });

    setHighlightLayouts(layouts);
    setShouldDetachHighlights(true);
    setCenterHighlights(false);

    const frame = requestAnimationFrame(() => {
      setCenterHighlights(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase === "initial") {
      setShouldDetachHighlights(false);
      setCenterHighlights(false);
      setHighlightLayouts({});
      setLeaving(false);
      setFinalLayout("vertical");
    }
  }, [phase]);

  const handleArrowClick = () => {
    if (phase !== "initial") return;
    setPhase("animating");
  };

  const fadePalette = useMemo(() => defaultFadePalette, []);

  const registerHighlightRef =
    (key: string) => (element: HTMLSpanElement | null) => {
      if (element) {
        highlightRefs.current[key] = element;
      } else {
        delete highlightRefs.current[key];
      }
    };

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
      const layout = highlightLayouts[identifierKey];
      const shouldFloat = shouldDetachHighlights && !!layout;
      const targets = finalLayout === "horizontal" ? horizontalTargets : finalLetterTargets;
      const target = targets[lineIndex] ?? { x: 0, top: 0 };
      const isTransformingI =
        isHighlight && lineIndex === 0 && char.toLowerCase() === "i";

      if (isTransformingI) {
        const rotationDegrees = phase === "initial" ? 0 : 180;
        const transforms: string[] = [];

        // When anchoring from top/absolute left, no need to translateX.

        transforms.push(`rotate(${rotationDegrees}deg)`);

        const style: CSSProperties = {
          minWidth: "0.75ch",
          transformOrigin: "center bottom",
          transition:
            "transform 1200ms ease, top 1200ms ease, left 1200ms ease, opacity 600ms ease",
        };

        if (shouldFloat) {
          style.position = "absolute";
          const cw = linesContainerRef.current?.getBoundingClientRect().width ?? 0;
          if (centerHighlights) {
            if (leaving) {
              const leftSide = lineIndex <= 1;
              const xFly = leftSide ? -cw * 0.4 : cw * 1.4;
              const baseTop = horizontalTargets[1]?.top ?? horizontalTargets[2]?.top ?? target.top;
              style.left = `${xFly}px`;
              style.top = `${baseTop - 35}px`;
            } else {
              style.left = `${target.x + cw / 2}px`;
              style.top = `${target.top}px`;
            }
          } else {
            style.left = `${layout.left}px`;
            style.top = `${layout.top}px`;
          }
          style.zIndex = 20;
        }

        style.transform = transforms.join(" ");

        return (
          <span
            key={identifierKey}
            ref={registerHighlightRef(identifierKey)}
            className={`${baseLetterClasses} ${headlineTextClasses} relative`}
            style={style}
          >
            <span
              className={`absolute transition-opacity duration-700 ${
                phase !== "initial" ? "opacity-0" : "opacity-100"
              }`}
            >
              i
            </span>
            <span
              className={`transition-opacity duration-700 ${
                phase !== "initial" ? "opacity-100" : "opacity-0"
              }`}
            >
              !
            </span>
            <span className="opacity-0">!</span>
          </span>
        );
      }

      if (isHighlight) {
        const style: CSSProperties = {
          color: "#ffffff",
          minWidth: "0.05ch",
          transition:
            "transform 1100ms ease, top 1100ms ease, left 1100ms ease, opacity 600ms ease",
        };

        if (shouldFloat) {
          style.position = "absolute";
          const cw = linesContainerRef.current?.getBoundingClientRect().width ?? 0;
          if (centerHighlights) {
            if (leaving) {
              const leftSide = lineIndex <= 1;
              const xFly = leftSide ? -cw * 0.4 : cw * 1.4;
              const baseTop = horizontalTargets[1]?.top ?? horizontalTargets[2]?.top ?? target.top;
              style.left = `${xFly}px`;
              style.top = `${baseTop}px`;
            } else {
              style.left = `${target.x + cw / 2}px`;
              style.top = `${target.top}px`;
            }
          } else {
            style.left = `${layout.left}px`;
            style.top = `${layout.top}px`;
          }
          style.transform = centerHighlights ? undefined : "translateX(0)";
          style.zIndex = 15;
        } else {
          style.transform = undefined;
        }

        return (
          <span
            key={identifierKey}
            ref={registerHighlightRef(identifierKey)}
            className={`${baseLetterClasses} ${headlineTextClasses}`}
            style={style}
          >
            {char}
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
        alt="Background Light"
        fill
        priority
        className={`object-cover ${isDarkTheme ? "hidden" : "block"}`}
      />
      <Image
        src="/images/home-black_background.jpg"
        alt="Background Dark"
        fill
        priority
        className={`object-cover ${isDarkTheme ? "block" : "hidden"}`}
      />

      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${
          isDarkTheme
            ? "from-transparent via-white/10 to-white/60"
            : "from-transparent via-white/15 to-white/70"
        }`}
      />

      {/* Intensified white gradient overlay during fly-out */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-white/100 to-white transition-opacity duration-700 ${
          leaving ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={linesContainerRef}
        className="relative z-10 flex h-full flex-col items-center translate-y-30 px-6 text-center text-white"
      >
        <div className="pointer-events-none space-y-3">
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
