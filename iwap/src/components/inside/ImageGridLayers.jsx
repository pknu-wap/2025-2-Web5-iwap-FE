'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import ProgressBar from '@/components/inside/ProgressBar';
import { useTheme } from "@/components/theme/ThemeProvider";

// --- [최적화 설정] ---
// 한 번에 렌더링할 레이어 수 
// 50개 이상 설정 시 투명도 겹침(Overdraw)으로 인해 GPU가 멈출 수 있음.
const RENDER_WINDOW_SIZE = 40; 

// 물리/애니메이션 상수
const MAX_VERTICAL_ROTATION = Math.PI / 4;
const Z_OFFSET = 15;
const INITIAL_ROTATION = [0.45, -0.35, 0];
const FOCUS_SCALE = 2.0;
const MIN_OPACITY = 0.65;
const CUTOFF_INDEX = 2240; 

const SPEEDS_AUTOPLAY = [48, 128, 256, 320]; 

// 댐핑(반응) 속도 관련
const DAMP_FACTOR_SCALE = 4;
const DAMP_FACTOR_LAYER_OPACITY = 8;
const DAMP_FACTOR_ROTATION = 10; // 회전 복귀 속도
const DAMP_FACTOR_OPACITY = 8;
const DAMP_FOCUS_SEEK = 5;       // 드래그 시 따라오는 속도
const DAMP_FOCUS_AUTOPLAY = 3;   // 자동 재생 시 속도

// 카메라 관련
const BASE_CAMERA_Z = 175;
const CAMERA_SIZE_FACTOR = 1.2;
const DAMP_FACTOR_CAMERA = 4;

/**
 * 개별 레이어 컴포넌트 (변경 없음)
 * useRef를 사용하여 매 프레임 직접 DOM(Mesh)을 조작합니다.
 */
function AnimatedElement({ layer, focusIndexRef, globalOpacityRef }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const textMaterialRef = useRef();
  
  // 애니메이션 상태 로컬 저장 (부드러운 보간용)
  const currentScale = useRef(1);
  const currentOpacity = useRef(0.1);

  useFrame((state, delta) => {
    // Delta Cap: 프레임 드랍 시 델타값이 튀는 것을 방지
    const dt = Math.min(delta, 0.1);
    
    // Ref에서 현재 값을 직접 읽어옴 (Re-render 없음)
    const focusIndex = focusIndexRef.current;
    const globalOpacity = globalOpacityRef.current;

    const distance = layer.originalIndex - focusIndex;
    const absDist = Math.abs(distance);

    // 타겟 값 계산
    const targetScale = Math.max(1, FOCUS_SCALE - absDist * 0.5);
    const targetLayerOpacity = Math.max(MIN_OPACITY, 1.0 - absDist / 3);

    // 댐핑 보간
    currentScale.current = THREE.MathUtils.damp(currentScale.current, targetScale, DAMP_FACTOR_SCALE, dt);
    currentOpacity.current = THREE.MathUtils.damp(currentOpacity.current, targetLayerOpacity, DAMP_FACTOR_LAYER_OPACITY, dt);

    // Mesh 업데이트
    const finalZ = -distance * Z_OFFSET;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(currentScale.current);
      meshRef.current.position.z = finalZ;
    }

    // Material 업데이트
    const finalOpacity = currentOpacity.current * globalOpacity;
    if (materialRef.current) materialRef.current.opacity = finalOpacity;
    if (textMaterialRef.current) textMaterialRef.current.opacity = finalOpacity;
  });

  const geometry = useMemo(() => 
    layer.isTextLayer ? null : new THREE.PlaneGeometry(layer.width, layer.height), 
  [layer.isTextLayer, layer.width, layer.height]);

  return layer.isTextLayer ? (
    <group ref={meshRef}>
      <Text font="/fonts/static/Pretendard-Thin.otf" fontSize={100} color={layer.color || "white"} anchorX="center" anchorY="middle">
        {layer.text}
        <meshStandardMaterial ref={textMaterialRef} color={layer.color || "white"} transparent />
      </Text>
    </group>
  ) : (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial ref={materialRef} map={layer.texture} side={THREE.DoubleSide} transparent />
    </mesh>
  );
}

/**
 * Scene 관리자
 * - 가시 영역(Visible Layers) 계산
 * - 3D 그룹 렌더링
 */
function Scene({ layers, textLayer, focusIndexRef, rotationRef, opacityRef }) {
  const [visibleLayers, setVisibleLayers] = useState([]);
  const groupRef = useRef();

  useFrame(() => {
    // 1. 회전값 적용 (Ref를 직접 읽어 Group에 적용)
    if (groupRef.current) {
      const [rx, ry, rz] = rotationRef.current;
      groupRef.current.rotation.set(rx, ry, rz);
    }

    // 2. 가시 영역 계산 (Culling)
    if (!layers || layers.length === 0) return;
    const currentFocus = focusIndexRef.current;
    
    let startIndex = Math.floor(currentFocus) - RENDER_WINDOW_SIZE;
    let endIndex = Math.ceil(currentFocus) + RENDER_WINDOW_SIZE + 1;
    
    // 배열 범위 클램핑
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(layers.length, endIndex);

    // 변경이 있을 때만 State 업데이트 (최적화)
    const prevStart = visibleLayers.length > 0 ? visibleLayers[0].originalIndex : -1;
    const prevEnd = visibleLayers.length > 0 ? visibleLayers[visibleLayers.length - 1].originalIndex + 1 : -1;

    if (prevStart !== startIndex || prevEnd !== endIndex) {
      setVisibleLayers(layers.slice(startIndex, endIndex));
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[0, 50, 50]} intensity={1} />
      {/* 회전은 groupRef를 통해 useFrame에서 직접 제어 */}
      <group ref={groupRef}>
        {visibleLayers.map((layer) => (
          <AnimatedElement key={layer.id} layer={layer} focusIndexRef={focusIndexRef} globalOpacityRef={opacityRef} />
        ))}
        {textLayer && (
          <AnimatedElement key={textLayer.id} layer={textLayer} focusIndexRef={focusIndexRef} globalOpacityRef={opacityRef} />
        )}
      </group>
    </>
  );
}

// 오토플레이 속도 페이즈 계산
const getPhaseFromIndex = (idx, sizeIndices) => {
  if (!sizeIndices || sizeIndices.length === 0) return 0;
  const nextChangeIdx = sizeIndices.findIndex(sIdx => sIdx > idx);
  return nextChangeIdx === -1 ? sizeIndices.length : nextChangeIdx;
};

/**
 * Controller (Logic Brain)
 * - UI가 아닌, 순수 데이터(Ref)만 조작하여 애니메이션 루프를 제어합니다.
 */
function AnimationController({
  layers,
  textLayer,
  sizeChangeIndices,
  modeRef,           // 'AUTOPLAY' | 'DRAG_H' | 'DRAG_V' | 'SNAP'
  focusIndexRef,     // 현재 화면에 보여지는 인덱스 (보간됨)
  targetIndexRef,    // 목표 인덱스
  rotationRef,       // 현재 회전값
  targetRotationRef, // 목표 회전값
  opacityRef,
  onUpdateUI         // React UI(ProgressBar) 업데이트용 콜백
}) {
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1); // 시간 차이 캡 (안전장치)
    const mode = modeRef.current;
    
    // --- 1. 인덱스(포커스) 로직 ---
    if (mode === 'DRAG_H') {
      // 드래그 중: 목표값으로 빠르게 댐핑
      focusIndexRef.current = THREE.MathUtils.damp(focusIndexRef.current, targetIndexRef.current, DAMP_FOCUS_SEEK, dt);
    } else if (mode === 'SNAP') {
      // 드래그 종료 후: 정수 인덱스로 자석처럼 붙기
      focusIndexRef.current = THREE.MathUtils.damp(focusIndexRef.current, targetIndexRef.current, DAMP_FOCUS_SEEK, dt);
      
      // 거의 도달했으면 오토플레이로 전환 (옵션)
      if (Math.abs(focusIndexRef.current - targetIndexRef.current) < 0.05) {
         // modeRef.current = 'AUTOPLAY'; // 필요시 주석 해제하여 자동 재생 복귀
      }
    } else { // AUTOPLAY
      const ci = focusIndexRef.current;
      const ti = targetIndexRef.current;
      
      if (ci < CUTOFF_INDEX) {
        // 등속 이동 구간
        const roundedIndex = Math.min(layers.length - 1, Math.max(0, Math.round(ci)));
        const phase = getPhaseFromIndex(roundedIndex, sizeChangeIndices);
        const speed = SPEEDS_AUTOPLAY[phase] || SPEEDS_AUTOPLAY[0];
        
        const step = speed * dt;
        const dist = ti - ci;
        
        if (Math.abs(dist) <= step) focusIndexRef.current = ti;
        else focusIndexRef.current = ci + Math.sign(dist) * step;
      } else {
        // 댐핑 이동 구간 (끝부분)
        focusIndexRef.current = THREE.MathUtils.damp(ci, ti, DAMP_FOCUS_AUTOPLAY, dt);
      }
    }

    // --- 2. 회전 로직 (문제의 핵심 해결) ---
    const [crx, cry, crz] = rotationRef.current;
    
    if (mode === 'DRAG_V') {
       // 세로 드래그 중: 목표값(사용자 손가락)을 따라감
       const [trx, try_, trz] = targetRotationRef.current;
       // 아주 빠른 댐핑으로 반응성 확보
       rotationRef.current = [
         THREE.MathUtils.damp(crx, trx, 20, dt),
         cry, crz 
       ];
    } else {
       // 그 외 모든 경우 (놓았을 때, 가로 드래그 중일 때 등): 무조건 초기값으로 복귀
       const [irx, iry, irz] = INITIAL_ROTATION;
       rotationRef.current = [
         THREE.MathUtils.damp(crx, irx, DAMP_FACTOR_ROTATION, dt),
         THREE.MathUtils.damp(cry, iry, DAMP_FACTOR_ROTATION, dt),
         THREE.MathUtils.damp(crz, irz, DAMP_FACTOR_ROTATION, dt),
       ];
    }

    // --- 3. 카메라 로직 ---
    const totalLayers = layers.length + (textLayer ? 1 : 0);
    const safeIndex = Math.min(totalLayers - 1, Math.max(0, Math.round(focusIndexRef.current)));
    const targetLayer = (safeIndex === layers.length && textLayer) ? textLayer : layers[safeIndex];
    if (targetLayer) {
      const w = targetLayer.width || (targetLayer.isTextLayer ? 100 : 28);
      const targetZ = BASE_CAMERA_Z + w * CAMERA_SIZE_FACTOR;
      state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetZ, DAMP_FACTOR_CAMERA, dt);
      state.camera.updateProjectionMatrix();
    }

    // --- 4. UI 업데이트 (Throttle 적용 가능) ---
    // 매 프레임 호출하되, React State는 Parent에서 처리
    onUpdateUI(focusIndexRef.current);
  });

  return null;
}

/**
 * Main Component
 */
export default function ImageGridLayers({ layersData }) {
  const { theme } = useTheme(); // 테마 훅 사용
  // --- 1. React State (UI 표시용으로만 사용, 애니메이션 로직에서 배제) ---
  const [uiLiveIndex, setUiLiveIndex] = useState(0);

  // --- 2. Mutable Refs (애니메이션의 Source of Truth) ---
  // 이 값들이 바뀌어도 리렌더링되지 않음 -> 끊김 없는 성능 보장
  const focusIndexRef = useRef(0);
  const targetIndexRef = useRef(0);
  const rotationRef = useRef(INITIAL_ROTATION);
  const targetRotationRef = useRef(INITIAL_ROTATION);
  const opacityRef = useRef(1);
  const modeRef = useRef('AUTOPLAY'); // 'AUTOPLAY', 'DRAG_H', 'DRAG_V', 'SNAP'

  // 드래그 계산용 임시 저장소
  const dragStartRotation = useRef([0,0,0]);
  const dragStartIndex = useRef(0);

  // --- 3. 데이터 처리 (Memo) ---
  const { layers, textLayer, sizeChangeIndices } = useMemo(() => {
    // ... (기존 데이터 가공 로직 그대로 유지) ...
    try {
      if (!layersData?.layers) return { layers: [], textLayer: null, sizeChangeIndices: [] };
      const actualLayers = layersData.layers;
      const extract2DArrays = (data) => {
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') return [data];
        if (Array.isArray(data)) return data.flatMap((item) => extract2DArrays(item));
        return [];
      };
      const allImageData = Object.entries(actualLayers).filter(([key]) => key !== 'fc').flatMap(([key, value]) =>
          extract2DArrays(value).map((arr, index) => ({ id: `${key}_${index}`, brightnessArray: arr }))
      );
      const processedLayers = allImageData.map((item, i) => {
          const { brightnessArray } = item;
          const h = brightnessArray.length;
          const w = brightnessArray[0].length;
          const flat = brightnessArray.flat();
          const data = new Uint8Array(w * h * 4);
          for (let j = 0; j < flat.length; j++) {
            const b = flat[j];
            data.set([b, b, b, 255], j * 4);
          }
          const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
          tex.needsUpdate = true; tex.flipY = true; tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter;
          return { ...item, texture: tex, width: w, height: h, originalIndex: i };
      }).filter(Boolean);

      let tLayer = null;
      if (actualLayers.fc?.[0]) {
        const fcData = actualLayers.fc[0];
        const maxIdx = fcData.indexOf(Math.max(...fcData));
        // 테마에 따라 텍스트 색상 결정
        const textColor = theme === 'dark' ? 'white' : 'black';
        tLayer = { id: 'final-text', isTextLayer: true, text: maxIdx.toString(), originalIndex: processedLayers.length, color: textColor };
      }

      const lPos = []; let cx = 0;
      processedLayers.forEach((l, i) => {
        const prev = i > 0 ? processedLayers[i - 1] : null;
        const pw = prev ? prev.width || 100 : 0;
        const cw = l.width || 100;
        cx += prev ? pw/2 + cw/2 + 25 : 0;
        lPos.push({ ...l, cumulativeX: cx });
      });

      const sIndices = [];
      lPos.forEach((l, i) => {
        if (i === 0) return;
        const p = lPos[i - 1];
        if ((p.width||0) !== (l.width||0) || (p.height||0) !== (l.height||0)) sIndices.push(i);
      });
      return { layers: lPos, textLayer: tLayer, sizeChangeIndices: sIndices };
    } catch (e) { return { layers: [], textLayer: null, sizeChangeIndices: [] }; }
  }, [layersData, theme]);

  const totalLayers = layers.length + (textLayer ? 1 : 0);

  // --- 4. 초기 자동 실행 ---
  useEffect(() => {
    if (totalLayers > 0) {
      const timer = setTimeout(() => {
        modeRef.current = 'AUTOPLAY';
        targetIndexRef.current = totalLayers - 1;
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [totalLayers]);

  // --- 5. 드래그 핸들러 (State 업데이트 없음 -> 렉 없음) ---
  const bind = useDrag(({ active, movement: [mx, my], first, cancel, tap }) => {
    if (tap) return; // 클릭 무시

    if (first) {
      // 드래그 시작 시점의 값 스냅샷
      dragStartIndex.current = focusIndexRef.current;
      dragStartRotation.current = rotationRef.current;
      // 일단 드래그 모드라고 가정하지 않고 움직임을 보고 결정 (Deadzone)
    }

    // 모드 결정
    const deadzone = 10;
    let currentDragMode = 'none';
    if (modeRef.current === 'DRAG_H' || modeRef.current === 'DRAG_V') {
       // 이미 결정된 모드 유지
       currentDragMode = modeRef.current === 'DRAG_H' ? 'horizontal' : 'vertical';
    } else if (Math.abs(mx) > deadzone || Math.abs(my) > deadzone) {
       // 새로 결정
       currentDragMode = Math.abs(my) > Math.abs(mx) * 2 ? 'vertical' : 'horizontal';
    }

    if (active) {
      if (currentDragMode === 'horizontal') {
        modeRef.current = 'DRAG_H';
        const sensitivity = 15;
        const nextIdx = dragStartIndex.current - (mx / sensitivity);
        // Ref만 업데이트
        targetIndexRef.current = Math.max(0, Math.min(totalLayers - 1, nextIdx));
      } else if (currentDragMode === 'vertical') {
        modeRef.current = 'DRAG_V';
        const sensitivity = 200;
        const nextRotX = dragStartRotation.current[0] - (my / sensitivity);
        const clampedX = Math.max(-MAX_VERTICAL_ROTATION, Math.min(MAX_VERTICAL_ROTATION, nextRotX));
        // Ref만 업데이트
        targetRotationRef.current = [clampedX, dragStartRotation.current[1], dragStartRotation.current[2]];
      }
    } else {
      // 드래그 종료 (active === false)
      if (modeRef.current === 'DRAG_H') {
        // 가로 드래그 끝 -> 정수 인덱스로 스냅
        modeRef.current = 'SNAP';
        targetIndexRef.current = Math.round(focusIndexRef.current);
      } else {
        // 세로 드래그 끝 or 탭 -> 무조건 AUTOPLAY나 SNAP으로 변경하여 회전 복귀 유도
        // SceneWrapper의 로직에 의해 mode가 DRAG_V가 아니면 자동으로 회전이 0으로 복귀됨
        modeRef.current = 'AUTOPLAY'; // 혹은 'SNAP'
      }
    }
  }, {
    pointer: { touch: true },
    filterTaps: true,
    preventDefault: true,
  });

  // ProgressBar 클릭 핸들러
  const handleSeek = (idx) => {
    modeRef.current = idx === totalLayers - 1 ? 'AUTOPLAY' : 'SNAP';
    targetIndexRef.current = idx;
  };
  
  // UI 업데이트 최적화 (너무 잦은 리렌더링 방지)
  const handleUiUpdate = useCallback((val) => {
    // 소수점 첫째 자리까지만 비교하여 변경 시 업데이트 (약 6fps ~ 10fps 효과)
    setUiLiveIndex(prev => {
      if (Math.abs(prev - val) > 0.1) return val;
      return prev;
    });
  }, []);

  if (totalLayers === 0) return null;

  return (
    <div className="w-full h-full relative">
      <div className="w-full h-full cursor-grab active:cursor-grabbing touch-none" {...bind()}>
        <Canvas
          gl={{ alpha: true, antialias: false }} // 앤티앨리어싱 꺼서 성능 향상
          dpr={[1, 1.5]} // 픽셀 비율 제한
          // 그라데이션 투명도 절반으로 변경 (0.5)
          style={{ background: 'linear-gradient(to bottom, rgba(15, 34, 47, 0), rgba(15, 34, 147, 0.5))' }}
          camera={{ position: [0, 0, BASE_CAMERA_Z], fov: 60 }}
          onCreated={({ scene }) => { scene.background = null; }}
        >
          {/* 씬 로직과 렌더링을 분리 */}
          <AnimationController 
             layers={layers}
             textLayer={textLayer}
             sizeChangeIndices={sizeChangeIndices}
             modeRef={modeRef}
             focusIndexRef={focusIndexRef}
             targetIndexRef={targetIndexRef}
             rotationRef={rotationRef}
             targetRotationRef={targetRotationRef}
             opacityRef={opacityRef}
             onUpdateUI={handleUiUpdate}
          />
          <Scene
             layers={layers}
             textLayer={textLayer}
             focusIndexRef={focusIndexRef}
             rotationRef={rotationRef}
             opacityRef={opacityRef}
          />
        </Canvas>
      </div>

      <div className="absolute bottom-8 left-4 right-4 md:bottom-10 md:left-10 md:right-10 pointer-events-auto">
        <ProgressBar
          liveIndex={uiLiveIndex}
          displayIndex={Math.round(uiLiveIndex)}
          totalLayers={totalLayers}
          onSeek={handleSeek}
          sizeChangeIndices={sizeChangeIndices}
        />
      </div>
    </div>
  );
}