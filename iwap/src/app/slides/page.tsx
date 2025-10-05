"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/string", text: "Str!ng" },
  { src: "/images/home/slides/slide2.jpg", link: "/inside", text: "!nside" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano" },
  { src: "/images/home/slides/slide4.jpg", link: "/this-is-for-u", text: "Th!s !s for u" },
  { src: "/images/home/slides/slide5.jpg", link: "/slides/5", text: "작품 설명 5" },
  { src: "/images/home/slides/slide6.jpg", link: "/slides/6", text: "작품 설명 6" },
  { src: "/images/home/slides/slide7.jpg", link: "/slides/7", text: "작품 설명 7" },
  { src: "/images/home/slides/slide8.jpg", link: "/slides/8", text: "작품 설명 8" },
  { src: "/images/home/slides/slide9.jpg", link: "/slides/9", text: "작품 설명 9" },
  { src: "/images/home/slides/slide10.jpg", link: "/slides/10", text: "작품 설명 10" },
];

export default function SlidesPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768); // Tailwind's md breakpoint is 768px
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // MODIFIED: Simplified click handler for both mobile and desktop
  const handleClick = (idx: number, link: string) => {
    if (activeIndex === idx) {
      window.location.href = link;
    } else {
      setActiveIndex(idx);
    }
  };

  return (
    <main className="relative bg-white h-screen overflow-hidden flex items-center justify-center">

      {/* Swiper */}
      <div className="w-full z-10">
        <Swiper
          loop={true}
          centeredSlides={true}
          className="w-full h-[300px] md:h-[500px]"
          slidesPerView={3.5} // Base slides per view for mobile
          spaceBetween={10}
          breakpoints={{
            768: {
              slidesPerView: 6, // On desktop, use 'auto' for custom widths
              spaceBetween: 15,
            },
          }}
        >
          {images.map((item, idx) => (
            <SwiperSlide
              key={idx}
              onClick={() => handleClick(idx, item.link)}
              style={{
                width: isDesktop
                  ? activeIndex === idx
                    ? "900px"
                    : "300px"
                  : undefined,
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
                {/* MODIFIED: Overlay class for mobile touch effect */}
                <div
                  className={`absolute inset-0 bg-black/40 transition-opacity duration-500 flex items-center justify-center p-4
                             opacity-0 group-hover:opacity-100 
                             ${activeIndex === idx ? "!opacity-100" : ""}`}
                >
                  <p className="text-white text-4xl md:text-[64px] font-Pretendard text-center">
                    {item.text}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

{/* 위쪽 타원 */}
<div
  className="
    absolute top-0 left-1/2 -translate-x-1/2 
    -translate-y-[15%] md:-translate-y-[43%]   // 모바일은 30%, 데스크톱은 43%
    w-[250vw] h-[550px] md:w-[2810px] md:h-[685px] 
    bg-white z-20 pointer-events-none
  "
  style={{
    clipPath: isDesktop
      ? "ellipse(50% 40% at 50% 50%)"
      : "ellipse(50% 30% at 50% 50%)",
  }}
/>

{/* 아래쪽 타원 */}
<div
  className="
    absolute bottom-0 left-1/2 -translate-x-1/2 
    translate-y-[15%] md:translate-y-[43%]    // 모바일은 30%, 데스크톱은 43%
    w-[250vw] h-[550px] md:w-[2810px] md:h-[685px] 
    bg-white z-20 pointer-events-none
  "
  style={{
    clipPath: isDesktop
      ? "ellipse(50% 40% at 50% 50%)"
      : "ellipse(50% 30% at 50% 50%)",
  }}
/>

    </main>
  );
}