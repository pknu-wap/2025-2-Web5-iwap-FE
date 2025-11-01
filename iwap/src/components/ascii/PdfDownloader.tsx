// src/components/ascii/PdfDownloader.tsx
'use client';

import React, { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import Image from 'next/image';

// --- 타입 정의 ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };

// --- Props 타입 ---
interface PdfDownloaderProps {
  asciiData: AsciiCell[][] | null;
  artDimensions: ArtDimensions;
  disabled: boolean;
}

export default function PdfDownloader({
  asciiData,
  artDimensions,
  disabled,
}: PdfDownloaderProps) {

  const downloadAsPdf = useCallback(() => {
    // ... (다운로드 로직은 변경 없음)
    if (!asciiData || artDimensions.w === 0) { return; }
    const CHAR_WIDTH_PX = 5;
    const CHAR_HEIGHT_PX = 7;
    const BASE_FONT_SIZE_PT = 10;
    const CHAR_ASPECT_RATIO = CHAR_WIDTH_PX / CHAR_HEIGHT_PX;
    const pdfCharHeightPt = BASE_FONT_SIZE_PT;
    const pdfCharWidthPt = pdfCharHeightPt * CHAR_ASPECT_RATIO;
    const artWidthChars = artDimensions.w;
    const artHeightChars = artDimensions.h;
    const pdfTotalWidthPt = artWidthChars * pdfCharWidthPt;
    const pdfTotalHeightPt = artHeightChars * pdfCharHeightPt;
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: [pdfTotalWidthPt, pdfTotalHeightPt] });
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(pdfCharHeightPt);
    asciiData.forEach((rowData, y) => {
      rowData.forEach((cell, x) => {
        const colorMatch = cell.color.match(/\d+/g);
        if (colorMatch) {
          const [r, g, b] = colorMatch.map(Number);
          doc.setTextColor(r, g, b);
          const drawX = (x * pdfCharWidthPt);
          const drawY = (y * pdfCharHeightPt) + pdfCharHeightPt;
          doc.text(cell.char, drawX, drawY, { align: 'left', baseline: 'alphabetic' });
        }
      });
    });
    doc.save(`ascii-art-${artDimensions.w}x${artDimensions.h}.pdf`);
  }, [asciiData, artDimensions]);

  return (
    <button
      onClick={downloadAsPdf}
      disabled={disabled}
      // [수정 3] 반응형 클래스 제거, 데스크탑 기준으로 스타일 고정
      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white rounded-[3px] text-stone-300 text-xl font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
      title="현재 해상도의 ASCII 아트를 벡터 PDF 파일로 다운로드합니다."
    >
      <Image
        src="/icons/download.svg" 
        alt="Download"
        width={20}
        height={20}
        // [수정 3] 반응형 클래스 제거
        className="w-5 h-5"
      />
      PDF
    </button>
  );
}