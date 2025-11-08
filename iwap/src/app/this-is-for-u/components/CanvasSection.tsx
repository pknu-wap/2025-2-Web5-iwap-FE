"use client";

import { type PointerEvent, type RefObject } from "react";

type CanvasSectionProps = {
  activeSide: "front" | "back";
  onActiveSideChange: (side: "front" | "back") => void;
  containerRef: RefObject<HTMLDivElement | null>;
  frontCanvasRef: RefObject<HTMLCanvasElement | null>;
  backCanvasRef: RefObject<HTMLCanvasElement | null>;
  frontBackgroundColor: string;
  handlePointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  stopDrawing: (event: PointerEvent<HTMLCanvasElement>) => void;
};

export function CanvasSection({
  activeSide,
  onActiveSideChange,
  containerRef,
  frontCanvasRef,
  backCanvasRef,
  frontBackgroundColor,
  handlePointerDown,
  handlePointerMove,
  stopDrawing,
}: CanvasSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => onActiveSideChange("front")}
            className={`rounded-full px-4 py-2 transition ${
              activeSide === "front"
                ? "bg-white shadow border border-slate-200 text-slate-900"
                : "text-slate-500"
            }`}
          >
            앞면 · Canvas
          </button>
          <button
            type="button"
            onClick={() => onActiveSideChange("back")}
            className={`rounded-full px-4 py-2 transition ${
              activeSide === "back"
                ? "bg-white shadow border border-slate-200 text-slate-900"
                : "text-slate-500"
            }`}
          >
            뒷면 · Text
          </button>
        </div>
        <div className="text-xs text-slate-500">PNG 보다는 PDF가 더 또렷해요</div>
      </div>
      <div
        ref={containerRef}
        className="relative aspect-[3/2] w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-white via-white to-slate-50 shadow-xl"
      >
        <canvas
          ref={frontCanvasRef}
          className={`absolute inset-0 h-full w-full rounded-[28px] transition-opacity duration-300 ${
            activeSide === "front" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ backgroundColor: frontBackgroundColor }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
        />
        <canvas
          ref={backCanvasRef}
          className={`absolute inset-0 h-full w-full rounded-[28px] transition-opacity duration-300 ${
            activeSide === "back" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      </div>
    </div>
  );
}
