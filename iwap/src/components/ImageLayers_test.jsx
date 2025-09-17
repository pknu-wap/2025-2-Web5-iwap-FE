// 'use client'
// Next.js의 App Router 환경에서 이 컴포넌트가 클라이언트 측에서 렌더링되어야 함을 명시합니다.
// 브라우저 API(예: WebGL)와 상호작용하고 상태(useRef, useState 등)를 사용하는 컴포넌트에는 필수입니다.
'use client'

// react-three-fiber(r3f) 및 drei 라이브러리에서 필요한 훅과 컴포넌트를 가져옵니다.
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Plane } from '@react-three/drei'
// three.js에서 텍스처 로더와 재질 설정을 위한 요소를 가져옵니다.
import { TextureLoader, DoubleSide } from 'three'

// 단일 이미지 평면을 렌더링하는 재사용 가능한 컴포넌트입니다.
const ImagePlane = ({ imageUrl, position, args }) => {
  // useLoader 훅을 사용하여 이미지 URL로부터 텍스처를 비동기적으로 로드합니다.
  // 로딩이 완료될 때까지 컴포넌트 렌더링은 잠시 중단(Suspense)됩니다.
  const texture = useLoader(TextureLoader, imageUrl)
  
  return (
    // <Plane>은 drei 라이브러리에서 제공하는 평면 지오메트리입니다.
    // args: [가로, 세로] 크기를 지정합니다.
    // position: [x, y, z] 좌표에 평면을 배치합니다.
    <Plane args={args} position={position}>
      {/* meshStandardMaterial은 빛의 영향을 받는 표준적인 3D 객체 재질입니다. */}
      {/* map={texture}: 로드한 이미지를 텍스처로 사용합니다. */}
      {/* side={DoubleSide}: 평면의 양면(앞/뒤)이 모두 보이도록 설정합니다. */}
      {/* transparent: 이미지의 투명한 부분을 실제로 투명하게 처리합니다. */}
      <meshStandardMaterial map={texture} side={DoubleSide} transparent />
    </ Plane>
  )
}

// 여러 이미지 레이어를 3D 공간에 배치하는 메인 컴포넌트입니다.
export default function ImageLayers() {
  // 1. 이미지 URL 배열을 저장할 state를 생성합니다. 초기값은 빈 배열입니다.
  const [imageUrls, setImageUrls] = useState([])
  // 2. 컴포넌트가 처음 렌더링될 때 API를 호출하기 위해 useEffect를 사용합니다.
  useEffect(() => {
    // API에서 데이터를 가져오는 비동기 함수를 정의합니다.
    const fetchImages = async () => {
      try {
        // 실제 사용할 API 엔드포인트로 교체해야 합니다.
        const response = await fetch('https://api.example.com/images') 
        const data = await response.json()
        
        // API 응답 데이터가 URL 배열이라고 가정합니다.
        // 예: { "images": ["/url1.png", "/url2.png"] }
        setImageUrls(data.images) 
      } catch (error) {
        console.error("Failed to fetch images:", error)
      }
    }

    fetchImages() // 함수를 호출합니다.
  }, []) // 빈 배열을 전달하여 이 effect가 컴포넌트 마운트 시 한 번만 실행되도록 합니다.

  return (
    // 3D 씬을 담을 컨테이너의 크기를 화면 전체로 설정합니다.
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* <Canvas>는 3D 렌더링이 일어나는 공간(Scene)을 설정합니다. */}
      {/* camera: 카메라의 초기 위치와 시야각(fov)을 설정합니다. */}
      <Canvas camera={{ position: [0, -2.5, 2.5], fov: 80 }}>
        {/* <ambientLight>는 씬 전체에 은은하게 퍼지는 조명입니다. 그림자를 만들지 않습니다. */}
        <ambientLight intensity={0.5} />
        {/* <pointLight>는 특정 위치에서 모든 방향으로 빛을 발산하는 조명입니다. */}
        <pointLight position={[10, 10, 10]} />

        {/* imageUrls 배열을 순회하며 각 이미지에 대한 ImagePlane 컴포넌트를 생성합니다. */}
        {imageUrls.map((url, index) => (
          <ImagePlane
            // React가 배열의 각 항목을 식별하기 위한 고유한 key입니다.
            key={index}
            // ImagePlane에 전달할 이미지의 URL입니다.
            imageUrl={url}
            // 이미지의 위치를 설정합니다. Z축 값을 index에 따라 다르게 주어 깊이감을 만듭니다.
            // index가 커질수록 화면에서 더 멀어집니다 (z값이 음수이므로).
            position={[0, 0, index * -1]} 
            // 이미지 평면의 크기를 [가로 5, 세로 3]으로 설정합니다.
            args={[5, 3]} 
          />
        ))}

        {/* <OrbitControls>는 마우스로 3D 씬을 회전, 확대/축소, 이동할 수 있게 해주는 컨트롤러입니다. */}
        <OrbitControls />
      </Canvas>
    </div>
  )
}