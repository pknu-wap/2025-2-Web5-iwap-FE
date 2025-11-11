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

// --- 애니메이션 속도 (Constant Speed) 상수 ---
// [수정] 페이즈(크기)별 *등속 이동 속도* (초당 인덱스)를 정의합니다.
// 5개의 레이어 크기 그룹에 대해 [페이즈1, 페이즈2, 페이즈3, 페이즈4, 페이즈5] 순서로
// 속도(Units/Sec) 값을 직접 지정합니다.

// (1) '재생' 속도: 로딩 시, 프로그레스 바의 시작/끝 클릭 시 (느림)
const SPEEDS_AUTOPLAY = [
  96, // 페이즈 1 (0-64 / 64개)
  384, // 페이즈 2 (64-320 / 256개)
  960, // 페이즈 3 (320-960 / 640개)
  1920, // 페이즈 4 (960-2240 / 1280개)
  3840  // 페이즈 5 (2240-4800 / 2560개)
];

// (2) '탐색' 속도: 프로그레스 바의 중간 지점 클릭 또는 드래그 스냅 시 (빠름)
const SPEEDS_SEEK = [
  96, // 페이즈 1 (0-64 / 64개)
  384, // 페이즈 2 (64-320 / 256개)
  960, // 페이즈 3 (320-960 / 640개)
  1920, // 페이즈 4 (960-2240 / 1280개)
  3840  // 페이즈 5 (2240-4800 / 2560개)
];

// --- [유지] 이하 Damping 상수는 부드러운 효과를 위해 그대로 사용 ---

// (3) '확대/축소' 속도: 레이어가 포커스될 때 확대/축소되는 속도
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
 * 개별 레이어 컴포넌트 (이미지 또는 텍스트).
 * useFrame을 통해 자신의 스케일, 투명도, Z위치를 독립적으로 애니메이션합니다.
 */
function AnimatedElement({ layer, focusIndex, globalOpacity }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const textMaterialRef = useRef();

  const currentScale = useRef(1);
  const currentOpacity = useRef(0.1);

  useFrame((state, delta) => {
    // 1. 타겟 값 계산
    const distance = layer.originalIndex - focusIndex;
    const absDist = Math.abs(distance);

    const targetScale = Math.max(1, FOCUS_SCALE - absDist * 0.5);
    const targetLayerOpacity = Math.max(minOpacity, 1.0 - absDist / 3);

    // 2. 현재 값 -> 타겟 값으로 Damping (속도 상수 적용)
    currentScale.current = THREE.MathUtils.damp(
      currentScale.current,
      targetScale,
      DAMP_FACTOR_SCALE, // 확대/축소 속도
      delta
    );

    currentOpacity.current = THREE.MathUtils.damp(
      currentOpacity.current,
      targetLayerOpacity,
      DAMP_FACTOR_LAYER_OPACITY, // 레이어 투명도 속도
      delta
    );

    // 3. 실제 3D 객체에 계산된 값 적용
    const finalZ = -distance * Z_OFFSET;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(currentScale.current);
      meshRef.current.position.z = finalZ;
    }

    // 개별 레이어 투명도와 전역(드래그) 투명도를 곱하여 최종 투명도 설정
    const finalOpacity = currentOpacity.current * globalOpacity;
    if (materialRef.current) materialRef.current.opacity = finalOpacity;
    if (textMaterialRef.current) textMaterialRef.current.opacity = finalOpacity;
  });

  // 레이어 타입(이미지/텍스트)에 따라 지오메트리 생성
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
 * 3D 씬 컨테이너.
 * 렌더링 윈도우(최적화) 로직을 담당하고 AnimatedElement를 렌더링합니다.
 */
function Scene({ layers, focusIndex, rotation, opacity }) {
  const [visibleLayers, setVisibleLayers] = useState([]);

  // 렌더링 윈도우 계산: 현재 포커스 주변의 레이어만 'visibleLayers' 상태로 관리
  useFrame(() => {
    if (!layers || layers.length === 0) return;

    const currentFocus = focusIndex;
    const startIndex = Math.max(
      0,
      Math.floor(currentFocus) - RENDER_WINDOW_SIZE
    );
    const endIndex = Math.min(
      layers.length,
      Math.ceil(currentFocus) + RENDER_WINDOW_SIZE + 1
    );

    if (
      visibleLayers.length === 0 ||
      visibleLayers[0]?.originalIndex !== startIndex ||
      visibleLayers[visibleLayers.length - 1]?.originalIndex !== endIndex - 1
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
      </group>
    </>
  );
}

/**
 * [추가] 현재 인덱스가 몇 번째 페이즈(0~4)에 속하는지 계산하는 헬퍼 함수
 */
const getPhaseFromIndex = (roundedIndex, sizeIndices) => {
  if (!sizeIndices || sizeIndices.length === 0) return 0;
  
  // 현재 인덱스보다 '큰' 첫 번째 변경 지점의 인덱스를 찾습니다.
  const nextChangeIdx = sizeIndices.findIndex(idx => idx > roundedIndex);
  
  if (nextChangeIdx === -1) {
    // 찾지 못했다면 마지막 페이즈입니다. (예: 5페이즈면 인덱스 4)
    return sizeIndices.length;
  }
  
  // 찾았다면, 그 인덱스가 현재 페이즈입니다.
  return nextChangeIdx;
};


/**
 * R3F의 useFrame을 실행하는 메인 래퍼.
 * 전역 상태(포커스, 회전, 카메라)를 관리하고 애니메이션(Damping)을 수행합니다.
 */
/**
 * R3F의 useFrame을 실행하는 메인 래퍼.
 * 전역 상태(포커스, 회전, 카메라)를 관리하고 애니메이션(Damping)을 수행합니다.
 */
function SceneWrapper({
  layers,
  targetFocusIndex,
  targetRotation,
  targetOpacity,
  currentFocusIndexRef,
  currentRotationRef,
  currentOpacityRef,
  dragModeRef,
  onLiveIndexUpdate,
  currentFocusDampFactorRef, // 이름은 Damp Factor지만, 실제로는 'mode' (AUTOPLAY/SEEK)를 가짐
  sizeChangeIndices
}) {
  useFrame((state, delta) => {
    const dragMode = dragModeRef.current;

    // --- 속도 계산 로직 (등속) ---

    // 1. 현재 모드 ('AUTOPLAY' 또는 'SEEK') 가져오기
    const mode = currentFocusDampFactorRef.current;

    // 2. 현재 레이어 정보 가져오기 (카메라 로직과 공유)
    const ci = currentFocusIndexRef.current;
    const roundedIndex = Math.min(
      layers.length - 1,
      Math.max(0, Math.round(ci))
    );
    const layer = layers[roundedIndex];

    // 3. 현재 페이즈(0~4) 계산
    const currentPhase = getPhaseFromIndex(roundedIndex, sizeChangeIndices);

    // 4. 모드와 페이즈에 맞는 *이동 속도* (units/sec) '조회'
    let speed;
    if (mode === 'AUTOPLAY') {
      speed = SPEEDS_AUTOPLAY[currentPhase];
    } else {
      // mode === 'SEEK'
      speed = SPEEDS_SEEK[currentPhase];
    }

    // (안전 장치) 만약 정의되지 않은 페이즈가 되면 0번 페이즈 값 사용
    if (speed === undefined) {
      speed =
        mode === 'AUTOPLAY'
          ? SPEEDS_AUTOPLAY[0]
          : SPEEDS_SEEK[0];
    }

    // 1. 포커스 인덱스 보간 (레이어 이동) [수정: 등속 이동]
    if (dragMode !== 'horizontal') {
      const current = currentFocusIndexRef.current;
      const target = targetFocusIndex;
      
      // 이 프레임에서 이동할 거리 (속도 * 시간)
      const step = speed * delta;

      // [수정] THREE.MathUtils.moveTowards는 존재하지 않으므로
      // 등속 이동 로직을 수동으로 구현합니다.
      const distance = target - current;

      if (Math.abs(distance) <= step) {
        currentFocusIndexRef.current = target; // 목표 도달
      } else {
        currentFocusIndexRef.current = current + Math.sign(distance) * step; // 등속 이동
      }
    }

    // --- 이하 로직은 댐핑(damp) 유지 ---

    // 2. 회전값 보간 (damp 유지)
    if (dragMode !== 'vertical') {
      const [rx, ry, rz] = currentRotationRef.current;
      const [tr, ty, tz] = targetRotation;
      currentRotationRef.current = [
        THREE.MathUtils.damp(rx, tr, DAMP_FACTOR_ROTATION, delta),
        THREE.MathUtils.damp(ry, ty, DAMP_FACTOR_ROTATION, delta),
        THREE.MathUtils.damp(rz, tz, DAMP_FACTOR_ROTATION, delta),
      ];
    }

    // 3. 전역 투명도 보간 (damp 유지)
    currentOpacityRef.current = THREE.MathUtils.damp(
      currentOpacityRef.current,
      targetOpacity,
      DAMP_FACTOR_OPACITY,
      delta
    );

    // 4. ProgressBar UI 업데이트 (변경 없음)
    onLiveIndexUpdate(currentFocusIndexRef.current);

    // 5. 동적 카메라 거리 조절 (damp 유지)
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
      focusIndex={currentFocusIndexRef.current}
      rotation={currentRotationRef.current}
      opacity={currentOpacityRef.current}
    />
  );
}

/**
 * 메인 컴포넌트.
 * 레이어 데이터를 처리하고, 상태를 관리하며, 드래그 이벤트를 바인딩합니다.
 */
export default function ImageGridLayers({ layersData }) {
  // '목표값' state: 애니메이션이 도달해야 할 최종 값
  const [targetFocusIndex, setTargetFocusIndex] = useState(0);
  const [targetRotation, setTargetRotation] = useState(INITIAL_ROTATION);
  const [targetOpacity, setTargetOpacity] = useState(1);

  // '실시간값' state: ProgressBar UI 업데이트용
  const [liveFocusIndex, setLiveFocusIndex] = useState(0);

  // '현재값' ref: useFrame에서 직접 조작될 실제 3D 씬의 값
  const currentFocusIndexRef = useRef(0);
  const currentRotationRef = useRef(INITIAL_ROTATION);
  const currentOpacityRef = useRef(1);
  // [유지] 현재 적용할 이동 속도 '모드' ref ('AUTOPLAY' 또는 'SEEK')
  const currentFocusDampFactorRef = useRef('AUTOPLAY');

  // 입력된 데이터를 3D 씬에서 사용할 수 있도록 가공 (텍스처 생성 등)
  const { layers, sizeChangeIndices } = useMemo(() => {
    try {
      if (
        !layersData ||
        !layersData.layers ||
        typeof layersData.layers !== 'object'
      ) {
        return { layers: [], sizeChangeIndices: [] };
      }

      const actualLayers = layersData.layers;

      // 데이터 구조에서 2D 배열(이미지) 추출
      const extract2DArrays = (data) => {
        if (
          Array.isArray(data) &&
          Array.isArray(data[0]) &&
          typeof data[0][0] === 'number'
        )
          return [data];
        if (Array.isArray(data))
          return data.flatMap((item) => extract2DArrays(item));
        return [];
      };

      // 'fc' (Fully Connected) 레이어를 제외한 모든 이미지 레이어 추출
      const allImageData = Object.entries(actualLayers)
        .filter(([key]) => key !== 'fc')
        .flatMap(([key, value]) =>
          extract2DArrays(value).map((arr, index) => ({
            id: `${key}_${index}`,
            brightnessArray: arr,
          }))
        );

      // 이미지 배열을 THREE.DataTexture로 변환
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
            data,
            width,
            height,
            THREE.RGBAFormat,
            THREE.UnsignedByteType
          );
          texture.needsUpdate = true;
          texture.flipY = true;
          texture.minFilter = THREE.NearestFilter;
          texture.magFilter = THREE.NearestFilter;

          return { ...item, texture, width, height, originalIndex: i };
        })
        .filter(Boolean);

      // 'fc' 레이어가 있다면, 최종 예측 숫자를 텍스트 레이어로 추가
      if (
        actualLayers.fc &&
        Array.isArray(actualLayers.fc) &&
        actualLayers.fc.length > 0
      ) {
        const fcData = actualLayers.fc[0];
        const predictedIndex = fcData.indexOf(Math.max(...fcData));
        processedLayers.push({
          id: 'final-prediction-text',
          isTextLayer: true,
          text: predictedIndex.toString(),
          originalIndex: processedLayers.length,
        });
      }

      // ProgressBar의 '마커' 계산을 위한 로직 (여기서는 3D 배치와 무관)
      const layersWithPositions = [];
      let currentX = 0;
      processedLayers.forEach((layer, i) => {
        const prevLayer = i > 0 ? processedLayers[i - 1] : null;
        const prevWidth = prevLayer ? prevLayer.width || 100 : 0;
        const currentWidth = layer.width || 100;
        const spacing = prevLayer
          ? prevWidth / 2 + currentWidth / 2 + 25
          : 0;
        currentX += spacing;
        layersWithPositions.push({ ...layer, cumulativeX: currentX });
      });

      // 이미지 크기가 변경되는 지점의 인덱스 계산 (ProgressBar 마커용)
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
      console.error(
        '[ImageGridLayers] Error: Failed to process and memoize layers:',
        error
      );
      return { layers: [], sizeChangeIndices: [] };
    }
  }, [layersData]);

  // 페이지 로딩 시: 0.75초 지연 후, 마지막 레이어로 '재생'(AUTOPLAY) 속도로 이동
  useEffect(() => {
    if (layers.length > 0) {
      const timer = setTimeout(() => {
        currentFocusDampFactorRef.current = 'AUTOPLAY';
        setTargetFocusIndex(layers.length - 1);
      }, 750); // 0.75초 지연

      // 컴포넌트 언마운트 시 타이머 정리
      return () => clearTimeout(timer);
    }
  }, [layers.length]);

  // 드래그 시작 시점의 값 저장을 위한 ref
  const startRotation = useRef([0, 0, 0]);
  const dragModeRef = useRef('none');
  const startFocusIndex = useRef(0);

  // @use-gesture/react 드래그 이벤트 핸들러
  const bind = useDrag(({ first, last, active, movement: [mx, my] }) => {
    const deadzone = 10; // 드래그 시작을 인지하는 최소 픽셀

    // 드래그 시작
    if (first) {
      startRotation.current = currentRotationRef.current;
      startFocusIndex.current = currentFocusIndexRef.current;
      dragModeRef.current = 'none';
    }

    // 드래그 중

    // 드래그 방향(가로/세로) 결정
    if (
      dragModeRef.current === 'none' &&
      (Math.abs(mx) > deadzone || Math.abs(my) > deadzone)
    ) {
      dragModeRef.current =
        Math.abs(my) > Math.abs(mx) * 2 ? 'vertical' : 'horizontal';
    }

    // 가로 드래그: 레이어 탐색
    if (dragModeRef.current === 'horizontal') {
      const indexSensitivity = 15;
      const newIndex = -(mx / indexSensitivity) + startFocusIndex.current;
      const clampedIndex = Math.max(0, Math.min(layers.length - 1, newIndex));

      // 드래그 중에는 Damping 없이 즉시 현재값(ref)을 업데이트하여 반응성 향상
      currentFocusIndexRef.current = clampedIndex;
      setLiveFocusIndex(clampedIndex);

      // 세로 드래그: 씬 회전
    } else if (dragModeRef.current === 'vertical') {
      const rotSensitivity = 200;
      const newRotationX = startRotation.current[0] - my / rotSensitivity;
      const clampedRotationX = Math.max(
        -MAX_VERTICAL_ROTATION,
        Math.min(MAX_VERTICAL_ROTATION, newRotationX)
      );

      currentRotationRef.current = [
        clampedRotationX,
        startRotation.current[1],
        startRotation.current[2],
      ];
    }

    // 드래그 종료
    if (last) {
      if (dragModeRef.current === 'horizontal') {
        // 드래그 종료 시 '탐색'(SEEK) 모드로 스냅
        currentFocusDampFactorRef.current = 'SEEK';
        setTargetFocusIndex(Math.round(currentFocusIndexRef.current));
      }
      if (dragModeRef.current !== 'horizontal') {
        // 세로 드래그 종료 시 초기 각도로 복귀
        setTargetRotation(INITIAL_ROTATION);
      }
      dragModeRef.current = 'none';
    }
  });

  // ProgressBar 클릭 이벤트 핸들러
  const handleSeek = (targetIndex) => {
    if (targetIndex === 0 || targetIndex === layers.length - 1) {
      // 시작/끝 클릭: '재생'(AUTOPLAY) 모드
      currentFocusDampFactorRef.current = 'AUTOPLAY';
    } else {
      // 중간 클릭: '탐색'(SEEK) 모드
      currentFocusDampFactorRef.current = 'SEEK';
    }
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
          style={{
            background:
              'linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113)',
          }}
          camera={{ position: [0, 0, BASE_CAMERA_Z], fov: 60 }}
          onCreated={({ scene }) => {
            scene.background = null;
          }}
        >
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
            currentFocusDampFactorRef={currentFocusDampFactorRef}
            sizeChangeIndices={sizeChangeIndices} 
          />
        </Canvas>
      </div>

      <div className="absolute bottom-8 left-4 right-4 md:bottom-10 md:left-10 md:right-10">
        <ProgressBar
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