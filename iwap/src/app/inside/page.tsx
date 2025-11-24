'use client';

import { useState, useEffect, useCallback } from 'react';
import DrawingCanvas from '@/components/inside/DrawingCanvas';
import ImageGridLayers from '@/components/inside/ImageGridLayers';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import FullScreenView from '@/components/ui/FullScreenView';
import PageHeader from '@/components/ui/PageHeader';
import { ProjectIntroModal } from '@/components/sections/ProjectIntroSections';

// 백엔드 데이터 구조에 대한 타입 정의
interface LayersData {
  layers: {
    [key: string]: number[][][][] | number[][];
  };
}

// POST 응답 (task_id) 타입 정의
interface TaskIdResponse {
  task_id: string;
}

/**
 * AI 모델의 숫자 인식 과정을 시각화하는 '!nside' 페이지 컴포넌트.
 */
export default function InsidePage() {
  const [view, setView] = useState('draw'); 
  const [layersData, setLayersData] = useState<LayersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  /**
   * 업로드가 시작될 때 호출되어 로딩 UI를 표시합니다.
   */
  const handleUploadStart = () => {
    setView('loading');
    setError(null);
    setTaskId(null);
    setLayersData(null);
  };

  /**
   * 업로드 실패 시 호출 (useCallback으로 래핑)
   */
  const handleUploadFail = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setView('draw');
    setTaskId(null);
  }, []);

  /**
   * 데이터 폴링 성공 시 호출될 새 함수 (useCallback으로 래핑)
   */
  const handleDataReady = useCallback((data: LayersData) => {
    try {
      if (!data || !data.layers || typeof data.layers !== 'object' || Object.keys(data.layers).length === 0) {
        throw new Error("Did not receive valid layer data from server.");
      }
      
      setLayersData(data);
      setView('visualize');
      setTaskId(null);

    } catch (err) {
      console.error('[InsidePage] Error: An error occurred during data processing:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      handleUploadFail(`[데이터 처리 오류]: ${errorMessage}`);
    }
  }, [handleUploadFail]);

  /**
   * 업로드 *요청* 성공 시(2022 Accepted) 호출됩니다.
   */
  const handleUploadAccepted = (data: TaskIdResponse) => {
    try {
      if (!data || typeof data.task_id !== 'string') {
        throw new Error("Did not receive valid task_id from server.");
      }
      setTaskId(data.task_id);
    } catch (err) {
      console.error('[InsidePage] Error: An error occurred processing task_id:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      handleUploadFail(`[Task ID 처리 오류]: ${errorMessage}`);
    }
  };

  /**
   * [!! 수정된 부분 !!]
   * 시각화 뷰에서 그리기 뷰로 돌아갈 때 호출됩니다.
   */
  const handleReturnToDraw = useCallback(() => {
    setLayersData(null);
    setView('draw');
    setError(null); // 에러 메시지도 함께 초기화
    setTaskId(null); // 혹시 모를 task ID도 초기화
  }, []); // 의존성 배열은 비어있습니다.

  // task_id가 설정되면 폴링을 시작하는 useEffect
  useEffect(() => {
    if (view !== 'loading' || !taskId) return;

    let intervalId: NodeJS.Timeout | null = null;
    let isFetching = false;

    const pollData = async () => {
      if (isFetching) return;
      isFetching = true;

      try {
        const response = await fetch(`/api/inside/${taskId}`);

        if (response.status === 200) {
          if (intervalId) clearInterval(intervalId);
          const data: LayersData = await response.json();
          handleDataReady(data);
        } else if (response.status === 202) {
          console.log(`[InsidePage] Polling... task ${taskId} is still processing.`);
        } else {
          if (intervalId) clearInterval(intervalId);
          let errorText = 'No response';
          try {
            errorText = await response.text();
          } catch {}
          throw new Error(`[Data Fetch Error ${response.status}]: ${errorText}`);
        }
      } catch (error) {
        if (intervalId) clearInterval(intervalId);
        const errorMessage = error instanceof Error ? error.message : '폴링 중 알 수 없는 오류가 발생했습니다.';
        handleUploadFail(errorMessage);
      } finally {
        isFetching = false;
      }
    };

    intervalId = setInterval(pollData, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [view, taskId, handleDataReady, handleUploadFail]);


  const renderContent = () => {
    switch (view) {
      case 'draw':
        return (
          <DrawingCanvas 
            onUploadStart={handleUploadStart}
            onUploadSuccess={handleUploadAccepted as (data: object) => void} 
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
    <div className="flex flex-col">
      <ProjectIntroModal projects={["inside"]} open={showIntro} onClose={() => setShowIntro(false)}/>
      <div 
        className="relative w-full h-dvh md:h-[calc(100dvh-60px)]"
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
          onClose={handleReturnToDraw} // 이제 이 함수를 찾을 수 있습니다.
          backgroundUrl="/images/inside_background.jpg"
        >
          <ImageGridLayers layersData={layersData} />
        </FullScreenView>
      ) : (
        <div className="w-[90%] h-[90%] translate-x-5 md:translate-x-0 md:w-full md:h-full flex items-center justify-center p-4 sm:p-8">
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
                  className="font-semibold text-white translate -translate-y-3 -translate-x-3" 
                  style={{
                    fontSize: 'clamp(1rem, 3.5vmin, 1.5rem)',
                  }}
                >
                  숫자를 그려주세요
                </h3>
                <div className="relative min-h-0 md:scale-[1] scale-[1.1]">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
