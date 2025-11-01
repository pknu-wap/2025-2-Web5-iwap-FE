// src/components/ascii/AsciiArtDisplay.tsx
'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import PageHeader from '@/components/ui/PageHeader';
import PngDownloader from './PngDownloader';
import PdfDownloader from './PdfDownloader';

// --- Types ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };
export type AsciiResult = {
  art: React.ReactNode | null;
  data: AsciiCell[][] | null;
  dims: ArtDimensions;
  initialResolution: number;
};

interface AsciiArtDisplayProps {
  asciiResult: AsciiResult;
  onClose: () => void;
  onResolutionChange: (newResolution: number) => void;
  isProcessing: boolean;
}

// --- Constants ---
const CHAR_WIDTH_PX = 5;
const CHAR_HEIGHT_PX = 7;
const PNG_SCALE_OPTIONS = [1, 2, 4];

// --- Display Component ---
export default function AsciiArtDisplay({
  asciiResult,
  onClose,
  onResolutionChange,
  isProcessing,
}: AsciiArtDisplayProps) {
  const [resolution, setResolution] = useState(asciiResult.initialResolution);
  const [pngScaleFactor, setPngScaleFactor] = useState<number>(1);

  const artRef = useRef<HTMLDivElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const sliderBarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // ... (useLayoutEffect 내용은 변경 없음)
    const container = containerRef.current;
    const art = artRef.current;
    const zoomWrapper = zoomWrapperRef.current;
    const artDims = asciiResult.dims;
    if (!container || !art || !zoomWrapper || artDims.w === 0) return;
    const calculateAndApplyScale = () => {
      const artNaturalWidth = artDims.w * CHAR_WIDTH_PX;
      const artNaturalHeight = artDims.h * CHAR_HEIGHT_PX;
      if (artNaturalWidth === 0) return;
      const scale = Math.min(
        container.clientWidth / artNaturalWidth,
        container.clientHeight / artNaturalHeight
      );
      zoomWrapper.style.width = `${artNaturalWidth * scale}px`;
      zoomWrapper.style.height = `${artNaturalHeight * scale}px`;
      art.style.width = `${artNaturalWidth}px`;
      art.style.height = `${artNaturalHeight}px`;
      art.style.transform = `scale(${scale}) translateY(-2px)`;
      art.style.transformOrigin = 'top left';
    };
    calculateAndApplyScale();
    window.addEventListener('resize', calculateAndApplyScale);
    return () => window.removeEventListener('resize', calculateAndApplyScale);
  }, [asciiResult.dims]);

  const handleRenderTrigger = () => {
    if (resolution !== asciiResult.initialResolution) {
      onResolutionChange(resolution);
    }
  };
  
  const minRes = 30;
  const maxRes = 500;
  const stepRes = 1;

  const bind = useDrag(({ down, xy: [x], tap, event }) => {
    // ... (useDrag 내용은 변경 없음)
    if (isProcessing || !sliderBarRef.current) return;
    if (tap) event.preventDefault();
    const { left, width } = sliderBarRef.current.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (x - left) / width));
    const rawValue = minRes + progress * (maxRes - minRes);
    const steppedValue = Math.round(rawValue / stepRes) * stepRes;
    const finalValue = Math.max(minRes, Math.min(maxRes, steppedValue));
    if (finalValue !== resolution) {
      setResolution(finalValue);
    }
    if (!down) {
      handleRenderTrigger();
    }
  }, { filterTaps: true });

  const backgroundStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(214, 211, 209, 0), #d6d3d1), url('/images/ascii_background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
  
  const progressPercent = maxRes > minRes ? ((resolution - minRes) / (maxRes - minRes)) * 100 : 0;

  return (
    // [수정 4] h-full을 min-h-full로 변경하여 스크롤 보장
    <div className="w-full min-h-full overflow-y-auto" style={backgroundStyle}>
      {/* [수정 4] h-full을 min-h-full로 변경 */}
      <div className="w-full min-h-full flex flex-col items-center justify-center p-4 sm:p-8">
        
        {/* [수정 2] 여백을 md:gap-1로 최소화 */}
        <div className="relative w-full max-w-5xl mx-auto md:flex md:items-start md:justify-center md:gap-1">
          {/* 왼쪽: 아트 + 슬라이더 컨테이너 */}
          <div className="flex flex-col items-center w-full">
            <div className="w-full max-w-[620px]">
              <PageHeader
                title="ASCii!"
                subtitle="이미지를 텍스트로 표현"
                onClose={onClose}
                isAbsolute={false}
                padding="p-0 pb-4"
              />
            </div>
            
            <div className="bg-white p-1.5 shadow-lg w-full max-w-[620px]">
              <div ref={containerRef} className="w-full aspect-square flex items-center justify-center overflow-hidden">
                <div ref={zoomWrapperRef} className="bg-black overflow-hidden">
                  <div ref={artRef} style={{ fontFamily: 'monospace' }}>
                    {asciiResult.art}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full max-w-[620px] mt-8">
              <span className="block text-white text-sm font-normal mb-1">{resolution}px</span>
              <div
                ref={sliderBarRef}
                {...bind()}
                className={`relative flex-1 h-8 flex items-center touch-none ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="relative w-full h-1.5">
                  <div className="w-full h-full bg-zinc-400 rounded-full"></div>
                  <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                  <div 
                    className="absolute top-1/2 w-1 h-4 bg-white pointer-events-none z-10 rounded-full"
                    style={{ 
                      left: `${progressPercent}%`,
                      transform: `translateX(-50%) translateY(-50%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* [수정 1, 3] 오른쪽: 다운로드 패널 너비 조정 및 transform scale 적용 */}
          <div className="absolute top-[88px] right-4 z-20 md:relative md:top-auto md:right-auto md:mt-[72px] transform-origin-top-right transition-transform duration-200 ease-in-out scale-75 md:scale-100">
            <div className="w-72 h-auto p-4 bg-white/40 border border-white rounded-md flex flex-col gap-4">
              <div className="flex items-center justify-around">
                {PNG_SCALE_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <div className="relative w-3.5 h-3.5">
                      <input
                        type="radio"
                        name="png-scale"
                        value={opt}
                        checked={pngScaleFactor === opt}
                        onChange={(e) => setPngScaleFactor(Number(e.target.value))}
                        className="peer sr-only"
                        disabled={isProcessing}
                      />
                      <div className="w-full h-full bg-zinc-300 rounded-full border border-zinc-400 peer-checked:bg-white"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1.2 w-2 h-2 rounded-full bg-zinc-300 peer-checked:bg-white"></div>
                    </div>
                    <span className="text-white text-xl font-semibold">{opt}x</span>
                  </label>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <PngDownloader
                  asciiData={asciiResult.data}
                  artDimensions={asciiResult.dims}
                  downloadCanvasRef={downloadCanvasRef}
                  disabled={!asciiResult.data || isProcessing}
                  scale={pngScaleFactor}
                />
                <PdfDownloader
                  asciiData={asciiResult.data}
                  artDimensions={asciiResult.dims}
                  disabled={!asciiResult.data || isProcessing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <canvas ref={downloadCanvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}