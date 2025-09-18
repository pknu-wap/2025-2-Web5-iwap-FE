'use client'

import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Plane } from '@react-three/drei'
import { TextureLoader, DoubleSide, Group } from 'three'

// 이미지 텍스처를 표시하기 위한 단일 평면 컴포넌트입니다. (변경 없음)
const ImagePlane = ({ imageUrl, position, args }) => {
  const texture = useLoader(TextureLoader, imageUrl)
  return (
    <Plane args={args} position={position}>
      <meshStandardMaterial map={texture} side={DoubleSide} transparent />
    </Plane>
  )
}

// 단일 이미지 그리드를 생성하는 컴포넌트입니다.
// 이 컴포넌트는 특정 Z 위치에 하나의 그리드를 렌더링합니다.
const ImageGrid = ({ imageUrls, position, gridConfig }) => {
  const { columns, planeWidth, planeHeight, spacing } = gridConfig;

  return (
    <group position={position}>
      {imageUrls.map((url, index) => {
        // 인덱스를 기반으로 각 이미지의 행과 열을 계산합니다.
        const row = Math.floor(index / columns);
        const col = index % columns;

        // 그리드를 중앙에 배치하기 위해 전체 너비와 높이를 계산합니다.
        const gridWidth = columns * (planeWidth + spacing) - spacing;
        const numRows = Math.ceil(imageUrls.length / columns);
        const gridHeight = numRows * (planeHeight + spacing) - spacing;

        // 각 평면의 x, y 위치를 계산합니다.
        // 그리드는 그룹의 원점 (0, 0)을 중심으로 배치됩니다.
        const x = col * (planeWidth + spacing) - gridWidth / 2 + planeWidth / 2;
        const y = -(row * (planeHeight + spacing)) + gridHeight / 2 - planeHeight / 2;

        return (
          <ImagePlane
            key={index}
            imageUrl={url}
            position={[x, y, 0]} // 그룹 내에서의 상대적 위치이므로 z는 0입니다.
            args={[planeWidth, planeHeight]}
          />
        )
      })}
    </group>
  )
}


// 여러 개의 이미지 그리드 레이어를 렌더링하는 메인 컴포넌트입니다.
export default function ImageGridLayers() {
  // 각 그리드 레이어에 대한 이미지 URL 배열입니다.

  // 1. 1부터 200까지의 전체 이미지 경로 배열 생성
  const allImages = Array.from({ length: 200 }, (_, i) => {
    const number = (i + 1).toString().padStart(3, '0'); // 숫자를 '001', '010', '100' 형태로 변환
    return `/test/image${number}.png`;
  });

  // 2. 전체 배열을 9개씩 묶음으로 나누기
  const chunkSize = 9;
  const gridLayersUrls = [];

  for (let i = 0; i < allImages.length; i += chunkSize) {
    const chunk = allImages.slice(i, i + chunkSize);
    gridLayersUrls.push(chunk);
  }

  // 모든 그리드에 동일하게 적용될 설정입니다.
  const gridConfig = {
    columns: 3,
    planeWidth: 5,
    planeHeight: 5,
    spacing: 1,
  };

  // Z축을 따라 그리드 레이어 사이의 간격입니다.
  const layerSpacing = 2;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111827' }}>
      <Canvas camera={{ position: [9, 12, 15], fov: 75 }}>
        {/* 장면에 전체적으로 빛을 추가합니다. */}
        <ambientLight intensity={1.5} />
        {/* 특정 지점에서 빛을 발산하여 그림자와 하이라이트를 만듭니다. */}
        <pointLight position={[15, 15, 15]} intensity={1} />

        {gridLayersUrls.map((urls, layerIndex) => {
          // 각 그리드 레이어의 Z 위치를 계산합니다.
          const zPosition = layerIndex * -layerSpacing;

          return (
            <ImageGrid
              key={layerIndex}
              imageUrls={urls}
              position={[0, 0, zPosition]} // 각 그리드 그룹의 Z 위치 설정
              gridConfig={gridConfig}
            />
          )
        })}

        {/* OrbitControls는 사용자가 카메라를 회전, 이동, 줌할 수 있게 해줍니다. */}
        <OrbitControls />
      </Canvas>
    </div>
  )
}
