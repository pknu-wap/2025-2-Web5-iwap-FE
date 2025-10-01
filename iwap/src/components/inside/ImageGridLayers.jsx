/**
 * @file app/components/inside/ImageGridLayers.jsx
 * @description 3D 데이터 시각화를 위한 메인 컴포넌트입니다.
 */
'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/three';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide, PlaneGeometry, NearestFilter } from 'three';

// #region 내부 3D 컴포넌트

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

function ImageGrid({ allImageData, gridConfig, rotation }) {
  const { columns, rows, layoutCellSize, layerSpacing } = gridConfig;
  const itemsPerLayer = columns * rows;
  const totalLayers = Math.ceil(allImageData.length / itemsPerLayer);
  const middleLayerIndex = Math.floor((totalLayers - 1) / 2);

  return (
    <animated.group rotation={rotation}>
      {allImageData.map((item, index) => {
        const layerIndex = Math.floor(index / itemsPerLayer);
        const indexInLayer = index % itemsPerLayer;
        
        // [수정됨] 고정된 셀 크기를 기준으로 위치를 계산하여 이미지 겹침을 방지합니다.
        const x = (indexInLayer % columns - (columns - 1) / 2) * layoutCellSize;
        const y = (Math.floor(indexInLayer / columns) - (rows - 1) / 2) * layoutCellSize;
        const z = (middleLayerIndex - layerIndex) * layerSpacing;

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
  
  // [수정됨] 그리드 레이아웃 설정. 'layoutCellSize'를 도입하여 배치 간격을 관리합니다.
  const gridConfig = {
    columns: 1,
    rows: 1,
    layoutCellSize: 200, // 각 이미지가 배치될 가상의 셀 크기
    layerSpacing: 2.5,
  };

  const [spring, api] = useSpring(() => ({
    rotation: [0, 0, 0],
    config: { friction: 40, mass: 1, tension: 400 },
  }));

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
    <div style={{ width: '100vw', height: '100vh', background: '#111827' }}>
      <Canvas camera={{ position: [-75, -25, 0], fov: 75 }}>
        <ambientLight intensity={1.5} />
        <pointLight position={[15, 15, 15]} intensity={1} />
        <ImageGrid allImageData={allImageData} gridConfig={gridConfig} rotation={spring.rotation} />
        <mesh {...bind()} onContextMenu={handleRightClick} position={[0, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </Canvas>
    </div>
  );
}