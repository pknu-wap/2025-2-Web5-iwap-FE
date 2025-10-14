'use client';

import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/three';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import SideNavButton from '@/components/ui/SideNavButton';

// --- 상수 정의 ---
const RENDER_WINDOW_SIZE = 50;
const MAX_VERTICAL_ROTATION = Math.PI / 4;

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

  useFrame(() => {
    if (!layers || layers.length === 0) return;
    
    const currentFocus = animatedFocusIndex.get();
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
      <animated.group rotation={rotation}>
        {visibleLayers.map((layer) => {
          const position = animatedFocusIndex.to(fi => {
            const distance = layer.originalIndex - fi;
            const spacing = Math.max(30, Math.min(viewport.width / 2.5, 50));
            return [distance * spacing, 0, -Math.abs(distance) * 10];
          });
          
          return layer.isTextLayer ? (
            <animated.group position={position} key={layer.id}>
              <Text 
                font="/fonts/static/Pretendard-Thin.otf"
                fontSize={100} color="white" anchorX="center" anchorY="middle">
                {layer.text}
                <animated.meshStandardMaterial color="white" opacity={opacity} transparent />
              </Text>
            </animated.group>
          ) : (
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
  const [focusLayerIndex, setFocusLayerIndex] = useState(0);
  const [focusAnimationConfig, setFocusAnimationConfig] = useState({ mass: 1, tension: 90, friction: 30, clamp: true });
  
  const [{ rotation, opacity }, api] = useSpring(() => ({
    rotation: [-0.125, 0.6, 0],
    opacity: 1,
    config: { mass: 1, tension: 120, friction: 30 },
  }));

  const { animatedFocusIndex } = useSpring({
    animatedFocusIndex: focusLayerIndex,
    config: focusAnimationConfig,
    onStart: () => api.start({ opacity: 0.5, immediate: true }),
    onRest: () => api.start({ opacity: 1 }),
  });

  const layers = useMemo(() => {
    try {
      if (!layersData || !layersData.layers || typeof layersData.layers !== 'object') return [];
      
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
      return processedLayers;
    } catch (error) {
      console.error('[ImageGridLayers] Error: Failed to process and memoize layers:', error);
      return [];
    }
  }, [layersData]);

  const startRotation = useRef([0, 0, 0]);
  const dragModeRef = useRef('none');
  const startFocusIndex = useRef(0);

  const bind = useDrag(({ first, last, active, movement: [mx, my] }) => {
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