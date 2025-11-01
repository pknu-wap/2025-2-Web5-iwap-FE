// src/components/string/StringArtDisplay.tsx
'use client';

import React, { useRef, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Point } from './StringArtProcessor';

interface StringArtDisplayProps {
  coordinates: Point[];
  onClose: () => void;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;

export default function StringArtDisplay({ coordinates, onClose }: StringArtDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (coordinates && coordinates.length > 1 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;

      ctx.beginPath();
      ctx.moveTo(coordinates[0][0], coordinates[0][1]);
      for (let i = 1; i < coordinates.length; i++) {
        const [x, y] = coordinates[i];
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, [coordinates]);

  const backgroundStyle = {
    backgroundImage: "url('/images/string_background.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  return (
    <div className="w-full h-full" style={backgroundStyle}>
      <div className="w-full h-full flex flex-col p-4 sm:p-8">
        
        <PageHeader
          title="Str!ng"
          subtitle="선들로 이미지를 표현"
          onClose={onClose}
          isAbsolute={false}
          padding="p-0 pb-4"
        />

        <div className="flex-1 w-full grid place-items-center overflow-hidden min-h-0">
          {/* 캔버스를 감싸는 div에 스타일을 적용하여 흰색 배경과 그림자 효과를 줍니다. */}
          <div className="bg-white p-2 shadow-lg">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>

        {/* String 아트는 별도의 컨트롤러가 없으므로 하단부는 비워둡니다. */}
        <div className="flex-shrink-0 w-full max-w-2xl mx-auto mt-4 h-[62px]"></div>
      </div>
    </div>
  );
}