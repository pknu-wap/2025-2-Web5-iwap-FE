/**
 * @file app/components/inside/ImageGrid.jsx
 * @description 3D 공간에 이미지 그리드를 렌더링하는 컴포넌트입니다.
 * @summary 성능 최적화를 위해 '지오메트리 재사용' 기법을 적용하여,
 * 모든 이미지 평면이 단 하나의 지오메트리 객체를 공유합니다.
 */
import { useMemo } from 'react';
import { DataTexture, RGBAFormat, UnsignedByteType, DoubleSide, PlaneGeometry, NearestFilter } from 'three';
import { animated } from '@react-spring/three';

/**
 * @description 단일 3D 이미지 평면(Mesh)을 생성하는 내부 컴포넌트입니다.
 * @summary 부모로부터 공유 지오메트리를 전달받아 성능을 최적화합니다.
 * @param {object} props - 컴포넌트 프롭.
 * @param {number[][]} props.brightnessArray - 텍스처 생성을 위한 2D 밝기값 배열.
 * @param {[number, number, number]} props.position - 3D 공간에서의 평면 위치.
 * @param {PlaneGeometry} props.geometry - 모든 평면이 공유하는 지오메트리 객체.
 * @returns {JSX.Element} react-three-fiber의 mesh 엘리먼트.
 */
function PlaneMesh({ brightnessArray, position, geometry }) {
  // brightnessArray 데이터가 변경될 때만 텍스처를 새로 생성하여 불필요한 연산을 방지합니다.
  const texture = useMemo(() => {
    if (!brightnessArray || brightnessArray.length === 0) return null;

    const flatArray = brightnessArray.flat();
    const size = Math.sqrt(flatArray.length);
    if (!Number.isInteger(size)) return null;

    // 1차원 밝기값 배열을 RGBA 형식의 이미지 데이터(Uint8Array)로 변환합니다.
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < flatArray.length; i++) {
      const brightness = flatArray[i];
      const offset = i * 4;
      data[offset] = brightness;     // Red
      data[offset + 1] = brightness; // Green
      data[offset + 2] = brightness; // Blue
      data[offset + 3] = 255;        // Alpha (불투명)
    }
    
    // 변환된 데이터로 Three.js의 DataTexture 객체를 생성합니다.
    const dataTexture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
    
    // 텍스처 필터링 설정을 통해 픽셀이 흐려지지 않고 선명하게 보이도록 합니다.
    dataTexture.generateMipmaps = false;
    dataTexture.minFilter = NearestFilter;
    dataTexture.magFilter = NearestFilter;
    
    // 데이터가 업데이트되었음을 렌더러에 알립니다.
    dataTexture.needsUpdate = true;
    return dataTexture;
  }, [brightnessArray]);

  return (
    <mesh position={position} geometry={geometry}>
      <meshStandardMaterial 
        map={texture} 
        side={DoubleSide} // 평면의 양면이 모두 보이도록 설정합니다.
      />
    </mesh>
  );
}

/**
 * @description 다수의 PlaneMesh 컴포넌트를 그리드 형태로 배치하여 전체 이미지 그리드를 구성합니다.
 * @param {object} props - 컴포넌트 프롭.
 * @param {{id: string, brightnessArray: number[][]}} props.allImageData - 모든 이미지 데이터 배열.
 * @param {object} props.gridConfig - 그리드 레이아웃 설정.
 * @param {object} props.rotation - 상위 컴포넌트로부터 전달받은 회전 상태.
 * @returns {JSX.Element} 모든 3D 평면을 포함하는 animated.group 엘리먼트.
 */
export default function ImageGrid({ allImageData, gridConfig, rotation }) {
  const { columns, rows, planeWidth, spacing, layerSpacing } = gridConfig;
  const itemsPerLayer = columns * rows;

  // [핵심 최적화] 모든 PlaneMesh가 공유할 단일 지오메트리를 생성합니다.
  // 이 기법은 GPU 메모리 사용량을 크게 줄여 성능을 향상시킵니다.
  const sharedGeometry = useMemo(() => new PlaneGeometry(planeWidth, planeWidth), [planeWidth]);

  return (
    // 상위 컴포넌트로부터 받은 회전(rotation) 상태를 그룹 전체에 적용합니다.
    <animated.group rotation={rotation}>
      {allImageData.map((item, index) => {
        // 전체 인덱스를 기반으로 각 평면의 3D 공간 좌표(x, y, z)를 계산합니다.
        const layerIndex = Math.floor(index / itemsPerLayer);
        const indexInLayer = index % itemsPerLayer;
        
        // 그리드 중앙 정렬을 위한 좌표 계산
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
    </animated.group>
  );
}

