import React from "react";
import Image from "next/image";
import { DEFAULT_CANVAS_SIZE, type CanvasSize } from "./postcardUtils";
import type { SketchSnapshot } from "./types";

type FrontPreviewProps = {
  frontSketches?: SketchSnapshot[];
  frontPreviewPng: string | null;
  backgroundColor?: string;
  /** 스케치를 그린 캔버스 크기. 모바일(320×200)과 데스크톱(600×375) 좌표계가 달라 viewBox에 맞춰준다. */
  canvasSize?: CanvasSize;
};

export function FrontPreview({
  frontSketches,
  frontPreviewPng,
  backgroundColor,
  canvasSize = DEFAULT_CANVAS_SIZE,
}: FrontPreviewProps) {
  const { width, height } = canvasSize;

  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      style={{ backgroundColor: backgroundColor ?? "#000000" }}
    >
      <Image
        src="/icons/!WAP_black.svg"
        alt="!WAP"
        width={43}
        height={15}
        className="pointer-events-none absolute bottom-4 right-8"
      />

      {/* SVG (사용자 드로잉) */}
      {frontSketches && frontSketches.length ? (
        <svg
          className="w-full h-full rounded"
          viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {frontSketches.map((sketch, idx) => (
            <polyline
              key={`front-preview-${idx}`}
              points={sketch.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={sketch.pathColor}
              strokeWidth={sketch.pathWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={Math.max(0, Math.min(1, sketch.pathAlpha / 255))}
            />
          ))}
        </svg>
      ) : frontPreviewPng ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={frontPreviewPng} alt="Front PNG" className="w-full h-full object-contain" />
      ) : (
        <span className="text-white/60 text-sm">No front preview</span>
      )}
    </div>
  );
}
