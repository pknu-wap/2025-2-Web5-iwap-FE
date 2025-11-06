// src/components/string/StringArtDisplay.tsx
'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ProgressBar from './ProgressBar';

// [수정] Point 타입을 컴포넌트 내부에 정의
type Point = [number, number];

// --- PROPS & CONSTANTS ---
interface StringArtDisplayProps {
  coordinates: number[]; // [수정] props 타입을 number[] (핀 인덱스 배열)로 변경
  onClose: () => void;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;
const TARGET_ANIMATION_DURATION_MS = 15000; // 15초

// [추가] 핀 좌표 계산을 위한 상수
const TOTAL_PINS = 211; // 0-210 범위
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const RADIUS = (CANVAS_WIDTH / 2) - 5; // 캔버스 가장자리에서 5px 여유

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

  // [수정] 핀 인덱스 배열을 캔버스 [x, y] 좌표 배열로 변환
  const canvasCoordinates: Point[] = useMemo(() => {
    if (!coordinates) return [];

    // 헬퍼 함수: 핀 인덱스를 [x, y] 좌표로 변환
    const getPointFromIndex = (index: number): Point => {
      // 각도를 계산 (12시 방향( -Math.PI / 2 )에서 시작)
      const angle = (index / TOTAL_PINS) * 2 * Math.PI - Math.PI ;
      const x = CENTER_X + RADIUS * Math.cos(angle);
      const y = CENTER_Y + RADIUS * Math.sin(angle);
      return [x, y];
    };

    // props로 받은 모든 핀 인덱스를 [x, y] 좌표로 매핑
    return coordinates.map(getPointFromIndex);
  }, [coordinates]);

  // [수정] totalCoordinates가 props.coordinates 대신 canvasCoordinates를 기반으로 계산되도록 변경
  const totalCoordinates = useMemo(() => canvasCoordinates.length, [canvasCoordinates]);

  // --- 일반 재생 속도 기준, 프레임당 그릴 라인 수 계산 ---
  const linesPerFrame = useMemo(() => {
    if (totalCoordinates <= 1) return 1;
    const totalFrames = TARGET_ANIMATION_DURATION_MS / (1000 / 60);
    return Math.max(1, Math.ceil(totalCoordinates / totalFrames));
  }, [totalCoordinates]);
  
  // --- 그리기 로직 ---
  useEffect(() => {
    // [수정] props.coordinates 대신 변환된 canvasCoordinates를 사용
    if (totalCoordinates <= 1 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.25;
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    // [수정] canvasCoordinates 사용
    ctx.moveTo(canvasCoordinates[0][0], canvasCoordinates[0][1]);
    
    const limit = Math.min(currentIndex + 1, totalCoordinates);
    for (let i = 1; i < limit; i++) {
        // [수정] canvasCoordinates 사용
        const [x, y] = canvasCoordinates[i];
        ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [canvasCoordinates, currentIndex, totalCoordinates]); // [수정] 의존성 배열 변경


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
                    {/*                         currentIndex는 0부터 (totalCoordinates - 1)까지 증가합니다. 
                        따라서 최대값은 (totalCoordinates - 1)이 맞습니다.
                    */}
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
                            // [수정] totalSteps는 currentStep의 최대값인 (totalCoordinates - 1)이 되어야 함
                            totalSteps={totalCoordinates - 1} 
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