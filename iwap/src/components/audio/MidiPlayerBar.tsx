"use client";

import { useMemo } from "react";

type MidiPlayerBarProps = {
  isPlaying: boolean;
  duration: number;
  position: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number, resumePlayback: boolean) => void;
  disabled?: boolean;
  className?: string;
};

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function MidiPlayerBar({
  isPlaying,
  duration,
  position,
  onTogglePlay,
  onSeek,
  disabled = false,
  className = "",
}: MidiPlayerBarProps) {
  const clampedPosition = useMemo(
    () => Math.max(0, Math.min(duration || 0, position || 0)),
    [duration, position]
  );

  const formattedCurrent = useMemo(
    () => formatTime(clampedPosition),
    [clampedPosition]
  );

  const formattedDuration = useMemo(
    () => formatTime(duration),
    [duration]
  );

  return (
    <div
      className={`rounded-xl bg-white/10 backdrop-blur border border-white/20 p-4 text-white -translate-y-30 md:translate-y-0 ${className}`}
    >
      <div className="flex items-center justify-between text-sm mb-2">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={disabled}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={isPlaying ? "Pause MIDI playback" : "Play MIDI playback"}
        >
          {isPlaying ? (
            <span className="w-2 h-5 bg-white relative">
              <span className="absolute inset-y-0 left-0 w-1 bg-white"></span>
              <span className="absolute inset-y-0 right-0 w-1 bg-white"></span>
            </span>
          ) : (
            <span className="ml-1 w-0 h-0 border-y-8 border-y-transparent border-l-[14px] border-l-white"></span>
          )}
        </button>
        <div className="flex-1 mx-4">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={clampedPosition}
            disabled={disabled}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) {
                onSeek(next, isPlaying);
              }
            }}
            className="w-full accent-white disabled:opacity-40"
          />
          <div className="flex justify-between text-xs text-white/70 mt-1">
            <span>{formattedCurrent}</span>
            <span>{formattedDuration}</span>
          </div>
        </div>
        <div className="text-xs text-white/70 min-w-[70px] text-right truncate">
          MIDI Playback
        </div>
      </div>
    </div>
  );
}
