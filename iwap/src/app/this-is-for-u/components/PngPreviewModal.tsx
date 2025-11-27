"use client";
import React from "react";

type Props = {
  show: boolean;
  frontPreviewPng: string | null;
  backPreviewPng: string | null;
  backgroundColor?: string;
  previewSide: "front" | "back";
  onClose: () => void;
  onToggleSide: () => void;
  onSend?: () => void;
  frontSketches?: {
    points: { x: number; y: number }[];
    pathColor: string;
    pathAlpha: number;
    pathWidth: number;
  }[];
  backText?: string;
};

function renderFront(props: Pick<Props, "frontSketches" | "frontPreviewPng" | "backgroundColor">) {
  const { frontSketches, frontPreviewPng, backgroundColor } = props;

  return (
    <div
      className="w-full h-full border border-white/30 rounded-2xl bg-black/90 flex items-center justify-center p-4 relative"
      style={{ backgroundColor: backgroundColor ?? "#000000" }}
    >
      <img
        src="/icons/!WAP_black.svg"
        alt="!WAP"
        className="pointer-events-none absolute bottom-4 right-8 w-[43px] h-[15px]"
      />

      {frontSketches && frontSketches.length > 0 ? (
        <svg className="w-full h-full rounded" viewBox="-400 -300 800 600" preserveAspectRatio="xMidYMid meet">
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
        <img src={frontPreviewPng} alt="Front PNG" className="max-w-full max-h-full object-contain" />
      ) : (
        <span className="text-white/60 text-sm">No front preview</span>
      )}
    </div>
  );
}

function renderBack(props: Pick<Props, "backPreviewPng" | "backText" | "backgroundColor">) {
  const { backPreviewPng, backText, backgroundColor } = props;
  const bg = backgroundColor ?? "#000000";
  const whiteIcons = bg === "#000000" || bg === "#0F172A";

  return (
    <div
      className="w-full h-full border border-white/30 rounded-2xl bg-black/90 p-6 relative flex flex-col gap-2"
      style={{ backgroundColor: bg }}
    >
      <img
        src={whiteIcons ? "/icons/Postcard_white.svg" : "/icons/Postcard_black.svg"}
        alt="Postcard"
        className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 w-[100px] h-[34px]"
      />

      <div className="flex items-start gap-2">
        <img
          src={whiteIcons ? "/icons/To_white.svg" : "/icons/To_black.svg"}
          alt="To"
          className="w-[28px] h-auto"
        />
        <p className="text-white flex-1 text-left text-sm leading-5 whitespace-pre-wrap break-words">
          {backText || "받는 사람"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {backText ? (
          <p className="text-white text-base leading-6 whitespace-pre-wrap break-words">{backText}</p>
        ) : backPreviewPng ? (
          <img src={backPreviewPng} alt="Back PNG" className="w-full h-full object-contain" />
        ) : (
          <span className="text-white/70 text-sm">No back preview</span>
        )}
      </div>

      <div className="pointer-events-none flex items-center justify-between text-white text-xs uppercase tracking-[0.2em]">
        <span>{new Date().toLocaleDateString()}</span>
        <img src="/icons/PostcardStamp.svg" alt="Stamp" className="w-[40px] h-[48px]" />
        <img
          src={whiteIcons ? "/icons/From_white.svg" : "/icons/From_black.svg"}
          alt="From"
          className="w-[69px] h-[30px]"
        />
      </div>
    </div>
  );
}

export function PngPreviewModal({
  show,
  frontPreviewPng,
  backPreviewPng,
  backgroundColor,
  previewSide,
  onClose,
  onToggleSide,
  onSend,
  frontSketches,
  backText,
}: Props) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm p-6 relative"
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-[2000] w-11 h-11 flex items-center justify-center rounded-full bg-white/20 border border-white/40 text-white text-2xl font-bold hover:bg-white/30"
      >
        ×
      </button>

      {/* Flip Animation */}
      <style jsx>{`
        .flip-container {
          perspective: 1600px;
        }
        .flip-card {
          width: 820px;
          height: 520px;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.8s ease;
        }
        .flipped {
          transform: rotateY(180deg);
        }
        .flip-face {
          backface-visibility: hidden;
          position: absolute;
          inset: 0;
        }
        .back-face {
          transform: rotateY(180deg);
        }
      `}</style>

      <div className="flip-container mt-4">
        <div className={`flip-card ${previewSide === "back" ? "flipped" : ""}`}>
          <div className="flip-face">
            {renderFront({ frontSketches, frontPreviewPng, backgroundColor })}
          </div>

          <div className="flip-face back-face">
            {renderBack({ backPreviewPng, backText, backgroundColor })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={onToggleSide}
          className="rounded-full border border-white/40 px-4 py-2 text-white text-xs uppercase tracking-wide hover:border-white/70"
        >
          {previewSide === "front" ? "Show back" : "Show front"}
        </button>

        {onSend && (
          <button
            onClick={onSend}
            className="rounded-full bg-emerald-500 px-4 py-2 text-white text-xs uppercase tracking-wide hover:bg-emerald-500/80"
          >
            Send postcard
          </button>
        )}
      </div>
    </div>
  );
}
