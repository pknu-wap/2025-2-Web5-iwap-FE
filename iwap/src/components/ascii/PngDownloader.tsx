// app/components/download/PngDownloader.tsx
'use client';

import React, { useState, useCallback } from 'react';

// --- 타입 정의 ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };

// --- 상수 ---
const PNG_SCALE_OPTIONS = [1, 2, 4];
const DEFAULT_PNG_SCALE = 1;

// --- Props 타입 ---
interface PngDownloaderProps {
  asciiData: AsciiCell[][] | null;
  artDimensions: ArtDimensions;
  downloadCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  zoomWrapperRef: React.RefObject<HTMLDivElement | null>;
  disabled: boolean;
}

export default function PngDownloader({
  asciiData,
  artDimensions,
  downloadCanvasRef,
  zoomWrapperRef,
  disabled,
}: PngDownloaderProps) {
  const [pngScaleFactor, setPngScaleFactor] = useState<number>(DEFAULT_PNG_SCALE);

  const handleScaleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setPngScaleFactor(Number(e.target.value));
  };

  /** PNG 다운로드 로직 */
  const downloadAsPng = useCallback(() => {
    const zoomWrapper = zoomWrapperRef.current;
    if (!asciiData || !downloadCanvasRef.current || !zoomWrapper || artDimensions.w === 0) {
      alert("먼저 이미지를 변환해주세요.");
      return;
    }

    const canvas = downloadCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const visibleWidth = zoomWrapper.clientWidth;
    const visibleHeight = zoomWrapper.clientHeight;
    const canvasWidth = Math.ceil(visibleWidth * pngScaleFactor);
    const canvasHeight = Math.ceil(visibleHeight * pngScaleFactor);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const charPixelWidth = canvasWidth / artDimensions.w;
    const charPixelHeight = canvasHeight / artDimensions.h;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const downloadFontSize = charPixelHeight * 0.85;
    ctx.font = `${downloadFontSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    asciiData.forEach((rowData, y) => {
      rowData.forEach((cell, x) => {
        ctx.fillStyle = cell.color;
        const drawX = x * charPixelWidth;
        const drawY = Math.round(y * charPixelHeight); // Y 좌표 반올림
        ctx.fillText(cell.char, drawX, drawY);
      });
    });

    try {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `ascii-art-${artDimensions.w}x${artDimensions.h}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("PNG 생성 또는 다운로드 실패:", error);
      alert("PNG 다운로드에 실패했습니다.");
    }
  }, [asciiData, artDimensions, pngScaleFactor, downloadCanvasRef, zoomWrapperRef]);

  return (
    <>
      {/* 배율 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-sm">배율(PNG):</span>
        {PNG_SCALE_OPTIONS.map(scale => (
          <label key={scale} className="text-sm cursor-pointer">
            <input
              type="radio"
              name="scale"
              value={scale}
              checked={pngScaleFactor === scale}
              onChange={handleScaleChange}
              className="mr-1"
              disabled={disabled}
            />
            {scale}x
          </label>
        ))}
      </div>

      {/* PNG 다운로드 버튼 */}
      <button
        onClick={downloadAsPng}
        disabled={disabled}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="현재 해상도의 ASCII 아트를 PNG 파일로 다운로드합니다."
      >
        PNG
      </button>
    </>
  );
}