"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";

import "swiper/css";
import "swiper/css/mousewheel";

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "엽서로 마음 표현" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide5.jpg", link: "/ascii", text: "ASCi!", description: "이미지를 텍스트로 표현" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "선들로 이미지를 표현" },
  { src: "/images/home/slides/slide6.jpg", link: "/graffiti", text: "Graff!ti", description: "움직임으로만 드로잉" },
  // { src: "/images/home/slides/slide6.jpg", link: "/graffiti", text: "Graff!ti", description: "움직임으로만 드로잉" },
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "엽서로 마음 표현" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide5.jpg", link: "/ascii", text: "ASCi!", description: "이미지를 텍스트로 표현" },
  { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "선들로 이미지를 표현" },
  { src: "/images/home/slides/slide6.jpg", link: "/graffiti", text: "Graff!ti", description: "움직임으로만 드로잉" },
];

export default function SlidesPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const swiperRef = useRef<SwiperClass | null>(null);
  const sliderWrapperRef = useRef<HTMLDivElement | null>(null);
  const maskStyle: CSSProperties = {
    clipPath: "ellipse(var(--mask-rx) var(--mask-ry) at 50% 50%)",
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 마우스 휠 수동 처리(페이지 어디서든 슬라이드 이동)
  useEffect(() => {
    const el = sliderWrapperRef.current ?? document.body;

    const onWheel = (e: WheelEvent) => {
      const swiper = swiperRef.current;
      if (!swiper) return;

      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 1) return;

      e.preventDefault();
      if (delta > 0) swiper.slideNext();
      else swiper.slidePrev();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
        <div className="relative w-[90vw] max-w-[2000px] min-w-[320px]">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[38%] w-[110%] h-[33%] bg-white z-20 pointer-events-none [--mask-rx:50%] [--mask-ry:32%] md:-translate-y-[46%] md:w-[120%] md:h-[55%] md:[--mask-ry:40%]"
            style={maskStyle}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[38%] w-[110%] h-[33%] bg-white z-20 pointer-events-none [--mask-rx:50%] [--mask-ry:32%] md:translate-y-[50%] md:w-[120%] md:h-[55%] md:[--mask-ry:40%]"
            style={maskStyle}
          />

          <div className="relative w-full z-10" ref={sliderWrapperRef}>
            <Swiper
              modules={[Mousewheel]}
              loop={true}
              centeredSlides={true}
              className="w-full h-[clamp(280px,35vw,520px)]"
              slidesPerView={"auto"}
              spaceBetween={15}
              mousewheel={{ forceToAxis: true, thresholdDelta: 1, releaseOnEdges: true, sensitivity: 0.6 }}
              onSwiper={(instance) => {
                swiperRef.current = instance;
                // 마우스 휠 강제로 활성화 (간혹 초기화 시 비활성화되는 경우 보완)
                instance.mousewheel.enable();
              }}
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
                    <div
                      className={
                        isMobile
                          ? "absolute inset-0 transition-opacity duration-500 flex items-center justify-center p-4 opacity-100 " +
                            (activeIndex === idx ? "bg-black/30" : "bg-transparent")
                          : "absolute inset-0 bg-black/30 transition-opacity duration-500 flex items-center justify-center p-4 opacity-0 md:opacity-0 md:group-hover:opacity-100"
                      }
                    >
                      <p className="text-[#FFFFFF] text-[clamp(28px,7vw,64px)] font-semilight text-center drop-shadow-sm md:drop-shadow-none">
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
