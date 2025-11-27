import React from "react";
import Image from "next/image";

export function FrontPreview({
  frontSketches,
  frontPreviewPng,
  backgroundColor,
}: {
  frontSketches?: {
    points: { x: number; y: number }[];
    pathColor: string;
    pathAlpha: number;
    pathWidth: number;
  }[];
  frontPreviewPng: string | null;
  backgroundColor?: string;
}) {
  return (
    <div
      className="w-full h-full border border-white/30 flex items-center justify-center p-4 relative"
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
          viewBox="-300 -187.5 600 375"
          preserveAspectRatio="xMidYMid meet"
        >
          {frontSketches.map((sketch, idx) => (
            <polyline
              key={`front-preview-${idx}`}
              points={sketch.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={sketch.pathColor}
              strokeWidth={sketch.pathWidth}
              opacity={Math.max(0, Math.min(1, sketch.pathAlpha / 255))}
            />
          ))}
        </svg>
      ) : frontPreviewPng ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={frontPreviewPng}
          alt="Front PNG"
          className="max-w-600 max-h-375 object-contain"
        />
      ) : (
        <span className="text-white/60 text-sm">No front preview</span>
      )}
    </div>
  );
}
