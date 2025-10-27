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

  const sortedUniqueIndices = [...new Set(sizeChangeIndices)].sort((a, b) => a - b);
  const boundaries = [0, ...sortedUniqueIndices, totalLayers - 1];
  // 간격 크기 조정 (기존 0.25 -> 0.5)
  const GAP_PERCENT = 0.5;

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-8 flex flex-col items-center justify-center z-10">
      {/* 인덱스 텍스트 */}
      <span className="absolute left-0 -top-5 text-white text-sm font-mono select-none">
        {currentIndex} / {totalLayers - 1}
      </span>
      
      {/* 바 + 점 컨테이너 */}
      <div className="relative w-full h-8 flex items-center">
        
        {/* 시작 점 (Clickable) */}
        <div 
          className="w-3 h-3 bg-white rounded-full z-30 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSeek(0);
          }}
        />

        {/* 프로그레스 바 (클릭/드래그 영역) */}
        <div
          ref={barRef}
          {...bind()}
          className="relative flex-1 h-8 mx-2 flex items-center cursor-pointer touch-none"
        >
          {/* 바 트랙 - 높이 조정 (h-2 -> h-3) */}
          <div className="relative w-full h-3">
            
            {/* 1. 각 세그먼트를 개별적으로 렌더링 */}
            {boundaries.slice(0, -1).map((startNode, index) => {
              const endNode = boundaries[index + 1];
              const startPercent = (startNode / (totalLayers - 1)) * 100;
              const endPercent = (endNode / (totalLayers - 1)) * 100;
              const totalWidthPercent = endPercent - startPercent;
              const isLastSegment = index === boundaries.length - 2;
              const segmentWidthPercent = isLastSegment ? totalWidthPercent : totalWidthPercent - GAP_PERCENT;

              if (segmentWidthPercent <= 0) return null;

              const segmentLength = endPercent - startPercent;
              const progressWithinSegment = progressPercent - startPercent;
              const fillRatio = Math.max(0, Math.min(1, progressWithinSegment / segmentLength));
              const fillPercentForSegment = fillRatio * 100;

              return (
                <div
                  key={`segment-${startNode}`}
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${startPercent}%`,
                    width: `${segmentWidthPercent}%`,
                  }}
                >
                  {/* 회색 배경 */}
                  <div className="w-full h-full bg-gray-600 rounded-full"></div>
                  {/* 흰색 진행 상태 (배경 위에 겹쳐짐) */}
                  <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full"
                    style={{
                      width: `${fillPercentForSegment}%`,
                    }}
                  ></div>
                </div>
              );
            })}

            {/* 2. 핸들 (가장 위에 위치) - 수직 위치 조정 (-top-1.5 -> -top-1) */}
            <div 
              className="absolute -top-1 w-1 h-5 bg-white pointer-events-none z-20 rounded-full"
              style={{ 
                left: `${progressPercent}%`, 
                transform: `translateX(-50%)`
              }}
            />
          </div>
        </div>
        
        {/* 끝 점 (Clickable) */}
        <div 
          className="w-3 h-3 bg-white rounded-full z-30 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSeek(totalLayers - 1);
          }}
        />
      </div>
    </div>
  );
}