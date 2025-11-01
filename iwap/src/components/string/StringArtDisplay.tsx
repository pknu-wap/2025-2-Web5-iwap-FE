// src/components/string/StringArtDisplay.tsx
'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Point } from './StringArtProcessor';
import ProgressBar from './ProgressBar';

// --- PROPS & CONSTANTS ---
interface StringArtDisplayProps {
  coordinates: Point[];
  onClose: () => void;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;
const TARGET_ANIMATION_DURATION_MS = 15000; // 15초

// --- HELPER ICONS ---
const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
    </svg>
);
  
const PauseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" fill="currentColor"/>
    </svg>
);

// --- MAIN COMPONENT ---
export default function StringArtDisplay({ coordinates, onClose }: StringArtDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1); // 1: normal, 2: fast-forward, -2: rewind

  const totalCoordinates = useMemo(() => coordinates?.length || 0, [coordinates]);

  // --- 일반 재생 속도 기준, 프레임당 그릴 라인 수 계산 ---
  const linesPerFrame = useMemo(() => {
    if (totalCoordinates <= 1) return 1;
    const totalFrames = TARGET_ANIMATION_DURATION_MS / (1000 / 60);
    return Math.max(1, Math.ceil(totalCoordinates / totalFrames));
  }, [totalCoordinates]);
  
  // --- 그리기 로직 ---
  useEffect(() => {
    if (!coordinates || totalCoordinates <= 1 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(coordinates[0][0], coordinates[0][1]);
    
    const limit = Math.min(currentIndex + 1, totalCoordinates);
    for (let i = 1; i < limit; i++) {
        const [x, y] = coordinates[i];
        ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [coordinates, currentIndex, totalCoordinates]);


  // --- 애니메이션 루프 로직 ---
  useEffect(() => {
    const animate = () => {
      setCurrentIndex(prevIndex => {
        const step = Math.round(linesPerFrame * playbackRate);
        const nextIndex = prevIndex + step;

        if (playbackRate < 0) {
          if (nextIndex <= 0) {
            setIsPlaying(false);
            setPlaybackRate(1);
            return 0;
          }
          return nextIndex;
        }

        if (nextIndex >= totalCoordinates - 1) {
          setIsPlaying(false);
          setPlaybackRate(1);
          return totalCoordinates - 1;
        }
        return nextIndex;
      });
      animationFrameId.current = requestAnimationFrame(animate);
    };

    if (isPlaying && totalCoordinates > 1) {
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPlaying, playbackRate, totalCoordinates, linesPerFrame]);

  // --- 사용자 인터랙션 핸들러 ---
  const handleSeek = useCallback((index: number) => {
    setIsPlaying(false);
    setPlaybackRate(1);
    setCurrentIndex(Math.round(index));
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setPlaybackRate(1);
      if (currentIndex >= totalCoordinates - 1) {
        setCurrentIndex(0);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentIndex, totalCoordinates]);
  
  const handleRewindClick = useCallback(() => {
    setIsPlaying(true);
    setPlaybackRate(-2);
  }, []);

  const handleFastForwardClick = useCallback(() => {
    setIsPlaying(true);
    setPlaybackRate(2);
  }, []);

  // --- 렌더링 ---
  const backgroundStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113), url('/images/string_background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  return (
    <div className="w-full h-full" style={backgroundStyle}>
      <div className="w-full h-full flex flex-col p-4 sm:p-8">
        
        <div className="flex-1 w-full grid place-items-center overflow-hidden min-h-0">
          <div className="w-fit">
            <PageHeader
              title="Str!ng"
              subtitle="선들로 이미지를 표현"
              onClose={onClose}
              isAbsolute={false}
              padding="p-0 pb-8" // [수정] 여백을 pb-1로 조정하여 통일감 부여
            />
            <div className="bg-white p-2 shadow-lg">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* --- 애니메이션 컨트롤러 (레이아웃 수정) --- */}
        <div className="flex-shrink-0 w-full max-w-3xl mx-auto mt-4 h-[62px] flex items-center justify-center -translate-x-4 gap-x-4 px-4 z-20">
            <button 
                onClick={handlePlayPause} 
                className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            
            <div className="flex-1 flex items-center relative h-full">
                {/* 진행률 텍스트 */}
                <span className="absolute -top-1 left-0 text-white text-sm font-mono select-none">
                    {currentIndex} / {totalCoordinates > 0 ? totalCoordinates - 1 : 0}
                </span>

                {/* 시작점 (역재생) */}
                <div 
                    className="w-3 h-3 bg-white rounded-full z-10 cursor-pointer"
                    onClick={handleRewindClick}
                />

                {/* 프로그레스 바 */}
                <div className="flex-1 mx-2">
                    {totalCoordinates > 1 && (
                        <ProgressBar
                            currentStep={currentIndex}
                            totalSteps={totalCoordinates}
                            onSeek={handleSeek}
                        />
                    )}
                </div>

                {/* 끝점 (빨리감기) */}
                <div 
                    className="w-3 h-3 bg-white rounded-full z-10 cursor-pointer"
                    onClick={handleFastForwardClick}
                />
            </div>
        </div>
      </div>
    </div>
  );
}