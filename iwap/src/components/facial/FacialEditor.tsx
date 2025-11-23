"use client";

import { useState, useEffect, useMemo, FC } from "react"; // useCallback 제거, useMemo 추가
import Image from "next/image";
import { debounce } from "lodash";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import UndoIcon from "@/components/ui/icons/UndoIcon"; // 아이콘이 없다면 텍스트로 대체 가능

// API 명세에 따른 키와 라벨 매핑
const FEATURE_CONFIG = [
  { key: "young", label: "나이 (Young)" },
  { key: "male", label: "성별 (Male)" },
  { key: "smiling", label: "미소 (Smiling)" },
  { key: "pale_skin", label: "피부톤 (Pale Skin)" },
  { key: "eyeglasses", label: "안경 (Glasses)" },
  { key: "mustache", label: "수염 (Mustache)" },
  { key: "wearing_lipstick", label: "화장 (Lipstick)" },
];

interface FeatureSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const FeatureSlider: FC<FeatureSliderProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center gap-4 text-white">
      <label className="w-32 shrink-0 text-sm">{label}</label>
      <input
        type="range"
        min="-5"
        max="5"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer"
      />
      <span className="w-12 text-center text-sm">{value.toFixed(1)}</span>
    </div>
  );
};

interface FacialEditorProps {
  sourceImage: File;
  onClose: () => void;
}

export default function FacialEditor({ sourceImage, onClose }: FacialEditorProps) {
  // API 키를 기반으로 초기 상태 생성 (모두 0.0)
  const [featureValues, setFeatureValues] = useState<Record<string, number>>(
    FEATURE_CONFIG.reduce((acc, cur) => ({ ...acc, [cur.key]: 0.0 }), {})
  );

  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 초기 이미지 설정
  useEffect(() => {
    if (sourceImage) {
      const url = URL.createObjectURL(sourceImage);
      setProcessedImageUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [sourceImage]);

  // [수정] useCallback 대신 useMemo 사용. 
  // debounce된 함수를 컴포넌트 생명주기 동안 한 번만 생성하여 유지.
  const debouncedUpdate = useMemo(
    () =>
      debounce(async (currentValues: Record<string, number>) => {
        setIsLoading(true);

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
          setIsLoading(false);
        }
      }, 500),
    []
  );

  // 컴포넌트 언마운트 시 debounce 취소 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  const handleSliderChange = (key: string, value: number) => {
    const newValues = { ...featureValues, [key]: value };
    setFeatureValues(newValues);
    debouncedUpdate(newValues);
  };

  if (!processedImageUrl) {
    return <LoadingIndicator text="이미지 준비 중..." />;
  }

return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-4 relative">
      {/* [수정] UndoIcon에 className을 직접 전달하지 않고 div로 감싸서 크기 조절 */}
      <div className="absolute top-4 left-4 z-10">
        <button 
          onClick={onClose}
          className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
          title="편집 취소 및 돌아가기"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <UndoIcon /> 
          </div>
        </button>
      </div>

      <div className="relative w-full aspect-square max-w-lg">
        {isLoading && <LoadingIndicator text="생성 중..." />}
        <Image 
          src={processedImageUrl} 
          alt="Processed image" 
          fill 
          className="object-contain rounded-md" 
          unoptimized 
        />
      </div>
      <div className="w-full max-w-lg p-4 space-y-3 bg-black/30 backdrop-blur-sm rounded-md max-h-[40vh] overflow-y-auto">
        {FEATURE_CONFIG.map((feature) => (
          <FeatureSlider
            key={feature.key}
            label={feature.label}
            value={featureValues[feature.key]}
            onChange={(value) => handleSliderChange(feature.key, value)}
          />
        ))}
      </div>
    </div>
  );
}