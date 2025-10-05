// inside/page.tsx
'use client';

import { useState } from 'react';
import DrawingCanvas from '@/components/inside/DrawingCanvas';
import ImageGridLayers from '@/components/inside/ImageGridLayers';
import LoadingIndicator from '@/components/inside/LoadingIndicator';
import FullScreenView from '@/components/ui/FullScreenView';
import PageHeader from '@/components/ui/PageHeader';

export default function InsidePage() {
  const [view, setView] = useState('draw');
  const [layersData, setLayersData] = useState(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleReturnToDraw = () => {
    setLayersData(null);
    setView('draw');
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

  return (
    <div
      className="relative w-full h-[calc(100dvh-96px)] overflow-hidden"
      style={pageBackgroundStyle}
    >
      {error && <p className="absolute top-4 text-red-500 bg-black/50 p-2 rounded z-30">에러: {error}</p>}

      {view === 'visualize' && layersData ? (
        <FullScreenView
          title="!nside."
          subtitle="인공지능이 숫자를 인식하는 과정"
          onClose={handleReturnToDraw}
          backgroundUrl="/images/inside_background.jpg"
        >
          <ImageGridLayers layersData={layersData} />
        </FullScreenView>
      ) : (
        // Draw/Loading 뷰
        <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[500/580] relative">
            <div className="w-full flex-grow min-h-0 pt-[100px]"> {/* 헤더 공간 확보 */}
              <PageHeader
                  title="!nside."
                  subtitle="인공지능이 숫자를 인식하는 과정"
                  goBack={true}
                  padding='p-0'
                />
              <div className="w-full h-full bg-white/40 border border-white backdrop-blur-[2px] pt-[7%] p-[10%] flex flex-col">
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