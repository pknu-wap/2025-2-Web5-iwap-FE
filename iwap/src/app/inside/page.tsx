'use client';

import { useState } from 'react';
import Image from 'next/image';
import DrawingCanvas from '@/components/inside/DrawingCanvas';
import ImageGridLayers from '@/components/inside/ImageGridLayers';
import LoadingIndicator from '@/components/inside/LoadingIndicator';

export default function InsidePage() {
  const [view, setView] = useState('draw');
  const [layersData, setLayersData] = useState(null);
  const [error, setError] = useState < string | null > (null);

  const handleUploadSuccess = async () => {
    setView('loading');
    setError(null);

    try {
      const response = await fetch('/api/inside/');
      if (!response.ok) {
        throw new Error(`행렬 데이터 요청 실패 (HTTP Status: ${response.status})`);
      }
      const data = await response.json();
      setLayersData(data);
      setView('visualize');
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
      setView('draw');
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'draw':
        return <DrawingCanvas onUploadSuccess={handleUploadSuccess} />;
      case 'loading':
        return <LoadingIndicator text="행렬 데이터 분석 중..." />;
      case 'visualize':
        return layersData ? <ImageGridLayers layersData={layersData} /> : <LoadingIndicator text="데이터 준비 중..." />;
      default:
        return <DrawingCanvas onUploadSuccess={handleUploadSuccess} />;
    }
  };

  // 이 페이지의 고유한 배경 스타일을 정의합니다.
  const pageBackgroundStyle = {
    backgroundImage: `
      linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113),
      url('/images/inside_background.jpg')
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  return (
    <div
      style={pageBackgroundStyle}
      className="w-full min-h-[calc(100vh-96px)] flex items-center justify-center p-4"
    >
      {error && <p className="absolute top-32 text-red-500">에러: {error}</p>}
      
      <div className="flex flex-col items-center w-[640px] gap-y-10">

        {/* --- 페이지 제목 및 닫기 버튼 (박스 외부) --- */}
        <div className="w-116 flex justify-between items-end">
          <div className="flex items-baseline gap-x-3">
            <h2 className="text-5xl font-bold text-white">!nside.</h2>
            <p className="text-sm font-light text-white">인공지능이 숫자를 인식하는 과정</p>
          </div>
          <button className="text-white">
            <CloseIcon />
          </button>
        </div>

        {/* --- 그림판을 담는 반투명 박스 --- */}
        <div className="w-116 h-120 bg-white/40 border border-white backdrop-blur-[2px] p-10 flex flex-col justify-center">
          <div className="w-full">
            <h3 className="text-2xl font-semibold text-white mb-2">숫자를 그려주세요</h3>
            {renderContent()}
          </div>
        </div>
        
      </div>
    </div>
  );
}

const CloseIcon = () => (
  <Image src="/icons/close.svg" alt="Close" width={24} height={24} />
);