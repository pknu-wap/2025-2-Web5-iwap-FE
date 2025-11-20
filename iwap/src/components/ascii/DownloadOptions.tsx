// src/components/ascii/DownloadOptions.tsx
'use client';

import React from 'react';
import PngDownloader from './PngDownloader';
import PdfDownloader from './PdfDownloader';
import type { AsciiResult } from './AsciiArtDisplay'; // AsciiArtDisplay에서 type import

// --- 상수 이동 ---
const PNG_SCALE_OPTIONS = [1, 2, 4];

// --- Props 타입 정의 ---
interface DownloadOptionsProps {
  pngScaleFactor: number;
  setPngScaleFactor: (scale: number) => void;
  isProcessing: boolean;
  asciiResult: AsciiResult;
  downloadCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

// --- 컴포넌트 정의 및 export ---
export default function DownloadOptions({
  pngScaleFactor,
  setPngScaleFactor,
  isProcessing,
  asciiResult,
  downloadCanvasRef,
}: DownloadOptionsProps) {
  return (
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
              <div className="w-full h-full border-1 border-white rounded-full flex items-center justify-center">
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
  );
}