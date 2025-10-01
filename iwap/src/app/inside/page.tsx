/**
 * @file /inside 경로의 메인 페이지 컴포넌트입니다.
 * 이 컴포넌트는 UI의 상태(그림판, 로딩, 3D 뷰어)를 관리하고,
 * 사용자의 상호작용에 따른 데이터 흐름을 총괄하는 컨트롤러 역할을 합니다.
 */
'use client';

import { useState } from 'react';
import DrawingCanvas from '@/components/inside/DrawingCanvas';
import ImageGridLayers from '@/components/inside/ImageGridLayers';
import LoadingIndicator from '@/components/inside/LoadingIndicator';

// 전체 페이지의 기본 레이아웃 스타일입니다.
const containerStyle = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: '#111827',
  fontFamily: 'sans-serif',
};

/**
 * /inside 경로에 대한 메인 페이지 컴포넌트입니다.
 * @returns {JSX.Element} 현재 UI 상태에 맞는 뷰를 렌더링합니다.
 */
export default function Home() {
  // --- 상태 관리 (State Management) ---
  const [view, setView] = useState('draw'); 
  const [layersData, setLayersData] = useState(null); // 초기값을 null로 변경
  const [error, setError] = useState<string | null>(null);

  /**
   * DrawingCanvas에서 이미지 업로드(POST)가 성공했을 때 호출되는 콜백 함수입니다.
   * 서버에 행렬 데이터(GET)를 요청하여 3D 시각화를 준비합니다.
   */
  const handleUploadSuccess = async () => {
    setView('loading');
    setError(null);

    try {
      const response = await fetch('/api/inside/');
      if (!response.ok) {
        throw new Error(`행렬 데이터 요청 실패 (HTTP Status: ${response.status})`);
      }
      
      const data = await response.json();
      
      // [핵심 수정]
      // API가 이제 'layers' 객체를 직접 반환하므로, 'data.layers'가 아닌 'data'를 사용합니다.
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

  /**
   * 현재 'view' 상태에 따라 적절한 컴포넌트를 렌더링하는 함수입니다.
   */
  const renderContent = () => {
    switch (view) {
      case 'draw':
        return <DrawingCanvas onUploadSuccess={handleUploadSuccess} />;
      case 'loading':
        return <LoadingIndicator text="행렬 데이터 분석 중..." />;
      case 'visualize':
        // layersData가 유효할 때만 ImageGridLayers를 렌더링합니다.
        return layersData ? <ImageGridLayers layersData={layersData} /> : <LoadingIndicator text="데이터 준비 중..." />;
      default:
        return <DrawingCanvas onUploadSuccess={handleUploadSuccess} />;
    }
  };

  return (
    <main style={containerStyle}>
      {error && <p style={{ color: 'red', position: 'absolute', top: 20 }}>에러: {error}</p>}
      {renderContent()}
    </main>
  );
}