'use client';

import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';

/**
 * 레이어 인덱스 탐색을 위한 프로그레스 바 컴포넌트
 * @param {object} props
 * @param {number} props.currentIndex - 현재 활성화된 레이어 인덱스
 * @param {number} props.totalLayers - 전체 레이어 수
 * @param {(index: number) => void} props.onSeek - 인덱스 변경 시 호출될 콜백 함수
 * @param {number[]} props.sizeChangeIndices - 크기 변경이 일어나는 레이어 인덱스 배열
 */
export default function ProgressBar({ currentIndex, totalLayers, onSeek, sizeChangeIndices = [] }) {
  const barRef = useRef(null);

  const bind = useDrag(({ down, xy: [x], tap }) => {
    if (!barRef.current) return;
    const { left, width } = barRef.current.getBoundingClientRect();
    const position = x - left;
    const percentage = Math.max(0, Math.min(1, position / width));
    const targetIndex = Math.round(percentage * (totalLayers - 1));
    
    if (down || tap) {
      onSeek(targetIndex);
    }
  });

  if (totalLayers <= 1) return null;

  const progressPercent = (currentIndex / (totalLayers - 1)) * 100;

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-8 flex items-center justify-center z-10">
      <span className="absolute left-0 -top-5 text-white text-sm font-mono select-none">
        {currentIndex} / {totalLayers - 1}
      </span>
      
      <div
        ref={barRef}
        {...bind()}
        className="relative w-full h-2 bg-gray-800 bg-opacity-70 rounded-full cursor-pointer touch-none"
        style={{ backdropFilter: 'blur(4px)' }}
      >
        <div 
          className="absolute top-0 left-0 h-full bg-sky-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
        
        <div 
          className="absolute top-1/2 w-4 h-4 bg-white rounded-full border-2 border-sky-500 pointer-events-none"
          style={{ left: `${progressPercent}%`, transform: `translate(-50%, -50%)` }}
        />

        {sizeChangeIndices.map(index => {
          const markerPercent = (index / (totalLayers - 1)) * 100;
          return (
            <div
              key={`marker-${index}`}
              className="absolute top-1/2 w-1 h-4 bg-yellow-400 pointer-events-none"
              style={{ left: `${markerPercent}%`, transform: `translate(-50%, -50%)` }}
            />
          );
        })}
      </div>
    </div>
  );
}