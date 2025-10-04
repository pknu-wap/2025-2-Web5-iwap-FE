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
      if (!response.ok) throw new Error(`행렬 데이터 요청 실패 (HTTP Status: ${response.status})`);
      const data = await response.json();
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) throw new Error("서버로부터 유효한 데이터를 받지 못했습니다.");
      setLayersData(data);
      setView('visualize');
    } catch (err) {
      console.error('An error occurred during fetch or processing:', err);
      if (err instanceof Error) setError(err.message);
      else setError('알 수 없는 오류가 발생했습니다.');
      setView('draw');
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'draw':
        return <DrawingCanvas onUploadSuccess={handleUploadSuccess} />;
      case 'loading':
        return <LoadingIndicator text="로딩 중..." />;
      default:
        return null; 
    }
  };

  const pageBackgroundStyle = {
    backgroundImage: `
      linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113),
      url('/images/inside_background.jpg')
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  const CloseIcon = () => (
    <Image src="/icons/close.svg" alt="Close" width={24} height={24} style={{ width: 'clamp(1rem, 3vmin, 1.5rem)', height: 'auto' }}/>
  );

  return (
    // [핵심 수정] 최상위 컨테이너에서 padding과 flex 관련 클래스 제거
    <div
      style={pageBackgroundStyle}
      className="w-full h-[calc(100dvh-96px)] overflow-hidden"
    >
      {error && <p className="absolute top-4 text-red-500 bg-black/50 p-2 rounded">에러: {error}</p>}

      {view === 'visualize' && layersData ? (
        // Visualize 뷰: 여백 없이 전체 공간을 차지
        <div className="w-full h-full relative">
          <ImageGridLayers layersData={layersData} />
        </div>
      ) : (
        // Draw/Loading 뷰: 중앙 정렬과 padding을 위한 래퍼(wrapper) 추가
        <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[500/580]">
            <div className="w-full flex justify-between items-baseline pt-[2%] px-[5%] pb-[1%]">
              <div className="flex items-baseline gap-x-2 flex-wrap">
                <h2 className="font-bold text-white" style={{ fontSize: 'clamp(1.75rem, 5vmin, 3rem)' }}>
                  !nside.
                </h2>
                <p className="font-light text-white" style={{ fontSize: 'clamp(0.75rem, 1.8vmin, 0.875rem)' }}>
                  인공지능이 숫자를 인식하는 과정
                </p>
              </div>
              <button className="text-white flex-shrink-0 relative top-0.5">
                <CloseIcon />
              </button>
            </div>
            <div className="w-full flex-grow min-h-0 p-[5%] pt-[2%]">
              <div className="w-full h-full bg-white/40 border border-white backdrop-blur-[2px] p-[5%] flex flex-col">
                <h3 className="font-semibold text-white flex-shrink-0" style={{
                  fontSize: 'clamp(1rem, 3.5vmin, 1.5rem)',
                  marginBottom: 'clamp(0.25rem, 2vmin, 0.5rem)'
                }}>
                  숫자를 그려주세요
                </h3>
                <div className="relative flex-grow min-h-0">
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