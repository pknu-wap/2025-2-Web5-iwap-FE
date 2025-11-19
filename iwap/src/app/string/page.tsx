"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ImageUploader from "@/components/ui/ImageUploader";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import StringArtDisplay from "@/components/string/StringArtDisplay";
import UndoIcon from "@/components/ui/icons/UndoIcon";
import SubmitIcon from "@/components/ui/icons/SubmitIcon";
import { processImageToStringArt } from "@/components/string/StringArtProcessor";

export default function StringArtPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [view, setView] = useState<'upload' | 'loading' | 'visualize'>('upload');
  const [error, setError] = useState<string | null>(null);

  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<number[] | null>(null);
  const [colorImageUrl, setColorImageUrl] = useState<string | null>(null);
  const [nailCount, setNailCount] = useState<number>(0);

  useEffect(() => { setHasMounted(true); }, []);

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

  const pageBackgroundStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(13, 17, 19, 0), #98B9C2), url('/images/string_background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (!hasMounted) return null;

  const renderContent = () => {
    if (view === 'loading') {
      return <LoadingIndicator text="변환 중..." />;
    }
    // 'upload' view
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-full md:6 md:h-9 bg-stone-300 flex justify-between items-center mb-[-1px] flex-shrink-0">
          <div className="flex gap-3 pl-3">
            <button onClick={() => handleFileSelect(null)} disabled={!previewUrl} className="disabled:opacity-40 scale-[0.7] md:scale-100"><UndoIcon /></button>
          </div>
          <div className="flex gap-3 pr-3">
            <button onClick={handleConversion} disabled={!previewUrl} className="scale-[0.7] md:scale-100"><SubmitIcon /></button>
          </div>
        </div>
        <div className="w-full flex-grow relative">
          <ImageUploader
            id="string-art-uploader"
            onFileSelect={handleFileSelect}
            previewUrl={previewUrl}
            title="이미지 선택"
            subtitle="파일을 드래그하거나 클릭하여 선택"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]" style={pageBackgroundStyle}>
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
        <div className="w-full h-full flex translate-x-5 md:translate-x-0 items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-[90%] md:w-full h-[90%] md:h-full pt-[100px]">
              <PageHeader title="Str!ng" subtitle="선들로 이미지를 표현" goBack={true} padding='p-0' closeButtonClassName="-translate-x-6 md:translate-x-0"/>
              <div className="w-full h-full bg-white/40 border border-white backdrop-blur-[2px] p-[8%] grid grid-rows-[auto_1fr] gap-y-1">
                <h3 className="-translate-y-3 -translate-x-3 md:translate-y-0 md:-translate-x-0 font-semibold text-white flex-shrink-0" style={{ fontSize: 'clamp(1rem, 3.5vmin, 1.5rem)' }}>
                  이미지를 업로드하세요
                </h3>
                <div className="relative min-h-0 min-h-0 scale-[1.1] md:scale-[1]">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}