"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import FacialSlider from "./FacialSlider";
import { useTheme } from "@/components/theme/ThemeProvider";

// API 명세에 따른 키와 라벨 매핑
const FEATURE_CONFIG = [
  { key: "young", label: "나이" },
  { key: "male", label: "성별" },
  { key: "smiling", label: "미소" },
  { key: "pale_skin", label: "피부" },
  { key: "eyeglasses", label: "안경" },
  { key: "mustache", label: "수염" },
  { key: "wearing_lipstick", label: "화장" },
];

export default function FacialEditor() {
  const { theme } = useTheme();
  // API 키를 기반으로 초기 상태 생성 (모두 0.0)
  const [featureValues, setFeatureValues] = useState<Record<string, number>>(
    FEATURE_CONFIG.reduce((acc, cur) => ({ ...acc, [cur.key]: 0.0 }), {})
  );

  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchImage = useCallback(async (currentValues: Record<string, number>) => {
    const queryParams = new URLSearchParams();
    Object.entries(currentValues).forEach(([key, value]) => {
      queryParams.append(key, value.toString());
    });

    try {
      const response = await fetch(`/api/facial?${queryParams.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Image processing failed");
      }

      const newImageBlob = await response.blob();
      const newImageUrl = URL.createObjectURL(newImageBlob);

      setProcessedImageUrl((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return newImageUrl;
      });
    } catch (error) {
      console.error("Error updating image:", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  // 초기 이미지 로드
  useEffect(() => {
    fetchImage(featureValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSliderChange = (key: string, value: number) => {
    setFeatureValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSliderChangeEnd = (key: string, value: number) => {
    const newValues = { ...featureValues, [key]: value };
    fetchImage(newValues);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center relative gap-2 md:gap-6">
      <div className="relative w-full max-h-[calc(100dvh-320px)] aspect-square flex items-center justify-center">
        {isInitialLoading && !processedImageUrl ? (
          <LoadingIndicator text="이미지 준비 중..." className={theme === 'dark' ? 'text-white' : 'text-zinc-900'} />
        ) : processedImageUrl ? (
          <Image 
            src={processedImageUrl} 
            alt="Processed image" 
            fill 
            className="object-contain" 
            unoptimized 
          />
        ) : null}
      </div>
      
      {/* 슬라이더 컨테이너: 가로 배치, 수직 슬라이더 */}
      <div className="w-full p-2 bg-white/40 border border-white backdrop-blur-sm shrink-0 flex justify-between items-end gap-1">
        {FEATURE_CONFIG.map((feature) => (
          <div key={feature.key} className="flex flex-col items-center gap-2 text-white h-32 flex-1 min-w-0">
            <span className="text-xs font-semibold truncate w-full text-center">{feature.label}</span>
            <div className="flex-1 py-1 w-full flex justify-center">
              <FacialSlider
                value={featureValues[feature.key]}
                min={-1}
                max={1}
                vertical={true}
                onChange={(value) => handleSliderChange(feature.key, value)}
                onChangeEnd={(value) => handleSliderChangeEnd(feature.key, value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}