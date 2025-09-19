// src/components/ImageGridLayers.jsx

'use client';

import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import BrightnessDataPlane from './BrightnessDataPlane';

export default function ImageGridLayers() {
  // 불러온 레이어 데이터를 저장할 state
  const [layers, setLayers] = useState([]);

  // 컴포넌트가 마운트될 때 데이터를 한 번만 불러옵니다.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/test/layers.txt'); // public 폴더의 파일에 접근
        const data = await response.json(); // 텍스트를 JSON으로 파싱
        setLayers(data);
      } catch (error) {
        console.error("Error fetching layers data:", error);
      }
    };

    fetchData();
  }, []); // 빈 배열을 전달하여 최초 렌더링 시에만 실행

  // Z축을 따라 레이어 사이의 간격
  const layerSpacing = 5;
  // 각 Plane의 크기
  const planeSize = 8;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111827' }}>
      <Canvas camera={{ position: [10, 10, 15], fov: 75 }}>
        <ambientLight intensity={1.5} />
        <pointLight position={[15, 15, 15]} intensity={1} />

        {/* 불러온 layers state를 기반으로 렌더링 */}
        {layers.map((layerData, layerIndex) => {
          const zPosition = layerIndex * -layerSpacing;

          return (
            <BrightnessDataPlane
              key={layerIndex}
              brightnessArray={layerData}
              position={[0, 0, zPosition]}
              args={[planeSize, planeSize]}
            />
          );
        })}

        <OrbitControls />
      </Canvas>
    </div>
  );
}