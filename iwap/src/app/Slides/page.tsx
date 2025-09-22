"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";

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
  // 현재 확장된 슬라이드 인덱스
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleClick = (idx: number, link: string) => {
    if (activeIndex === idx) {
      // 이미 활성화된 상태 -> 실제로 이동
      window.location.href = link;
    } else {
      // 아직 활성화 안됨 -> 활성화만
      setActiveIndex(idx);
    }
  };

  return (
    <main className="relative bg-white h-screen overflow-hidden flex items-center justify-center">
      {/* 상단 텍스트 */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-10 z-30 pointer-events-none">
        <h1 className="text-3xl font-bold mb-4">!WAP</h1>
        <p className="mb-12">Interactive Web Art Project</p>
      </div>

      {/* Swiper */}
      <div className="w-full z-10">
        <Swiper
          loop={true}
          centeredSlides={true}
          className="w-full h-[500px]"
          slidesPerView={"auto"}
          spaceBetween={15}
        >
          {images.map((item, idx) => (
            <SwiperSlide
              key={idx}
              onClick={() => handleClick(idx, item.link)}
              style={{
                width: activeIndex === idx ? "900px" : "300px",
                transition: "width 0.4s ease-in-out",
                cursor: "pointer",
              }}
              className="flex justify-center items-center"
            >
              <div className="relative block w-full h-full rounded-lg overflow-hidden group">
                <Image
                  src={item.src}
                  alt={item.text}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 
                                transition-opacity duration-500 flex items-center justify-center p-4">
                  <p className="text-white text-[64px] font-Pretendard text-center">
                    {item.text}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
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
