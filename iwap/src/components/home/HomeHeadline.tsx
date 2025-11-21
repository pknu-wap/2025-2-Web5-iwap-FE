"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";

type FadePalette = Array<{ color: string; weight: number }>;

export const defaultFadePalette: FadePalette = [
  { color: "rgba(255,255,255,0.90)", weight: 600 },
  { color: "rgba(255,255,255,0.80)", weight: 500 },
  { color: "rgba(255,255,255,0.60)", weight: 400 },
  { color: "rgba(255,255,255,0.40)", weight: 300 },
  { color: "rgba(255,255,255,0.20)", weight: 200 },
  { color: "rgba(255,255,255,0.10)", weight: 100 },
];

export const desktopFadePalette: FadePalette = [
  { color: "rgba(255,255,255,0.65)", weight: 500 },
  { color: "rgba(255,255,255,0.40)", weight: 300 },
  { color: "rgba(255,255,255,0.18)", weight: 100 },
];

export type HomeHeadlineLine = {
  strong: string;
  fade?: string;
  leadingFade?: string;
};

export const defaultHeadlineLines: HomeHeadlineLine[] = [
  { strong: "!nteractive", fade: "eee" },
  { strong: "Web", fade: "bbb" },
  { strong: "Art", fade: "ttt" },
  { strong: "Project", fade: "ttt" },
];

const defaultLetterClassName =
  "text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[128px]";
const letterTransition =
  "font-weight 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
const maxScaleDelta = 0.05;
const hoverRadius = 30;
const maxLetterWeight = 800;
const minLetterWeight = 300;

const getLetterIntensity = (
  mousePosition: { x: number; y: number } | null,
  element: HTMLSpanElement | null
) => {
  if (!mousePosition || !element) return 0;
  const rect = element.getBoundingClientRect();
  const dx =
    mousePosition.x < rect.left
      ? rect.left - mousePosition.x
      : mousePosition.x > rect.right
      ? mousePosition.x - rect.right
      : 0;
  const dy =
    mousePosition.y < rect.top
      ? rect.top - mousePosition.y
      : mousePosition.y > rect.bottom
      ? mousePosition.y - rect.bottom
      : 0;
  const distance = Math.hypot(dx, dy);
  const normalized = Math.max(0, 1 - distance / hoverRadius);
  return Math.pow(normalized, 1.2);
};

interface HoverLettersProps {
  letters: string;
  baseWeight: number;
  letterClassName: string;
  interactive: boolean;
}

function HoverBoldLetters({
  letters,
  baseWeight,
  letterClassName,
  interactive,
}: HoverLettersProps) {
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  letterRefs.current.length = letters.length;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    letterRefs.current.forEach((node) => {
      if (!node) return;
      const prevTransition = node.style.transition;
      const prevWeight = node.style.fontWeight;
      node.style.transition = "none";
      node.style.fontWeight = `${maxLetterWeight}`;
      const width = node.getBoundingClientRect().width;
      node.style.width = `${width}px`;
      node.style.minWidth = `${width}px`;
      node.style.display = "inline-flex";
      node.style.justifyContent = "center";
      node.style.fontWeight = prevWeight;
      node.style.transition = prevTransition;
      node.style.textAlign = "center";
    });
  }, [letters]);

  const handleMouseMove = interactive
    ? (event: MouseEvent<HTMLSpanElement>) =>
        setMousePosition({ x: event.clientX, y: event.clientY })
    : undefined;

  const handleMouseLeave = interactive
    ? () => setMousePosition(null)
    : undefined;

  return (
    <span
      className="inline-flex"
      style={{ alignItems: "baseline" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {letters.split("").map((char, index) => {
        const intensity = interactive
          ? getLetterIntensity(
              mousePosition,
              letterRefs.current[index] ?? null
            )
          : 0;
        const computedWeight = Math.round(
          Math.max(
            minLetterWeight,
            baseWeight - (baseWeight - minLetterWeight) * intensity
          )
        );

        return (
          <span
            key={`hover-${char}-${index}`}
            ref={(node) => {
              letterRefs.current[index] = node;
            }}
            className={letterClassName}
            style={{
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "flex-end",
              fontFamily: "Pretendard",
              fontWeight: computedWeight,
              transform: `scale(${1 - maxScaleDelta * intensity})`,
              transformOrigin: "center bottom",
              textAlign: "center",
              transition: letterTransition,
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

interface FadedLettersProps {
  letters: string;
  letterClassName: string;
  interactive: boolean;
  reverse?: boolean;
  palette: FadePalette;
}

function FadedLetters({
  letters,
  letterClassName,
  interactive,
  reverse = false,
  palette,
}: FadedLettersProps) {
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  letterRefs.current.length = letters.length;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    letterRefs.current.forEach((node) => {
      if (!node) return;
      const prevTransition = node.style.transition;
      const prevWeight = node.style.fontWeight;
      node.style.transition = "none";
      node.style.fontWeight = `${maxLetterWeight}`;
      const width = node.getBoundingClientRect().width;
      node.style.width = `${width}px`;
      node.style.minWidth = `${width}px`;
      node.style.display = "inline-flex";
      node.style.justifyContent = "center";
      node.style.fontWeight = prevWeight;
      node.style.transition = prevTransition;
      node.style.textAlign = "center";
    });
  }, [letters]);

  const handleMouseMove = interactive
    ? (event: MouseEvent<HTMLSpanElement>) =>
        setMousePosition({ x: event.clientX, y: event.clientY })
    : undefined;

  const handleMouseLeave = interactive
    ? () => setMousePosition(null)
    : undefined;

  const paletteToUse = reverse ? [...palette].reverse() : palette;

  return (
    <span
      className="inline-flex"
      style={{ alignItems: "baseline" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {letters.split("").map((char, index) => {
        const fadeIndex = index % paletteToUse.length;
        const { color, weight: baseWeight } = paletteToUse[fadeIndex];
        const intensity = interactive
          ? getLetterIntensity(
              mousePosition,
              letterRefs.current[index] ?? null
            )
          : 0;
        const computedWeight = Math.round(
          Math.max(
            minLetterWeight,
            baseWeight - (baseWeight - minLetterWeight) * intensity
          )
        );

        return (
          <span
            key={`fade-${char}-${index}`}
            ref={(node) => {
              letterRefs.current[index] = node;
            }}
            className={letterClassName}
            style={{
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "flex-end",
              color,
              fontWeight: computedWeight,
              fontFamily: "Pretendard",
              transform: `scale(${1 + maxScaleDelta * intensity})`,
              transformOrigin: "center bottom",
              textAlign: "center",
              transition: letterTransition,
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

interface HomeHeadlineProps {
  className?: string;
  style?: CSSProperties;
  letterClassName?: string;
  baseWeight?: number;
  lines?: HomeHeadlineLine[];
  interactive?: boolean;
  fadePalette?: FadePalette;
}

export function HomeHeadline({
  className,
  style,
  letterClassName = defaultLetterClassName,
  baseWeight = 700,
  lines = defaultHeadlineLines,
  interactive = true,
  fadePalette,
}: HomeHeadlineProps) {
  const baseClassName =
    "relative text-white whitespace-pre-line cursor-default pb-2";
  const combinedClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;
  const palette = fadePalette ?? defaultFadePalette;

  return (
    <h1 className={combinedClassName} style={style}>
      {lines.map(({ leadingFade, strong, fade }, index) => (
        <span
          key={`${leadingFade ?? ""}-${strong}-${fade ?? ""}-${index}`}
        >
          {leadingFade ? (
            <FadedLetters
              letters={leadingFade}
              letterClassName={letterClassName}
              interactive={interactive}
              palette={palette}
              reverse
            />
          ) : null}
          <HoverBoldLetters
            letters={strong}
            baseWeight={baseWeight}
            letterClassName={letterClassName}
            interactive={interactive}
          />
          {fade ? (
            <FadedLetters
              letters={fade}
              letterClassName={letterClassName}
              interactive={interactive}
              palette={palette}
            />
          ) : null}
          {index < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </h1>
  );
}
