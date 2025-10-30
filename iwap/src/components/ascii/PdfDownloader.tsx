// app/components/download/PdfDownloader.tsx
'use client';

import React, { useCallback } from 'react';
import { jsPDF } from 'jspdf'; // PDF 라이브러리

// --- 타입 정의 ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };

// --- 공유 상수 ---
const CHAR_WIDTH_PX = 5;
const CHAR_HEIGHT_PX = 7;

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

  /** PDF 다운로드 로직 (벡터, 여백 없음) */
  const downloadAsPdf = useCallback(() => {
    if (!asciiData || artDimensions.w === 0) {
      alert("먼저 이미지를 변환해주세요.");
      return;
    }

    // --- 아트 크기 계산 (pt 단위) ---

    // PDF에서 사용할 기본 문자 높이(pt) (이 값을 조절해 전체 크기 조절 가능)
    const BASE_FONT_SIZE_PT = 10;
    
    // 원본 문자의 종횡비
    const CHAR_ASPECT_RATIO = CHAR_WIDTH_PX / CHAR_HEIGHT_PX;

    // PDF에서 사용할 문자 크기 (높이는 기본값, 너비는 종횡비에 맞춰 계산)
    const pdfCharHeightPt = BASE_FONT_SIZE_PT;
    const pdfCharWidthPt = pdfCharHeightPt * CHAR_ASPECT_RATIO;

    // 문자의 개수
    const artWidthChars = artDimensions.w;
    const artHeightChars = artDimensions.h;

    // 여백 없는 PDF의 총 크기 (pt)
    const pdfTotalWidthPt = artWidthChars * pdfCharWidthPt;
    const pdfTotalHeightPt = artHeightChars * pdfCharHeightPt;

    // --- PDF 문서 생성 (커스텀 크기) ---
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: [pdfTotalWidthPt, pdfTotalHeightPt]
    });

    // --- 배경색 그리기 ---
    
    // 페이지 크기 가져오기
    const actualPageWidth = doc.internal.pageSize.getWidth();
    const actualPageHeight = doc.internal.pageSize.getHeight();
    
    doc.setFillColor(0, 0, 0); // 채우기 색상을 검은색(0, 0, 0)으로 설정
    // (0, 0) 위치에서 '실제 페이지 크기'만큼 채워진 사각형('F')을 그림
    doc.rect(0, 0, actualPageWidth, actualPageHeight, 'F');

    // --- 텍스트 그리기 ---
    
    // 고정폭 글꼴 및 계산된 크기 설정
    doc.setFont('courier', 'normal');
    doc.setFontSize(pdfCharHeightPt);

    // 여백이 없으므로 (0, 0)에서 그리기 시작
    const startX = 0;
    const startY = 0;

    asciiData.forEach((rowData, y) => {
      rowData.forEach((cell, x) => {
        // 'rgb(r, g, b)' 형식에서 숫자 파싱
        const colorMatch = cell.color.match(/\d+/g);
        if (colorMatch) {
          const [r, g, b] = colorMatch.map(Number);
          doc.setTextColor(r, g, b); // 텍스트 색상 설정

          // (0, 0) 기준 좌표 계산
          const drawX = startX + (x * pdfCharWidthPt);
          // jsPDF의 y 좌표는 텍스트 '베이스라인' 기준이므로 (높이)를 더해줌
          const drawY = startY + (y * pdfCharHeightPt) + pdfCharHeightPt;

          doc.text(cell.char, drawX, drawY);
        }
      });
    });

    // --- 파일 저장 ---
    doc.save(`ascii-art-${artDimensions.w}x${artDimensions.h}.pdf`);

  }, [asciiData, artDimensions]);

  return (
    <button
      onClick={downloadAsPdf}
      disabled={disabled}
      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      title="현재 해상도의 ASCII 아트를 벡터 PDF 파일로 다운로드합니다."
    >
      PDF
    </button>
  );
}