// src/components/ascii/AsciiArtProcessor.tsx
import React from 'react';

// --- Constants ---
// 이 상수들은 이제 렌더링 로직에서만 사용됩니다.
const CHAR_WIDTH_PX = 5;
const CHAR_HEIGHT_PX = 7;
const FONT_SIZE_PX = 7;

// --- Shared Types ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };

export type AsciiResult = {
  art: React.ReactNode | null;
  data: AsciiCell[][] | null;
  dims: ArtDimensions;
  initialResolution: number;
};

// --- React 엘리먼트 생성 로직 (메인 스레드에서 실행) ---
// 데이터 처리와 렌더링 로직을 분리합니다.
export const createAsciiArtFromData = (data: AsciiCell[][]): React.ReactNode => {
  const artLines = data.map((rowData, y) => {
    const lineChars = rowData.map((cell, x) => (
      <span
        key={x}
        style={{
          color: cell.color,
          width: `${CHAR_WIDTH_PX}px`,
          fontSize: `${FONT_SIZE_PX}px`,
          display: 'inline-block',
          textAlign: 'center',
        }}
      >
        {cell.char}
      </span>
    ));
    return (
      <div
        key={y}
        style={{
          height: `${CHAR_HEIGHT_PX}px`,
          lineHeight: `${CHAR_HEIGHT_PX}px`,
          whiteSpace: 'nowrap',
        }}
      >
        {lineChars}
      </div>
    );
  });
  return <>{artLines}</>;
};

// --- 웹 워커를 사용하는 새로운 이미지 처리 함수 ---
export const processImageToAsciiWithWorker = (
  imageSrc: string,
  maxWidth: number
): Promise<Omit<AsciiResult, 'art' | 'initialResolution'>> => {
  return new Promise((resolve, reject) => {
    // Next.js 환경에서는 URL 객체를 사용하여 워커 경로를 지정해야 합니다.
    const worker = new Worker(new URL('ascii.worker.ts', import.meta.url));

    worker.onmessage = (e: MessageEvent) => {
      const { status, data, dims, message } = e.data;
      if (status === 'success') {
        resolve({ data, dims });
      } else {
        reject(new Error(message));
      }
      worker.terminate(); // 작업 완료 후 워커 종료
    };

    worker.onerror = (e: ErrorEvent) => {
      reject(new Error(`Worker error: ${e.message}`));
      worker.terminate(); // 에러 발생 시 워커 종료
    };
    
    // 워커에 작업을 요청합니다.
    worker.postMessage({ imageSrc, maxWidth });
  });
};