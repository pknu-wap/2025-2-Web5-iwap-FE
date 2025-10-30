// app/string/page.tsx

"use client";

import { useState, useRef, useEffect } from "react";

// [수정] 분리된 ImageUploader 컴포넌트를 가져옵니다.
import ImageUploader from "../../components/ui/ImageUploader"; // 경로 확인 필요

// 백엔드에서 받을 좌표의 타입 (예: [x, y])
type Point = [number, number];

// 백엔드 응답 데이터 구조 (가정)
interface ApiResponse {
  coordinates: Point[];
}

// 캔버스 크기 (백엔드와 좌표계를 맞춰야 함)
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;

export default function StringArtConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Point[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 파일이 변경될 때 상태 업데이트 및 미리보기 생성
  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setCoordinates(null); // 이전 결과 초기화

      // 이미지 미리보기 URL 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // 파일 선택이 취소된 경우
      setFile(null);
      setPreviewUrl(null);
    }
  };

  // [작업 목록] 백엔드 API로 이미지 전송
  const handleSubmit = async () => {
    if (!file) {
      setError("먼저 이미지를 업로드해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCoordinates(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/v1/string-art", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("이미지 변환에 실패했습니다.");
      }

      const data: ApiResponse = await res.json();

      if (!data.coordinates || data.coordinates.length === 0) {
        throw new Error("서버에서 유효한 좌표 데이터를 받지 못했습니다.");
      }

      setCoordinates(data.coordinates);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // [작업 목록] Canvas에 선 그리기
  useEffect(() => {
    if (coordinates && coordinates.length > 1 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // 캔버스 초기화
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 선 스타일
      ctx.strokeStyle = "black";
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;

      ctx.beginPath();
      ctx.moveTo(coordinates[0][0], coordinates[0][1]);

      for (let i = 1; i < coordinates.length; i++) {
        const [x, y] = coordinates[i];
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    }
  }, [coordinates]);

  return (
    <div className="w-full max-w-2xl p-6 mx-auto my-10 bg-white rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
        스트링 아트 변환기
      </h2>

      {/* 1. [수정] ImageUploader 컴포넌트 사용 */}
      <ImageUploader
        id="string-art-uploader"
        onFileSelect={handleFileSelect}
        previewUrl={previewUrl}
      />

      {file && (
        <p className="mt-2 text-sm text-center text-gray-600">
          선택된 파일: {file.name}
        </p>
      )}

      {/* 2. 변환 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!file || isLoading}
        className="w-full px-4 py-3 mt-6 font-bold text-white bg-blue-600 rounded-lg shadow-md disabled:bg-gray-400 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        {isLoading ? "변환 중..." : "스트링 아트로 변환하기"}
      </button>

      {/* 3. 오류 메시지 */}
      {error && (
        <div className="p-3 mt-4 text-center text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      {/* 4. 결과 캔버스 */}
      {isLoading && (
        <div className="mt-6 text-center text-gray-600">
          <p>좌표를 계산 중입니다... (시간이 걸릴 수 있습니다)</p>
        </div>
      )}

      {coordinates && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-center mb-4 text-gray-700">
            변환 결과
          </h3>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full border border-gray-300 rounded-lg bg-white"
            style={{ aspectRatio: "1 / 1" }}
          />
        </div>
      )}
    </div>
  );
}