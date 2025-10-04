'use client';

import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide, PlaneGeometry, NearestFilter } from 'three';

// --- 상수 정의 ---
const RENDER_WINDOW_SIZE = 50;
const MAX_VERTICAL_ROTATION = Math.PI / 4;

// --- [수정됨] 내부 3D 컴포넌트 ---
function AnimatedPlane({ texture, position, width, height, opacity }) {
  const geometry = useMemo(() => new PlaneGeometry(width, height), [width, height]);

  return (
    <animated.mesh position={position} geometry={geometry}>
      <animated.meshStandardMaterial 
        map={texture} 
        side={DoubleSide} 
        transparent
        // 부모 컴포넌트에서 애니메이션 처리된 opacity 값을 직접 전달받아 사용합니다.
        opacity={opacity} 
      />
    </animated.mesh>
  );
}


function Scene({ layers, animatedFocusIndex, rotation, opacity }) {
  const [visibleLayers, setVisibleLayers] = useState([]);

  useFrame(() => {
    if (!layers || layers.length === 0) return;
    const currentFocus = animatedFocusIndex.get();
    const virtualStartIndex = Math.max(0, Math.floor(currentFocus) - RENDER_WINDOW_SIZE);
    const virtualEndIndex = Math.min(layers.length, Math.ceil(currentFocus) + RENDER_WINDOW_SIZE + 1);
    
    if (visibleLayers.length === 0 || visibleLayers[0]?.originalIndex !== virtualStartIndex || visibleLayers[visibleLayers.length - 1]?.originalIndex !== virtualEndIndex - 1) {
      setVisibleLayers(layers.slice(virtualStartIndex, virtualEndIndex));
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <pointLight position={[0, 50, 50]} intensity={1} />
      <animated.group rotation={rotation}>
        {visibleLayers.map((layer) => {
          const position = animatedFocusIndex.to(fi => {
            const distance = layer.originalIndex - fi;
            const x = -50 + distance * 30;
            const z = -Math.abs(distance) * 10;
            return [x, 0, z];
          });
          
          return (
            <AnimatedPlane
              key={layer.id}
              texture={layer.texture}
              width={layer.width}
              height={layer.height}
              position={position}
              opacity={opacity}
            />
          );
        })}
      </animated.group>
    </>
  );
}

// --- 메인 컴포넌트 ---
export default function ImageGridLayers({ layersData }) {
  const [focusLayerIndex, setFocusLayerIndex] = useState(0);

  const [{ rotation, opacity }, api] = useSpring(() => ({
    rotation: [-0.125, 0.6, 0],
    opacity: 1,
    config: { mass: 1, tension: 210, friction: 30 },
  }));

  const { animatedFocusIndex } = useSpring({
    animatedFocusIndex: focusLayerIndex,
    config: { mass: 1, tension: 150, friction: 30, clamp: true },
    onStart: () => {
      // 애니메이션 '시작 시' 투명도 즉시 감소
      api.start({ opacity: 0.5, immediate: true });
    },
    onRest: () => {
      // 애니메이션 '종료 시' 투명도 복원
      api.start({ opacity: 1 });
    },
  });

  const layers = useMemo(() => {
    // ... (데이터 가공 로직은 변경 없음)
    try {
      if (!layersData || typeof layersData !== 'object' || Object.keys(layersData).length === 0) return [];
      const extract2DArrays = (data) => {
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') return [data];
        if (Array.isArray(data)) return data.flatMap(item => extract2DArrays(item));
        return [];
      };
      const allImageData = Object.entries(layersData).flatMap(([key, value]) => {
        const extractedArrays = extract2DArrays(value);
        return extractedArrays.map((arr, index) => ({ id: `${key}_${index}`, brightnessArray: arr }));
      });
      if (allImageData.length === 0) return [];
      return allImageData.map((item, i) => {
        const { brightnessArray } = item;
        if (!Array.isArray(brightnessArray) || brightnessArray.length === 0 || !Array.isArray(brightnessArray[0])) return null;
        const height = brightnessArray.length;
        const width = brightnessArray[0].length;
        const flatArray = brightnessArray.flat();
        const data = new Uint8Array(width * height * 4);
        for (let j = 0; j < flatArray.length; j++) {
          const brightness = flatArray[j];
          data.set([brightness, brightness, brightness, 255], j * 4);
        }
        const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
        texture.needsUpdate = true;
        texture.flipY = true; 
        texture.minFilter = NearestFilter;
        texture.magFilter = NearestFilter;
        return { ...item, texture, width, height, originalIndex: i };
      }).filter(Boolean);
    } catch (error) {
      console.error('Error memoizing layers:', error);
      return [];
    }
  }, [layersData]);

  const startRotation = useRef([0,0,0]);
  const dragModeRef = useRef('none');
  const startFocusIndex = useRef(0);

  const bind = useDrag(({ first, last, active, movement: [mx, my] }) => {
    // ... (useDrag 로직은 변경 없음)
    const deadzone = 10;
    if (first) {
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
    setFocusLayerIndex(targetIndex);
  };
  
  const navButtonStyle = {
    position: 'absolute', bottom: '45px', background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white',
    width: '45px', height: '45px', borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    backdropFilter: 'blur(5px)', zIndex: 10, fontSize: '20px', lineHeight: '1',
  };

  if (!layers || layers.length === 0) {
    return null;
  }

  return (
    <div 
      style={{ position: 'absolute', width: '100%', height: '100%', cursor: 'grab' }} 
      {...bind()}
      onMouseDown={(e) => { e.currentTarget.style.cursor = 'grabbing'; }}
      onMouseUp={(e) => { e.currentTarget.style.cursor = 'grab'; }}
    >
      <Canvas
        gl={{ alpha: true }}
        style={{ background: 'transparent' }}
        camera={{ position: [0, 20, 150], fov: 60 }}
        onCreated={({ scene }) => { scene.background = null; }}
      >
        <Scene layers={layers} animatedFocusIndex={animatedFocusIndex} rotation={rotation} opacity={opacity}/>
      </Canvas>
      <button 
        style={{...navButtonStyle, left: '200px', bottom: '47%' }}
        onClick={(e) => { e.stopPropagation(); handleNavClick(0); }}
        title="첫 번째 레이어로 이동"
      >
        {'«'}
      </button>
      <button 
        style={{...navButtonStyle, right: '200px', bottom: '47%' }}
        onClick={(e) => { e.stopPropagation(); handleNavClick(layers.length - 1); }}
        title="마지막 레이어로 이동"
      >
        {'»'}
      </button>
    </div>
  );
}