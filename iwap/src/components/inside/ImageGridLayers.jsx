/**
 * @file app/components/inside/ImageGridLayers.jsx
 * 3D 시각화의 전체 씬(Scene)을 구성하고 관리하는 메인 컨테이너 컴포넌트입니다.
 * 3D 캔버스, 조명, 카메라 컨트롤을 설정하고,
 * 하위 컴포넌트인 ImageGrid에 렌더링할 데이터를 전달합니다.
 */
'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ImageGrid from './ImageGrid';

/**
 * 서버로부터 받은 행렬 데이터를 3D 씬에 렌더링합니다.
 * @param {object} props - 컴포넌트 프롭.
 * @param {Array<Object<string, number[][]>>} props.layersData - 서버로부터 받은 원본 레이어 데이터 배열.
 * @returns {JSX.Element} 3D 캔버스 컴포넌트.
 */
export default function ImageGridLayers({ layersData }) {
  /**
   * useMemo를 사용하여 서버로부터 받은 원본 데이터를 ImageGrid 컴포넌트가 사용하기
   * 용이한 형태의 배열로 변환합니다.
   * layersData가 변경될 때만 이 비싼 연산을 수행하여 성능을 최적화합니다.
   */
  const allImageData = useMemo(() => {
    if (!layersData) return [];

    // 원본 데이터 형식: [ {'conv1': [[...]]}, {'layer1': [[...]]} ]
    // 변환된 데이터 형식: [ {id: 'conv1', brightnessArray: [[...]]}, {id: 'layer1', ...} ]
    return layersData.map((layerObject) => {
      const key = Object.keys(layerObject)[0];
      const brightnessArray = Object.values(layerObject)[0];
      return { id: key, brightnessArray };
    });
  }, [layersData]);
  
  /**
   * 3D 그리드의 레이아웃을 정의하는 설정 객체입니다.
   * 이 객체는 ImageGrid 컴포넌트에 props로 전달됩니다.
   */
  const gridConfig = {
    columns: 3,         // 한 층(layer)에 들어갈 그리드의 열 수
    rows: 3,            // 한 층(layer)에 들어갈 그리드의 행 수
    planeWidth: 3,      // 각 이미지 평면의 너비
    spacing: 0.5,       // 평면 사이의 간격
    layerSpacing: 5,    // 층(layer) 사이의 Z축 간격
  };

  return (
    // 3D 씬을 렌더링할 전체 영역을 정의합니다.
    <div style={{ width: '100vw', height: '100vh', background: '#111827' }}>
      {/* Canvas는 react-three-fiber의 핵심으로, WebGL 렌더링 영역을 생성합니다. */}
      <Canvas camera={{ position: [10, 10, 25], fov: 75 }}>
        {/* AmbientLight는 씬 전체를 은은하게 비추는 조명입니다. */}
        <ambientLight intensity={1.5} />
        {/* PointLight는 특정 지점에서 모든 방향으로 빛을 발산하는 조명입니다. */}
        <pointLight position={[15, 15, 15]} intensity={1} />
        
        {/* ImageGrid 컴포넌트에 가공된 데이터와 설정값을 전달하여 렌더링을 위임합니다. */}
        <ImageGrid allImageData={allImageData} gridConfig={gridConfig} />
        
        {/* OrbitControls는 사용자가 마우스로 씬을 회전, 확대/축소, 이동할 수 있게 해줍니다. */}
        <OrbitControls />
      </Canvas>
    </div>
  );
}

