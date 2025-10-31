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

  // 경계값 계산 로직
  const sortedUniqueIndices = [...new Set(sizeChangeIndices)].sort((a, b) => a - b);
  const boundaries = [0, ...sortedUniqueIndices, totalLayers - 1];
  
  // 스냅 민감도 (+-인덱스 기준)
  const SNAP_THRESHOLD = 5; 
  
  // 세그먼트 간 간격 (이 값을 조절하여 간격 너비 변경)
  const GAP_PERCENT = 0.5;

  const bind = useDrag(({ down, xy: [x], tap }) => {
    if (!barRef.current) return;
    const { left, width } = barRef.current.getBoundingClientRect();
    const position = x - left;
    
    // 1. 클릭한 지점의 '시각적 퍼센트' 계산
    const visualPercentage = Math.max(0, Math.min(1, position / width)) * 100; // 0-100

    // 2. '시각적 퍼센트'를 '논리적 인덱스'로 역변환
    let logicalIndex = 0;
    let cumulativeLeftPercent = 0;

    for (let i = 0; i < boundaries.length - 1; i++) {
      const startNode = boundaries[i];
      const endNode = boundaries[i + 1];
      
      const startPercent = (startNode / (totalLayers - 1)) * 100;
      const endPercent = (endNode / (totalLayers - 1)) * 100;
      const totalWidthPercent = endPercent - startPercent;
      
      const isLastSegment = i === boundaries.length - 2;
      const segmentWidthPercent = isLastSegment ? totalWidthPercent : totalWidthPercent - GAP_PERCENT;
      const gap = isLastSegment ? 0 : GAP_PERCENT;

      const visualSegmentStart = cumulativeLeftPercent;
      const visualSegmentEnd = visualSegmentStart + segmentWidthPercent;
      const visualGapStart = visualSegmentEnd;
      const visualGapEnd = visualGapStart + gap;

      if (visualPercentage >= visualSegmentStart && visualPercentage <= visualSegmentEnd) {
        // 2a. 클릭이 세그먼트 내부에 있음
        const progressInVisualSegment = visualPercentage - visualSegmentStart;
        const localFillRatio = (segmentWidthPercent > 0) ? (progressInVisualSegment / segmentWidthPercent) : 0;
        
        logicalIndex = Math.round(startNode + localFillRatio * (endNode - startNode));
        break;
      } else if (visualPercentage > visualSegmentEnd && visualPercentage <= visualGapEnd) {
        // 2b. 클릭이 갭 내부에 있음 (가까운 노드로 스냅)
        const midGap = visualGapStart + gap / 2;
        if (visualPercentage < midGap) {
          logicalIndex = endNode; // 앞 세그먼트 끝
        } else {
          logicalIndex = boundaries[i + 1]; // 뒤 세그먼트 시작
        }
        break;
      }
      
      cumulativeLeftPercent = visualGapEnd; // 다음 세그먼트 시작 위치
    }
    
    if (visualPercentage >= 100) {
      logicalIndex = totalLayers - 1;
    }
    if (visualPercentage <= 0) {
      logicalIndex = 0;
    }

    // 3. 스냅 로직 적용
    const rawIndex = logicalIndex;
    let closestBoundary = rawIndex;
    let minDistance = Infinity;

    for (const boundary of boundaries) {
      const distance = Math.abs(rawIndex - boundary);
      if (distance < minDistance) {
        minDistance = distance;
        closestBoundary = boundary;
      }
    }
    let targetIndex;
    if (minDistance <= SNAP_THRESHOLD) {
      targetIndex = closestBoundary;
    } else {
      targetIndex = rawIndex;
    }
    
    if (down || tap) {
      onSeek(targetIndex);
    }
  });

  if (totalLayers <= 1) return null;

  // --- 렌더링 로직 수정 ---
  let visualProgressPercent = 0; // 핸들의 최종 시각적 위치
  let cumulativeLeftPercent = 0; // 세그먼트가 그려질 시각적 left 위치

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
              
              // 논리적 위치/너비
              const startPercent = (startNode / (totalLayers - 1)) * 100;
              const endPercent = (endNode / (totalLayers - 1)) * 100;
              const totalWidthPercent = endPercent - startPercent;
              
              const isLastSegment = index === boundaries.length - 2;
              
              // 시각적 너비
              const segmentWidthPercent = isLastSegment ? totalWidthPercent : totalWidthPercent - GAP_PERCENT;
              const gap = isLastSegment ? 0 : GAP_PERCENT;

              if (segmentWidthPercent < 0) return null; // 너비가 0보다 작으면 렌더링 안함

              // 현재 세그먼트의 시각적 left 위치
              const visualLeftPercent = cumulativeLeftPercent;
              
              // 다음 세그먼트를 위해 갭을 포함한 너비 누적
              cumulativeLeftPercent += segmentWidthPercent + gap;

              // --- (fillRatio 로직) ---
              const segmentLengthInIndices = endNode - startNode;
              const progressInIndices = currentIndex - startNode;
              
              let fillRatio = 0;
              if (segmentLengthInIndices > 0) {
                fillRatio = Math.max(0, Math.min(1, progressInIndices / segmentLengthInIndices));
              } else if (currentIndex >= endNode) {
                fillRatio = 1; 
              }
              
              if (currentIndex > endNode) fillRatio = 1;
              if (currentIndex < startNode) fillRatio = 0;

              const fillPercentForSegment = fillRatio * 100;
              // --- (fillRatio 로직 끝) ---
              
              // --- 핸들 위치 계산 ---
              if (currentIndex >= startNode && currentIndex <= endNode) {
                 // 이 세그먼트가 활성 세그먼트
                 const visualProgressInSegment = fillRatio * segmentWidthPercent;
                 visualProgressPercent = visualLeftPercent + visualProgressInSegment;
              } else if (currentIndex > endNode && isLastSegment) {
                 // 마지막 세그먼트를 지난 경우 (100%)
                 visualProgressPercent = 100;
              } else if (currentIndex === 0) {
                 visualProgressPercent = 0;
              }
              // --- 핸들 위치 계산 끝 ---

              let fillClassName = "absolute top-0 left-0 h-full bg-white";
              if (fillRatio === 1) {
                fillClassName += " rounded-full";
              } else if (fillRatio > 0) {
                fillClassName += " rounded-l-full";
              }

              return (
                <div
                  key={`segment-${startNode}`}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${visualLeftPercent}%`, // 수정: 시각적 left 사용
                    width: `${segmentWidthPercent}%`, // 수정: 시각적 width 사용
                  }}
                >
                  {/* 회색 배경 */}
                  <div className="w-full h-full bg-gray-600 rounded-full"></div>
                  {/* 흰색 진행 상태 */}
                  <div
                    className={fillClassName}
                    style={{
                      width: `${fillPercentForSegment}%`,
                    }}
                  ></div>
                </div>
              );
            })}

            {/* 2. 핸들 (가장 위에 위치) */}
            <div 
              className="absolute -top-1 w-1 h-5 bg-white pointer-events-none z-20 rounded-full"
              style={{ 
                left: `${visualProgressPercent}%`,  // 수정: 시각적 위치 사용
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