// src/components/ascii/ResolutionSlider.tsx
'use client';

import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';

interface ResolutionSliderProps {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onChangeEnd: (value: number) => void;
}

export default function ResolutionSlider({
  value,
  min,
  max,
  disabled,
  onChange,
  onChangeEnd,
}: ResolutionSliderProps) {
  const sliderBarRef = useRef<HTMLDivElement>(null);

  const bind = useDrag(({ down, xy: [x], tap }) => {
    if (disabled || !sliderBarRef.current) return;

    const { left, width } = sliderBarRef.current.getBoundingClientRect();
    if (width === 0) return;

    const progress = Math.max(0, Math.min(1, (x - left) / width));
    const finalValue = Math.round(min + progress * (max - min));

    // 탭 또는 드래그 중에 UI를 즉시 업데이트
    if (tap || down) {
      onChange(finalValue);
    }
    
    // 드래그가 끝났을 때만 API 호출
    if (!down) {
      onChangeEnd(finalValue);
    }
  });
  
  const progressPercent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div
      ref={sliderBarRef}
      {...bind()}
      // touch-none 클래스는 use-gesture가 모바일 터치 이벤트를 올바르게 처리하기 위해 필수적입니다.
      className={`relative flex-1 h-8 flex items-center touch-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="relative w-full h-1.5">
        <div className="w-full h-full bg-zinc-400 rounded-full" />
        <div
          className="absolute top-0 left-0 h-full bg-white rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute top-1/2 w-1 h-4 bg-white pointer-events-none z-10 rounded-full"
          style={{
            left: `${progressPercent}%`,
            transform: `translateX(-50%) translateY(-50%)`,
          }}
        />
      </div>
    </div>
  );
}