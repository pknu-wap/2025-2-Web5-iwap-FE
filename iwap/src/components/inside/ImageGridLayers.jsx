// /components/inside/ImageGridLayers.jsx
'use client';

import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/three';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import SideNavButton from '@/components/ui/SideNavButton';

// --- 상수 정의 ---
const RENDER_WINDOW_SIZE = 50; // 성능 최적화: 현재 포커스된 레이어 주변의 N개만 렌더링.
const MAX_VERTICAL_ROTATION = Math.PI / 4; // 사용자가 드래그로 회전시킬 수 있는 최대 세로 각도.

// --- 내부 3D 컴포넌트: AnimatedPlane (단일 이미지 레이어) ---
function AnimatedPlane({ texture, position, width, height, opacity }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(width, height), [width, height]);
  return (
    <animated.mesh position={position} geometry={geometry}>
      <animated.meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent opacity={opacity} />
    </animated.mesh>
  );
}

// --- 내부 3D 컴포넌트: Scene (전체 3D 공간) ---
function Scene({ layers, animatedFocusIndex, rotation, opacity }) {
  const [visibleLayers, setVisibleLayers] = useState([]);
  const { viewport } = useThree();

  // 매 프레임마다 실행되는 훅 (렌더링 최적화).
  useFrame(() => {
    if (!layers || layers.length === 0) return;
    
    // 현재 포커스 위치를 기준으로, 화면에 보여줄 레이어의 범위를 계산.
    const currentFocus = animatedFocusIndex.get();
    const startIndex = Math.max(0, Math.floor(currentFocus) - RENDER_WINDOW_SIZE);
    const endIndex = Math.min(layers.length, Math.ceil(currentFocus) + RENDER_WINDOW_SIZE + 1);
    
    // visibleLayers 상태를 불필요하게 자주 업데이트하지 않도록, 범위 변경 시에만 업데이트.
    if (visibleLayers.length === 0 || visibleLayers[0]?.originalIndex !== startIndex || visibleLayers[visibleLayers.length - 1]?.originalIndex !== endIndex - 1) {
      setVisibleLayers(layers.slice(startIndex, endIndex));
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[0, 50, 50]} intensity={1} />
      {/* 그룹 전체를 회전시켜 사용자가 씬을 둘러보는 듯한 효과를 줌. */}
      <animated.group rotation={rotation}>
        {visibleLayers.map((layer) => {
          // 현재 포커스 인덱스(fi)와의 거리에 따라 각 레이어의 3D 위치를 동적으로 계산.
          const position = animatedFocusIndex.to(fi => {
            const distance = layer.originalIndex - fi;
            // 화면 너비에 비례하여 레이어 간 간격 조정
            const spacing = Math.max(30, Math.min(viewport.width / 2.5, 50));
            // 멀리 있는 레이어일수록 뒤쪽(z축)으로 깊이감을 줌.
            return [distance * spacing, 0, -Math.abs(distance) * 10];
          });
          
          return layer.isTextLayer ? ( // 최종 예측 결과(텍스트) 레이어
            <animated.group position={position} key={layer.id}>
              <Text fontSize={100} color="white" anchorX="center" anchorY="middle">
                {layer.text}
                <animated.meshStandardMaterial color="white" opacity={opacity} transparent />
              </Text>
            </animated.group>
          ) : ( // 이미지 레이어
            <AnimatedPlane
              key={layer.id}
              texture={layer.texture}
              width={layer.width} height={layer.height}
              position={position} opacity={opacity}
            />
          );
        })}
      </animated.group>
    </>
  );
}

/**
 * AI 모델의 각 레이어 데이터를 3D 공간에 시각화하는 메인 컴포넌트.
 * @param {{ layersData: object }} props - 백엔드에서 받은 AI 레이어 데이터 객체
 */
export default function ImageGridLayers({ layersData }) {
  // --- 상태 및 스프링 애니메이션 설정 ---
  const [focusLayerIndex, setFocusLayerIndex] = useState(0); // 사용자가 최종적으로 포커스할 레이어 인덱스
  const [focusAnimationConfig, setFocusAnimationConfig] = useState({ mass: 1, tension: 90, friction: 30, clamp: true });
  
  // 씬의 회전과 전체 투명도를 제어하는 스프링
  const [{ rotation, opacity }, api] = useSpring(() => ({
    rotation: [-0.125, 0.6, 0], // 초기 회전값
    opacity: 1,
    config: { mass: 1, tension: 120, friction: 30 },
  }));

  // 사용자의 드래그에 따라 부드럽게 움직이는 포커스 인덱스를 위한 스프링
  const { animatedFocusIndex } = useSpring({
    animatedFocusIndex: focusLayerIndex,
    config: focusAnimationConfig,
    onStart: () => api.start({ opacity: 0.5, immediate: true }), // 애니메이션 시작 시 반투명하게
    onRest: () => api.start({ opacity: 1 }), // 애니메이션 종료 시 원래 투명도로
  });

  // --- 데이터 가공 ---
  // layersData prop이 변경될 때만 실행. 원시 데이터를 Three.js가 사용할 수 있는 형식(텍스처 등)으로 변환.
  const layers = useMemo(() => {
    try {
      if (!layersData || typeof layersData !== 'object' || Object.keys(layersData).length === 0) return [];
      
      const extract2DArrays = (data) => {
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') return [data];
        if (Array.isArray(data)) return data.flatMap(item => extract2DArrays(item));
        return [];
      };

      // 1. 'fc' 레이어를 제외한 모든 이미지 레이어 데이터를 2D 배열 형태로 추출.
      const allImageData = Object.entries(layersData)
        .filter(([key]) => key !== 'fc')
        .flatMap(([key, value]) => extract2DArrays(value).map((arr, index) => ({ id: `${key}_${index}`, brightnessArray: arr })));

      // 2. 각 2D 밝기 배열을 Three.js의 DataTexture로 변환.
      const processedLayers = allImageData.map((item, i) => {
        const { brightnessArray } = item;
        const height = brightnessArray.length;
        const width = brightnessArray[0].length;
        const flatArray = brightnessArray.flat();
        const data = new Uint8Array(width * height * 4); // RGBA 4채널 데이터 버퍼 생성
        
        for (let j = 0; j < flatArray.length; j++) {
          const brightness = flatArray[j]; // 0-255 값
          data.set([brightness, brightness, brightness, 255], j * 4); // R, G, B 채널에 동일한 밝기 값, A는 255(불투명)
        }

        const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
        texture.needsUpdate = true;
        texture.flipY = true; // 이미지 Y축 뒤집기
        texture.minFilter = THREE.NearestFilter; // 픽셀이 깨져보이도록 필터링 (레트로 효과)
        texture.magFilter = THREE.NearestFilter;
        
        return { ...item, texture, width, height, originalIndex: i };
      }).filter(Boolean);

      // 3. 최종 분류(Fully Connected) 레이어 데이터를 텍스트 레이어로 추가.
      if (layersData.fc && Array.isArray(layersData.fc) && layersData.fc.length > 0) {
        const fcData = layersData.fc[0];
        const predictedIndex = fcData.indexOf(Math.max(...fcData));
        processedLayers.push({
          id: 'final-prediction-text', isTextLayer: true,
          text: predictedIndex.toString(), originalIndex: processedLayers.length,
        });
      }
      return processedLayers;
    } catch (error) {
      console.error('Error memoizing layers:', error);
      return [];
    }
  }, [layersData]);

  // --- 드래그 제스처 처리 ---
  const startRotation = useRef([0, 0, 0]);
  const dragModeRef = useRef('none'); // 드래그 모드 ('none', 'horizontal', 'vertical')
  const startFocusIndex = useRef(0);

  const bind = useDrag(({ first, last, active, movement: [mx, my] }) => {
    const deadzone = 10; // 드래그 시작을 감지하기 위한 최소 이동 거리
    if (first) { // 드래그 시작 시
      startRotation.current = rotation.get();
      startFocusIndex.current = animatedFocusIndex.get();
      dragModeRef.current = 'none';
    }
    if (active) {
      api.start({ opacity: 0.5, immediate: true });
    }
    if (dragModeRef.current === 'none' && (Math.abs(mx) > deadzone || Math.abs(my) > deadzone)) {
      dragModeRef.current = Math.abs(my) > Math.abs(mx) * 2 ? 'vertical' : 'horizontal';
    }
    if (dragModeRef.current === 'horizontal') {
      const indexSensitivity = 15;
      const newIndex = - (mx / indexSensitivity) + startFocusIndex.current;
      const clampedIndex = Math.max(0, Math.min(layers.length - 1, newIndex));
      animatedFocusIndex.set(clampedIndex);
      if (last) {
        setFocusAnimationConfig({ mass: 1, tension: 90, friction: 15, clamp: true });
        setFocusLayerIndex(Math.round(clampedIndex));
      }
    } else if (dragModeRef.current === 'vertical') {
      const rotSensitivity = 200;
      const newRotationX = startRotation.current[0] - my / rotSensitivity;
      const clampedRotationX = Math.max(-MAX_VERTICAL_ROTATION, Math.min(MAX_VERTICAL_ROTATION, newRotationX));
      api.start({ rotation: [clampedRotationX, startRotation.current[1], startRotation.current[2]], immediate: true });
    }
    if (last) {
      if (Math.round(animatedFocusIndex.get()) === focusLayerIndex) {
        api.start({ opacity: 1 });
      }
      if (dragModeRef.current !== 'horizontal') {
        api.start({ rotation: [startRotation.current[0], startRotation.current[1], startRotation.current[2]] });
      }
    }
  });

  const handleNavClick = (targetIndex) => {
    setFocusAnimationConfig({ mass: 1, tension: 30, friction: 26 });
    setFocusLayerIndex(targetIndex);
  };
  
  if (!layers || layers.length === 0) return null;

  return (
    <div 
      className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      {...bind()}
    >
      <Canvas
        gl={{ alpha: true }}
        style={{ background: 'transparent' }}
        camera={{ position: [0, 20, 150], fov: 60 }}
        onCreated={({ scene }) => { scene.background = null; }}
      >
        <Scene layers={layers} animatedFocusIndex={animatedFocusIndex} rotation={rotation} opacity={opacity}/>
      </Canvas>

      <SideNavButton 
        direction="left"
        onClick={(e) => { e.stopPropagation(); handleNavClick(0); }}
      />
      <SideNavButton 
        direction="right"
        onClick={(e) => { e.stopPropagation(); handleNavClick(layers.length - 1); }}
      />
    </div>
  );
}