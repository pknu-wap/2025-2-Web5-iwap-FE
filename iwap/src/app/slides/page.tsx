"use client";

import { useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide5.jpg", link: "/ascii", text: "ASCi!", description: "이미지를 텍스트로 표현" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "선들로 이미지를 표현" },
  { src: "/images/home/slides/slide6.jpg", link: "/instrument", text: "!nstrument", description: "손동작으로 음악을 연주하는 오케스트라." },
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide5.jpg", link: "/ascii", text: "ASCi!", description: "이미지를 텍스트로 표현" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "선들로 이미지를 표현" },
  { src: "/images/home/slides/slide6.jpg", link: "/instrument", text: "!nstrument", description: "손동작으로 음악을 연주하는 오케스트라." },
];

export default function SlidesPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = (idx: number, link: string) => {
    if (activeIndex === idx) {
      window.location.href = link;
    } else {
      setActiveIndex(idx);
    }
  };

  return (
    <main className="relative bg-white min-h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-10 z-30 pointer-events-none" />

      <div className="relative w-full flex justify-center">
        <div className="relative w-[90vw] max-w-[1280px] min-w-[320px]">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[46%] w-[120%] h-[55%] bg-white z-20 pointer-events-none"
            style={{ clipPath: "ellipse(50% 40% at 50% 50%)" }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[46%] w-[120%] h-[55%] bg-white z-20 pointer-events-none"
            style={{ clipPath: "ellipse(50% 40% at 50% 50%)" }}
          />

          <div className="relative w-full z-10">
            <Swiper
              loop={true}
              centeredSlides={true}
              className="w-full h-[clamp(280px,35vw,520px)]"
              slidesPerView={"auto"}
              spaceBetween={15}
              onTouchMove={() => setIsDragging(true)}
              onSliderMove={() => setIsDragging(true)}
              onTouchEnd={() => setTimeout(() => setIsDragging(false), 0)}
              onSlideChange={() => setIsDragging(false)}
            >
              {images.map((item, idx) => (
                <SwiperSlide
                  key={idx}
                  onClick={() => {
                    if (isDragging) {
                      setIsDragging(false);
                      return;
                    }
                    handleClick(idx, item.link);
                  }}
                  style={{
                    width:
                      activeIndex === idx
                        ? "clamp(340px, 62vw, 900px)"
                        : "clamp(220px, 44vw, 320px)",
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
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center p-4">
                      <p className="text-white text-[clamp(32px,6vw,64px)] font-Pretendard text-center">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </main>
  );
}
