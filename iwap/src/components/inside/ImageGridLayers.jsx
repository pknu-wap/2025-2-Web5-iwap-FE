'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import ProgressBar from '@/components/inside/ProgressBar';

// --- 설정 상수 ---

// 렌더링 최적화: 현재 포커스된 레이어 주변으로 몇 개까지 미리 렌더링할지 결정
const RENDER_WINDOW_SIZE = 50;
// 사용자 드래그: 세로 드래그 시 최대 회전 각도 (라디안)
const MAX_VERTICAL_ROTATION = Math.PI / 4;
// 레이어 배치: Z축(깊이) 방향으로 레이어 사이의 기본 간격
const Z_OFFSET = 15;
// 초기 카메라 각도: [x, y, z] (오른쪽 위에서 내려다보는 사선)
const INITIAL_ROTATION = [0.45, -0.35, 0];
// 포커스 애니메이션: 현재 선택된 레이어의 확대 배율
const FOCUS_SCALE = 2.0;
// 최소 투명도
const minOpacity = 0.65;

const CUTOFF_INDEX = 2240; // 등속/댐핑 전환 인덱스

// --- [수정] 1. 등속 이동 (0 ~ 2239) - 4개 페이즈
const SPEEDS_AUTOPLAY = [48, 128, 256, 320]; // 5번째 값 제거

// --- [유지] 2. 댐핑 이동 (2240 이후) ---
const DAMP_FOCUS_AUTOPLAY = 3;
const DAMP_FOCUS_SEEK = 4;

// --- [유지] 기타 댐핑 상수 ---
const DAMP_FACTOR_SCALE = 4;
// (4) '레이어 투명도' 속도: 주변 레이어의 투명도가 변경되는 속도
const DAMP_FACTOR_LAYER_OPACITY = 8;
// (5) '회전 복귀' 속도: 사용자가 세로 드래그를 놓았을 때 원래 각도로 돌아오는 속도
const DAMP_FACTOR_ROTATION = 8;
// (6) '전역 투명도' 속도: 드래그 시 전체 씬이 반투명해지는 속도
const DAMP_FACTOR_OPACITY = 8;


// --- 동적 카메라 상수 ---

// 카메라 기본 Z 위치 (화면과의 거리)
const BASE_CAMERA_Z = 175;
// 레이어 크기 비례 카메라 거리: 레이어 크기에 따라 카메라가 추가로 멀어지는 비율
const CAMERA_SIZE_FACTOR = 1.2;
// 카메라 이동 속도: 레이어 크기 변경 시 카메라 거리가 조절되는 속도
const DAMP_FACTOR_CAMERA = 4;


/**
 * 개별 레이어 컴포넌트 (변경 없음).
 */
function AnimatedElement({ layer, focusIndex, globalOpacity }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const textMaterialRef = useRef();
  const currentScale = useRef(1);
  const currentOpacity = useRef(0.1);

  useFrame((state, delta) => {
    const distance = layer.originalIndex - focusIndex;
    const absDist = Math.abs(distance);
    const targetScale = Math.max(1, FOCUS_SCALE - absDist * 0.5);
    const targetLayerOpacity = Math.max(minOpacity, 1.0 - absDist / 3);

    currentScale.current = THREE.MathUtils.damp(
      currentScale.current, targetScale, DAMP_FACTOR_SCALE, delta
    );
    currentOpacity.current = THREE.MathUtils.damp(
      currentOpacity.current, targetLayerOpacity, DAMP_FACTOR_LAYER_OPACITY, delta
    );

    const finalZ = -distance * Z_OFFSET;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(currentScale.current);
      meshRef.current.position.z = finalZ;
    }
    const finalOpacity = currentOpacity.current * globalOpacity;
    if (materialRef.current) materialRef.current.opacity = finalOpacity;
    if (textMaterialRef.current) textMaterialRef.current.opacity = finalOpacity;
  });

  const geometry = useMemo(
    () =>
      layer.isTextLayer
        ? null
        : new THREE.PlaneGeometry(layer.width, layer.height),
    [layer.isTextLayer, layer.width, layer.height]
  );

  return layer.isTextLayer ? (
    <group ref={meshRef} position={[0, 0, 0]}>
      <Text
        font="/fonts/static/Pretendard-Thin.otf"
        fontSize={100}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {layer.text}
        <meshStandardMaterial ref={textMaterialRef} color="white" transparent />
      </Text>
    </group>
  ) : (
    <mesh ref={meshRef} position={[0, 0, 0]} geometry={geometry}>
      <meshStandardMaterial
        ref={materialRef}
        map={layer.texture}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

/**
 * 3D 씬 컨테이너 (변경 없음 - textLayer 별도 렌더링).
 */
function Scene({ layers, textLayer, focusIndex, rotation, opacity }) {
  const [visibleLayers, setVisibleLayers] = useState([]);

  useFrame(() => {
    if (!layers || layers.length === 0) return;
    const currentFocus = focusIndex;
    const startIndex = Math.max(0, Math.floor(currentFocus) - RENDER_WINDOW_SIZE);
    const endIndex = Math.min(layers.length, Math.ceil(currentFocus) + RENDER_WINDOW_SIZE + 1);

    if (
      visibleLayers.length === 0 ||
      !visibleLayers[0] ||
      visibleLayers[0].originalIndex !== startIndex ||
      visibleLayers[visibleLayers.length - 1].originalIndex !== endIndex - 1
    ) {
      setVisibleLayers(layers.slice(startIndex, endIndex));
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[0, 50, 50]} intensity={1} />
      <group rotation={rotation}>
        {visibleLayers.map((layer) => (
          <AnimatedElement
            key={layer.id}
            layer={layer}
            focusIndex={focusIndex}
            globalOpacity={opacity}
          />
        ))}
        {textLayer && (
          <AnimatedElement
            key={textLayer.id}
            layer={textLayer}
            focusIndex={focusIndex}
            globalOpacity={opacity}
          />
        )}
      </group>
    </>
  );
}

/**
 * 등속 이동 페이즈 계산 헬퍼 함수 (변경 없음).
 */
const getPhaseFromIndex = (roundedIndex, sizeIndices) => {
  if (!sizeIndices || sizeIndices.length === 0) return 0;
  const nextChangeIdx = sizeIndices.findIndex(idx => idx > roundedIndex);
  if (nextChangeIdx === -1) {
    return sizeIndices.length;
  }
  return nextChangeIdx;
};


/**
 * R3F의 useFrame을 실행하는 메인 래퍼.
 * [수정] 'autoplay' 모드의 if 조건을 'ci' 기준으로만 판단
 */
function SceneWrapper({
  layers,
  textLayer,
  targetFocusIndex,
  targetRotation,
  targetOpacity,
  currentFocusIndexRef,
  currentRotationRef,
  currentOpacityRef,
  onLiveIndexUpdate,
  currentFocusDampFactorRef, // 'AUTOPLAY' 또는 'SEEK' 모드
  sizeChangeIndices
}) {
  useFrame((state, delta) => {
    const ci = currentFocusIndexRef.current;
    const target = targetFocusIndex;
    const mode = currentFocusDampFactorRef.current; // 'AUTOPLAY' or 'SEEK'

    // 1. 포커스 인덱스 보간
    if (mode === 'SEEK') {
      // --- (A) 'SEEK' 모드: 항상 Damping ---
      const dampFactor = DAMP_FOCUS_SEEK;
      currentFocusIndexRef.current = THREE.MathUtils.damp(
        ci,
        target,
        dampFactor,
        delta
      );
    } else {
      // --- (B) 'AUTOPLAY' 모드: 하이브리드 (등속 or 댐핑) ---
      
      // [수정] 분기 조건을 'target'과 무관하게 '현재 위치(ci)'로만 판단
      if (ci < CUTOFF_INDEX) { 
        // (B-1) 현재 2240 이전 구간: 등속
        const roundedIndex = Math.min(layers.length - 1, Math.max(0, Math.round(ci)));
        const currentPhase = getPhaseFromIndex(roundedIndex, sizeChangeIndices);
        
        let speed = SPEEDS_AUTOPLAY[currentPhase];
        if (speed === undefined) speed = SPEEDS_AUTOPLAY[0]; // 안전 장치

        const step = speed * delta;
        const distance = target - ci;

        // 등속으로 이동 시 타겟을 지나치지 않도록 처리
        if (Math.abs(distance) <= step) {
          currentFocusIndexRef.current = target;
        } else {
          currentFocusIndexRef.current = ci + Math.sign(distance) * step;
        }
      } else {
        // (B-2) 현재 2240 이후 구간: 댐핑
        const dampFactor = DAMP_FOCUS_AUTOPLAY;
        currentFocusIndexRef.current = THREE.MathUtils.damp(
          ci,
          target,
          dampFactor,
          delta
        );
      }
    }

    // 2. 회전값 보간 (damp 유지)
    const [rx, ry, rz] = currentRotationRef.current;
    const [tr, ty, tz] = targetRotation;
    currentRotationRef.current = [
      THREE.MathUtils.damp(rx, tr, DAMP_FACTOR_ROTATION, delta),
      THREE.MathUtils.damp(ry, ty, DAMP_FACTOR_ROTATION, delta),
      THREE.MathUtils.damp(rz, tz, DAMP_FACTOR_ROTATION, delta),
    ];

    // 3. 전역 투명도 보간 (damp 유지)
    currentOpacityRef.current = THREE.MathUtils.damp(
      currentOpacityRef.current,
      targetOpacity,
      DAMP_FACTOR_OPACITY,
      delta
    );

    // 4. ProgressBar UI 업데이트
    onLiveIndexUpdate(currentFocusIndexRef.current);

    // 5. 동적 카메라 거리 조절 (damp 유지)
    const totalLayers = layers.length + (textLayer ? 1 : 0);
    const roundedIndex = Math.min(
      totalLayers - 1,
      Math.max(0, Math.round(currentFocusIndexRef.current))
    );
    const layer = (roundedIndex === layers.length && textLayer) 
                  ? textLayer 
                  : layers[roundedIndex];
                  
    if (layer) {
      const layerWidth = layer.width || (layer.isTextLayer ? 100 : 28);
      const targetZ = BASE_CAMERA_Z + layerWidth * CAMERA_SIZE_FACTOR;

      state.camera.position.z = THREE.MathUtils.damp(
        state.camera.position.z,
        targetZ,
        DAMP_FACTOR_CAMERA,
        delta
      );
      state.camera.updateProjectionMatrix();
    }
  });

  return (
    <Scene
      layers={layers}
      textLayer={textLayer}
      focusIndex={currentFocusIndexRef.current}
      rotation={currentRotationRef.current}
      opacity={currentOpacityRef.current}
    />
  );
}

/**
 * 메인 컴포넌트 (변경 없음 - textLayer 분리).
 */
export default function ImageGridLayers({ layersData }) {
  const [targetFocusIndex, setTargetFocusIndex] = useState(0);
  const [targetRotation, setTargetRotation] = useState(INITIAL_ROTATION);
  const [targetOpacity, setTargetOpacity] = useState(1);
  const [liveFocusIndex, setLiveFocusIndex] = useState(0);

  const currentFocusIndexRef = useRef(0);
  const currentRotationRef = useRef(INITIAL_ROTATION);
  const currentOpacityRef = useRef(1);
  const currentFocusDampFactorRef = useRef('AUTOPLAY');

  const { layers, textLayer, sizeChangeIndices } = useMemo(() => {
    try {
      if (!layersData || !layersData.layers || typeof layersData.layers !== 'object') {
        return { layers: [], textLayer: null, sizeChangeIndices: [] };
      }
      const actualLayers = layersData.layers;
      const extract2DArrays = (data) => {
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number')
          return [data];
        if (Array.isArray(data))
          return data.flatMap((item) => extract2DArrays(item));
        return [];
      };

      const allImageData = Object.entries(actualLayers)
        .filter(([key]) => key !== 'fc')
        .flatMap(([key, value]) =>
          extract2DArrays(value).map((arr, index) => ({
            id: `${key}_${index}`,
            brightnessArray: arr,
          }))
        );

      const processedLayers = allImageData
        .map((item, i) => {
          const { brightnessArray } = item;
          const height = brightnessArray.length;
          const width = brightnessArray[0].length;
          const flatArray = brightnessArray.flat();
          const data = new Uint8Array(width * height * 4);
          for (let j = 0; j < flatArray.length; j++) {
            const brightness = flatArray[j];
            data.set([brightness, brightness, brightness, 255], j * 4);
          }
          const texture = new THREE.DataTexture(
            data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType
          );
          texture.needsUpdate = true;
          texture.flipY = true;
          texture.minFilter = THREE.NearestFilter;
          texture.magFilter = THREE.NearestFilter;
          return { ...item, texture, width, height, originalIndex: i };
        })
        .filter(Boolean);

      let textLayer = null;
      if (actualLayers.fc && Array.isArray(actualLayers.fc) && actualLayers.fc.length > 0) {
        const fcData = actualLayers.fc[0];
        const predictedIndex = fcData.indexOf(Math.max(...fcData));
        textLayer = {
          id: 'final-prediction-text',
          isTextLayer: true,
          text: predictedIndex.toString(),
          originalIndex: processedLayers.length,
        };
      }

      const layersWithPositions = [];
      let currentX = 0;
      processedLayers.forEach((layer, i) => {
        const prevLayer = i > 0 ? processedLayers[i - 1] : null;
        const prevWidth = prevLayer ? prevLayer.width || 100 : 0;
        const currentWidth = layer.width || 100;
        const spacing = prevLayer ? prevWidth / 2 + currentWidth / 2 + 25 : 0;
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
      
      return { layers: layersWithPositions, textLayer, sizeChangeIndices };
      
    } catch (error) {
      console.error('[ImageGridLayers] Error: Failed to process and memoize layers:', error);
      return { layers: [], textLayer: null, sizeChangeIndices: [] };
    }
  }, [layersData]);

  const totalLayers = layers.length + (textLayer ? 1 : 0);

  useEffect(() => {
    if (totalLayers > 0) {
      const timer = setTimeout(() => {
        currentFocusDampFactorRef.current = 'AUTOPLAY';
        setTargetFocusIndex(totalLayers - 1);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [totalLayers]);

  const startRotation = useRef([0, 0, 0]);
  const dragModeRef = useRef('none');
  const startFocusIndex = useRef(0);

  // @use-gesture/react 드래그 이벤트 핸들러 (변경 없음)
  const bind = useDrag(({ first, last, active, movement: [mx, my] }) => {
    const deadzone = 10;
    if (first) {
      startRotation.current = currentRotationRef.current;
      startFocusIndex.current = currentFocusIndexRef.current;
      dragModeRef.current = 'none';
      currentFocusDampFactorRef.current = 'SEEK';
    }

    if (dragModeRef.current === 'none' && (Math.abs(mx) > deadzone || Math.abs(my) > deadzone)) {
      dragModeRef.current = Math.abs(my) > Math.abs(mx) * 2 ? 'vertical' : 'horizontal';
    }

    if (dragModeRef.current === 'horizontal') {
      const indexSensitivity = 15;
      const newIndex = -(mx / indexSensitivity) + startFocusIndex.current;
      const clampedIndex = Math.max(0, Math.min(totalLayers - 1, newIndex));
      setTargetFocusIndex(clampedIndex);
      currentFocusIndexRef.current = clampedIndex;
      setLiveFocusIndex(clampedIndex);
    } else if (dragModeRef.current === 'vertical') {
      const rotSensitivity = 200;
      const newRotationX = startRotation.current[0] - my / rotSensitivity;
      const clampedRotationX = Math.max(-MAX_VERTICAL_ROTATION, Math.min(MAX_VERTICAL_ROTATION, newRotationX));
      const newRot = [clampedRotationX, startRotation.current[1], startRotation.current[2]];
      setTargetRotation(newRot);
      currentRotationRef.current = newRot;
    }

    if (last) {
      if (dragModeRef.current === 'horizontal') {
        currentFocusDampFactorRef.current = 'SEEK';
        setTargetFocusIndex(Math.round(currentFocusIndexRef.current));
      }
      if (dragModeRef.current === 'vertical') {
        setTargetRotation(INITIAL_ROTATION);
      }
      dragModeRef.current = 'none';
    }
  });

  // ProgressBar 클릭 이벤트 핸들러 (변경 없음)
  const handleSeek = (targetIndex) => {
    if (targetIndex === totalLayers - 1) {
      currentFocusDampFactorRef.current = 'AUTOPLAY';
    } else {
      currentFocusDampFactorRef.current = 'SEEK';
    }
    setTargetFocusIndex(targetIndex);
  };

  if (totalLayers === 0) return null;

  // 렌더링 (변경 없음)
  return (
    <div className="w-full h-full relative">
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        {...bind()}
      >
        <Canvas
          gl={{ alpha: true }}
          style={{
            background: 'linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113)',
          }}
          camera={{ position: [0, 0, BASE_CAMERA_Z], fov: 60 }}
          onCreated={({ scene }) => { scene.background = null; }}
        >
          <SceneWrapper
            layers={layers}
            textLayer={textLayer}
            targetFocusIndex={targetFocusIndex}
            targetRotation={targetRotation}
            targetOpacity={targetOpacity}
            currentFocusIndexRef={currentFocusIndexRef}
            currentRotationRef={currentRotationRef}
            currentOpacityRef={currentOpacityRef}
            onLiveIndexUpdate={setLiveFocusIndex}
            currentFocusDampFactorRef={currentFocusDampFactorRef}
            sizeChangeIndices={sizeChangeIndices}
          />
        </Canvas>
      </div>

      <div className="absolute bottom-8 left-4 right-4 md:bottom-10 md:left-10 md:right-10">
        <ProgressBar
          liveIndex={liveFocusIndex}
          displayIndex={Math.round(liveFocusIndex)}
          totalLayers={totalLayers}
          onSeek={handleSeek}
          sizeChangeIndices={sizeChangeIndices}
        />
      </div>
    </div>
  );
}