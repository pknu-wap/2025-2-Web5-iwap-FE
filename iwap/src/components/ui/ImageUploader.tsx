// components/ui/ImageUploader.tsx
"use client";

import { DragEvent, ChangeEvent, useState } from "react";
import Image from "next/image";

// 업로드 아이콘 SVG 컴포넌트
const UploadIcon = () => (
  <svg
    className="w-10 h-10 mb-3 text-gray-400"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 20 16"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
    />
  </svg>
);

// 컴포넌트가 받을 Props 정의
interface ImageUploaderProps {
  id: string;
  onFileSelect: (file: File | null) => void;
  previewUrl: string | null;
  title?: string;
  subtitle?: string;
}

/**
 * 재사용 가능한 이미지 드래그 앤 드롭 업로드 컴포넌트.
 * 파일 상태와 미리보기 URL 생성 로직은 부모 컴포넌트에서 관리합니다.
 */
export default function ImageUploader({
  id,
  onFileSelect,
  previewUrl,
  title = "이미지를 드래그 앤 드롭",
  subtitle = "또는 클릭하여 업로드",
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelectInternal = (selectedFile: File | null) => {
    onFileSelect(selectedFile);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelectInternal(e.target.files?.[0] || null);
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
    handleFileSelectInternal(e.dataTransfer.files?.[0] || null);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 transition-colors ${
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
        accept="image/*"
        onChange={handleFileChange}
      />
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt="업로드 미리보기"
          className="object-contain w-40 h-40 rounded-md"
          width={160}
          height={160}
        />
      ) : (
        // [수정] 아이콘과 텍스트를 감싸는 div에 flex 속성을 추가하여 내용물을 명확하게 중앙 정렬합니다.
        <div className="flex flex-col items-center text-center text-gray-500">
          <UploadIcon />
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-2 text-sm">{subtitle}</p>
        </div>
      )}
    </div>
  );
}