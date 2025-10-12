// app/slides/page.tsx
"use client";

import { usePathname } from "next/navigation";
import { CardSlider } from "@/components/slides/CardSlider"; // 경로에 맞게 수정

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/string", text: "Str!ng", description: "This is the description for Str!ng." },
  { src: "/images/home/slides/slide2.jpg", link: "/inside", text: "!nside", description: "A look at the inner world." },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "Interactive piano project." },
  { src: "/images/home/slides/slide4.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "A special project for you." },
  { src: "/images/home/slides/slide5.jpg", link: "/slides/5", text: "작품 5", description: "다섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide6.jpg", link: "/slides/6", text: "작품 6", description: "여섯 번째 작품에 대한 설명입니다." },
];

export default function SlidesPage() {
  const pathname = usePathname();
  const showHeader = pathname !== '/';

  return (
    <main className={`relative bg-white flex items-center select-none overflow-hidden ${showHeader ? "h-screen md:h-[calc(100vh_-_96px)]" : "h-screen"}`}>
      <CardSlider images={images} showHeader={showHeader} />
    </main>
  );
}