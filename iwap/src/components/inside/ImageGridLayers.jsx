'use client';

import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import ProgressBar from '@/components/inside/ProgressBar';

// --- 상수 정의 ---
const RENDER_WINDOW_SIZE = 50;
const MAX_VERTICAL_ROTATION = Math.PI / 4;
const BASE_SPACING = 25;
const INITIAL_ROTATION = [-0.125, 0.6, 0];
const DAMP_FACTOR = 8; // 부드러움 계수 (낮을수록 빠름)

// --- 내부 3D 컴포넌트: Plane (단일 이미지 레이어) ---
// 'AnimatedPlane' -> 'Plane', 'animated.' 제거
function Plane({ texture, position, width, height, opacity }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(width, height), [width, height]);
  return (
    <mesh position={position} geometry={geometry}>
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent opacity={opacity} />
    </mesh>
  );
}

// --- 내부 3D 컴포넌트: Scene (전체 3D 공간) ---
// 'animatedFocusIndex' -> 'focusIndex' (숫자)
function Scene({ layers, focusIndex, rotation, opacity }) {
  const [visibleLayers, setVisibleLayers] = useState([]);
  
  useFrame(() => {
    if (!layers || layers.length === 0) return;
    
    // 'animatedFocusIndex.get()' -> 'focusIndex'
    const currentFocus = focusIndex; 
    const startIndex = Math.max(0, Math.floor(currentFocus) - RENDER_WINDOW_SIZE);
    const endIndex = Math.min(layers.length, Math.ceil(currentFocus) + RENDER_WINDOW_SIZE + 1);
    
    if (visibleLayers.length === 0 || visibleLayers[0]?.originalIndex !== startIndex || visibleLayers[visibleLayers.length - 1]?.originalIndex !== endIndex - 1) {
      setVisibleLayers(layers.slice(startIndex, endIndex));
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[0, 50, 50]} intensity={1} />
      {/* 'animated.group' -> 'group' */}
      <group rotation={rotation}>
        {visibleLayers.map((layer) => {
          
          // 'animatedFocusIndex.to(...)' -> 직접 계산
          const fi = focusIndex; 
          if (!layers || layers.length < 2) return [0, 0, 0];
          const floorIndex = Math.floor(fi);
          const ceilIndex = Math.min(layers.length - 1, Math.ceil(fi));
          const fraction = fi - floorIndex;
          const x1 = layers[floorIndex].cumulativeX;
          const x2 = layers[ceilIndex].cumulativeX;
          const focusedX = x1 + (x2 - x1) * fraction;
          const finalX = layer.cumulativeX - focusedX;
          const distance = layer.originalIndex - fi;
          const finalZ = -Math.abs(distance) * 10;
          const position = [finalX, 0, finalZ];
          
          return layer.isTextLayer ? (
            <group position={position} key={layer.id}>
              <Text 
                font="/fonts/static/Pretendard-Thin.otf"
                fontSize={100} color="white" anchorX="center" anchorY="middle">
                {layer.text}
                <meshStandardMaterial color="white" opacity={opacity} transparent />
              </Text>
            </group>
          ) : (
            <Plane
              key={layer.id}
              texture={layer.texture}
              width={layer.width} height={layer.height}
              position={position} opacity={opacity}
            />
          );
        })}
      </group>
    </>
  );
}

// --- [신규] useFrame 훅을 실행하고 Scene을 래핑하는 컴포넌트 ---
function SceneWrapper({ 
  layers, 
  targetFocusIndex, 
  targetRotation, 
  targetOpacity, 
  currentFocusIndexRef, 
  currentRotationRef, 
  currentOpacityRef, 
  dragModeRef, 
  onLiveIndexUpdate 
}) {
  
  useFrame((state, delta) => {
    const dragMode = dragModeRef.current;

    // 1. 포커스 인덱스 보간 (수평 드래그 중이 아닐 때만)
    if (dragMode !== 'horizontal') {
      currentFocusIndexRef.current = THREE.MathUtils.damp(
        currentFocusIndexRef.current,
        targetFocusIndex,
        DAMP_FACTOR,
        delta
      );
    }

    // 2. 로테이션 보간 (수직 드래그 중이 아닐 때만)
    if (dragMode !== 'vertical') {
      const [rx, ry, rz] = currentRotationRef.current;
      const [tr, ty, tz] = targetRotation;
      currentRotationRef.current = [
        THREE.MathUtils.damp(rx, tr, DAMP_FACTOR, delta),
        THREE.MathUtils.damp(ry, ty, DAMP_FACTOR, delta),
        THREE.MathUtils.damp(rz, tz, DAMP_FACTOR, delta),
      ];
    }

    // 3. 투명도 보간 (항상)
    currentOpacityRef.current = THREE.MathUtils.damp(
      currentOpacityRef.current,
      targetOpacity,
      DAMP_FACTOR,
      delta
    );

    // 4. ProgressBar 업데이트를 위해 부모 컴포넌트에 현재 값 전달
    onLiveIndexUpdate(currentFocusIndexRef.current);
  });

  return (
    <Scene 
      layers={layers}
      focusIndex={currentFocusIndexRef.current}
      rotation={currentRotationRef.current}
      opacity={currentOpacityRef.current}
    />
  );
}

/**
 * AI 모델의 각 레이어 데이터를 3D 공간에 시각화하는 메인 컴포넌트.
 */
export default function ImageGridLayers({ layersData }) {
  // [수정] '목표값' state
  const [targetFocusIndex, setTargetFocusIndex] = useState(0);
  const [targetRotation, setTargetRotation] = useState(INITIAL_ROTATION);
  const [targetOpacity, setTargetOpacity] = useState(1);
  
  // [수정] ProgressBar를 위한 실시간 '현재값' state
  const [liveFocusIndex, setLiveFocusIndex] = useState(0);

  // [수정] '현재값' ref (useFrame에서 직접 조작됨)
  const currentFocusIndexRef = useRef(0);
  const currentRotationRef = useRef(INITIAL_ROTATION);
  const currentOpacityRef = useRef(1);

  const { layers, sizeChangeIndices } = useMemo(() => {
    try {
      if (!layersData || !layersData.layers || typeof layersData.layers !== 'object') {
        return { layers: [], sizeChangeIndices: [] };
      }
      
      const actualLayers = layersData.layers;

      const extract2DArrays = (data) => {
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') return [data];
        if (Array.isArray(data)) return data.flatMap(item => extract2DArrays(item));
        return [];
      };

      const allImageData = Object.entries(actualLayers)
        .filter(([key]) => key !== 'fc')
        .flatMap(([key, value]) => extract2DArrays(value).map((arr, index) => ({ id: `${key}_${index}`, brightnessArray: arr })));

      const processedLayers = allImageData.map((item, i) => {
        const { brightnessArray } = item;
        const height = brightnessArray.length;
        const width = brightnessArray[0].length;
        const flatArray = brightnessArray.flat();
        const data = new Uint8Array(width * height * 4);
        
        for (let j = 0; j < flatArray.length; j++) {
          const brightness = flatArray[j];
          data.set([brightness, brightness, brightness, 255], j * 4);
        }

        const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
        texture.needsUpdate = true;
        texture.flipY = true;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        
        return { ...item, texture, width, height, originalIndex: i };
      }).filter(Boolean);

      if (actualLayers.fc && Array.isArray(actualLayers.fc) && actualLayers.fc.length > 0) {
        const fcData = actualLayers.fc[0];
        const predictedIndex = fcData.indexOf(Math.max(...fcData));
        processedLayers.push({
          id: 'final-prediction-text', isTextLayer: true,
          text: predictedIndex.toString(), originalIndex: processedLayers.length,
        });
      }

      const layersWithPositions = [];
      let currentX = 0;
      processedLayers.forEach((layer, i) => {
        const prevLayer = i > 0 ? processedLayers[i - 1] : null;
        const prevWidth = prevLayer ? (prevLayer.width || 100) : 0;
        const currentWidth = layer.width || 100;
        const spacing = prevLayer ? (prevWidth / 2) + (currentWidth / 2) + BASE_SPACING : 0;
        currentX += spacing;
        layersWithPositions.push({ ...layer, cumulativeX: currentX });
      });

      const sizeChangeIndices = [];
      layersWithPositions.forEach((layer, i) => {
        if (i === 0) return;
        const prevLayer = layersWithPositions[i - 1];
        const prevW = prevLayer.width || (prevLayer.isTextLayer ? -1 : 0);
        const prevH = prevLayer.height || (prevLayer.isTextLayer ? -1 : 0);
        const currW = layer.width || (layer.isTextLayer ? -1 : 0);
        const currH = layer.height || (layer.isTextLayer ? -1 : 0);
        if (prevW !== currW || prevH !== currH) {
          sizeChangeIndices.push(i);
        }
      });
      
      return { layers: layersWithPositions, sizeChangeIndices };
    } catch (error) {
      console.error('[ImageGridLayers] Error: Failed to process and memoize layers:', error);
      return { layers: [], sizeChangeIndices: [] };
    }
  }, [layersData]);

  const startRotation = useRef([0, 0, 0]);
  const dragModeRef = useRef('none');
  const startFocusIndex = useRef(0);

  const bind = useDrag(({ first, last, active, movement: [mx, my] }) => {
    const deadzone = 10;
    if (first) {
      // [수정] 현재값(ref)에서 시작
      startRotation.current = currentRotationRef.current; 
      startFocusIndex.current = currentFocusIndexRef.current; 
      dragModeRef.current = 'none';
    }
    if (active) {
      // [수정] 목표값(state) 설정
      setTargetOpacity(0.5); 
    }
    if (dragModeRef.current === 'none' && (Math.abs(mx) > deadzone || Math.abs(my) > deadzone)) {
      dragModeRef.current = Math.abs(my) > Math.abs(mx) * 2 ? 'vertical' : 'horizontal';
    }
    if (dragModeRef.current === 'horizontal') {
      const indexSensitivity = 15;
      const newIndex = - (mx / indexSensitivity) + startFocusIndex.current;
      const clampedIndex = Math.max(0, Math.min(layers.length - 1, newIndex));
      
      // [수정] 현재값(ref)을 즉시 업데이트
      currentFocusIndexRef.current = clampedIndex; 
      // [수정] ProgressBar를 위한 state 업데이트
      setLiveFocusIndex(clampedIndex); 
      
    } else if (dragModeRef.current === 'vertical') {
      const rotSensitivity = 200;
      const newRotationX = startRotation.current[0] - my / rotSensitivity;
      const clampedRotationX = Math.max(-MAX_VERTICAL_ROTATION, Math.min(MAX_VERTICAL_ROTATION, newRotationX));
      
      // [수정] 현재값(ref)을 즉시 업데이트
      currentRotationRef.current = [clampedRotationX, startRotation.current[1], startRotation.current[2]]; 
    }

    if (last) {
      // [수정] 목표값(state)을 설정하여 'damp'가 작동하도록 함
      setTargetOpacity(1); 
      
      if (dragModeRef.current === 'horizontal') {
        // 스냅
        setTargetFocusIndex(Math.round(currentFocusIndexRef.current));
      }
      if (dragModeRef.current !== 'horizontal') {
        // 회전 복귀
        setTargetRotation(INITIAL_ROTATION); 
      }
      dragModeRef.current = 'none';
    }
  });

  const handleNavClick = (targetIndex) => {
    setTargetFocusIndex(targetIndex);
  };
  
  const handleSeek = (targetIndex) => {
    setTargetFocusIndex(targetIndex);
  };
  
  if (!layers || layers.length === 0) return null;

  return (
    <div className="w-full h-full relative">
      <div 
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        {...bind()}
      >
        <Canvas
          gl={{ alpha: true }}
          style={{ background: 'linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113)' }}
          camera={{ position: [0, 20, 150], fov: 60 }}
          onCreated={({ scene }) => { scene.background = null; }}
        >
          {/* [수정] SceneWrapper가 3D 객체와 useFrame 로직을 관리 */}
          <SceneWrapper
            layers={layers}
            targetFocusIndex={targetFocusIndex}
            targetRotation={targetRotation}
            targetOpacity={targetOpacity}
            currentFocusIndexRef={currentFocusIndexRef}
            currentRotationRef={currentRotationRef}
            currentOpacityRef={currentOpacityRef}
            dragModeRef={dragModeRef}
            onLiveIndexUpdate={setLiveFocusIndex}
          />
        </Canvas>
      </div>

      <div className="absolute bottom-8 left-4 right-4 md:bottom-10 md:left-10 md:right-10">
        <ProgressBar 
          // [수정] 'liveFocusIndex' state 전달
          liveIndex={liveFocusIndex}
          displayIndex={Math.round(liveFocusIndex)}
          totalLayers={layers.length}
          onSeek={handleSeek}
          sizeChangeIndices={sizeChangeIndices}
        />
      </div>
    </div>
  );
}