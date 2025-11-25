// src/app/ascii/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ImageUploader, { ImageUploaderHandles } from '@/components/ui/ImageUploader';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import AsciiArtDisplay from '@/components/ascii/AsciiArtDisplay';
import TrashIcon from '@/components/ui/icons/TrashIcon';
import SubmitIcon from '@/components/ui/icons/SubmitIcon';
import { ProjectIntroModal } from '@/components/sections/ProjectIntroSections';
import { useTheme } from "@/components/theme/ThemeProvider";

import {
  processImageToAsciiWithWorker,
  AsciiResult,
} from '@/components/ascii/AsciiArtProcessor';

// --- Page Constants ---
const DEFAULT_RESOLUTION = 100;

// --- Page Controller Component ---
export default function AsciiPage() {
  const { theme } = useTheme();
  // --- State Declarations ---
  const [hasMounted, setHasMounted] = useState(false);
  const [view, setView] = useState<'upload' | 'loading' | 'visualize'>('upload');
  const [error, setError] = useState<string | null>(null);

  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState<number>(DEFAULT_RESOLUTION);
  const [asciiResult, setAsciiResult] = useState<AsciiResult | null>(null);
  
  const [isReProcessing, setIsReProcessing] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const imageUploaderRef = useRef<ImageUploaderHandles>(null);

  // --- Callbacks & Event Handlers ---
  // [수정] useEffect보다 먼저 선언하여 '선언 전 사용' 오류를 해결합니다.
  const handleConversion = useCallback(async () => {
    if (!sourceImage) return;

    const imageUrl = URL.createObjectURL(sourceImage);
    try {
      const { data, dims } = await processImageToAsciiWithWorker(imageUrl, resolution);
      
      if (!data) {
        throw new Error("Worker returned success status but no data.");
      }
      
      setAsciiResult({ 
        art: null, 
        data: data, 
        dims: dims, 
        initialResolution: resolution 
      });

      setView('visualize');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setView('upload');
    } finally {
      URL.revokeObjectURL(imageUrl);
      setIsReProcessing(false);
    }
  }, [sourceImage, resolution]);

  // --- Effects ---
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (view === 'loading' || isReProcessing) {
      handleConversion();
    }
  }, [view, isReProcessing, handleConversion]);

  const handleFileSelect = useCallback((file: File | null) => {
    setError(null);
    setAsciiResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

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

  // --- Styles ---
  const pageBackgroundStyle = {
    backgroundImage: theme === 'dark'
      ? `url('/images/bg-dark/ascii_dark.jpg')`
      : `url('/images/bg-light/ascii_light.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (!hasMounted) {
    return null;
  }

  // --- Render Logic ---
  const renderContent = () => {
    switch (view) {
      case 'loading':
        return <LoadingIndicator text="변환 중..." />;
      
      case 'upload':
        return (
          <div className="absolute inset-0 flex flex-col">
            {/* [수정] Tailwind CSS 클래스를 표준에 맞게 수정합니다. */}
            <div className="w-full h-6 md:h-9 bg-stone-300 flex justify-between items-center -mb-px shrink-0">
              <div className="flex gap-3 pl-3">
                <button
                  onClick={() => {
                    if (isCameraOpen) {
                      imageUploaderRef.current?.closeCamera();
                    } else {
                      handleFileSelect(null);
                    }
                  }}
                  disabled={!previewUrl && !isCameraOpen}
                  className="disabled:opacity-40 scale-[0.7] md:scale-100"
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="flex gap-3 pr-3">
                <button
                  onClick={() => {
                    if (isCameraOpen) {
                      imageUploaderRef.current?.handleCapture();
                    } else {
                      handleConversionStart();
                    }
                  }}
                  disabled={!previewUrl && !isCameraOpen}
                  className="scale-[0.7] md:scale-100"
                >
                  <SubmitIcon />
                </button>
              </div>
            </div>
            {/* [수정] Tailwind CSS 클래스를 표준에 맞게 수정합니다. */}
            <div className="w-full grow relative">
              <ImageUploader
                ref={imageUploaderRef}
                id="ascii-image-upload"
                onFileSelect={handleFileSelect}
                previewUrl={previewUrl}
                onCameraStateChange={setIsCameraOpen}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col">
      <ProjectIntroModal
        projects={["ascii"]}
        open={showIntro}
        onClose={() => setShowIntro(false)}
      />
      <div 
        className="relative w-full h-dvh md:h-[calc(100dvh-60px)]" 
        style={pageBackgroundStyle}
      >
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
          previewUrl={previewUrl} // [수정] 이 prop을 추가합니다.
        />
      ) : (
        <div className="w-[90%] md:w-full h-[90%] md:h-full translate-x-5 md:translate-x-0 flex items-center justify-center p-4 sm:p-8">
          {/* [수정] Tailwind CSS 클래스를 표준에 맞게 수정합니다. */}
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-5/6 relative">
            <div className="w-full h-full pt-[100px]">
              <PageHeader 
                title="ASCi!" 
                subtitle="이미지를 텍스트로 표현" 
                goBack={true} 
                padding='p-0' 
                darkBackground={theme === 'dark'}
              />
              <div className="w-full h-full bg-white/40 border border-white backdrop-blur-[2px] p-[8%] grid grid-rows-[auto_1fr] gap-y-1">
                <h3 
                  // [수정] Tailwind CSS 클래스를 표준에 맞게 수정합니다.
                  className={`font-semibold shrink-0 -translate-y-3 -translate-x-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
                  style={{ fontSize: 'clamp(1rem, 3.5vmin, 1.5rem)' }}
                >
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
      </div>
    </div>
  );
}
