// src/components/ImageGridLayers.jsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ImageGrid from './ImageGrid';

/**
 * 3D 캔버스를 설정하고, 외부에서 이미지 데이터를 불러와 지정된 x, y 개수에 따라
 * 여러 레이어에 걸쳐 그리드로 렌더링하는 메인 컴포넌트입니다.
 */
export default function ImageGridLayers() {
  // 불러온 전체 이미지 데이터를 저장하는 state
  const [imageData, setImageData] = useState([]);

  // ✨ 그리드 및 레이어 레이아웃을 한 곳에서 관리하기 위한 설정 객체
  const gridConfig = {
    columns: 5,       // 그리드의 X축 개수 (가로)
    rows: 5,          // 그리드의 Y축 개수 (세로)
    planeWidth: 3,    // 각 이미지 평면의 너비
    planeHeight: 3,   // 각 이미지 평면의 높이
    spacing: 0.5,     // 이미지 평면 사이의 간격
    layerSpacing: 5,  // Z축 레이어 사이의 간격
  };

  // 컴포넌트가 처음 마운트될 때 한 번만 데이터를 불러옵니다.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/test/layers.txt');
        const data = await response.json();
        const formattedData = data.map((brightnessArray, index) => ({
          id: `image-${index}`,
          brightnessArray: brightnessArray,
        }));
        setImageData(formattedData);
      } catch (error) {
        console.error("데이터를 불러오는 중 오류가 발생했습니다:", error);
      }
    };
    fetchData();
  }, []);

  // ✨ 불러온 imageData를 여러 레이어로 나누는 로직
  // useMemo를 사용하여 imageData가 변경될 때만 재계산합니다.
  const layers = useMemo(() => {
    if (imageData.length === 0) {
      return [];
    }
    // 한 레이어에 들어갈 이미지의 총 개수
    const itemsPerLayer = gridConfig.columns * gridConfig.rows;
    const layerChunks = [];

    // 전체 이미지 데이터를 itemsPerLayer 크기로 잘라서 배열에 추가합니다.
    for (let i = 0; i < imageData.length; i += itemsPerLayer) {
      layerChunks.push(imageData.slice(i, i + itemsPerLayer));
    }
    return layerChunks;
  }, [imageData, gridConfig.columns, gridConfig.rows]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111827' }}>
      <Canvas camera={{ position: [10, 10, 25], fov: 75 }}>
        {/* 씬의 전반적인 조명 설정 */}
        <ambientLight intensity={1.5} />
        <pointLight position={[15, 15, 15]} intensity={1} />

        {/* ✨ 분할된 레이어들을 순회하며 각각 ImageGrid로 렌더링합니다. */}
        {layers.map((layerData, layerIndex) => {
          // 각 레이어의 Z 위치를 layerSpacing을 이용해 계산합니다.
          const zPosition = -layerIndex * gridConfig.layerSpacing;

          return (
            <ImageGrid
              key={layerIndex}
              layerData={layerData}
              // 그리드 그룹 전체를 계산된 Z 위치에 배치합니다.
              position={[0, 0, zPosition]}
              gridConfig={gridConfig}
            />
          );
        })}

        {/* 마우스 컨트롤러 */}
        <OrbitControls />
      </Canvas>
    </div>
  );
}