'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ProgressBar from './ProgressBar';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1); 

  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (colorImageUrl) {
      const img = new Image();
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

    const isComplete = currentIndex >= totalCoordinates - 1;
    if (overlayImage && isComplete) {
      ctx.globalAlpha = 1.0; 
      ctx.globalCompositeOperation = 'overlay';
      ctx.drawImage(overlayImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalCompositeOperation = 'source-over'; 
    }

  }, [canvasCoordinates, currentIndex, totalCoordinates, overlayImage]); 


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
    backgroundImage: "url('/images/string_background.png')",
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
              padding="p-0 pb-8"
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

        {/* --- 애니메이션 컨트롤러 --- */}
        <div className="shrink-0 w-full max-w-3xl mx-auto mt-4 h-[62px] flex items-center justify-center -translate-x-4 gap-x-4 px-4 z-20">
            <button 
              onClick={handlePlayPause} 
              className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            
            <div className="flex-1 flex items-center relative h-full">
                <span className="absolute -top-1 left-0 text-white text-sm font-mono select-none">
                    {currentIndex} / {totalCoordinates > 0 ? totalCoordinates - 1 : 0}
                </span>

                <div 
                    className="w-3 h-3 bg-white rounded-full z-10 cursor-pointer"
                    onClick={handleRewindClick}
                />

                <div className="flex-1 mx-2">
                    {totalCoordinates > 1 && (
                        <ProgressBar
                            currentStep={currentIndex}
                            totalSteps={totalCoordinates - 1} 
                            onSeek={handleSeek}
                        />
                    )}
                </div>

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