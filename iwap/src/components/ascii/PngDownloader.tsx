// src/components/ascii/PngDownloader.tsx
'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';

// --- 타입 정의 ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };

// --- Props 타입 ---
interface PngDownloaderProps {
  asciiData: AsciiCell[][] | null;
  artDimensions: ArtDimensions;
  downloadCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  disabled: boolean;
  scale: number;
}

export default function PngDownloader({
  asciiData,
  artDimensions,
  downloadCanvasRef,
  disabled,
  scale,
}: PngDownloaderProps) {

  const downloadAsPng = useCallback(() => {
    if (!asciiData || !downloadCanvasRef.current || artDimensions.w === 0) { return; }
    const canvas = downloadCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const CHAR_WIDTH_PX = 5;
    const CHAR_HEIGHT_PX = 7;
    const FONT_SIZE_PX = 7;
    const canvasWidth = artDimensions.w * CHAR_WIDTH_PX * scale;
    const canvasHeight = artDimensions.h * CHAR_HEIGHT_PX * scale;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const charPixelWidth = CHAR_WIDTH_PX * scale;
    const charPixelHeight = CHAR_HEIGHT_PX * scale;
    const downloadFontSize = FONT_SIZE_PX * scale;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.font = `${downloadFontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    asciiData.forEach((rowData, y) => {
      rowData.forEach((cell, x) => {
        ctx.fillStyle = cell.color;
        const drawX = x * charPixelWidth + charPixelWidth / 2;
        const drawY = y * charPixelHeight + charPixelHeight / 2;
        ctx.fillText(cell.char, drawX, drawY);
      });
    });
    try {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `ascii-art-${artDimensions.w}x${artDimensions.h}@${scale}x.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) { console.error(error); }
  }, [asciiData, artDimensions, scale, downloadCanvasRef]);

  return (
    <button
      onClick={downloadAsPng}
      disabled={disabled}
      // [수정 3] cursor-pointer 추가
      className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-white rounded-[3px] text-black/50 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      title="선택한 배율로 PNG 파일을 다운로드합니다."
    >
      <Image 
        src="/icons/download_white.svg" 
        alt="Download"
        width={16}
        height={16} 
        className="w-4 h-4"
        style={{ filter: 'brightness(0) opacity(0.5)' }}
      />
      PNG
    </button>
  );
}