"use client";

import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';

interface FacialSliderProps {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  vertical?: boolean;
  onChange: (value: number) => void;
  onChangeEnd: (value: number) => void;
}

export default function FacialSlider({
  value,
  min,
  max,
  disabled = false,
  vertical = false,
  onChange,
  onChangeEnd,
}: FacialSliderProps) {
  const sliderBarRef = useRef<HTMLDivElement>(null);

  const bind = useDrag(({ down, xy: [x, y], tap, last }) => {
    if (disabled || !sliderBarRef.current) return;

    const rect = sliderBarRef.current.getBoundingClientRect();
    
    let progress = 0;

    if (vertical) {
        const { top, height } = rect;
        if (height === 0) return;
        // 수직일 경우 아래쪽이 min, 위쪽이 max라고 가정
        // y가 커질수록(아래로 갈수록) 값이 작아져야 함.
        progress = Math.max(0, Math.min(1, 1 - (y - top) / height));
    } else {
        const { left, width } = rect;
        if (width === 0) return;
        progress = Math.max(0, Math.min(1, (x - left) / width));
    }

    // Calculate value based on min/max
    const rawValue = min + progress * (max - min);
    // Round to 1 decimal place
    const finalValue = Math.round(rawValue * 10) / 10;

    // Update UI immediately during drag or tap
    if (tap || down) {
      onChange(finalValue);
    }
    
    // Trigger API call only when drag ends
    if (last) {
      onChangeEnd(finalValue);
    }
  });
  
  const progressPercent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  if (vertical) {
    return (
      <div
        ref={sliderBarRef}
        {...bind()}
        className={`relative w-8 h-full flex justify-center touch-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="relative w-1.5 h-full">
          <div className="w-full h-full bg-zinc-400 rounded-full" />
          <div
            className="absolute bottom-0 left-0 w-full bg-white rounded-full"
            style={{ height: `${progressPercent}%` }}
          />
          <div
            className="absolute left-1/2 h-1 w-4 bg-white pointer-events-none z-10 rounded-full"
            style={{
              bottom: `${progressPercent}%`,
              transform: `translateX(-50%) translateY(50%)`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={sliderBarRef}
      {...bind()}
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
