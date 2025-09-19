// src/components/BrightnessDataPlane.jsx

import { useMemo } from 'react';
import { Plane } from '@react-three/drei';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide } from 'three';

/**
 * n*n 밝기값 배열(2D)을 받아 3D 평면에 텍스처로 렌더링하는 컴포넌트입니다.
 * @param {number[][]} brightnessArray - 픽셀 밝기값을 담은 2차원 배열.
 */
const BrightnessDataPlane = ({ brightnessArray, position, args }) => {
  const texture = useMemo(() => {
    if (!brightnessArray || brightnessArray.length === 0) return null;

    // ✨ 2차원 배열을 1차원 배열로 변환합니다.
    const flatArray = brightnessArray.flat();
    const n = Math.sqrt(flatArray.length);

    if (!Number.isInteger(n)) {
      console.warn('The flattened brightnessArray must have a length that is a perfect square.');
      return null;
    }

    const data = new Uint8Array(n * n * 4);
    for (let i = 0; i < flatArray.length; i++) {
      const brightness = flatArray[i];
      const offset = i * 4;
      data[offset] = brightness;     // R
      data[offset + 1] = brightness; // G
      data[offset + 2] = brightness; // B
      data[offset + 3] = 255;        // A
    }

    const dataTexture = new DataTexture(data, n, n, RGBAFormat, UnsignedByteType);
    dataTexture.needsUpdate = true;

    return dataTexture;
  }, [brightnessArray]);

  return (
    <Plane args={args} position={position}>
      <meshStandardMaterial map={texture} side={DoubleSide} transparent />
    </Plane>
  );
};

export default BrightnessDataPlane;