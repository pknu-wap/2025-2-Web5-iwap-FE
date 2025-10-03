/**
 * @file app/components/inside/ImageGridLayers.jsx
 * @description 3D 데이터 시각화를 위한 메인 컴포넌트입니다.
 */
'use client';

import { useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide, PlaneGeometry, NearestFilter } from 'three';

// #region 내부 3D 컴포넌트

function CameraControl({ cameraZ }) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, cameraZ, 0.1);
    // 카메라는 항상 월드 좌표의 원점(0,0,0)을 바라봄
    // 포커싱된 레이어가 항상 원점에 오도록 장면이 움직이므로, lookAt은 고정됨
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function PlaneMesh({ brightnessArray, position }) {
  const texture = useMemo(() => {
    if (!brightnessArray || brightnessArray.length === 0 || !brightnessArray[0] || brightnessArray[0].length === 0) return null;

    const height = brightnessArray.length;
    const width = brightnessArray[0].length;
    const flatArray = brightnessArray.flat();

    const data = new Uint8Array(width * height * 4);
    for (let i = 0; i < flatArray.length; i++) {
      const brightness = flatArray[i];
      const offset = i * 4;
      data[offset] = data[offset + 1] = data[offset + 2] = brightness;
      data[offset + 3] = 255;
    }
    
    const dataTexture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
    dataTexture.needsUpdate = true;
    dataTexture.generateMipmaps = false;
    dataTexture.minFilter = NearestFilter;
    dataTexture.magFilter = NearestFilter;
    return dataTexture;
  }, [brightnessArray]);

  const geometry = useMemo(() => {
    const height = brightnessArray?.length || 1;
    const width = brightnessArray?.[0]?.length || 1;
    const scale = 1;
    return new PlaneGeometry(width * scale, height * scale);
  }, [brightnessArray]);

  return (
    <mesh position={position} geometry={geometry}>
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}

// [수정] 그룹의 z위치를 외부에서 받아 중심 레이어를 동적으로 변경
function ImageGrid({ allImageData, gridConfig, rotation, groupZ }) {
  const { columns, rows, layoutCellSize, layerSpacing } = gridConfig;
  const itemsPerLayer = columns * rows;

  return (
    // [핵심] 그룹 전체를 z축으로 이동시켜 선택된 레이어가 (0,0,0)에 오도록 함
    <animated.group rotation={rotation} position={[0, 0, groupZ]}>
      {allImageData.map((item, index) => {
        const layerIndex = Math.floor(index / itemsPerLayer);
        const indexInLayer = index % itemsPerLayer;
        
        const x = (indexInLayer % columns - (columns - 1) / 2) * layoutCellSize;
        const y = (Math.floor(indexInLayer / columns) - (rows - 1) / 2) * layoutCellSize;
        // [수정] 각 Plane의 z위치는 단순하게 계산 (첫 레이어가 z=0, 두번째가 z=-15...)
        const z = -layerIndex * layerSpacing;

        return (
          <PlaneMesh
            key={item.id}
            brightnessArray={item.brightnessArray}
            position={[x, y, z]}
          />
        );
      })}
    </animated.group>
  );
}

// #endregion

export default function ImageGridLayers({ layersData }) {
  const allImageData = useMemo(() => {
    if (!layersData || Object.keys(layersData).length === 0) return [];
    
    const extract2DArrays = (data) => {
      if (Array.isArray(data) && Array.isArray(data[0]) && (typeof data[0][0] === 'number')) {
        return [data];
      }
      if (Array.isArray(data)) {
        return data.flatMap(item => extract2DArrays(item));
      }
      return [];
    };

    return Object.entries(layersData).flatMap(([key, value]) => {
      const extractedArrays = extract2DArrays(value);
      return extractedArrays.map((arr, index) => ({
        id: `${key}_${index}`,
        brightnessArray: arr,
      }));
    });
  }, [layersData]);
  
  const gridConfig = {
    columns: 1,
    rows: 1,
    layoutCellSize: 100,
    layerSpacing: 15,
  };

  // [추가] 전체 레이어 수 계산
  const totalLayers = useMemo(() => {
    if (allImageData.length === 0) return 0;
    const itemsPerLayer = gridConfig.columns * gridConfig.rows;
    return Math.ceil(allImageData.length / itemsPerLayer);
  }, [allImageData, gridConfig]);

  const [spring, api] = useSpring(() => ({
    rotation: [0, 0, 0],
    config: { friction: 40, mass: 1, tension: 400 },
  }));
  
  const [cameraZ, setCameraZ] = useState(300);
  
  // [추가] 현재 포커싱된 레이어의 인덱스를 관리 (초기값 0 = 첫 번째 레이어)
  const [focusLayerIndex, setFocusLayerIndex] = useState(0);

  // [핵심] 선택된 레이어가 (0,0,0)에 오도록 전체 그룹이 이동해야 할 Z축 거리 계산
  const groupZ = focusLayerIndex * gridConfig.layerSpacing;

  const bind = useDrag(({ first, movement: [mx, my], memo }) => {
    if (first) memo = spring.rotation.get();
    api.start({ rotation: [memo[0] + my / 100, memo[1] + mx / 100, 0] });
    return memo;
  });

  const handleRightClick = (event) => {
    event.nativeEvent.preventDefault();
    api.start({ rotation: [0, 0, 0] });
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#111827' }}>
      {/* 초기 카메라 위치는 고정값으로 설정 */}
      <Canvas camera={{ position: [100, 100, 200], fov: 75 }}>
        <ambientLight intensity={1.5} />
        <pointLight position={[15, 15, 15]} intensity={1} />
        {/* [수정] ImageGrid에 계산된 groupZ 값을 전달 */}
        <ImageGrid allImageData={allImageData} gridConfig={gridConfig} rotation={spring.rotation} groupZ={groupZ} />
        {/* 드래그 영역은 항상 (0,0,0)에 위치 */}
        <mesh {...bind()} onContextMenu={handleRightClick} position={[0, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <CameraControl cameraZ={cameraZ} />
      </Canvas>
      {/* [수정] 레이어 선택 및 줌을 위한 새로운 컨트롤러 UI */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '10px 20px',
        borderRadius: '8px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Layer Focus Slider */}
        <div style={{display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center'}}>
          <p style={{ color: 'white', margin: 0 }}>레이어 선택: {focusLayerIndex + 1}</p>
          <input 
            type="range" 
            min="0" 
            max={totalLayers > 0 ? totalLayers - 1 : 0} 
            step="1"
            value={focusLayerIndex} 
            onChange={(e) => setFocusLayerIndex(Number(e.target.value))} 
            style={{ width: '100%' }} 
          />
        </div>
        {/* Camera Z Slider */}
        <div style={{display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center'}}>
          <p style={{ color: 'white', margin: 0 }}>카메라 Z축: {cameraZ}</p>
          <input type="range" min="-200" max="1000" value={cameraZ} onChange={(e) => setCameraZ(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}