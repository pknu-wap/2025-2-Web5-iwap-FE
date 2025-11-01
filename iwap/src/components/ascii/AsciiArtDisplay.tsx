// src/components/ascii/AsciiArtDisplay.tsx
'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { useDrag } from '@use-gesture/react'; // [추가] useDrag 훅 import
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

const SpinnerIcon = () => (
  <svg
    className="animate-spin ml-2 h-4 w-4 text-white inline-block"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// --- Display Component ---
export default function AsciiArtDisplay({
  asciiResult,
  onClose,
  onResolutionChange,
  isProcessing,
}: AsciiArtDisplayProps) {
  const [resolution, setResolution] = useState(asciiResult.initialResolution);

  const artRef = useRef<HTMLDivElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const sliderBarRef = useRef<HTMLDivElement>(null); // [추가] 슬라이더 바를 위한 ref

  useLayoutEffect(() => {
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
      art.style.transform = `scale(${scale})`;
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
  
  // --- [추가] 커스텀 슬라이더 로직 ---
  const minRes = 30;
  const maxRes = 500;
  const stepRes = 1;

  const bind = useDrag(({ down, xy: [x], tap, event }) => {
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
  // --- 슬라이더 로직 끝 ---

  const backgroundStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113), url('/images/ascii_background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
  
  // 슬라이더 렌더링을 위한 해상도(px -> %) 계산
  const progressPercent = maxRes > minRes ? ((resolution - minRes) / (maxRes - minRes)) * 100 : 0;

  return (
    <div className="w-full h-full" style={backgroundStyle}>
      <div className="w-full h-full flex flex-col p-4 sm:p-8">
        
        <div ref={containerRef} className="flex-1 w-full grid place-items-center overflow-hidden min-h-0">
          <div>
            <PageHeader
              title="ASCii!"
              subtitle="이미지를 텍스트로 표현"
              onClose={onClose}
              isAbsolute={false}
              padding="p-0 pb-8"
            />
            <div ref={zoomWrapperRef} className="bg-black">
              <div ref={artRef} style={{ fontFamily: 'monospace' }}>
                {asciiResult.art}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 w-full max-w-2xl mx-auto mt-4">
          <fieldset className="border border-gray-700 p-2.5 bg-black/50 text-white">
            <legend className="px-1 font-semibold text-gray-300 flex items-center">
              해상도 조절
              {isProcessing && <SpinnerIcon />}
            </legend>
            <div className="flex items-center gap-2.5">
              
              {/* [수정] 기존 input을 커스텀 슬라이더 JSX로 교체 */}
              <div
                ref={sliderBarRef}
                {...bind()}
                className={`relative flex-1 h-8 flex items-center touch-none ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="relative w-full h-2">
                  <div className="w-full h-full bg-gray-600 rounded-full"></div>
                  <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                  <div 
                    className="absolute -top-1 w-1 h-4 bg-white pointer-events-none z-20 rounded-full"
                    style={{ 
                      left: `${progressPercent}%`,
                      transform: `translateX(-50%)`
                    }}
                  />
                </div>
              </div>
              
              <span className="w-10 text-right">{resolution}px</span>
              <div className="flex items-center gap-2.5 border-l border-gray-600 pl-2.5">
                <PngDownloader
                  asciiData={asciiResult.data}
                  artDimensions={asciiResult.dims}
                  downloadCanvasRef={downloadCanvasRef}
                  zoomWrapperRef={zoomWrapperRef}
                  disabled={!asciiResult.data || isProcessing}
                />
                <PdfDownloader
                  asciiData={asciiResult.data}
                  artDimensions={asciiResult.dims}
                  disabled={!asciiResult.data || isProcessing}
                />
              </div>
            </div>
          </fieldset>
        </div>
      </div>
      <canvas ref={downloadCanvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}