'use client'

import { useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Plane } from '@react-three/drei'
import { TextureLoader, DoubleSide } from 'three'

const ImagePlane = ({ imageUrl, position, args }) => {
  const texture = useLoader(TextureLoader, imageUrl)
  return (
    <Plane args={args} position={position}>
      <meshStandardMaterial map={texture} side={DoubleSide} transparent />
    </Plane>
  )
}

export default function ImageLayers() {
  const imageUrls = [
    '/image1.png',
    '/image2.png',
    '/image3.png',
    // ... more images
  ]

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [6, 9, 6], fov: 80 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {imageUrls.map((url, index) => (
          <ImagePlane
            key={index}
            imageUrl={url}
            position={[0, 0, index * -1]} // Z-축을 따라 이미지 배치
            args={[5, 3]} // 이미지 평면의 크기
          />
        ))}
        <OrbitControls />
      </Canvas>
    </div>
  )
}