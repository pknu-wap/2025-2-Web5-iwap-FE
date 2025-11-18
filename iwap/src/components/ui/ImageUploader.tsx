// src/components/ui/ImageUploader.tsx
"use client";

import { DragEvent, ChangeEvent, useState } from "react";
import Image from "next/image";

const UploadIcon = () => (
  <svg className="w-10 h-10 mb-3 text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
  </svg>
);

interface ImageUploaderProps {
  id: string;
  onFileSelect: (file: File | null) => void;
  previewUrl: string | null;
  title?: string;
  subtitle?: string;
}

export default function ImageUploader({
  id,
  onFileSelect,
  previewUrl,
  title = "이미지를 드래그 앤 드롭",
  subtitle = "또는 클릭하여 업로드",
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileValidation = (file: File | null, inputToClear?: HTMLInputElement) => {
    const allowedExtensions = [".jpeg", ".jpg", ".png"];
    if (file) {
      const lastDot = file.name.lastIndexOf(".");
      const fileExtension = lastDot === -1 ? "" : file.name.substring(lastDot).toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        alert("jpeg, jpg, png 형식의 파일만 업로드 가능합니다.");
        if (inputToClear) {
          inputToClear.value = "";
        }
        onFileSelect(null);
        return;
      }
    }
    onFileSelect(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileValidation(e.target.files?.[0] || null, e.target);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileValidation(e.dataTransfer.files?.[0] || null);
  };

  return (
    // [수정] 기존 ImageUploader의 점선 및 호버 효과를 다시 적용합니다.
    // - `border-dashed`를 추가합니다.
    // - `isDragging` 상태가 아닐 때, 기본 `border-gray-300`과 `hover:border-blue-400`을 적용합니다.
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center w-full h-full cursor-pointer bg-white transition-colors border-2 border-dashed ${
        isDragging ? "border-blue-500" : "border-gray-300 hover:border-blue-400"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById(id)?.click()}
    >
      <input
        type="file"
        id={id}
        className="hidden"
        accept=".jpeg,.jpg,.png"
        onChange={handleFileChange}
      />
      {previewUrl ? (
        <div className="relative w-full h-full">
          <Image
            src={previewUrl}
            alt="업로드 미리보기"
            fill
            className="object-contain"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center text-center text-gray-500">
          <UploadIcon />
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-2 text-sm">{subtitle}</p>
        </div>
      )}
    </div>
  );
}