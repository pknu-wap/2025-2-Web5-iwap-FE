"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";

const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano" , description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide4.jpg", link: "/ascii", text: "Asc!!", description: "네 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide5.jpg", link: "/string", text: "str!ng", description: "다섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide6.jpg", link: "/intsrument", text: "!ntrument", description: "여섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano" , description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide4.jpg", link: "/ascii", text: "Asc!!", description: "네 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide5.jpg", link: "/string", text: "str!ng", description: "다섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide6.jpg", link: "/intsrument", text: "!ntrument", description: "여섯 번째 작품에 대한 설명입니다." },
];

const ACTIVE_SLIDE_WIDTH = "clamp(320px, 68vw, 900px)";
const INACTIVE_SLIDE_WIDTH = "clamp(220px, 28vw, 360px)";
const SLIDER_HEIGHT = "clamp(320px, 58vh, 520px)";
const ELLIPSE_WIDTH_SCALE = 4.6;
const ELLIPSE_HEIGHT_SCALE = 1.35;

export default function SlidesPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [spaceBetween, setSpaceBetween] = useState(16);
  const sliderStyle = { "--slider-height": SLIDER_HEIGHT } as CSSProperties;

  useEffect(() => {
    const updateSpacing = () => {
      const width = window.innerWidth;

      if (width < 640) {
        setSpaceBetween(10);
      } else if (width < 1024) {
        setSpaceBetween(18);
      } else {
        setSpaceBetween(24);
      }
    };

    updateSpacing();
    window.addEventListener("resize", updateSpacing);

    return () => window.removeEventListener("resize", updateSpacing);
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
      className="relative bg-white min-h-screen overflow-hidden flex items-center justify-center"
      style={sliderStyle}
    >
      <div className="w-full max-w-none z-10 px-4 sm:px-8 lg:px-16">
        <Swiper
          loop
          centeredSlides
          className="w-full overflow-visible"
          slidesPerView="auto"
          spaceBetween={spaceBetween}
          autoplay={{ delay: 2500, disableOnInteraction: false }}
          speed={800}
          modules={[Autoplay]}
          style={{ height: "var(--slider-height)", overflow: "visible" }}
        >
          {images.map((item, idx) => (
            <SwiperSlide
              key={item.src}
              onClick={() => handleClick(idx, item.link)}
              style={{
                width:
                  activeIndex === idx
                    ? ACTIVE_SLIDE_WIDTH
                    : INACTIVE_SLIDE_WIDTH,
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
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 50vw"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center p-4">
                  <p className="text-white text-[clamp(24px,4vw,64px)] font-Pretendard text-center">
                    {item.text}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>


<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 804 50.167" enable-background="new 0 0 804 50.167" xml:space="preserve">
<path fill="#E9C6DD" d="M804,0v16.671c0,0-204.974,33.496-401.995,33.496C204.974,50.167,0,16.671,0,16.671V0H804z"/>
</svg>
    </main>
  );
}