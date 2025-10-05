// components/inside/ImageGridLayers.jsx
'use client';

import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/three';
import { Text } from '@react-three/drei';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide, PlaneGeometry, NearestFilter } from 'three';
// [수정] SideNavButton만 가져오도록 변경
import SideNavButton from '@/components/ui/SideNavButton';


// --- (내부 3D 컴포넌트인 Scene, AnimatedPlane은 변경 사항 없음) ---
// --- 상수 정의 ---
const RENDER_WINDOW_SIZE = 50;
const MAX_VERTICAL_ROTATION = Math.PI / 4;

// --- 내부 3D 컴포넌트 ---
function AnimatedPlane({ texture, position, width, height, opacity }) {
  const geometry = useMemo(() => new PlaneGeometry(width, height), [width, height]);

  return (
    <animated.mesh position={position} geometry={geometry}>
      <animated.meshStandardMaterial 
        map={texture} 
        side={DoubleSide} 
        transparent
        opacity={opacity} 
      />
    </animated.mesh>
  );
}

function Scene({ layers, animatedFocusIndex, rotation, opacity }) {
  const [visibleLayers, setVisibleLayers] = useState([]);
  const { viewport } = useThree();

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
            
            const minSpacing = 30;
            const maxSpacing = 50;
            const preferredSpacing = viewport.width / 2.5;
            const spacing = Math.max(minSpacing, Math.min(preferredSpacing, maxSpacing));
            
            const x = distance * spacing;
            const z = -Math.abs(distance) * 10;
            return [x, 0, z];
          });
          
          if (layer.isTextLayer) {
            return (
              <animated.group position={position} key={layer.id}>
                <Text
                  fontSize={100}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                >
                  {layer.text}
                  <animated.meshStandardMaterial 
                    color="white" 
                    opacity={opacity} 
                    transparent 
                  />
                </Text>
              </animated.group>
            );
          }
          
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
export default function ImageGridLayers({ layersData }) { // [수정] onClose prop 제거
  const [focusLayerIndex, setFocusLayerIndex] = useState(0);
  const [focusAnimationConfig, setFocusAnimationConfig] = useState(
    { mass: 1, tension: 90, friction: 30, clamp: true }
  );

  const [{ rotation, opacity }, api] = useSpring(() => ({
    rotation: [-0.125, 0.6, 0],
    opacity: 1,
    config: { mass: 1, tension: 120, friction: 30 },
  }));

  const { animatedFocusIndex } = useSpring({
    animatedFocusIndex: focusLayerIndex,
    config: focusAnimationConfig,
    onStart: () => { api.start({ opacity: 0.5, immediate: true }); },
    onRest: () => { api.start({ opacity: 1 }); },
  });

  const layers = useMemo(() => {
    // ... (데이터 처리 로직 변경 없음)
    try {
      if (!layersData || typeof layersData !== 'object' || Object.keys(layersData).length === 0) return [];
      const extract2DArrays = (data) => {
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') return [data];
        if (Array.isArray(data)) return data.flatMap(item => extract2DArrays(item));
        return [];
      };

      const allImageData = Object.entries(layersData)
        .filter(([key]) => key !== 'fc')
        .flatMap(([key, value]) => {
          const extractedArrays = extract2DArrays(value);
          return extractedArrays.map((arr, index) => ({ id: `${key}_${index}`, brightnessArray: arr }));
        });

      if (allImageData.length === 0 && !layersData.fc) return [];

      const processedLayers = allImageData.map((item, i) => {
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

      if (layersData.fc && Array.isArray(layersData.fc) && layersData.fc.length > 0) {
        const fcData = layersData.fc[0];
        const maxValue = Math.max(...fcData);
        const predictedIndex = fcData.indexOf(maxValue);

        const textLayer = {
          id: 'final-prediction-text',
          isTextLayer: true,
          text: predictedIndex.toString(),
          originalIndex: processedLayers.length,
        };
        processedLayers.push(textLayer);
      }

      return processedLayers;

    } catch (error) {
      console.error('Error memoizing layers:', error);
      return [];
    }
  }, [layersData]);

  const startRotation = useRef([0,0,0]);
  const dragModeRef = useRef('none');
  const startFocusIndex = useRef(0);

  const bind = useDrag(({ first, last, active, movement: [mx, my] }) => {
    // ... (useDrag 로직 변경 없음)
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

  // [수정] FullScreenView를 제거하고 원래의 div 구조로 복귀
  return (
    <div 
      className="w-full h-full cursor-grab touch-none"
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

      {/* [수정] SideNavButton 컴포넌트를 직접 사용 */}
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