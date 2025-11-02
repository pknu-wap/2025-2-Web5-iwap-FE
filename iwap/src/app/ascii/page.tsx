// src/app/ascii/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ImageUploader from '@/components/ui/ImageUploader';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import AsciiArtDisplay from '@/components/ascii/AsciiArtDisplay';
import TrashIcon from '@/components/ui/icons/TrashIcon';
import SubmitIcon from '@/components/ui/icons/SubmitIcon';

// [수정] 웹 워커 기반의 함수들과 타입을 import 합니다.
import {
  processImageToAsciiWithWorker,
  createAsciiArtFromData,
  AsciiResult,
} from '@/components/ascii/AsciiArtProcessor';

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

  // [제거] hiddenCanvasRef는 더 이상 필요하지 않습니다.
  // const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setHasMounted(true); }, []);

  const handleConversion = useCallback(async () => {
    // [수정] canvas ref 체크 로직 제거
    if (!sourceImage) return;

    const imageUrl = URL.createObjectURL(sourceImage);
    try {
      // [수정] 웹 워커를 호출하여 데이터만 먼저 받습니다.
      const { data, dims } = await processImageToAsciiWithWorker(imageUrl, resolution);
      
      if (!data) {
        // 워커가 성공 메시지를 보냈다면 이 경우는 발생하지 않아야 하지만,
        // 타입 안정성을 위해 에러 처리를 해줍니다.
        throw new Error("Worker returned success status but no data.");
      }
      
      const art = createAsciiArtFromData(data);
      
      // [수정] 최종 결과를 상태에 저장합니다.
      setAsciiResult({ art, data, dims, initialResolution: resolution });
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
    backgroundImage: `linear-gradient(to bottom, rgba(214, 211, 209, 0), #d6d3d1), url('/images/ascii_background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (!hasMounted) return null;

  const renderContent = () => {
    // ... (이 부분의 코드는 변경 사항 없음)
    switch (view) {
      case 'loading':
        return <LoadingIndicator text="변환 중..." />;
      case 'upload':
        return (
          <div className="absolute inset-0 flex flex-col">
            <div className="w-full h-6 md:h-9 bg-stone-300 flex justify-between items-center mb-[-1px] flex-shrink-0">
              <div className="flex gap-3 pl-3">
                <button onClick={() => handleFileSelect(null)} disabled={!previewUrl} className="disabled:opacity-40 scale-[0.7] md:scale-100"><TrashIcon /></button>
              </div>
              <div className="flex gap-3 pr-3">
                <button onClick={handleConversionStart} disabled={!previewUrl} className="scale-[0.7] md:scale-100"><SubmitIcon /></button>
              </div>
            </div>
            <div className="w-full flex-grow relative">
              <ImageUploader
                id="ascii-image-upload"
                onFileSelect={handleFileSelect}
                previewUrl={previewUrl}
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
        <div className="w-[90%] md:w-full h-[90%] md:h-full translate-x-5 md:translate-x-0 flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-full h-full pt-[100px]">
              <PageHeader title="ASCi!" subtitle="이미지를 텍스트로 표현" goBack={true} padding='p-0' />
              <div className="w-full h-full bg-white/40 border border-white backdrop-blur-[2px] p-[8%] grid grid-rows-[auto_1fr] gap-y-1">
                <h3 className="font-semibold text-white flex-shrink-0 -translate-y-3 -translate-x-3" style={{ fontSize: 'clamp(1rem, 3.5vmin, 1.5rem)' }}>
                  이미지를 업로드하세요
                </h3>
                <div className="relative min-h-0 md:scale-[1] scale-[1.1]">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* [제거] hiddenCanvasRef와 canvas 엘리먼트는 더 이상 필요하지 않습니다. */}
    </div>
  );
}