"use client";

import { useMemo } from "react";

type MidiPlayerBarProps = {
  isPlaying: boolean;
  duration: number;
  position: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number, resumePlayback: boolean) => void;
  onRewind?: () => void;
  onDownload?: () => void;
  canDownload?: boolean;
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

const RewindIcon = () => (
  <svg
    className="h-6 w-6 text-white"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M11.5 7.5 5 12l6.5 4.5V7.5Zm7 0L12 12l6.5 4.5V7.5Z" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="h-5 w-5 text-white"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M11 3h2v9.17l2.59-2.58L17 11l-5 5-5-5 1.41-1.41L11 12.17V3Z" />
    <path d="M5 18h14v2H5z" />
  </svg>
);

export default function MidiPlayerBar({
  isPlaying,
  duration,
  position,
  onTogglePlay,
  onSeek,
  onRewind,
  onDownload,
  canDownload = false,
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

  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  const isSeekingDisabled =
    disabled || !Number.isFinite(duration) || duration <= 0;

  const buttonClasses =
    "flex h-12 w-12 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40";
  const rewindDisabled = disabled || !onRewind;
  const downloadDisabled = disabled || !onDownload || !canDownload;

  return (
    <div className={`w-full flex justify-center pointer-events-none ${className}`}>
      <div
        className="pointer-events-auto w-full max-w-2xl flex flex-col items-center p-4 text-white"
      >
        {/* transport controls */}
        <div className="flex items-center gap-6 -mb-4">
          {onRewind ? (
            <button
              type="button"
              onClick={onRewind}
              disabled={rewindDisabled}
              aria-label="Rewind to start"
              className={buttonClasses}
            >
              <RewindIcon />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={disabled}
            aria-label={isPlaying ? "Pause playback" : "Play MIDI"}
            className={buttonClasses}
          >
            {disabled ? (
              <SpinnerIcon />
            ) : isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>
          {onDownload ? (
            <button
              type="button"
              onClick={onDownload}
              disabled={downloadDisabled}
              aria-label="Download audio file"
              className={buttonClasses}
            >
              <DownloadIcon />
            </button>
          ) : null}
        </div>

        {/* time labels */}
        <div className="w-full flex justify-between text-xs font-mono text-white/80 mb-1">
          <span>{formattedCurrent}</span>
          <span>{formattedDuration}</span>
        </div>

        {/* progress slider */}
        <div className="w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={clampedPosition}
            style={
              {
                "--value": `${(clampedPosition / (duration || 1)) * 100}%`,
              } as React.CSSProperties
            }
            readOnly
            disabled={isSeekingDisabled}
            className="flex-1 h-1 appearance-none rounded-full bg-white/20 accent-white pointer-events-none disabled:opacity-40"
          />
        </div>
      </div>

      {/* range track styling */}
      <style jsx global>{`
        input[type="range"]::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            #FFFFFF var(--value, 0%),
            rgba(255, 255, 255, 0.3) var(--value, 0%)
          );
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 4px;
          height: 16px;
          border-radius: 15px;
          background: #FFFFFF;
          margin-top: -6px;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-track {
          height: 4px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            #FFFFFF var(--value, 0%),
            rgba(255, 255, 255, 0.3) var(--value, 0%)
          );
        }
        input[type="range"]::-moz-range-thumb {
          width: 4px;
          height: 16px;
          border-radius: 15px;
          background: #FFFFFF;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}