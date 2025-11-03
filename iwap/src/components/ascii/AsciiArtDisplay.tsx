// src/components/ascii/AsciiArtDisplay.tsx
'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import PngDownloader from './PngDownloader';
import PdfDownloader from './PdfDownloader';
import ResolutionSlider from './ResolutionSlider';

// --- Types & Constants ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };
export type AsciiResult = { art: React.ReactNode | null; data: AsciiCell[][] | null; dims: ArtDimensions; initialResolution: number; };
interface AsciiArtDisplayProps { asciiResult: AsciiResult; onClose: () => void; onResolutionChange: (newResolution: number) => void; isProcessing: boolean; }
const PNG_SCALE_OPTIONS = [1, 2, 4];
const CHAR_WIDTH_PX = 5;
const CHAR_HEIGHT_PX = 7;
const FONT_SIZE_PX = 7;
const SpinnerIcon = () => ( <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> );
const InlineLoadingIndicator = ({ text }: { text: string }) => ( <div className="flex items-center"> <SpinnerIcon /> <span className="text-sm text-white ml-2">{text}</span> </div> );

const DownloadOptions = ({
  pngScaleFactor,
  setPngScaleFactor,
  isProcessing,
  asciiResult,
  downloadCanvasRef,
}: {
  pngScaleFactor: number;
  setPngScaleFactor: (scale: number) => void;
  isProcessing: boolean;
  asciiResult: AsciiResult;
  downloadCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}) => (
  <div className="w-40 h-auto p-1.5 bg-white/40 border border-white flex flex-col gap-1.5">
    <div className="flex items-center justify-around">
      {PNG_SCALE_OPTIONS.map(opt => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
          <div className="relative w-3.5 h-3.5 flex items-center justify-center">
            <input
              type="radio"
              name="png-scale"
              value={opt}
              checked={pngScaleFactor === opt}
              onChange={(e) => setPngScaleFactor(Number(e.target.value))}
              className="absolute w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            <div className="w-full h-full border border-white rounded-full flex items-center justify-center">
              {pngScaleFactor === opt && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
          </div>
          <span className="text-white text-sm font-semibold">{opt}x</span>
        </label>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      <PngDownloader asciiData={asciiResult.data} artDimensions={asciiResult.dims} downloadCanvasRef={downloadCanvasRef} disabled={!asciiResult.data || isProcessing} scale={pngScaleFactor} />
      <PdfDownloader asciiData={asciiResult.data} artDimensions={asciiResult.dims} disabled={!asciiResult.data || isProcessing} />
    </div>
  </div>
);

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

  useLayoutEffect(() => {
    setResolution(asciiResult.initialResolution);
  }, [asciiResult.initialResolution]);

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
      
      const scale = Math.min(container.clientWidth / artNaturalWidth, container.clientHeight / artNaturalHeight);
      
      if (!isFinite(scale) || scale <= 0) return;

      zoomWrapper.style.width = `${artNaturalWidth * scale}px`;
      zoomWrapper.style.height = `${artNaturalHeight * scale}px`;
      art.style.width = `${artNaturalWidth}px`;
      art.style.height = `${artNaturalHeight}px`;
      art.style.transform = `scale(${scale}) translateY(-2px)`;
      art.style.transformOrigin = 'top left';
    };

    calculateAndApplyScale();
    const resizeObserver = new ResizeObserver(calculateAndApplyScale);
    if (container) {
      resizeObserver.observe(container);
    }
    window.addEventListener('resize', calculateAndApplyScale);

    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
      window.removeEventListener('resize', calculateAndApplyScale);
    };
  }, [asciiResult.dims]);

  const maxRes = 300;
  const minRes = 30;

  const handleSliderChangeEnd = (value: number) => {
    if (value !== asciiResult.initialResolution) {
      onResolutionChange(value);
    }
  };

  const backgroundStyle = { backgroundImage: `linear-gradient(to bottom, rgba(214, 211, 209, 0), #d6d3d1), url('/images/ascii_background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' };

  const downloadOptionsProps = {
    pngScaleFactor,
    setPngScaleFactor,
    isProcessing,
    asciiResult,
    downloadCanvasRef,
  };

  return (
    // [수정] 'justify-center' 추가 (수직 중앙 정렬)
    <div className="w-full h-screen overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8" style={backgroundStyle}>
      
      {/* [수정] 'max-h-full' 추가 (화면 높이 초과 방지) */}
      <div className="w-full max-w-[620px] flex flex-col max-h-full">
        
        {/* 1. 헤더 (고정 크기) */}
        <PageHeader title="ASCi!" subtitle="이미지를 텍스트로 표현" onClose={onClose} isAbsolute={false} padding="p-0 pb-2" />
        
        {/* 2. 아트워크 영역 (가변 크기) */}
        {/* [수정] 'flex-1 min-h-0' 적용 (남은 공간 차지 및 축소) */}
        <div ref={containerRef} className="flex-1 min-h-0 w-full flex items-center justify-center">
          
          <div className="bg-white p-1.5 shadow-lg">
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <div ref={zoomWrapperRef} className="bg-black overflow-hidden">
                <div ref={artRef} style={{ userSelect: 'none', fontFamily: 'monospace' }}>
                  {asciiResult.data?.map((rowData, y) => (
                    <div key={y} style={{ height: `${CHAR_HEIGHT_PX}px`, lineHeight: `${CHAR_HEIGHT_PX}px`, whiteSpace: 'nowrap' }}>
                      {rowData.map((cell, x) => (
                        <span key={x} style={{ color: cell.color, width: `${CHAR_WIDTH_PX}px`, fontSize: `${FONT_SIZE_PX}px`, display: 'inline-block', textAlign: 'center' }}>
                          {cell.char}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div> {/* End Art Container */}

        {/* 3. 슬라이더 영역 (고정 크기) */}
        <div className="w-full mt-4 mb-30">
          <div className="flex items-end gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1 h-5">
                <span className="block text-white text-sm font-normal">{resolution}px</span>
                {isProcessing && <div className="ml-3"><InlineLoadingIndicator text="변환 중..." /></div>}
              </div>
              <ResolutionSlider
                value={resolution}
                min={minRes}
                max={maxRes}
                disabled={isProcessing}
                onChange={setResolution}
                onChangeEnd={handleSliderChangeEnd}
              />
            </div>
            <DownloadOptions {...downloadOptionsProps} />
          </div>
        </div> {/* End Unified Slider Area */}

      </div> {/* End Main Content Wrapper */}

      <canvas ref={downloadCanvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}