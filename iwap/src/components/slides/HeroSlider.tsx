"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Mousewheel, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css/mousewheel";

type Slide = {
  href: string;
  title: string;
  desc: string;
  img: string;
  alt: string;
};

const slides: {
  src: string;
  link: string;
  text: string;
  description: string;
}[] = [
  { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
  { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
  { src: "/images/home/slides/slide4.jpg", link: "/ascii", text: "Asc!!", description: "네 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide5.jpg", link: "/string", text: "str!ng", description: "다섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide6.jpg", link: "/instrument", text: "!ntrument", description: "여섯 번째 작품에 대한 설명입니다." },
];

export default function HeroSlider() {
  const swiperRef = useRef<SwiperType | null>(null);

  // 비활성 슬라이드 클릭 시 활성화만 처리
  useEffect(() => {
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const slideEl = target.closest(".swiper-slide") as HTMLElement | null;
      if (!slideEl || !swiperRef.current) return;

      const isActive = slideEl.classList.contains("swiper-slide-active");
      if (isActive) return;

      e.preventDefault();
      const indexAttr = slideEl.getAttribute("data-swiper-slide-index");
      const idx = Number(indexAttr ?? 0);
      swiperRef.current.slideToLoop(idx);
    };

    const root = document.querySelector(".hero-slider-root");
    root?.addEventListener("click", onClick as EventListener);
    return () => root?.removeEventListener("click", onClick as EventListener);
  }, []);


  return (
    <section className="relative z-0 py-[clamp(20px,6vw,60px)] pb-[clamp(60px,12vw,100px)]">
      {/* 상단/하단 타원 장식 */}
      <div className="pointer-events-none absolute left-1/2 -top-[clamp(10px,10vw,40px)] z-[10] w-[min(92vw,2200px)] -translate-x-1/2 translate-y-14">
        <svg viewBox="0 0 804 50.167" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path fill="#FFFFF" d="M804,0v16.671c0,0-204.974,33.496-401.995,33.496C204.974,50.167,0,16.671,0,16.671V0H804z" />
        </svg>
      </div>
      <div className="pointer-events-none absolute left-1/2 bottom-[clamp(-40px,-8vw,20px)] z-[10] w-[min(92vw,2200px)] -translate-x-1/2 rotate-180 -translate-y-24">
        <svg viewBox="0 0 804 50.167" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path fill="#FFFFF" d="M804,0v16.671c0,0-204.974,33.496-401.995,33.496C204.974,50.167,0,16.671,0,16.671V0H804z" />
        </svg>
      </div>

      <div className="relative w-full">
        <div className="hero-slider-root">
          <Swiper
            modules={[Autoplay, Pagination, Mousewheel]}
            onSwiper={(s) => {
              swiperRef.current = s;
              s.mousewheel.enable();
            })}
            loop={true}
            loopAdditionalSlides={slides.length}
            centeredSlides
            slidesPerView={"auto"}
            grabCursor
            speed={820}
            autoplay={{ delay: 2500, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            mousewheel={{ forceToAxis: true, thresholdDelta: 1, releaseOnEdges: true, sensitivity: 0.6 }}
            spaceBetween={30}
            breakpoints={{
              0: { spaceBetween: 12 },
              640: { spaceBetween: 18 },
              1024: { spaceBetween: 26 },
            }}
            className="overflow-visible"
          >
            {slides.map((s, i) => (
              <SwiperSlide key={`${s.link}-${i}`} className="slide-h slide-w md:slide-w lg:slide-w">
                <a
                  href={s.link}
                  className="relative block h-full w-full overflow-hidden rounded-card bg-black card-overlay"
                >
                  <div className="card-hover absolute inset-0">
                    <Image
                      src={s.src}
                      alt={s.text}
                      fill
                      className="card-img object-cover [filter:grayscale(8%)_contrast(110%)]"
                      sizes="(max-width: 1024px) 80vw, 50vw"
                      priority
                    />
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-end p-[clamp(18px,3vw,32px)] text-white">
                    <h3 className="m-0 mb-1 font-playfair text-[clamp(24px,4vw,48px)] tracking-[0.1em] drop-shadow">
                      {s.text}
                    </h3>
                    <p className="m-0 text-[clamp(14px,2.1vw,18px)] leading-relaxed opacity-85">
                      {s.description}
                    </p>
                  </div>
                </a>
              </SwiperSlide>
            ))}

          </Swiper>
        </div>
      </div>

      {/* 활성/이전/다음 스케일 조정 */}
      <style jsx global>{`
        .swiper-slide {
          transition: transform .5s ease, filter .5s ease;
          display: flex; align-items: center; justify-content: center;
          width: clamp(220px, 28vw, 360px);
          height: clamp(320px, 58vh, 520px);
        }

        @media (max-width: 920px) {
          .swiper-slide { width: clamp(200px, 60vw, 300px); }
          .swiper-slide-active { transform: scale(1.12); }
        }
        @media (max-width: 640px) {
          .swiper-slide { height: clamp(260px, 52vh, 420px); }
        }
      `}</style>
    </section>
  );
}
