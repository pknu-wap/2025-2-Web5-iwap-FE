/**
 * @file app/components/inside/ImageGrid.jsx
 * 다수의 이미지 데이터를 3D 공간에 효율적으로 렌더링하는 최종 컴포넌트입니다.
 * '지오메트리 재사용(Geometry Re-use)' 기법을 사용하여 메모리 사용량을 최적화하고,
 * WebGL 렌더링 오류를 안정적으로 방지합니다.
 */

import { useMemo } from 'react';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide, PlaneGeometry, NearestFilter } from 'three';

/**
 * 단일 3D 평면(Mesh)을 렌더링하는 내부 컴포넌트입니다.
 * 모든 평면은 외부에서 생성된 동일한 지오메트리(모양)를 공유하여 메모리를 절약합니다.
 * @param {object} props - 컴포넌트 프롭.
 * @param {number[][]} props.brightnessArray - 텍스처를 생성할 2D 밝기값 배열.
 * @param {[number, number, number]} props.position - 3D 공간에서의 평면 위치.
 * @param {PlaneGeometry} props.geometry - 모든 평면이 공유할 지오메트리 객체.
 * @returns {JSX.Element} React-Three-Fiber의 mesh 엘리먼트.
 */
function PlaneMesh({ brightnessArray, position, geometry }) {
  // 각 평면은 고유한 텍스처를 가져야 하므로, useMemo를 사용해 효율적으로 생성합니다.
  const texture = useMemo(() => {
    if (!brightnessArray || brightnessArray.length === 0) return null;

    const flatArray = brightnessArray.flat();
    const n = Math.sqrt(flatArray.length);
    if (!Number.isInteger(n)) return null;

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
    
    // 텍스처의 크기가 2의 거듭제곱이 아닐 때 발생하는 화질 저하 및 렌더링 문제를 방지합니다.
    dataTexture.generateMipmaps = false;
    // NearestFilter를 사용하여 픽셀을 흐릿하게 만들지 않고 선명하게 표시합니다.
    dataTexture.minFilter = NearestFilter;
    dataTexture.magFilter = NearestFilter;
    
    // 텍스처 데이터가 업데이트되었음을 렌더러에 알립니다.
    dataTexture.needsUpdate = true;
    return dataTexture;
  }, [brightnessArray]);

  return (
    // position과 geometry는 props로 받고, 재질(material)만 내부에서 정의합니다.
    <mesh position={position} geometry={geometry}>
      <meshStandardMaterial 
        map={texture} 
        side={DoubleSide} // 평면의 양면이 모두 보이도록 설정합니다.
      />
    </mesh>
  );
}

/**
 * 모든 이미지 데이터를 받아 3D 그리드 형태로 렌더링하는 메인 컴포넌트입니다.
 * @param {object} props - 컴포넌트 프롭.
 * @param {{id: string, brightnessArray: number[][]}} props.allImageData - 모든 이미지 데이터 배열.
 * @param {object} props.gridConfig - 그리드 레이아웃 설정 객체.
 * @returns {JSX.Element} 모든 3D 평면을 포함하는 group 엘리먼트.
 */
export default function ImageGrid({ allImageData, gridConfig }) {
  const { columns, rows, planeWidth, spacing, layerSpacing } = gridConfig;
  const itemsPerLayer = columns * rows;

  // [핵심 최적화]
  // 단 하나의 평면 지오메트리를 생성하고 useMemo로 캐싱합니다.
  // 이 지오메트리는 아래에서 생성되는 모든 3D 평면들이 공유하게 되며,
  // 이를 통해 GPU 메모리 사용량을 획기적으로 줄여 WebGL 오류를 방지합니다.
  const sharedGeometry = useMemo(() => new PlaneGeometry(planeWidth, planeWidth), [planeWidth]);

  return (
    <group>
      {allImageData.map((item, index) => {
        // 전체 인덱스를 기반으로 각 평면의 3D 공간 좌표(x, y, z)를 계산합니다.
        const layerIndex = Math.floor(index / itemsPerLayer);
        const indexInLayer = index % itemsPerLayer;
        
        // 그리드 중앙 정렬을 위한 계산
        const x = (indexInLayer % columns - (columns - 1) / 2) * (planeWidth + spacing);
        const y = (Math.floor(indexInLayer / columns) - (rows - 1) / 2) * (planeWidth + spacing);
        const z = -layerIndex * layerSpacing;

        return (
          <PlaneMesh
            key={item.id}
            brightnessArray={item.brightnessArray}
            position={[x, y, z]}
            geometry={sharedGeometry} // 모든 평면이 동일한 지오메트리를 공유합니다.
          />
        );
      })}
    </group>
  );
}

