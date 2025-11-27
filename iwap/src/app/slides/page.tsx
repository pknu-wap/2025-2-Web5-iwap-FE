"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";
import { useTheme } from "@/components/theme/ThemeProvider";

import "swiper/css";
import "swiper/css/mousewheel";

type SlideContent = {
  src: { light: string; dark: string };
  link: string;
  title: string;
  description: string;
  leftTexts: [string, string];
  rightTexts: [string, string];
};

const baseSlides: SlideContent[] = [
  {
    src: {
      light: "/images/bg-light/inside_light.webp",
      dark: "/images/bg-dark/inside_dark.webp",
    },
    link: "/inside",
    title: "!nside",
    description: "인공지능이 숫자를 인식하는 과정",
    leftTexts: ["!nside", "인공지능이 숫자를 인식하는 과정"],
    rightTexts: ["Project", "01"],
  },
  {
    src: {
      light: "/images/bg-light/this-is-for-u_light.webp",
      dark: "/images/bg-dark/this-is-for-u_dark.webp",
    },
    link: "/this-is-for-u",
    title: "Th!s !s for u",
    description: "엽서로 마음 표현",
    leftTexts: ["Th!s !s for u", "엽서로 마음 표현"],
    rightTexts: ["Project", "02"],
  },
  {
    src: {
      light: "/images/bg-light/piano_light.webp",
      dark: "/images/bg-dark/piano_dark.webp",
    },
    link: "/piano",
    title: "P!ano",
    description: "음성을 피아노로 변환",
    leftTexts: ["P!ano", "음성을 피아노로 변환"],
    rightTexts: ["Project", "03"],
  },
  {
    src: {
      light: "/images/bg-light/ascii_light.webp",
      dark: "/images/bg-dark/ascii_dark.webp",
    },
    link: "/ascii",
    title: "ASCi!",
    description: "이미지를 텍스트로 표현",
    leftTexts: ["ASCi!", "이미지를 텍스트로 표현"],
    rightTexts: ["Project", "04"],
  },
  {
    src: {
      light: "/images/bg-light/string_light.webp",
      dark: "/images/bg-dark/string_dark.webp",
    },
    link: "/string",
    title: "Str!ng",
    description: "선들로 이미지를 표현",
    leftTexts: ["Str!ng", "선들로 이미지를 표현"],
    rightTexts: ["Project", "05"],
  },
  {
    src: {
      light: "/images/bg-light/graffiti_light.webp",
      dark: "/images/bg-dark/graffiti_dark.webp",
    },
    link: "/graffiti",
    title: "Graff!ti",
    description: "움직임으로만 드로잉",
    leftTexts: ["Graff!ti", "움직임으로만 드로잉"],
    rightTexts: ["Project", "06"],
  },
  {
    src: {
      light: "/images/bg-light/facial_light.webp",
      dark: "/images/bg-dark/facial_dark.webp",
    },
    link: "/facial",
    title: "Fac!al",
    description: "얼굴의 특징을 변경",
    leftTexts: ["Fac!al", "얼굴의 특징을 변경"],
    rightTexts: ["Project", "07"],
  },
];

const images = [...baseSlides, ...baseSlides];

export default function SlidesPage() {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const swiperRef = useRef<SwiperClass | null>(null);
  const sliderWrapperRef = useRef<HTMLDivElement | null>(null);
  const maskStyle: CSSProperties = {
    clipPath: "ellipse(var(--mask-rx) var(--mask-ry) at 50% 50%)",
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1440px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);


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
    <main
      className="relative min-h-screen overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: theme === "dark" ? "#171717" : "#ffffff" }}
    >
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-10 z-30 pointer-events-none" />

      <div className="relative w-full flex justify-center">
        <div className="relative w-[90vw] max-w-[2000px] min-w-[320px]">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[38%] w-[110%] h-[33%] z-20 pointer-events-none [--mask-rx:50%] [--mask-ry:32%] md:-translate-y-[46%] md:w-[120%] md:h-[55%] md:[--mask-ry:40%]"
            style={{
              ...maskStyle,
              backgroundColor: theme === "dark" ? "#171717" : "#ffffff",
            }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[38%] w-[110%] h-[33%] z-20 pointer-events-none [--mask-rx:50%] [--mask-ry:32%] md:translate-y-[50%] md:w-[120%] md:h-[55%] md:[--mask-ry:40%]"
            style={{
              ...maskStyle,
              backgroundColor: theme === "dark" ? "#171717" : "#ffffff",
            }}
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

                instance.mousewheel.enable();
              }}
              onTouchMove={() => setIsDragging(true)}
              onSliderMove={() => setIsDragging(true)}
              onTouchEnd={() => setTimeout(() => setIsDragging(false), 0)}
              onSlideChange={() => setIsDragging(false)}
            >
              {images.map((item, idx) => (
                // 클릭으로 활성화된 상태에서는 타이틀만 보여준다.
                <SwiperSlide
                  key={idx}
                  className="flex justify-center items-center"
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
                >
                  <div className="relative block w-full h-full rounded-lg overflow-hidden group">
                    <Image
                      src={item.src[theme]}
                      alt={item.title}
                      fill
                      priority
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className={
                        isMobile
                          ? `absolute inset-0 ${theme === 'dark' ? 'text-white bg-gradient-to-br from-black/30 via-black/25 to-black/20' : 'text-black bg-gradient-to-br from-white/30 via-white/25 to-white/20'} opacity-100 ${
                              activeIndex === idx
                                ? "flex items-center justify-center px-6"
                                : "flex items-center justify-between gap-4 sm:gap-6 md:gap-8 px-5 sm:px-6 md:px-8 transform translate-y-4 md:translate-y-8"
                            }`
                          : `absolute inset-0 ${theme === 'dark' ? 'text-white bg-gradient-to-br from-black/30 via-black/25 to-black/20' : 'text-black bg-gradient-to-br from-white/30 via-white/25 to-white/20'} opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                              activeIndex === idx
                                ? "flex items-center justify-center px-6"
                                : "flex items-center justify-between gap-4 sm:gap-6 md:gap-8 px-5 sm:px-6 md:px-8 transform translate-y-[15px] md:translate-y-[95px]"
                            }`
                      }
                    >
                      {activeIndex === idx ? (
                        <div className="w-full flex items-center justify-center text-center">
                          <span className="text-[clamp(28px,7vw,64px)] font-semibold leading-tight">
                            {item.title}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-[5px] max-w-[120%] text-left md:translate-y-0 translate-y-[25px]">
                            <span className="text-[24px] font-medium">
                              {item.leftTexts[0]}
                            </span>
                            <span className="text-[14px] font-normal">
                              {isMobile && item.title === "!nside" ? (
                                <>
                                  인공지능이 숫자를
                                  <br />
                                  인식하는 과정
                                </>
                              ) : (
                                item.leftTexts[1]
                              )}
                            </span>
                          </div>
                          <div className="flex flex-col gap-[5px] items-end text-right max-w-[10%] md:translate-y-0 translate-y-[25px]">
                            <span className="text-[12px] font-light">
                              {item.rightTexts[0]}
                            </span>
                            <span className="font-light text-[36px]">
                              {item.rightTexts[1]}
                            </span>
                          </div>
                        </>
                      )}
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
