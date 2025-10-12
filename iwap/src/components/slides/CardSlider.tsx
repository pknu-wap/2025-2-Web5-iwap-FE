// components/slides/CardSlider.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/slides/Card";

type ImageItem = {
  src: string; link: string; text: string; description: string;
};

type CardSliderProps = {
  images: ImageItem[];
  showHeader: boolean;
};

const BASE_CARD_WIDTH = 320;
const BASE_CARD_HEIGHT = 500;
const FOCUSED_WIDTH_RATIO = 2;
const GAP = 40;
const VISIBLE_STACK_OFFSET = 50;
const VISIBLE_STACKED_CARDS = 4;
const HEADER_HEIGHT = 96;
const RIGHT_PADDING = 20;

export const CardSlider = ({ images, showHeader }: CardSliderProps) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [cardDimensions, setCardDimensions] = useState({
    width: BASE_CARD_WIDTH,
    height: BASE_CARD_HEIGHT,
    focusedWidth: BASE_CARD_WIDTH * FOCUSED_WIDTH_RATIO,
    initialX: 0,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    isDragging: false, startX: 0, scrollLeft: 0, wasDragged: false,
    velocity: 0, animationFrame: 0,
  }).current;

  const updateDimensions = useCallback(() => {
    const isDesktop = window.innerWidth >= 768;
    const isLandscape = window.innerWidth > window.innerHeight;
    
    const headerHeight = showHeader && isDesktop ? HEADER_HEIGHT : 0;
    const availableHeight = window.innerHeight - headerHeight;
    const verticalMargin = availableHeight * (isLandscape ? 0.25 : 0.15);
    const newHeight = Math.min(availableHeight - verticalMargin, BASE_CARD_HEIGHT);
    
    const aspectRatio = BASE_CARD_WIDTH / BASE_CARD_HEIGHT;
    const newWidth = newHeight * aspectRatio;
    
    const stackedVisibleCards = Math.min(images.length, VISIBLE_STACKED_CARDS);
    const stackedWidth = newWidth + (stackedVisibleCards > 0 ? stackedVisibleCards - 1 : 0) * VISIBLE_STACK_OFFSET;
    
    let newInitialX;
    if (isDesktop) {
      // 데스크탑: 기존 로직대로 오른쪽 정렬
      newInitialX = window.innerWidth - stackedWidth - RIGHT_PADDING;
    } else {
      // 모바일: 화면 중앙에 오도록 X 위치 계산
      newInitialX = (window.innerWidth - stackedWidth) / 2;
    }

    setCardDimensions({
      width: newWidth,
      height: newHeight,
      focusedWidth: newWidth * FOCUSED_WIDTH_RATIO,
      initialX: newInitialX,
    });

    if (!isInitialized) {
      // 모든 계산이 끝난 후 초기화 상태로 설정
      setIsInitialized(true);
    }
  }, [showHeader, isInitialized, images.length]);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    // 컴포넌트 마운트 시 첫 계산 실행
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isExpanded) return;
    const momentumLoop = () => { if (!container) return; container.scrollLeft += dragState.velocity; dragState.velocity *= 0.95; if (Math.abs(dragState.velocity) > 0.5) { dragState.animationFrame = requestAnimationFrame(momentumLoop); } };
    const handleDragStart = (e: MouseEvent | TouchEvent) => { cancelAnimationFrame(dragState.animationFrame); dragState.isDragging = true; const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX; dragState.startX = pageX - container.offsetLeft; dragState.scrollLeft = container.scrollLeft; dragState.wasDragged = false; dragState.velocity = 0; container.style.cursor = 'grabbing'; container.style.userSelect = 'none'; };
    const handleDragMove = (e: MouseEvent | TouchEvent) => { if (!dragState.isDragging) return; if ('touches' in e) e.preventDefault(); dragState.wasDragged = true; const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX; const x = pageX - container.offsetLeft; const walk = (x - dragState.startX); const prevScrollLeft = container.scrollLeft; container.scrollLeft = dragState.scrollLeft - walk; dragState.velocity = container.scrollLeft - prevScrollLeft; };
    const handleDragEnd = () => { if (!dragState.isDragging) return; dragState.isDragging = false; container.style.cursor = 'grab'; container.style.userSelect = 'auto'; dragState.animationFrame = requestAnimationFrame(momentumLoop); };
    container.addEventListener('mousedown', handleDragStart); container.addEventListener('touchstart', handleDragStart, { passive: false }); container.addEventListener('mousemove', handleDragMove); container.addEventListener('touchmove', handleDragMove, { passive: false }); container.addEventListener('mouseup', handleDragEnd); container.addEventListener('touchend', handleDragEnd); container.addEventListener('mouseleave', handleDragEnd);
    return () => { container.removeEventListener('mousedown', handleDragStart); container.removeEventListener('touchstart', handleDragStart); container.removeEventListener('mousemove', handleDragMove); container.removeEventListener('touchmove', handleDragMove); container.removeEventListener('mouseup', handleDragEnd); container.removeEventListener('touchend', handleDragEnd); container.removeEventListener('mouseleave', handleDragEnd); cancelAnimationFrame(dragState.animationFrame); };
  }, [isExpanded, dragState]);

  const handleCardClick = (index: number) => {
    if (dragState.wasDragged) return;
    if (!isExpanded) { setIsExpanded(true); return; }
    if (activeIndex === index) { router.push(images[index].link); } else { setActiveIndex(index); }
  };

  const spacerWidth = `calc(50vw - ${cardDimensions.width / 2}px)`;

  return (
    <div
      ref={scrollContainerRef}
      className={`w-full ${isExpanded ? 'cursor-grab overflow-x-auto' : 'overflow-hidden'} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      style={{
        height: `${cardDimensions.height}px`,
        // 초기화 완료 시 부드럽게 표시
        opacity: isInitialized ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      {/* 초기화가 완료된 후에만 내부 컨텐츠를 렌더링하여 Flicker 방지 */}
      {isInitialized && (
        <div
          className="relative flex items-center h-full"
          style={{
            transform: isExpanded ? 'translateX(0)' : `translateX(${cardDimensions.initialX}px)`,
            transition: 'transform 1s ease-in-out',
          }}
        >
          <div className="flex-shrink-0" style={{ width: isExpanded ? spacerWidth : '0', transition: 'width 1s ease-in-out' }} />
          
          {images.map((item, index) => {
            const isActive = activeIndex === index;
            const cardWidth = isExpanded && isActive ? cardDimensions.focusedWidth : cardDimensions.width;
            const marginLeft = !isExpanded && index > 0 ? -(cardDimensions.width - VISIBLE_STACK_OFFSET) : GAP;

            const cardStyle: React.CSSProperties = {
              width: `${cardWidth}px`,
              height: '100%',
              zIndex: index,
              marginLeft: index > 0 ? `${marginLeft}px` : (isExpanded ? `${GAP}px` : '0'),
              transition: 'width 0.5s ease-in-out, margin-left 1s ease-in-out',
              opacity: !isExpanded && (images.length - index > VISIBLE_STACKED_CARDS) ? 0 : 1,
              pointerEvents: !isExpanded && (images.length - index > VISIBLE_STACKED_CARDS) ? 'none' : 'auto',
            };

            return (
              <Card
                key={item.src}
                item={item}
                style={cardStyle}
                isActive={isActive}
                onMouseDown={() => { dragState.wasDragged = false; }}
                onClick={() => handleCardClick(index)}
              />
            );
          })}

          <div
            className="flex-shrink-0"
            style={{
              width: isExpanded ? cardDimensions.width : 0,
              height: '100%',
              marginLeft: isExpanded ? `${GAP}px` : '0',
              transition: 'width 1s ease-in-out, margin-left 1s ease-in-out',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
};