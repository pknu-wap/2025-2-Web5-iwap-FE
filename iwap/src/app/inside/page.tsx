'use client';

import { useState } from 'react';
import DrawingCanvas from '@/components/inside/DrawingCanvas';
import ImageGridLayers from '@/components/inside/ImageGridLayers';
import LoadingIndicator from '@/components/inside/LoadingIndicator';
import FullScreenView from '@/components/ui/FullScreenView';
import PageHeader from '@/components/ui/PageHeader';

// 백엔드 데이터 구조에 대한 타입 정의
interface LayersData {
  layers: {
    [key: string]: number[][][][] | number[][];
  };
}

/**
 * AI 모델의 숫자 인식 과정을 시각화하는 '!nside' 페이지 컴포넌트.
 */
export default function InsidePage() {
  const [view, setView] = useState('draw'); 
  const [layersData, setLayersData] = useState<LayersData | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 업로드가 시작될 때 호출되어 로딩 UI를 표시합니다.
   */
  const handleUploadStart = () => {
    setView('loading');
    setError(null);
  };

  /**
   * 업로드 및 데이터 처리 성공 시 호출됩니다.
   * @param data - 백엔드에서 POST 응답으로 전달된 AI 레이어 데이터.
   */
  const handleUploadSuccess = (data: LayersData) => {
    try {
      if (!data || !data.layers || typeof data.layers !== 'object' || Object.keys(data.layers).length === 0) {
        throw new Error("서버로부터 유효한 데이터를 받지 못했습니다.");
      }
      
      setLayersData(data);
      setView('visualize');

    } catch (err) {
      console.error('[InsidePage] Error: An error occurred during data processing:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      // 데이터 처리 실패 시 에러 핸들러 호출
      handleUploadFail(`[데이터 처리 오류]: ${errorMessage}`);
    }
  };

  /**
   * 업로드 실패 시 호출되어 에러 메시지를 표시하고 UI를 되돌립니다.
   * @param errorMessage - 표시할 에러 메시지
   */
  const handleUploadFail = (errorMessage: string) => {
    setError(errorMessage);
    setView('draw');
  };

  const handleReturnToDraw = () => {
    setLayersData(null);
    setView('draw');
  };

  const renderContent = () => {
    switch (view) {
      case 'draw':
        return (
          <DrawingCanvas 
            onUploadStart={handleUploadStart}
            onUploadSuccess={handleUploadSuccess as (data: object) => void} 
            onUploadFail={handleUploadFail}
          />
        );
      case 'loading':
        return <LoadingIndicator text="분석 중..." />;
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
      className="relative w-full h-dvh md:h-[calc(100dvh-96px)]"
      style={pageBackgroundStyle}
    >
      {error && (
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-red-500 bg-black/50 p-2 rounded z-30 text-center">
          {error}
        </p>
      )}

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
        <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-full h-full pt-[100px]">
              <PageHeader
                title="!nside."
                subtitle="인공지능이 숫자를 인식하는 과정"
                goBack={true}
                padding='p-0'
              />
              <div className="w-full h-full bg-white/40 border border-white backdrop-blur-[2px] p-[8%] grid grid-rows-[auto_1fr] gap-y-1">
                <h3 
                  className="font-semibold text-white flex-shrink-0" 
                  style={{
                    fontSize: 'clamp(1rem, 3.5vmin, 1.5rem)',
                  }}
                >
                  숫자를 그려주세요
                </h3>
                <div className="relative min-h-0">
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