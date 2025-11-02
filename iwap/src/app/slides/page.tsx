// app/slides/page.tsx
"use client";

import { usePathname } from "next/navigation";
import { CardSlider } from "@/components/slides/CardSlider"; // 경로에 맞게 수정

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.svg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide5.svg", link: "/ascii", text: "ASCi!", description: "이미지를 텍스트로 표현" },
  { src: "/images/home/slides/slide4.svg", link: "/string", text: "Str!ng", description: "선들로 이미지를 표현" },
  { src: "/images/home/slides/slide6.svg", link: "/instrument", text: "!nstrument", description: "손동작으로 음악을 연주하는 오케스트라." },
];

export default function SlidesPage() {
  const pathname = usePathname();
  const showHeader = pathname !== '/';

  return (
    <main className={`relative bg-white flex items-center select-none overflow-hidden ${showHeader ? "h-screen md:h-[calc(100vh_-_60px)]" : "h-screen"}`}>
      <CardSlider images={images} showHeader={showHeader} />
    </main>
  );
}