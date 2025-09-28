"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const images = [
  { src: "/slides/slide1.jpg", link: "/!nside", text: "!nside" },
  { src: "/slides/slide2.jpg", link: "/String", text: "String" },
  { src: "/slides/slide3.jpg", link: "/P!ano", text: "P!ano" },
  { src: "/slides/slide4.jpg", link: "/Th!s!s4U", text: "Th!s !s 4 U" },
  { src: "/slides/slide5.jpg", link: "/!nstrument", text: "!nstrument" },
  { src: "/slides/slide6.jpg", link: "/slides/6", text: "작품 설명 6" },
  { src: "/slides/slide7.jpg", link: "/slides/7", text: "작품 설명 7" },
  { src: "/slides/slide8.jpg", link: "/slides/8", text: "작품 설명 8" },
  { src: "/slides/slide9.jpg", link: "/slides/9", text: "작품 설명 9" },
  { src: "/slides/slide10.jpg", link: "/slides/10", text: "작품 설명 10" },
];

export default function SlidesPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleClick = (idx: number, link: string) => {
    if (activeIndex === idx) {
      router.push(link);
    } else {
      setActiveIndex(idx);
    }
  };

  // Shift + wheel → 좌우 스크롤
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      if (e.shiftKey) {
        scrollRef.current.scrollLeft += e.deltaY; // shift 누르면 좌우
      }
    }
  };

  // 마우스 드래그 → 좌우 스크롤
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDown = true;
    startX = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft = scrollRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown = false;
  };

  const handleMouseUp = () => {
    isDown = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.2; // drag speed
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <main className="relative bg-white h-screen overflow-hidden flex items-center justify-center">
      {/* 상단 텍스트 */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-10 z-30 pointer-events-none">
        <h1 className="text-3xl font-bold mb-4">!WAP</h1>
        <p className="mb-12">Interactive Web Art Project</p>
      </div>

      {/* 카드 리스트 */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="w-full z-10 overflow-x-auto scrollbar-hide cursor-grab"
      >
        <div className="flex items-center gap-4 px-10">
          {images.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleClick(idx, item.link)}
              className="relative rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
              style={{
                width:
                  activeIndex === idx
                    ? "70vw" // 활성화 시 반응형: 화면의 70%
                    : "20vw", // 비활성화 시 20%
                maxWidth: activeIndex === idx ? "900px" : "300px",
                height: "500px",
                transition: "width 0.4s ease-in-out",
              }}
            >
              <Image
                src={item.src}
                alt={item.text}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-500 flex items-center justify-center p-4">
                <p className="text-white text-[8vw] md:text-[64px] font-Pretendard text-center">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 타원 배경 */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[43%] w-[2810px] h-[685px] bg-white z-20 pointer-events-none"
        style={{ clipPath: "ellipse(50% 40% at 50% 50%)" }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[43%] w-[2810px] h-[685px] bg-white z-20 pointer-events-none"
        style={{ clipPath: "ellipse(50% 40% at 50% 50%)" }}
      />
    </main>
  );
}
