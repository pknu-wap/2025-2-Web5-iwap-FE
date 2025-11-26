"use client";

import { useEffect, useRef, useState } from "react";

type RecordedAudioPlayerProps = {
  src: string;
  autoPlay?: boolean;
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

/**
 * Custom audio player bar used to preview recorded voice input.
 */
export default function RecordedAudioPlayer({
  src,
  autoPlay = false,
  className = "",
}: RecordedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    if (autoPlay) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [autoPlay, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio
        .play()
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const togglePlayback = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleScrub = (value: number) => {
    const audio = audioRef.current;
    if (!audio || Number.isNaN(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div
      className={`w-full rounded-xl bg-white/10 backdrop-blur border border-white/20 p-4 text-white ${className}`}
    >
      <audio ref={audioRef} src={src} preload="auto" />
      <div className="flex items-center justify-between text-sm mb-2">
        <button
          type="button"
          onClick={togglePlayback}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
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
            ref={progressRef}
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={(event) => handleScrub(Number(event.target.value))}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-xs text-white/70 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="text-xs text-white/70 min-w-[70px] text-right truncate">
          녹음 미리듣기
        </div>
      </div>
    </div>
  );
}

