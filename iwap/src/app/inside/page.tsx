// /inside/page.tsx
'use client';

import { useState } from 'react';
import DrawingCanvas from '@/components/inside/DrawingCanvas';
import ImageGridLayers from '@/components/inside/ImageGridLayers';
import LoadingIndicator from '@/components/inside/LoadingIndicator';
import FullScreenView from '@/components/ui/FullScreenView';
import PageHeader from '@/components/ui/PageHeader';

/**
 * AI 모델의 숫자 인식 과정을 시각화하는 '!nside' 페이지 컴포넌트.
 * 사용자는 숫자를 그리고, 제출하면 AI의 각 레이어별 처리 결과를 3D로 확인할 수 있음.
 * 'draw' -> 'loading' -> 'visualize' 순서로 뷰 상태가 전환됨.
 */
export default function InsidePage() {
  // --- 상태 관리 (State Management) ---
  // 현재 페이지가 보여줄 뷰를 제어하는 상태 ('draw', 'loading', 'visualize').
  const [view, setView] = useState('draw'); 
  // 백엔드로부터 받은 AI 모델의 레이어별 데이터.
  const [layersData, setLayersData] = useState(null);
  // 데이터 요청 또는 처리 중 발생한 에러 메시지.
  const [error, setError] = useState<string | null>(null);

  /**
   * 이미지 업로드 성공 후 실행되는 비동기 핸들러.
   * 뷰를 'loading'으로 전환하고, 백엔드 API(/api/inside)를 호출하여 AI 레이어 데이터를 가져옴.
   * 데이터 수신 성공 시 'visualize' 뷰로 전환, 실패 시 에러를 표시하고 'draw' 뷰로 복귀.
   */
  const handleUploadSuccess = async () => {
    setView('loading');
    setError(null); // 이전 에러 메시지 초기화
    
    try {
      // 프록시 API 라우트로 GET 요청을 보내 AI 레이어 데이터를 요청함.
      const response = await fetch('/api/inside/');
      if (!response.ok) {
        throw new Error(`행렬 데이터 요청 실패 (HTTP Status: ${response.status})`);
      }
      
      const data = await response.json();
      // 수신한 데이터가 비어있거나 유효하지 않은 객체인지 검증.
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        throw new Error("서버로부터 유효한 데이터를 받지 못했습니다.");
      }
      
      setLayersData(data); // 상태에 데이터 저장
      setView('visualize'); // 3D 시각화 뷰로 전환

    } catch (err) {
      console.error('An error occurred during fetch or processing:', err);
      // 에러 종류에 따라 적절한 메시지를 상태에 저장.
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      setView('draw'); // 에러 발생 시 사용자가 다시 시도할 수 있도록 그리기 뷰로 복귀.
    }
  };

  /** 3D 시각화 뷰에서 그리기 뷰로 돌아가는 핸들러. 관련 상태를 초기화함. */
  const handleReturnToDraw = () => {
    setLayersData(null);
    setView('draw');
  };

  /** 'view' 상태에 따라 적절한 UI 컴포넌트를 선택적으로 렌더링하는 함수. */
  const renderContent = () => {
    switch (view) {
      case 'draw':
        return <DrawingCanvas onUploadSuccess={handleUploadSuccess} />;
      case 'loading':
        return <LoadingIndicator text="로딩 중..." />;
      default:
        // 'visualize' 뷰는 이 함수 밖에서 별도로 처리되므로 null 반환.
        return null;
    }
  };

  // 배경 이미지와 그라데이션을 적용한 페이지 배경 스타일 객체.
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
          에러: {error}
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
          {/* [핵심 1] max-h-full과 aspect-square를 통해
            컨테이너가 뷰포트 크기에 맞춰 자연스럽게 줄어드는 정사각형이 되도록 합니다. (가로 모드 대응)
          */}
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-full h-full pt-[100px]">
              <PageHeader
                title="!nside."
                subtitle="인공지능이 숫자를 인식하는 과정"
                goBack={true}
                padding='p-0'
              />
              {/* [핵심 2] Grid 레이아웃과 미세 조정한 padding을 통해
                그리기 영역이 더 큰 공간을 차지하도록 만듭니다. (세로 모드 대응)
              */}
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