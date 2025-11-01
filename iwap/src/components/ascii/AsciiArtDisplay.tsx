// src/components/ascii/AsciiArtDisplay.tsx
'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
// [수정] FullScreenView 대신 PageHeader를 직접 import 합니다.
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
  
  // FullScreenView의 배경 스타일 로직을 직접 적용합니다.
  const backgroundStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113), url('/images/ascii_background.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  return (
    // [수정] FullScreenView 대신 새로운 Flexbox 레이아웃으로 전체 구조를 변경합니다.
    <div className="w-full h-full" style={backgroundStyle}>
      <div className="w-full h-full flex flex-col p-4 sm:p-8">
        
        {/* 아이템 1: PageHeader. 이제 일반적인 흐름(static)에 따라 렌더링됩니다. */}
        <PageHeader
          title="ASCii!"
          subtitle="이미지를 텍스트로 표현"
          onClose={onClose}
          isAbsolute={false} // 이 prop을 false로 설정하여 absolute 포지셔닝을 비활성화합니다.
          padding="p-0 pb-4" // 새로운 레이아웃에 맞는 패딩을 설정합니다.
        />

        {/* 아이템 2: 아스키 아트. flex-1 클래스로 남은 공간을 모두 차지합니다. */}
        <div ref={containerRef} className="flex-1 w-full grid place-items-center overflow-hidden min-h-0">
          <div ref={zoomWrapperRef} className="bg-black">
            <div ref={artRef} style={{ fontFamily: 'monospace' }}>
              {asciiResult.art}
            </div>
          </div>
        </div>

        {/* 아이템 3: 컨트롤러. 필요한 만큼의 공간만 차지합니다. */}
        <div className="flex-shrink-0 w-full max-w-2xl mx-auto mt-4">
          <fieldset className="border border-gray-700 p-2.5 bg-black/50 text-white">
            <legend className="px-1 font-semibold text-gray-300 flex items-center">
              해상도 조절
              {isProcessing && <SpinnerIcon />}
            </legend>
            <div className="flex items-center gap-2.5">
              <input
                type="range" min="30" max="500" step="1"
                value={resolution}
                onChange={(e) => setResolution(Number(e.target.value))}
                onMouseUp={handleRenderTrigger}
                onTouchEnd={handleRenderTrigger}
                disabled={isProcessing}
                className="flex-1"
              />
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