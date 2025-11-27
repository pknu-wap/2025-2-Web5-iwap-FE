import React from "react";
import type { FourierSketchController } from "../fourier-sketch";

type Props = {
  isSending: boolean;
  sendStage: "idle" | "insert" | "closing" | "closed";
  frontSketches: ReturnType<FourierSketchController["getOriginalSketches"]>;
  recipientName: string;
  senderName: string;
  textCanvasMessage: string;
  tokenWords: string[];
};

export function SendAnimation({
  isSending,
  sendStage,
  frontSketches,
  recipientName,
  senderName,
  textCanvasMessage,
  tokenWords,
}: Props) {
  if (!isSending) return null;
  return (
    <div className="fixed inset-0 z-[1300] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="relative w-[400px] h-[280px]">
        {sendStage !== "closed" && (
          <img
            src="/images/This-is-for-u_bottom.png"
            alt="Envelope base"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        <div
          className={`absolute left-[18%] top-[10%] w-[64%] h-[55%] bg-white/95 border border-slate-200 rounded-[8px] shadow-lg overflow-hidden transition-all duration-500 ${
            sendStage === "insert"
              ? "translate-y-[-10px] opacity-100 scale-100"
              : sendStage === "closing"
                ? "translate-y-[10px] opacity-90 scale-95"
                : "translate-y-[36px] opacity-0 scale-90"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-100 opacity-90" />
          <div className="relative w-full h-[55%] border-b border-slate-200/80">
            <svg
              viewBox="-200 -150 400 300"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {frontSketches.map((sketch, idx) => (
                <polyline
                  key={`mail-front-${idx}`}
                  points={sketch.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke={sketch.pathColor}
                  strokeWidth={Math.max(1, sketch.pathWidth * 0.6)}
                  opacity={Math.max(0, Math.min(1, sketch.pathAlpha / 255))}
                />
              ))}
            </svg>
          </div>
          <div className="relative w-full h-[45%] p-2 text-[10px] text-slate-700">
            <div className="flex justify-between mb-1">
              <span className="font-semibold">To: {recipientName || "______"}</span>
              <span className="font-semibold">From: {senderName || "______"}</span>
            </div>
            <div className="h-[70%] overflow-hidden text-[10px] leading-4 text-slate-600">
              {(tokenWords.join(" ") || textCanvasMessage || "Write a note...").slice(0, 120)}
            </div>
          </div>
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-600 ${
            sendStage === "closed" ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src="/images/This-is-for-u_closed.png"
            alt="Envelope closed"
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>
        {sendStage !== "closed" && (
          <img
            src="/images/This-is-for-u_open.png"
            alt="Envelope open"
            className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 ${
              sendStage === "closing" ? "translate-y-[6px]" : "translate-y-[-4px]"
            }`}
          />
        )}
        <div
          className={`absolute left-[10%] right-[10%] top-[12%] h-[38%] origin-top bg-[#f0f0f0]/95 transition-all duration-600 ${
            sendStage === "closing" || sendStage === "closed" ? "translate-y-[44px] opacity-100" : "translate-y-[-8px] opacity-0"
          }`}
          style={{
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            boxShadow: "0 6px 10px rgba(0,0,0,0.18)",
          }}
        />
      </div>
    </div>
  );
}

