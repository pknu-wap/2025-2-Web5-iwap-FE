// src/components/ascii/AsciiArtProcessor.tsx
import React from 'react';

// --- Constants ---
const ASCII_CHARS = ' `^\',.:;-_Il!i~+<>()[]{}|\\/│─tfjrxnuczXYUJCLQ0OZmwqpdbkhao·○1?*±=≤≥×÷≈√ΣΠΩΔδ∞YV#MW&8%B@$┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬░▒▓';
const CHAR_WIDTH_PX = 5;
const CHAR_HEIGHT_PX = 7;
const FONT_SIZE_PX = 7;

// --- Shared Types ---
// 이 타입들은 page.tsx와 AsciiArtDisplay.tsx에서 모두 사용됩니다.
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };

export type AsciiResult = {
  art: React.ReactNode | null;
  data: AsciiCell[][] | null;
  dims: ArtDimensions;
  initialResolution: number;
};


// --- Core Image Processing Logic ---
export const processImageToAscii = (
  canvas: HTMLCanvasElement,
  imageSrc: string,
  maxWidth: number
): Promise<Omit<AsciiResult, 'initialResolution'>> => {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error("Failed to get canvas context."));

    const img = new Image();
    img.onload = () => {
      const charAspectRatio = CHAR_WIDTH_PX / CHAR_HEIGHT_PX;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvasWidth = Math.floor(img.width * scale);
      const canvasHeight = Math.floor((img.height * scale) / (1 / charAspectRatio));
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imageData.data;
      const generatedData: AsciiCell[][] = [];
      const artLines: React.ReactNode[] = [];

      for (let y = 0; y < canvasHeight; y++) {
        const rowData: AsciiCell[] = [];
        const lineChars: React.ReactNode[] = [];
        for (let x = 0; x < canvasWidth; x++) {
          const i = (y * canvasWidth + x) * 4;
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          const gray = 0.21 * r + 0.72 * g + 0.07 * b;
          const char = ASCII_CHARS[Math.floor((gray / 255) * (ASCII_CHARS.length - 1))] || ' ';
          const color = `rgb(${r},${g},${b})`;
          rowData.push({ char, color });
          lineChars.push(
            <span key={x} style={{ color, width: `${CHAR_WIDTH_PX}px`, fontSize: `${FONT_SIZE_PX}px`, display: 'inline-block', textAlign: 'center' }}>
              {char}
            </span>
          );
        }
        generatedData.push(rowData);
        artLines.push(<div key={y} style={{ height: `${CHAR_HEIGHT_PX}px`, lineHeight: `${CHAR_HEIGHT_PX}px`, whiteSpace: 'nowrap' }}>{lineChars}</div>);
      }
      resolve({ art: <>{artLines}</>, data: generatedData, dims: { w: canvasWidth, h: canvasHeight } });
    };
    img.onerror = () => reject(new Error("Image failed to load."));
    img.src = imageSrc;
  });
};