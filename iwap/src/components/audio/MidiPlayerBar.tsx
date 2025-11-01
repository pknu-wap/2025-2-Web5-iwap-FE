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

const SpinnerIcon = () => (
  <svg
    className="h-5 w-5 animate-spin text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  />
);

const PlayIcon = () => (
  <svg
    className="h-10 w-6 text-white"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8 5.14v13.72L19 12 8 5.14z" />
  </svg>
);

const PauseIcon = () => (
  <svg
    className="h-6 w-6 text-white"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
    <rect x="14" y="5" width="3.5" height="14" rx="1" />
  </svg>
);

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

  const isSeekingDisabled =
    disabled || !Number.isFinite(duration) || duration <= 0;

  return (
    <div className="fixed bottom-5 md:bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto w-full max-w-2xl flex flex-col items-center p-4 text-white ${className}`}
      >
        {/* 재생 버튼 */}
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={disabled}
          className="flex h-12 w-12 translate-y-7 md:translate-y-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? <SpinnerIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* 시간 표시 (위로 이동) */}
        <div className="w-full flex justify-between text-xs font-mono text-white/80 mb-1">
          <span>{formattedCurrent}</span>
          <span>{formattedDuration}</span>
        </div>

        {/* 재생바 */}
        <div className="w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={clampedPosition}
            style={
              {
                "--value": `${(clampedPosition / (duration || 1)) * 100}`,
              } as React.CSSProperties
            }
            disabled={isSeekingDisabled}
            onChange={(event) => {
              const next = Number(event.target.value);
              const percent = (next / (duration || 1)) * 100;
              event.target.style.setProperty("--value", `${percent}`);
              if (Number.isFinite(next)) onSeek(next, isPlaying);
            }}
            className="flex-1 h-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
      </div>

      {/* range 진행 부분 흰색 표시 */}
      <style jsx global>{`
        input[type="range"]::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            white var(--value, 0%),
            rgba(255, 255, 255, 0.2) var(--value, 0%)
          );
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 4px;
          height: 16px;
          border-radius: 15px;
          background: white;
          margin-top: -6px;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-track {
          height: 4px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            white var(--value, 0%),
            rgba(255, 255, 255, 0.2) var(--value, 0%)
          );
        }
        input[type="range"]::-moz-range-thumb {
          width: 4px;
          height: 16px;
          border-radius: 15px;
          background: white;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
