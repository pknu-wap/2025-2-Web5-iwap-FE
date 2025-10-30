// src/app/ascii/page.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ImageUploader from '@/components/ui/ImageUploader';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import AsciiArtDisplay from '@/components/ascii/AsciiArtDisplay';
import UndoIcon from '@/components/ui/icons/UndoIcon';
import SubmitIcon from '@/components/ui/icons/SubmitIcon';

// [수정] 핵심 로직과 타입을 별도의 파일에서 import 합니다.
import { processImageToAscii, AsciiResult } from '@/components/ascii/AsciiArtProcessor';

// --- Page Constants ---
const DEFAULT_RESOLUTION = 150;

// --- Page Controller Component ---
export default function AsciiPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [view, setView] = useState<'upload' | 'loading' | 'visualize'>('upload');
  const [error, setError] = useState<string | null>(null);

  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState<number>(DEFAULT_RESOLUTION);
  const [asciiResult, setAsciiResult] = useState<AsciiResult | null>(null);
  
  const [isReProcessing, setIsReProcessing] = useState(false);

  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setHasMounted(true); }, []);

  const handleConversion = useCallback(async () => {
    if (!sourceImage || !hiddenCanvasRef.current) return;

    const imageUrl = URL.createObjectURL(sourceImage);
    try {
      // [수정] import한 함수를 직접 호출합니다.
      const result = await processImageToAscii(hiddenCanvasRef.current, imageUrl, resolution);
      setAsciiResult({ ...result, initialResolution: resolution });
      setView('visualize');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setView('upload');
    } finally {
      URL.revokeObjectURL(imageUrl);
      setIsReProcessing(false);
    }
  }, [sourceImage, resolution]);

  useEffect(() => {
    if (view === 'loading' || isReProcessing) {
      handleConversion();
    }
  }, [view, isReProcessing, handleConversion]);

  const handleFileSelect = useCallback((file: File | null) => {
    setError(null);
    setAsciiResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (file) {
      setSourceImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResolution(DEFAULT_RESOLUTION);
    } else {
      setSourceImage(null);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleConversionStart = () => {
    if (!sourceImage) {
      setError("Please select an image first.");
      return;
    }
    setView('loading');
  };

  const handleReturnToUpload = useCallback(() => {
    handleFileSelect(null);
    setView('upload');
  }, [handleFileSelect]);

  const handleResolutionChange = (newResolution: number) => {
    setResolution(newResolution);
    setIsReProcessing(true);
  };

  const pageBackgroundStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113), url('/images/ascii_background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (!hasMounted) return null;

  const renderContent = () => {
    switch (view) {
      case 'loading':
        return <LoadingIndicator text="변환 중..." />;
      case 'upload':
        return (
          <div className="absolute inset-0 flex flex-col">
            <div className="w-full h-9 bg-stone-300 flex justify-between items-center mb-[-1px] flex-shrink-0">
              <div className="flex gap-3 pl-3">
                <button onClick={() => handleFileSelect(null)} disabled={!previewUrl} className="disabled:opacity-40"><UndoIcon /></button>
              </div>
              <div className="flex gap-3 pr-3">
                <button onClick={handleConversionStart} disabled={!previewUrl}><SubmitIcon /></button>
              </div>
            </div>
            <div className="w-full flex-grow relative">
              <ImageUploader
                id="ascii-image-upload"
                onFileSelect={handleFileSelect}
                previewUrl={previewUrl}
                title="이미지 선택"
                subtitle="파일을 드래그하거나 클릭하여 선택"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]" style={pageBackgroundStyle}>
      {error && (
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-red-500 bg-black/50 p-2 rounded z-30 text-center">
          {error}
        </p>
      )}

      {view === 'visualize' && asciiResult ? (
        <AsciiArtDisplay
          asciiResult={asciiResult}
          onClose={handleReturnToUpload}
          onResolutionChange={handleResolutionChange}
          isProcessing={isReProcessing}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-full h-full pt-[100px]">
              <PageHeader title="ASCi!" subtitle="이미지를 텍스트로 표현" goBack={true} padding='p-0' />
              <div className="w-full h-full bg-white/40 border border-white backdrop-blur-[2px] p-[8%] grid grid-rows-[auto_1fr] gap-y-1">
                <h3 className="font-semibold text-white flex-shrink-0" style={{ fontSize: 'clamp(1rem, 3.5vmin, 1.5rem)' }}>
                  이미지를 업로드하세요
                </h3>
                <div className="relative min-h-0">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}