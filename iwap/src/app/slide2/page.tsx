"use client";

import { usePathname } from "next/navigation";
import ThreeDImageRing from "@/components/lightswind/3d-image-ring";

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "선들로 이미지를 표현" },
  { src: "/images/home/slides/slide5.jpg", link: "/ascii", text: "ASCi!", description: "이미지를 텍스트로 표현" },
  { src: "/images/home/slides/slide6.jpg", link: "/instrument", text: "!nstrument", description: "손동작으로 음악을 연주하는 오케스트라." },
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "선들로 이미지를 표현" },
  { src: "/images/home/slides/slide5.jpg", link: "/ascii", text: "ASCi!", description: "이미지를 텍스트로 표현" },
  { src: "/images/home/slides/slide6.jpg", link: "/instrument", text: "!nstrument", description: "손동작으로 음악을 연주하는 오케스트라." },
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
      {/* 🖥️ 데스크톱용: 12개 */}
      <div className="hidden md:flex w-full h-full items-center justify-center">
        <ThreeDImageRing
          images={images} // 전체 12개
          width={180}
          height={230}
          perspective={800}
          imageDistance={230}
          initialRotation={180}
          animationDuration={1.5}
          staggerDelay={0.1}
          backgroundColor="#ffffff"
          draggable
          ease="expo"
          desktopScale={1.6}
        />
      </div>

      {/* 📱 모바일용: 6개만 */}
      <div className="flex md:hidden w-full h-full items-center justify-center">
        <ThreeDImageRing
          images={images.slice(0, 12)} // 앞에서 6개만
          width={55}
          height={90}
          perspective={200}
          imageDistance={50}
          initialRotation={160}
          animationDuration={1.2}
          staggerDelay={0.08}
          backgroundColor="#ffffff"
          draggable
          ease="easeOutCubic"
          mobileScaleFactor={2.3}
        />
      </div>
    </main>
  );
}
