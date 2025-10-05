'use client';

import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/three';
import { Text } from '@react-three/drei'; // [추가] 텍스트 렌더링을 위해 import
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide, PlaneGeometry, NearestFilter } from 'three';
import Image from 'next/image';

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
          
          // [수정] isTextLayer 플래그에 따라 다른 컴포넌트를 렌더링
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
export default function ImageGridLayers({ layersData, onClose }) {
  const [focusLayerIndex, setFocusLayerIndex] = useState(0);

  // ✨ 1. 애니메이션 설정을 위한 state 추가 (기본은 빠른 설정)
  const [focusAnimationConfig, setFocusAnimationConfig] = useState(
    { mass: 1, tension: 90, friction: 30, clamp: true }
  );

  const [{ rotation, opacity }, api] = useSpring(() => ({
    rotation: [-0.125, 0.6, 0],
    opacity: 1,
    config: { mass: 1, tension: 120, friction: 30 },
  }));

  // ✨ 2. useSpring 훅을 원래 형태로 되돌리고, config state를 연결
  const { animatedFocusIndex } = useSpring({
    animatedFocusIndex: focusLayerIndex,
    config: focusAnimationConfig, // state를 사용
    onStart: () => {
      api.start({ opacity: 0.5, immediate: true });
    },
    onRest: () => {
      api.start({ opacity: 1 });
    },
  });

  const layers = useMemo(() => {
    try {
      if (!layersData || typeof layersData !== 'object' || Object.keys(layersData).length === 0) return [];
      const extract2DArrays = (data) => {
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') return [data];
        if (Array.isArray(data)) return data.flatMap(item => extract2DArrays(item));
        return [];
      };

      // 1. 'fc' 키를 제외하고 이미지 데이터만 먼저 추출
      const allImageData = Object.entries(layersData)
        .filter(([key]) => key !== 'fc')
        .flatMap(([key, value]) => {
          const extractedArrays = extract2DArrays(value);
          return extractedArrays.map((arr, index) => ({ id: `${key}_${index}`, brightnessArray: arr }));
        });

      if (allImageData.length === 0 && !layersData.fc) return [];

      // 2. 이미지 데이터들을 텍스처로 변환
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

      // 3. 'fc' 데이터가 있다면 텍스트 레이어를 생성하여 배열 마지막에 추가
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
        // ✨ 3. '빠른' 설정으로 변경 후, focus index 업데이트
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
    // ✨ 4. '느린' 설정으로 변경 후, focus index 업데이트
    setFocusAnimationConfig({ mass: 1, tension: 30, friction: 26 });
    setFocusLayerIndex(targetIndex);
  };
  
  const navButtonStyle = {
    position: 'absolute', bottom: '45px', background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white',
    width: '45px', height: '45px', borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    backdropFilter: 'blur(5px)', zIndex: 10, fontSize: '20px',
  };

  if (!layers || layers.length === 0) {
    return null;
  }

  const CloseIcon = () => (
    <Image src="/icons/close.svg" alt="Close" width={24} height={24} style={{ width: 'clamp(1rem, 3vmin, 1.5rem)', height: 'auto' }}/>
  );

  return (
    <div 
      style={{ 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        cursor: 'grab',
        touchAction: 'none'
      }} 
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

      <div 
          className="w-full flex justify-between items-baseline pt-[2%] px-[5%] pb-[1%]"
          style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              zIndex: 10,
              pointerEvents: 'none' // 전체 영역의 마우스 이벤트를 막음
          }} 
      >
          <div className="flex items-baseline gap-x-2 flex-wrap">
              <h2 className="font-bold text-white" style={{ fontSize: 'clamp(1.75rem, 5vmin, 3rem)' }}>
                  !nside.
              </h2>
              <p className="font-light text-white" style={{ fontSize: 'clamp(0.75rem, 1.8vmin, 0.875rem)' }}>
                  인공지능이 숫자를 인식하는 과정
              </p>
          </div>
          <button 
              className="text-white flex-shrink-0 relative top-2"
              style={{ pointerEvents: 'auto' }} // 버튼만 다시 마우스 이벤트를 허용
              onClick={() => onClose && onClose()}
          >
              <CloseIcon />
          </button>
      </div>

      <button 
        style={{...navButtonStyle, left: '7%', bottom: '47%' }}
        onClick={(e) => { e.stopPropagation(); handleNavClick(0); }}
        title="첫 번째 레이어로 이동"
      >
        {'«'}
      </button>
      <button 
        style={{...navButtonStyle, right: '7%', bottom: '47%' }}
        onClick={(e) => { e.stopPropagation(); handleNavClick(layers.length - 1); }}
        title="마지막 레이어로 이동"
      >
        {'»'}
      </button>
    </div>
  );
}