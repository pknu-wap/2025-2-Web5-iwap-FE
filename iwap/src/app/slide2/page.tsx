"use client";

import { usePathname } from "next/navigation";
import { ThreeDImageRing } from "@/components/lightswind/3d-image-ring";

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "네 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide5.jpg", link: "/slides/5", text: "작품 5", description: "다섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide6.jpg", link: "/slides/6", text: "작품 6", description: "여섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "네 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide5.jpg", link: "/slides/5", text: "작품 5", description: "다섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide6.jpg", link: "/slides/6", text: "작품 6", description: "여섯 번째 작품에 대한 설명입니다." },
];

export default function SlidesPage() {
  const pathname = usePathname();
  const showHeader = pathname !== "/";

  return (
    <main
      className={`relative flex justify-center items-center w-full bg-white overflow-hidden ${
        showHeader ? "h-screen md:h-[calc(100vh_-_60px)]" : "h-screen"
      }`}
    >
      <ThreeDImageRing
        images={images}
        width={300}
        height={400}
        perspective={2000}
        imageDistance={400}
        initialRotation={180}
        animationDuration={1.5}
        staggerDelay={0.1}
        backgroundColor="#ffffff"
        draggable
        ease="expo"
        desktopScale={1.6}
      />
    </main>
  );
}
