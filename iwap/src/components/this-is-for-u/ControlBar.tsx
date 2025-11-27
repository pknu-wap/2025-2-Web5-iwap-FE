import React from "react";
import type { FourierSketchController } from "@/components/this-is-for-u/fourier-sketch";

type Props = {
  phase: "front-draw" | "back-write" | "preview" | "sent";
  readyAction: boolean;
  isPlaying: boolean;
  backSketches: ReturnType<FourierSketchController["getOriginalSketches"]>;
  textCanvasMessage: string;
  handleStart: () => void;
  handleStop: () => void;
  handleGoToBackside: () => void;
  handleResetToFront: () => void;
  handleShowPreview: () => void;
  handleSendAnim: () => void;
};

export function ControlBar({
  phase,
  readyAction,
  isPlaying,
  backSketches,
  textCanvasMessage,
  handleStart,
  handleStop,
  handleGoToBackside,
  handleResetToFront,
  handleShowPreview,
  handleSendAnim,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-200">
      <button
        type="button"
        onClick={handleStart}
        disabled={!readyAction}
        className="rounded-full bg-rose-500 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-rose-500/80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Play Fourier
      </button>
      <button
        type="button"
        onClick={handleStop}
        disabled={!isPlaying}
        className="rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:border-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Pause
      </button>
      {phase === "front-draw" && (
        <button
          type="button"
          onClick={handleGoToBackside}
          disabled={!readyAction}
          className="rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:border-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Go write message
        </button>
      )}
      {phase === "back-write" && (
        <button
          type="button"
          onClick={handleResetToFront}
          className="rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:border-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back to drawing
        </button>
      )}
      <button
        type="button"
        onClick={handleShowPreview}
        disabled={phase === "back-write" ? (!backSketches.length && !textCanvasMessage.trim()) : !readyAction}
        className="rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:border-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Preview postcard
      </button>
      <button
        type="button"
        onClick={handleSendAnim}
        className="rounded-full bg-emerald-500 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500/80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Send postcard
      </button>
    </div>
  );
}

