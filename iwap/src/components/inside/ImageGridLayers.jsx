/**
 * @file app/components/inside/ImageGridLayers.jsx
 * @description 3D 데이터 시각화를 위한 메인 컴포넌트입니다.
 * @summary react-three-fiber를 사용하여 3D 씬, 카메라, 조명을 설정하고,
 * 마우스 입력을 처리하여 3D 객체를 제어합니다.
 * 모듈 해석 오류 방지를 위해 모든 관련 컴포넌트(ImageGrid, PlaneMesh)를 이 파일에 통합했습니다.
 */
'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/three';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide, PlaneGeometry, NearestFilter } from 'three';

// #region 내부 3D 컴포넌트

/**
 * @description 단일 3D 평면(Mesh)과 텍스처를 생성하는 컴포넌트입니다.
 * @summary 성능 최적화를 위해 부모로부터 지오메트리(geometry)를 공유받습니다.
 */
function PlaneMesh({ brightnessArray, position, geometry }) {
  // brightnessArray 데이터가 변경될 때만 텍스처를 새로 생성합니다.
  const texture = useMemo(() => {
    if (!brightnessArray || brightnessArray.length === 0) return null;

    const flatArray = brightnessArray.flat();
    const size = Math.sqrt(flatArray.length);
    if (!Number.isInteger(size)) return null;

    // 1차원 배열을 RGBA 형식의 이미지 데이터(Uint8Array)로 변환합니다.
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < flatArray.length; i++) {
      const brightness = flatArray[i];
      const offset = i * 4;
      data[offset] = brightness;     // Red
      data[offset + 1] = brightness; // Green
      data[offset + 2] = brightness; // Blue
      data[offset + 3] = 255;        // Alpha
    }
    
    // 변환된 데이터로 Three.js의 DataTexture 객체를 생성합니다.
    const dataTexture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
    
    // 텍스처 필터링 설정을 통해 픽셀을 선명하게 표시합니다.
    dataTexture.generateMipmaps = false;
    dataTexture.minFilter = NearestFilter;
    dataTexture.magFilter = NearestFilter;
    
    // 데이터가 업데이트되었음을 렌더러에 알립니다.
    dataTexture.needsUpdate = true;
    return dataTexture;
  }, [brightnessArray]);

  return (
    <mesh position={position} geometry={geometry}>
      <meshStandardMaterial 
        map={texture} 
        side={DoubleSide} // 평면의 양면이 모두 보이도록 설정합니다.
      />
    </mesh>
  );
}

/**
 * @description 모든 이미지 데이터를 받아 3D 그리드 형태로 배치하고 렌더링합니다.
 */
function ImageGrid({ allImageData, gridConfig, rotation }) {
  const { columns, rows, planeWidth, spacing, layerSpacing } = gridConfig;
  const itemsPerLayer = columns * rows;

  // [핵심 최적화] 모든 PlaneMesh가 공유할 단일 지오메트리를 생성합니다.
  // 이 기법은 GPU 메모리 사용량을 크게 줄여 성능을 향상시킵니다.
  const sharedGeometry = useMemo(() => new PlaneGeometry(planeWidth, planeWidth), [planeWidth]);

  return (
    // 부모로부터 받은 회전(rotation) 상태를 그룹 전체에 적용합니다.
    <animated.group rotation={rotation}>
      {allImageData.map((item, index) => {
        // 전체 인덱스를 기반으로 각 평면의 3D 공간 좌표(x, y, z)를 계산합니다.
        const layerIndex = Math.floor(index / itemsPerLayer);
        const indexInLayer = index % itemsPerLayer;
        
        const x = (indexInLayer % columns - (columns - 1) / 2) * (planeWidth + spacing);
        const y = (Math.floor(indexInLayer / columns) - (rows - 1) / 2) * (planeWidth + spacing);
        const z = -layerIndex * layerSpacing;

        return (
          <PlaneMesh
            key={item.id}
            brightnessArray={item.brightnessArray}
            position={[x, y, z]}
            geometry={sharedGeometry} // 모든 평면이 동일한 지오메트리를 공유합니다.
          />
        );
      })}
    </animated.group>
  );
}

// #endregion

/**
 * @description 3D 씬의 최상위 컨테이너 컴포넌트입니다. 데이터 처리, 상태 관리, 이벤트 바인딩을 담당합니다.
 */
export default function ImageGridLayers({ layersData }) {
  // 서버로부터 받은 원본 데이터를 3D 렌더링에 적합한 형태로 가공합니다.
  // layersData가 변경될 때만 재연산하여 성능을 최적화합니다.
  const allImageData = useMemo(() => {
    if (!layersData) return [];
    // 원본 데이터 형식: [ {'conv1': [[...]]}, {'layer1': [[...]]} ]
    // 변환된 데이터 형식: [ {id: 'conv1', brightnessArray: [[...]]}, ... ]
    return layersData.map((layerObject) => {
      const key = Object.keys(layerObject)[0];
      const brightnessArray = Object.values(layerObject)[0];
      return { id: key, brightnessArray };
    });
  }, [layersData]);
  
  // 3D 그리드의 레이아웃을 정의하는 설정 객체입니다.
  const gridConfig = {
    columns: 3,
    rows: 3,
    planeWidth: 3,
    spacing: 0.5,
    layerSpacing: 5,
  };

  // react-spring을 사용하여 회전 상태에 부드러운 물리 기반 애니메이션을 적용합니다.
  const [spring, api] = useSpring(() => ({
    rotation: [0, 0, 0], // 초기 회전값 [x, y, z]
    config: { friction: 40, mass: 1, tension: 400 }, // 애니메이션 물리 효과 설정
  }));

  // 마우스 드래그 제스처를 감지하고 회전 상태를 업데이트하는 로직입니다.
  const bind = useDrag(({ first, movement: [mx, my], memo }) => {
    // 'first'는 드래그 제스처의 시작을 나타냅니다.
    if (first) {
      // 드래그 시작 시의 현재 회전값을 memo에 저장합니다.
      memo = spring.rotation.get();
    }
    // 저장된 회전값에 현재 마우스 이동량을 더하여 새로운 회전값을 계산하고 적용합니다.
    api.start({
      rotation: [memo[0] + my / 100, memo[1] + mx / 100, 0],
    });
    // 다음 드래그 이벤트에서 이어서 사용하기 위해 memo를 반환합니다.
    return memo;
  });

  // 마우스 우클릭 시, 객체의 회전을 초기 상태로 리셋합니다.
  const handleRightClick = (event) => {
    event.nativeEvent.preventDefault(); // 브라우저의 기본 우클릭 메뉴 동작을 막습니다.
    api.start({ rotation: [0, 0, 0] });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111827' }}>
      <Canvas camera={{ position: [0, 0, 30], fov: 75 }}>
        {/* 3D 씬의 조명을 설정합니다. */}
        <ambientLight intensity={1.5} />
        <pointLight position={[15, 15, 15]} intensity={1} />
        
        {/* 3D 이미지 그리드를 렌더링하는 컴포넌트입니다. */}
        <ImageGrid 
          allImageData={allImageData} 
          gridConfig={gridConfig} 
          rotation={spring.rotation}
        />

        {/* 씬 전체를 덮는 투명한 평면입니다. 사용자의 마우스 이벤트를 감지하는 역할을 합니다. */}
        <mesh 
          {...bind()} 
          onContextMenu={handleRightClick}
          position={[0, 0, 0]} 
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </Canvas>
    </div>
  );
}

