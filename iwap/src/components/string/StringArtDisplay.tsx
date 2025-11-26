'use client';

import Image from 'next/image';
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ProgressBar from './ProgressBar';
import { useTheme } from "@/components/theme/ThemeProvider";

type Point = [number, number];

// --- PROPS & CONSTANTS ---
interface StringArtDisplayProps {
  coordinates: number[];
  colorImageUrl: string | null; 
  onClose: () => void;
  nailCount: number;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;
const TARGET_ANIMATION_DURATION_MS = 15000; // 15초

const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const RADIUS = (CANVAS_WIDTH / 2) - 5; 

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
export default function StringArtDisplay({ coordinates, onClose, colorImageUrl, nailCount }: StringArtDisplayProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1); 
  const [overlayScale] = useState(0.98);

  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (colorImageUrl) {
      const img = new window.Image();
      img.onload = () => setOverlayImage(img);
      img.onerror = () => {
        console.error("Failed to load overlay image from URL:", colorImageUrl);
        setOverlayImage(null);
      };
      img.src = colorImageUrl;
    } else {
      setOverlayImage(null);
    }
  }, [colorImageUrl]);

  const canvasCoordinates: Point[] = useMemo(() => {
    if (!coordinates) return [];
    const getPointFromIndex = (index: number): Point => {
      const angle = (index / nailCount) * 2 * Math.PI - Math.PI ;
      const x = CENTER_X + RADIUS * Math.cos(angle);
      const y = CENTER_Y + RADIUS * Math.sin(angle);
      return [x, y];
    };
    return coordinates.map(getPointFromIndex);
  }, [coordinates, nailCount]);

  const totalCoordinates = useMemo(() => canvasCoordinates.length, [canvasCoordinates]);

  const linesPerFrame = useMemo(() => {
    if (totalCoordinates <= 1) return 1;
    const totalFrames = TARGET_ANIMATION_DURATION_MS / (1000 / 60);
    return Math.max(1, Math.ceil(totalCoordinates / totalFrames));
  }, [totalCoordinates]);
  
  // --- 그리기 로직 ---
  useEffect(() => {
    if (!canvasRef.current || !canvasCoordinates || canvasCoordinates.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. 항상 캔버스를 깨끗하게 지우고 흰색 배경을 설정
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. 그려야 할 선이 없으면 여기서 함수를 종료
    if (currentIndex <= 0) {
      return;
    }

    // 3. 선 그리기 설정
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.25;
    ctx.globalAlpha = 0.5;

    // 4. 경로 생성 및 그리기
    ctx.beginPath();
    ctx.moveTo(canvasCoordinates[0][0], canvasCoordinates[0][1]);
    
    const limit = Math.min(currentIndex + 1, totalCoordinates);
    for (let i = 1; i < limit; i++) {
        const [x, y] = canvasCoordinates[i];
        ctx.lineTo(x, y);
    }
    ctx.stroke();

  }, [canvasCoordinates, currentIndex, totalCoordinates]);

  // --- 애니메이션 루프 로직 ---
  useEffect(() => {
    const animate = () => {
      setCurrentIndex(prevIndex => {
        const step = Math.round(linesPerFrame * playbackRate);
        const nextIndex = prevIndex + step;
        const isForward = playbackRate > 0;

        // --- Seeking Logic ---
        if (seekTarget !== null) {
          if ((isForward && nextIndex >= seekTarget) || (!isForward && nextIndex <= seekTarget)) {
            setIsPlaying(false);
            setSeekTarget(null);
            setPlaybackRate(1);
            if (seekTarget >= totalCoordinates - 1) {
              setIsComplete(true);
            }
            return seekTarget;
          }
          return nextIndex;
        }

        // --- Normal Playback Logic ---
        if (isForward) {
          if (nextIndex >= totalCoordinates - 1) {
            setIsPlaying(false);
            setIsComplete(true);
            setPlaybackRate(1);
            return totalCoordinates - 1;
          }
        } else { // Backward
          if (nextIndex <= 0) {
            setIsPlaying(false);
            setPlaybackRate(1);
            return 0;
          }
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
  }, [isPlaying, playbackRate, totalCoordinates, linesPerFrame, seekTarget]);

  // --- 사용자 인터랙션 핸들러 ---
  const handleSeek = useCallback((index: number) => {
    const targetIndex = Math.round(index);

    // 이미 해당 지점에 있거나, 진행 중인 탐색 애니메이션이 같은 곳을 향하고 있다면 아무것도 하지 않음
    if (targetIndex === currentIndex) {
      return;
    }

    const performSeek = () => {
      const seekRate = 4;

      if (targetIndex > currentIndex) {
        setPlaybackRate(seekRate);
      } else if (targetIndex < currentIndex) {
        setPlaybackRate(-seekRate);
      } else {
        return; // 현재 위치와 목표가 같으면 중단
      }
      
      setSeekTarget(targetIndex);
      setIsPlaying(true);
    };

    if (isComplete) {
      setIsComplete(false);
      setTimeout(performSeek, 500); 
    } else {
      performSeek();
    }
  }, [isComplete, currentIndex]);

  const handleScrub = useCallback((index: number) => {
    setIsPlaying(false);
    setSeekTarget(null);
    setPlaybackRate(1);
    setIsComplete(index >= totalCoordinates - 1);
    setCurrentIndex(index);
  }, [totalCoordinates]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setPlaybackRate(1);
      if (currentIndex >= totalCoordinates - 1) {
        setIsComplete(false);
        setCurrentIndex(0);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentIndex, totalCoordinates]);
  
  const handleRewindClick = useCallback(() => {
    if (isComplete) {
      setIsComplete(false);
      setTimeout(() => {
        setIsPlaying(true);
        setPlaybackRate(-2);
      }, 500); // fade-out duration
    } else {
      setIsPlaying(true);
      setPlaybackRate(-2);
    }
  }, [isComplete]);

  const handleFastForwardClick = useCallback(() => {
    setIsPlaying(true);
    setPlaybackRate(2);
  }, []);

  // --- 렌더링 ---
  const backgroundStyle = {
    backgroundImage: theme === 'dark'
      ? `linear-gradient(to bottom, rgba(98, 144, 153, 0), rgba(98, 144, 153, 0.5)), url('/images/bg-dark/string_dark.webp')`
      : `linear-gradient(to bottom, rgba(98, 144, 153, 0), rgba(98, 144, 153, 0.5)), url('/images/bg-light/string_light.webp')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  return (
    <div className="w-full h-dvh flex items-center justify-center" style={backgroundStyle}>
      <div 
        className="flex flex-col w-full p-4 sm:p-8"
        style={{ 
            width: 'min(100%, calc(100dvh - 180px))',
            maxWidth: '600px'
        }}
      >
        
        <div className="w-full z-10 mb-2">
          <PageHeader
            title="Str!ng"
            subtitle="선들로 이미지를 표현"
            onClose={onClose}
            isAbsolute={false}
            padding="p-0"
            darkBackground={theme === 'dark'}
          />
        </div>

        <div className="w-full aspect-square relative bg-white p-2 shadow-lg z-0">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-full object-contain block"
            />
            {overlayImage && colorImageUrl && (
              <Image
                src={colorImageUrl}
                alt="Color Overlay"
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="absolute top-2 left-2 pointer-events-none transition-opacity duration-500"
                style={{
                  opacity: isComplete ? 1 : 0,
                  transform: `scale(${overlayScale})`,
                  mixBlendMode: 'overlay',
                  width: 'calc(100% - 16px)',
                  height: 'calc(100% - 16px)',
                  objectFit: 'contain'
                }}
              />
            )}
        </div>

        {/* --- 애니메이션 컨트롤러 --- */}
        <div className="shrink-0 w-full mt-4 flex flex-col items-center justify-center gap-y-2 z-20">
          <div className="w-full h-[62px] flex items-center justify-center gap-x-4 px-0">
              <button 
                onClick={handlePlayPause} 
                className="p-2 rounded-full text-white hover:bg-white/20 transition-colors shrink-0"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              
              <div className="flex-1 flex items-center relative h-full min-w-0">
                  <span className="absolute -top-1 left-0 text-white text-sm font-mono">
                      {currentIndex} / {totalCoordinates > 0 ? totalCoordinates - 1 : 0}
                  </span>

                  <div 
                      className="w-3 h-3 bg-white rounded-full z-10 cursor-pointer shrink-0"
                      onClick={handleRewindClick}
                  />

                  <div className="flex-1 mx-2">
                      {totalCoordinates > 1 && (
                          <ProgressBar
                              currentStep={currentIndex}
                              totalSteps={totalCoordinates - 1} 
                              onSeek={handleSeek}
                              onScrub={handleScrub}
                          />
                      )}
                  </div>

                  <div 
                      className="w-3 h-3 bg-white rounded-full z-10 cursor-pointer shrink-0"
                      onClick={handleFastForwardClick}
                  />
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}