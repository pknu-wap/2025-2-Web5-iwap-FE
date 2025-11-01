// SlidesPage.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "네 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide5.jpg", link: "/slides/5", text: "작품 5", description: "다섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide6.jpg", link: "/slides/6", text: "작품 6", description: "여섯 번째 작품에 대한 설명입니다." },
];

export default function SlidesPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleClick = (idx: number, link: string) => {
    if (activeIndex === idx) window.location.href = link;
    else setActiveIndex(idx);
  };

  return (
    <section
      className="
        fixed inset-0
        md:top-[60px] md:h-[calc(100vh-60px)]
        overflow-hidden flex items-center justify-center bg-white
      "
    >
<section
  className="
    fixed inset-0
    md:top-[60px] md:h-[calc(100vh-60px)]
    overflow-hidden flex items-center justify-center bg-white
    pt-[300px] -pb-[100px]   /* ← translate 대신 패딩으로 여백 확보 */
  "
>
  {/* 상단 타원 */}
  <div className="absolute top-0 left-0 w-full h-[3vw] pointer-events-none z-[60]">
    <svg
      viewBox="0 0 804 50.167"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <path
        fill="black"
        d="M804,0v16.671c0,0-204.974,33.496-401.995,33.496C204.974,50.167,0,16.671,0,16.671V0H804z"
      />
    </svg>
  </div>

  {/* 하단 타원 */}
  <div className="absolute bottom-0 left-0 w-full h-[3vw] rotate-180 pointer-events-none z-[60]">
    <svg
      viewBox="0 0 804 50.167"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <path
        fill="black"
        d="M804,0v16.671c0,0-204.974,33.496-401.995,33.496C204.974,50.167,0,16.671,0,16.671V0H804z"
      />
    </svg>
  </div>

  {/* 슬라이드 */}
  <div className="relative z-10 w-full max-w-[90vw]" style={{ perspective: "2000px" }}>
    {/* Swiper 그대로 */}
  </div>
</section>



      {/* 슬라이드 */}
      <div
        className="relative z-10 w-full max-w-[90vw]"
        style={{ perspective: "2000px" }}
      >
        <Swiper
          loop
          centeredSlides
          slidesPerView="auto"
          spaceBetween={20}
          className="w-full h-[500px]"
        >
          {images.map((item, idx) => (
            <SwiperSlide
              key={idx}
              onClick={() => handleClick(idx, item.link)}
              style={{
                width: activeIndex === idx ? "60vw" : "20vw",
                transform: `rotateY(${activeIndex === idx ? 0 : idx % 2 === 0 ? 12 : -12}deg)`,
                transition: "all 0.5s ease-in-out",
                cursor: "pointer",
              }}
              className="flex justify-center items-center"
            >
              <div className="relative block w-full h-full rounded-lg overflow-hidden group shadow-xl">
                <Image
                  src={item.src}
                  alt={item.text}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center p-4">
                  <p className="text-white text-[4vw] font-Pretendard text-center">
                    {item.text}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
