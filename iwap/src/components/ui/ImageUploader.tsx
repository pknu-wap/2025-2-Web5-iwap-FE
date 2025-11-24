// src/components/ui/ImageUploader.tsx
"use client";

import { DragEvent, ChangeEvent, useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import Image from "next/image";

const UploadIcon = () => (
  <svg className="w-10 h-10 mb-3 text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-8 h-8 text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export interface ImageUploaderHandles {
  handleCapture: () => void;
  closeCamera: () => void;
}

interface ImageUploaderProps {
  id: string;
  onFileSelect: (file: File | null) => void;
  previewUrl: string | null;
  title?: string;
  subtitle?: string;
  onCameraStateChange?: (isOpen: boolean) => void;
}

const ImageUploader = forwardRef<ImageUploaderHandles, ImageUploaderProps>(
  (
    {
      id,
      onFileSelect,
      previewUrl,
      title = "이미지를 드래그 앤 드롭",
      subtitle = "또는 클릭하여 업로드",
      onCameraStateChange,
    },
    ref,
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

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

    const closeCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsCameraOpen(false);
      onCameraStateChange?.(false);
    }, [onCameraStateChange]);

    useEffect(() => {
      if (isCameraOpen) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
              streamRef.current = stream;
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
              }
            })
            .catch((err) => {
              console.error("Camera access error:", err);
              alert("카메라에 접근할 수 없습니다. 권한을 확인해주세요.");
              closeCamera();
            });
        } else {
          alert("이 브라우저에서는 카메라 기능을 지원하지 않습니다.");
          closeCamera();
        }
      }
      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };
    }, [isCameraOpen, closeCamera]);

    const openCamera = () => {
      setIsCameraOpen(true);
      onCameraStateChange?.(true);
    };

    const handleCapture = () => {
      const video = videoRef.current;
      if (video) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `capture-${Date.now()}.png`, {
                type: "image/png",
              });
              handleFileValidation(file);
            }
          }, "image/png");
        }
        closeCamera();
      }
    };

    useImperativeHandle(ref, () => ({
      handleCapture,
      closeCamera,
    }));

    return (
      <div
        className={`relative inset-0 flex flex-col items-center justify-center w-full h-full cursor-pointer bg-white transition-colors border-2 border-dashed ${
          isDragging ? "border-blue-500" : "border-gray-300 hover:border-blue-400"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isCameraOpen && document.getElementById(id)?.click()}
      >
        <input type="file" id={id} className="hidden" accept=".jpeg,.jpg,.png" onChange={handleFileChange} />
        {isCameraOpen ? (
          <div className="relative w-full h-full">
            <video ref={videoRef} autoPlay playsInline className="object-cover w-full h-full" />
          </div>
        ) : previewUrl ? (
          <div className="relative w-full h-full">
            <Image src={previewUrl} alt="업로드 미리보기" fill className="object-contain" />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center text-gray-500">
            <UploadIcon />
            <p className="text-lg font-semibold">{title}</p>
            <p className="mt-2 text-sm">{subtitle}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCamera();
              }}
              className="p-2 mt-2 rounded-full hover:bg-gray-200"
            >
              <CameraIcon />
            </button>
          </div>
        )}
      </div>
    );
  },
);

ImageUploader.displayName = "ImageUploader";
export default ImageUploader;