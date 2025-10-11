"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperCore } from 'swiper';

import "swiper/css";

// --- [수정 3-1] 데이터 구조에 description 필드 추가 ---
const images = [
  { src: "/images/home/slides/slide1.jpg", link: "/string", text: "Str!ng", description: "This is the description for Str!ng." },
  { src: "/images/home/slides/slide2.jpg", link: "/inside", text: "!nside", description: "A look at the inner world." },
  { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "Interactive piano project." },
  { src: "/images/home/slides/slide4.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "A special project for you." },
  { src: "/images/home/slides/slide5.jpg", link: "/slides/5", text: "작품 설명 5", description: "다섯 번째 작품에 대한 설명입니다." },
  { src: "/images/home/slides/slide6.jpg", link: "/slides/6", text: "작품 설명 6", description: "여섯 번째 작품에 대한 설명입니다." },
];

const MAX_VISIBLE_CARDS = 4;

export default function SlidesPage() {
  const pathname = usePathname();
  const showHeader = pathname !== '/';

  // --- [수정 1] 상태 기억 로직 제거, 단순한 상태 초기화 ---
  const [isExpanded, setIsExpanded] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState<SwiperCore | null>(null);
  
  // --- [수정 2-1] 모바일 터치(탭) 활성화 상태를 위한 상태 추가 ---
  const [activatedIndex, setActivatedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (swiperInstance) {
      swiperInstance.allowTouchMove = isExpanded;
    }
  }, [isExpanded, swiperInstance]);
    
  const handleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };
    
  return (
    <main
      className={`
        relative bg-white flex items-center justify-center select-none overflow-hidden
        ${showHeader ? "h-screen md:h-[calc(100vh_-_96px)]" : "h-screen"}
      `}
    >
      <div
        className={`
          w-full h-[300px] md:h-[500px]
          transition-transform duration-700 ease-in-out opacity-100
          ${!isExpanded ? 'translate-x-[30vw] md:translate-x-[35%]' : 'translate-x-0'}
        `}
      >
        <Swiper
          loop={false}
          centeredSlides={true}
          slidesPerView={"auto"}
          spaceBetween={15}
          className="w-full h-full"
          onSwiper={setSwiperInstance}
          // 다른 슬라이드로 이동하면 활성화 상태 초기화
          onSlideChange={() => setActivatedIndex(null)}
          allowTouchMove={isExpanded}
        >
          {images.map((item, idx) => {
            const isVisibleInStack = idx < MAX_VISIBLE_CARDS;
            const stackOffset = isVisibleInStack ? idx * 50 : 0; 
            
            return (
              <SwiperSlide
                key={idx}
                className="!w-[60vw] md:!w-[320px] transition-transform duration-700 ease-in-out"
                style={{
                  transform: !isExpanded ? `translateX(-${stackOffset}px)` : 'translateX(0)',
                  zIndex: images.length - idx,
                  opacity: !isExpanded && !isVisibleInStack ? 0 : 1,
                  pointerEvents: !isExpanded && !isVisibleInStack ? 'none' : 'auto',
                }}
              >
                <Link
                  href={item.link}
                  className="block w-full h-full cursor-pointer"
                  onDragStart={(e) => e.preventDefault()}
                  // --- [수정 2-2] 모바일 '2단계 클릭' 및 확장 로직 통합 ---
                  onClick={(e) => {
                    // 1. 스택이 축소 상태일 경우: 모든 클릭은 스택을 확장시킴
                    if (!isExpanded) {
                      handleExpand();
                      e.preventDefault();
                      return;
                    }

                    // 2. 스택이 확장 상태일 경우: '2단계 클릭' 로직 적용
                    // 이미 활성화된 카드가 아니라면, 첫 번째 클릭으로 간주
                    if (activatedIndex !== idx) {
                      e.preventDefault(); // 링크 이동 방지
                      setActivatedIndex(idx); // 현재 카드를 활성화
                    }
                    // 이미 활성화된 카드라면, 두 번째 클릭이므로 링크 이동을 허용
                  }}
                >
                  <div className="relative w-full h-full rounded-lg overflow-hidden group shadow-lg">
                    <Image src={item.src} alt={item.text} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    {/* --- [수정 2-3 & 3-2] 활성화 상태 및 레이아웃 수정 --- */}
                    <div
                      className={`
                        absolute inset-0 bg-black/40 transition-opacity duration-300
                        flex flex-col items-center justify-center text-center p-4
                        opacity-0 group-hover:opacity-100
                        ${activatedIndex === idx ? '!opacity-100' : ''}
                      `}
                    >
                      <h3 className="text-white text-4xl md:text-5xl font-bold font-Pretendard">{item.text}</h3>
                      <p className="text-white text-sm md:text-base font-Pretendard mt-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </main>
  );
}