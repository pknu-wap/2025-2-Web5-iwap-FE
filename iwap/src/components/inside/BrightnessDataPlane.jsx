/**
 * @file BrightnessDataPlane.jsx
 * 2차원 배열 형태의 밝기값 데이터를 받아, 이를 텍스처로 변환하여 3D 평면(Plane)에 렌더링하는 컴포넌트입니다.
 * React-Three-Fiber와 Drei 라이브러리를 사용합니다.
 */

import { useMemo } from 'react';
import { Plane } from '@react-three/drei';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide } from 'three';

/**
 * 하나의 2D 밝기값 배열을 3D 텍스처 평면으로 렌더링합니다.
 * @param {object} props - 컴포넌트 프롭스.
 * @param {number[][]} props.brightnessArray - 픽셀 밝기값을 담은 2차원 배열 (예: 64x64).
 * @param {[number, number, number]} props.position - 3D 공간에서의 평면 위치 [x, y, z].
 * @param {number} props.size - 평면의 가로 및 세로 크기.
 * @returns {JSX.Element | null} 렌더링할 3D 평면 객체.
 */
const BrightnessDataPlane = ({ brightnessArray, position, size }) => {
  // `useMemo` 훅을 사용하여 `brightnessArray` 프롭이 변경될 때만 텍스처를 재생성합니다.
  // 이는 불필요한 리렌더링과 텍스처 생성을 방지하여 성능을 최적화합니다.
  const texture = useMemo(() => {
    // 데이터가 유효하지 않으면 텍스처를 생성하지 않고 null을 반환합니다.
    if (!brightnessArray || brightnessArray.length === 0) {
      return null;
    }

    // 1. 2차원 배열을 1차원 배열로 변환합니다.
    const flatArray = brightnessArray.flat();
    const dimension = Math.sqrt(flatArray.length);

    // 2. 텍스처의 가로/세로 길이를 구하기 위해 배열 길이가 제곱수인지 확인합니다.
    if (!Number.isInteger(dimension)) {
      console.warn('텍스처 생성을 위해 1차원으로 변환된 배열의 길이는 제곱수여야 합니다.');
      return null;
    }

    // 3. 텍스처 데이터를 저장할 Uint8Array를 생성합니다.
    // 각 픽셀은 R, G, B, A (빨강, 초록, 파랑, 투명도) 4개의 채널 값을 가집니다.
    const textureData = new Uint8Array(dimension * dimension * 4);
    for (let i = 0; i < flatArray.length; i++) {
      const brightness = flatArray[i]; // 0-255 사이의 밝기값
      const offset = i * 4; // 각 픽셀 데이터의 시작 인덱스

      // 흑백 이미지를 표현하기 위해 R, G, B 채널에 모두 동일한 밝기값을 할당합니다.
      textureData[offset] = brightness;     // R channel
      textureData[offset + 1] = brightness; // G channel
      textureData[offset + 2] = brightness; // B channel
      textureData[offset + 3] = 255;        // A channel (255 = 불투명)
    }

    // 4. `three.js`의 `DataTexture`를 사용하여 원시 데이터로부터 텍스처를 생성합니다.
    const dataTexture = new DataTexture(textureData, dimension, dimension, RGBAFormat, UnsignedByteType);
    
    // 5. 텍스처 데이터가 변경되었음을 `three.js` 렌더러에 알려 다음 렌더링 프레임에 반영되도록 합니다.
    dataTexture.needsUpdate = true;

    return dataTexture;
  }, [brightnessArray]);

  // 텍스처가 성공적으로 생성된 경우에만 평면을 렌더링합니다.
  if (!texture) {
    return null;
  }

  return (
    // Drei의 <Plane> 컴포넌트를 사용하여 평면 지오메트리를 생성합니다.
    <Plane args={[size, size]} position={position}>
      {/* 생성된 텍스처를 `map` 속성에 연결하여 평면에 이미지를 입힙니다. */}
      {/* `side={DoubleSide}`는 평면의 양면이 모두 보이도록 설정합니다. */}
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </Plane>
  );
};

export default BrightnessDataPlane;
