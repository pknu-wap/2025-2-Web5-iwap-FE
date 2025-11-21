// src/components/variation/VariationEditor.tsx
"use client";

import { useState, useEffect, useCallback, FC } from "react";
import Image from "next/image";
import { debounce } from "lodash";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

interface FeatureSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const FeatureSlider: FC<FeatureSliderProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center gap-4 text-white">
      <label className="w-24 shrink-0">{label}</label>
      <input
        type="range"
        min="-10"
        max="10"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer"
      />
      <span className="w-12 text-center">{value.toFixed(1)}</span>
    </div>
  );
};

interface VariationEditorProps {
  sourceImage: File;
  onClose: () => void;
}

export default function VariationEditor({ sourceImage, onClose }: VariationEditorProps) {
  const [sliderValues, setSliderValues] = useState(Array(7).fill(0.0));
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sourceImage) {
      const url = URL.createObjectURL(sourceImage);
      setProcessedImageUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [sourceImage]);

  const sendSliderValuesToBackend = useCallback(
    debounce(async (values: number[]) => {
      if (!sourceImage) return;
      setIsLoading(true);

      const formData = new FormData();
      formData.append("image", sourceImage);
      values.forEach((value, index) => {
        formData.append(`value_${index}`, value.toString());
      });

      try {
        const response = await fetch("/api/variation", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Image processing failed");
        }

        const newImageBlob = await response.blob();
        const newImageUrl = URL.createObjectURL(newImageBlob);

        if (processedImageUrl && processedImageUrl.startsWith("blob:")) {
          URL.revokeObjectURL(processedImageUrl);
        }

        setProcessedImageUrl(newImageUrl);
      } catch (error) {
        console.error("Error updating image:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [sourceImage, processedImageUrl],
  );

  const handleSliderChange = (index: number, value: number) => {
    const newValues = [...sliderValues];
    newValues[index] = value;
    setSliderValues(newValues);
    sendSliderValuesToBackend(newValues);
  };

  const sliderLabels = ["나이", "성별", "헤어스타일", "표정", "안경", "화장", "인종"];

  if (!processedImageUrl) {
    return <LoadingIndicator text="이미지 로딩 중..." />;
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-4">
      <div className="relative w-full aspect-square max-w-lg">
        {isLoading && <LoadingIndicator text="변환 중..." />}
        <Image src={processedImageUrl} alt="Processed image" fill className="object-contain rounded-md" />
      </div>
      <div className="w-full max-w-lg p-4 space-y-3 bg-black/30 backdrop-blur-sm rounded-md">
        {sliderLabels.map((label, index) => (
          <FeatureSlider
            key={label}
            label={label}
            value={sliderValues[index]}
            onChange={(value) => handleSliderChange(index, value)}
          />
        ))}
      </div>
    </div>
  );
}