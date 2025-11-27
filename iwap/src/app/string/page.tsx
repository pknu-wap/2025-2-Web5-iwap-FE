"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ImageUploader, { ImageUploaderHandles } from "@/components/ui/ImageUploader";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import StringArtDisplay from "@/components/string/StringArtDisplay";
import UndoIcon from "@/components/ui/icons/UndoIcon";
import SubmitIcon from "@/components/ui/icons/SubmitIcon";
import { ProjectIntroModal } from "@/components/sections/ProjectIntroSections";
import { useTheme } from "@/components/theme/ThemeProvider";

import { processImageToStringArt } from "@/components/string/StringArtProcessor";

export default function StringArtPage() {
  const { theme } = useTheme();
  const [hasMounted, setHasMounted] = useState(false);
  const [view, setView] = useState<'upload' | 'loading' | 'visualize'>('upload');
  const [error, setError] = useState<string | null>(null);

  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [coordinates, setCoordinates] = useState<number[] | null>(null);
  const [colorImageUrl, setColorImageUrl] = useState<string | null>(null);
  const [nailCount, setNailCount] = useState<number>(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const imageUploaderRef = useRef<ImageUploaderHandles>(null);
  const [loadingMessage, setLoadingMessage] = useState("변환 중... (약 2분 소요)");

  useEffect(() => { setHasMounted(true); }, []);

  useEffect(() => {
    if (view !== 'loading') return;

    let elapsed = 0;
    let currentTimeText = "약 2분 소요";
    setLoadingMessage(`변환 중 (${currentTimeText}).`);

    const interval = setInterval(() => {
      elapsed += 1;
      const remaining = 120 - elapsed;

      if (remaining === 90) {
        currentTimeText = "약 1분 30초 소요";
      } else if (remaining === 60) {
        currentTimeText = "약 1분 소요";
      } else if (remaining === 30) {
        currentTimeText = "약 30초 소요";
      } else if (remaining === 15) {
        currentTimeText = "곧 완료됩니다";
      }

      const dots = ".".repeat((elapsed % 3) + 1);
      setLoadingMessage(`변환 중 (${currentTimeText})${dots}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [view]);

  const handleConversion = useCallback(async () => {
    if (!sourceImage) return;

    setView('loading');
    try {
      const { coordinates, colorImageUrl, nailCount } = await processImageToStringArt(
        sourceImage
      );
      setCoordinates(coordinates);
      setColorImageUrl(colorImageUrl);
      setNailCount(nailCount);
      setView('visualize');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setView('upload');
    }
  }, [sourceImage]); 

  const handleFileSelect = useCallback((file: File | null) => {
    setError(null);
    setCoordinates(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (colorImageUrl) {
        URL.revokeObjectURL(colorImageUrl);
        setColorImageUrl(null);
    }

    if (file) {
      setSourceImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSourceImage(null);
      setPreviewUrl(null);
    }
  }, [previewUrl, colorImageUrl]);

  // --- Styles ---
  const pageBackgroundStyle = {
    backgroundImage: theme === 'dark'
      ? `linear-gradient(to bottom, rgba(98, 144, 153, 0), rgba(98, 144, 153, 0.5)), url('/images/bg-dark/string_dark.webp')`
      : `linear-gradient(to bottom, rgba(98, 144, 153, 0), rgba(98, 144, 153, 0.5)), url('/images/bg-light/string_light.webp')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (!hasMounted) return null;

  const renderContent = () => {
    if (view === 'loading') {
      return (
        <div className="relative w-full h-full">
          <LoadingIndicator text={loadingMessage} className={theme === 'dark' ? 'text-white' : 'text-zinc-900'} />
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              onClick={() => window.open('/slides', '_blank')}
              className={`
                pointer-events-auto
                w-auto h-auto
                px-6 py-3
                md:px-8 md:py-4
                rounded-full
                border border-gray-600
                bg-white/30 backdrop-blur-[4px]
                flex flex-col items-center justify-center
                text-center
                cursor-pointer
                transition
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-white
                animate-shadow-pulse
                mt-32
              `}
            >
              <span className="text-black text-[16px] md:text-[20px] font-semibold">
                다른 프로젝트 탐색하고 오기
              </span>
            </button>
          </div>
        </div>
      );
    }
    // 'upload' view
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
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
              <UndoIcon />
            </button>
          </div>
          <div className="flex gap-3 pr-3">
            <button
              onClick={() => {
                if (isCameraOpen) {
                  imageUploaderRef.current?.handleCapture();
                } else {
                  handleConversion();
                }
              }}
              disabled={!previewUrl && !isCameraOpen}
              className="scale-[0.7] md:scale-100"
            >
              <SubmitIcon />
            </button>
          </div>
        </div>
        <div className="w-full grow relative">
          <ImageUploader
            ref={imageUploaderRef}
            id="string-art-uploader"
            onFileSelect={handleFileSelect}
            previewUrl={previewUrl}
            onCameraStateChange={setIsCameraOpen}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <ProjectIntroModal
        projects={["string"]}
        open={showIntro}
        onClose={() => setShowIntro(false)}
      />
      <div className={`relative w-full h-dvh md:h-[calc(100dvh-60px)] ${theme === 'dark' ? 'text-white' : 'text-black'}`} style={pageBackgroundStyle}>
      {error && (
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-red-500 bg-black/50 p-2 rounded z-30 text-center">
          {error}
        </p>
      )}

      {view === 'visualize' && coordinates ? (
        <StringArtDisplay
          coordinates={coordinates}
          colorImageUrl={colorImageUrl}
          nailCount={nailCount}
          onClose={() => {
            handleFileSelect(null);
            setView('upload');
          }}
        />
      ) : (
        <div className="w-[90%] md:w-full h-[90%] md:h-full translate-x-5 md:translate-x-0 flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-5/6 relative">
            <div className="w-full h-full pt-[100px]">
              <PageHeader 
                title="Str!ng" 
                subtitle="선들로 이미지를 표현" 
                goBack={true} 
                padding='p-0' 
                darkBackground={theme === 'dark'}
              />
              <div className="w-full h-full bg-white/40 border border-white backdrop-blur-[2px] p-[8%] grid grid-rows-[auto_1fr] gap-y-1">
                <h3 
                  className="font-semibold shrink-0" 
                  style={{ fontSize: 'clamp(1rem, 3.5vmin, 1.5rem)' }}
                >
                  이미지를 업로드하세요
                </h3>
                <div className="relative min-h-0 w-full h-full">
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
