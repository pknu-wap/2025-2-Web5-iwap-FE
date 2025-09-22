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

  // 현재 화면에 표시될 뷰(view)를 제어하는 상태입니다.
  // 'draw': 사용자가 숫자를 그리는 그림판 뷰
  // 'loading': 서버로부터 행렬 데이터를 받아오는 중임을 나타내는 로딩 뷰
  // 'visualize': 받아온 행렬 데이터를 3D로 시각화하는 뷰
  const [view, setView] = useState('draw'); 
  
  // API로부터 받아온 행렬 데이터(레이어)를 저장하는 상태입니다.
  const [layersData, setLayersData] = useState([]);
  
  // 데이터 요청 과정에서 발생한 에러 메시지를 저장하는 상태입니다.
  const [error, setError] = useState<string | null>(null);

  /**
   * DrawingCanvas에서 이미지 업로드(POST)가 성공했을 때 호출되는 콜백 함수입니다.
   * 서버에 행렬 데이터(GET)를 요청하여 3D 시각화를 준비합니다.
   */
  const handleUploadSuccess = async () => {
    // 1. UI를 로딩 상태로 전환하고, 이전 에러 메시지를 초기화합니다.
    setView('loading');
    setError(null);

    try {
      // 2. 서버의 GET 엔드포인트로 행렬 데이터를 요청합니다.
      const response = await fetch('/api/inside/');
      if (!response.ok) {
        throw new Error(`행렬 데이터 요청 실패 (HTTP Status: ${response.status})`);
      }
      
      // 3. 응답받은 JSON 데이터에서 'layers' 배열을 추출하여 상태에 저장합니다.
      const data = await response.json();
      setLayersData(data.layers);
      
      // 4. 데이터 로딩이 완료되었으므로, UI를 3D 시각화 뷰로 전환합니다.
      setView('visualize');

    } catch (err) {
      // 5. 데이터 요청 중 에러가 발생한 경우, 에러 상태를 업데이트하고 UI를 다시 그림판 뷰로 되돌립니다.
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
   * @returns {JSX.Element} 현재 상태에 맞는 React 컴포넌트.
   */
  const renderContent = () => {
    switch (view) {
      case 'draw':
        return <DrawingCanvas onUploadSuccess={handleUploadSuccess} />;
      case 'loading':
        return <LoadingIndicator text="행렬 데이터 분석 중..." />;
      case 'visualize':
        return <ImageGridLayers layersData={layersData} />;
      default:
        // 예외적인 경우, 기본값으로 그림판 뷰를 보여줍니다.
        return <DrawingCanvas onUploadSuccess={handleUploadSuccess} />;
    }
  };

  return (
    <main style={containerStyle}>
      {/* 에러 상태가 존재할 경우, 화면 상단에 에러 메시지를 표시합니다. */}
      {error && <p style={{ color: 'red', position: 'absolute', top: 20 }}>에러: {error}</p>}
      
      {/* 현재 UI 상태에 맞는 컴포넌트를 렌더링합니다. */}
      {renderContent()}
    </main>
  );
}
