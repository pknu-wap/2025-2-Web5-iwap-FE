/**
 * @file ImageGridLayers.jsx
 * 전체 3D 씬을 구성하고, 여러 이미지 레이어를 3D 공간에 배치하여 렌더링하는
 * 최상위 3D 뷰어 컴포넌트입니다.
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import ImageGrid from './ImageGrid';

/**
 * 서버로부터 받은 행렬 데이터를 받아 3D 씬으로 시각화합니다.
 * @param {object} props - 컴포넌트 프롭스.
 * @param {Array<object>} props.layersData - 서버에서 받은 전체 레이어 데이터 배열.
 * @returns {JSX.Element} 3D 씬 캔버스.
 */
export default function ImageGridLayers({ layersData }) {
  // 화면에 실제로 렌더링될 레이어들을 관리하는 상태입니다.
  const [visibleLayers, setVisibleLayers] = useState([]);

  // 3D 공간의 레이아웃을 정의하는 설정 객체입니다.
  const gridConfig = {
    columns: 3,
    rows: 3,
    planeWidth: 3,
    spacing: 0.5,
    layerSpacing: 7, // 레이어 간 Z축 간격을 조정하여 겹치지 않게 합니다.
  };

  // 1. 서버 원본 데이터를 프론트엔드에서 사용하기 쉬운 형태로 가공합니다.
  // useMemo를 사용하여 `layersData`가 변경될 때만 이 비싼 계산을 수행합니다.
  const imageData = useMemo(() => {
    if (!layersData) return [];
    return layersData.map((layerObject) => {
      const key = Object.keys(layerObject)[0];
      const brightnessArray = Object.values(layerObject)[0];
      return { id: key, brightnessArray };
    });
  }, [layersData]);

  // 2. 가공된 전체 이미지 데이터를 3x3 그리드 단위의 '레이어'로 분할합니다.
  // 이 또한 `imageData`가 변경될 때만 재계산됩니다.
  const layers = useMemo(() => {
    if (imageData.length === 0) return [];
    const itemsPerLayer = gridConfig.columns * gridConfig.rows;
    const layerChunks = [];
    for (let i = 0; i < imageData.length; i += itemsPerLayer) {
      layerChunks.push({
        id: `layer-${i}`,
        data: imageData.slice(i, i + itemsPerLayer),
      });
    }
    return layerChunks;
  }, [imageData, gridConfig.columns, gridConfig.rows]);

  // 3. 분할된 레이어들을 점진적으로 화면에 표시하여 렌더링 부담을 줄입니다.
  // useEffect를 사용하여 `layers` 데이터가 준비되면 렌더링을 시작합니다.
  useEffect(() => {
    if (layers.length === 0) return;

    setVisibleLayers([]); // 렌더링 시작 전 기존 레이어 초기화
    let frameId;

    const renderIncrementally = (layerIndex = 0) => {
      if (layerIndex >= layers.length) return; // 모든 레이어를 렌더링했으면 종료
      
      // visibleLayers 상태에 다음 레이어를 추가하여 렌더링을 유발합니다.
      setVisibleLayers(prev => [...prev, layers[layerIndex]]);
      
      // requestAnimationFrame을 사용하여 다음 프레임에 다음 레이어를 렌더링하도록 예약합니다.
      frameId = requestAnimationFrame(() => renderIncrementally(layerIndex + 1));
    };

    renderIncrementally();

    // 컴포넌트가 언마운트되거나 `layers`가 변경될 때 예약된 애니메이션을 정리합니다.
    return () => cancelAnimationFrame(frameId);
  }, [layers]);

  // --- 최종 UI 렌더링 ---
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111827' }}>
      <Canvas camera={{ position: [0, 0, 35], fov: 75 }}>
        {/* 씬 전체에 은은한 조명을 추가합니다. */}
        <ambientLight intensity={1.5} />
        {/* 특정 위치에서 빛을 비추는 조명을 추가하여 입체감을 줍니다. */}
        <pointLight position={[15, 15, 15]} intensity={1} />
        
        {/* 화면에 표시될 레이어들(visibleLayers)을 순회하며 렌더링합니다. */}
        {visibleLayers.map((layer, layerIndex) => (
          // 각 레이어 그룹의 Z 위치를 다르게 하여 층을 만듭니다.
          <group key={layer.id} position={[0, 0, -layerIndex * gridConfig.layerSpacing]}>
            <ImageGrid layerData={layer.data} gridConfig={gridConfig} />
            {/* 각 레이어의 이름을 표시하는 3D 텍스트를 추가합니다. */}
            <Text
              position={[0, -gridConfig.planeWidth * 1.8, 0]}
              fontSize={0.8}
              color="white"
              anchorX="center"
            >
              {layer.data[0].id.split('.')[0]}
            </Text>
          </group>
        ))}
        
        {/* 사용자가 마우스로 씬을 회전, 확대/축소할 수 있게 합니다. */}
        <OrbitControls />
      </Canvas>
    </div>
  );
}
