// src/components/ascii/AsciiArtDisplay.tsx
'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ResolutionSlider from './ResolutionSlider';
import DownloadOptions from './DownloadOptions';

// --- Types & Constants ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };
// DownloadOptions.tsx에서 import할 수 있도록 'export' 키워드 유지
export type AsciiResult = { art: React.ReactNode | null; data: AsciiCell[][] | null; dims: ArtDimensions; initialResolution: number; };
interface AsciiArtDisplayProps { asciiResult: AsciiResult; onClose: () => void; onResolutionChange: (newResolution: number) => void; isProcessing: boolean; }
const CHAR_WIDTH_PX = 5;
const CHAR_HEIGHT_PX = 7;
const FONT_SIZE_PX = 7;
const MAX_USER_ZOOM = 8;
const FONT_FAMILY = 'monospace';
const FONT = `${FONT_SIZE_PX}px ${FONT_FAMILY}`;
const RENDER_SCALE = 4;


const SpinnerIcon = () => ( <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> );
const InlineLoadingIndicator = ({ text }: { text: string }) => ( <div className="flex items-center"> <SpinnerIcon /> <span className="text-sm text-white ml-2">{text}</span> </div> );

export default function AsciiArtDisplay({
  asciiResult,
  onClose,
  onResolutionChange,
  isProcessing,
}: AsciiArtDisplayProps) {
  const [resolution, setResolution] = useState(asciiResult.initialResolution);
  const [pngScaleFactor, setPngScaleFactor] = useState<number>(1);
  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);

  // Panning(드래그 이동) 상태 추가
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const artRef = useRef<HTMLDivElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const panTargetRef = useRef<HTMLDivElement>(null); // [수정] 패닝 대상을 위한 Ref
  const containerRef = useRef<HTMLDivElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const artNaturalDimsRef = useRef({ w: 0, h: 0 });
  const pinchDistRef = useRef<number | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Panning 시작 위치 Ref
  const panStartRef = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    setResolution(asciiResult.initialResolution);
  }, [asciiResult.initialResolution]);

  // fitScale 계산
  useLayoutEffect(() => {
    const container = containerRef.current;
    const artDims = asciiResult.dims;
    if (!container || artDims.w === 0) return;

    const artNaturalWidth = artDims.w * CHAR_WIDTH_PX;
    const artNaturalHeight = artDims.h * CHAR_HEIGHT_PX;
    artNaturalDimsRef.current = { w: artNaturalWidth, h: artNaturalHeight };

    const calculateFitScale = () => {
      const { w, h } = artNaturalDimsRef.current;
      if (w === 0 || !container) return;
      const scale = Math.min(
        container.clientWidth / w,
        container.clientHeight / h
      );
      if (isFinite(scale) && scale > 0) {
        setFitScale(scale);
      } else {
        setFitScale(1);
      }
    };

    calculateFitScale();
    setUserZoom(1);
    setPanOffset({ x: 0, y: 0 }); // 줌 리셋 시 팬 리셋

    const resizeObserver = new ResizeObserver(calculateFitScale);
    resizeObserver.observe(container);
    window.addEventListener('resize', calculateFitScale);

    return () => {
      resizeObserver.unobserve(container);
      window.removeEventListener('resize', calculateFitScale);
    };
  }, [asciiResult.dims]);

  // DOM에 스케일 *및* 팬(transform) 적용
  useLayoutEffect(() => {
    const art = artRef.current;
    const zoomWrapper = zoomWrapperRef.current;
    const panTarget = panTargetRef.current; // [수정] panTarget Ref 가져오기
    const { w: artNaturalWidth, h: artNaturalHeight } = artNaturalDimsRef.current;
    
    if (!art || !zoomWrapper || !panTarget || artNaturalWidth === 0) return; // [수정] panTarget null 체크
    
    // userZoom이 1이면 panOffset을 0으로 강제 리셋 (줌아웃 시 중앙 정렬)
    const effectivePanOffset = userZoom <= 1 ? { x: 0, y: 0 } : panOffset;
    if (userZoom <= 1 && (panOffset.x !== 0 || panOffset.y !== 0)) {
      setPanOffset({ x: 0, y: 0 });
    }

    const effectiveScale = fitScale * userZoom;
    if (!isFinite(effectiveScale) || effectiveScale <= 0) return;

    zoomWrapper.style.width = `${artNaturalWidth * effectiveScale}px`;
    zoomWrapper.style.height = `${artNaturalHeight * effectiveScale}px`;
    
    // [수정] panTarget(흰색 박스)에 translate(panOffset) 적용
    panTarget.style.transform = `translate(${effectivePanOffset.x}px, ${effectivePanOffset.y}px)`;
    // [수정] 줌 래퍼는 transform 없음
    zoomWrapper.style.transform = '';

    art.style.width = `${artNaturalWidth}px`;
    art.style.height = `${artNaturalHeight}px`;

    // [수정] 아트(artRef)는 scale만 적용
    art.style.transform = `scale(${effectiveScale})`;
    art.style.transformOrigin = 'top left';
  }, [fitScale, userZoom, panOffset]);

  // 캔버스 드로잉 Effect
  useLayoutEffect(() => {
    const canvas = displayCanvasRef.current;
    const artData = asciiResult.data;
    const artDims = asciiResult.dims;
    if (!canvas || !artData || artDims.w === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const naturalWidth = artDims.w * CHAR_WIDTH_PX;
    const naturalHeight = artDims.h * CHAR_HEIGHT_PX;
    canvas.width = naturalWidth * RENDER_SCALE;
    canvas.height = naturalHeight * RENDER_SCALE;
    ctx.scale(RENDER_SCALE, RENDER_SCALE);
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, naturalWidth, naturalHeight);

    for (let y = 0; y < artDims.h; y++) {
      const rowData = artData[y];
      for (let x = 0; x < artDims.w; x++) {
        const cell = rowData[x];
        if (cell) {
          const safeChar = cell.char; // 워커에서 이미 안전한 ASCII로 보냄
          if (safeChar !== ' ') {
            const cx = x * CHAR_WIDTH_PX + (CHAR_WIDTH_PX / 2);
            const cy = y * CHAR_HEIGHT_PX + (CHAR_HEIGHT_PX / 2); 
            ctx.fillStyle = cell.color;
            ctx.fillText(safeChar, cx, cy);
          }
        }
      }
    }
  }, [asciiResult.data, asciiResult.dims]);

  const maxRes = 300;
  const minRes = 30;

  const handleSliderChangeEnd = (value: number) => {
    if (value !== asciiResult.initialResolution) {
      onResolutionChange(value);
    }
  };

  const backgroundStyle = { backgroundImage: `linear-gradient(to bottom, rgba(214, 211, 209, 0), #d6d3d1), url('/images/ascii_background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' };

  const downloadOptionsProps = {
    pngScaleFactor,
    setPngScaleFactor,
    isProcessing,
    asciiResult,
    downloadCanvasRef,
  };

  // --- 줌/터치/팬 핸들러 (이하 로직 변경 없음) ---

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
    setUserZoom(prevZoom => Math.max(1, Math.min(prevZoom * delta, MAX_USER_ZOOM)));
  };

  // Pan(드래그) 시작
  const handlePanStart = (clientX: number, clientY: number) => {
    if (userZoom <= 1) return; // 줌 안됐으면 팬 안됨
    panStartRef.current = { x: clientX, y: clientY };
    setIsPanning(true);
  };

  // Pan(드래그) 이동
  const handlePanMove = (clientX: number, clientY: number) => {
    if (!isPanning) return;

    const effectiveScale = fitScale * userZoom;
    if (effectiveScale <= 1) return;

    // 1. 스크린 픽셀(Scaled) 기준 이동량
    const dx = clientX - panStartRef.current.x;
    const dy = clientY - panStartRef.current.y;

    setPanOffset(prev => {
        const newX = prev.x + dx;
        const newY = prev.y + dy;

        // 경계 제한 (Clamping) 로직
        const { w, h } = artNaturalDimsRef.current; // natural unscaled width
        const container = containerRef.current;
        if (!container) return prev;

        const scaledWidth = w * effectiveScale;
        const scaledHeight = h * effectiveScale;

        // 1. 이미지가 컨테이너보다 얼마나 더 큰지 (오버행) 계산
        const maxOverhangX = Math.max(0, scaledWidth - container.clientWidth);
        const maxOverhangY = Math.max(0, scaledHeight - container.clientHeight);
        
        // 2. 패닝은 오버행의 절반만큼만 (±) 가능 (Scaled Pixel 기준)
        const maxPanX = maxOverhangX / 2;
        const minPanX = -maxPanX;
        
        const maxPanY = maxOverhangY / 2;
        const minPanY = -maxPanY;
        
        // 3. 새 좌표를 min/max 범위 내로 제한
        const clampedX = Math.max(minPanX, Math.min(newX, maxPanX));
        const clampedY = Math.max(minPanY, Math.min(newY, maxPanY));

        return { x: clampedX, y: clampedY };
    });

    // 3. 다음 이동량 계산을 위해 현재 위치를 시작 위치로 업데이트
    panStartRef.current = { x: clientX, y: clientY };
  };
  
  // Pan(드래그) 종료
  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // 터치 핸들러: Pan / Pinch 분기
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 1-finger touch: Pan
      handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      // 2-finger touch: Pinch
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      pinchDistRef.current = dist;
      setIsPanning(false); // 핀치 시작 시 패닝 중지
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      // 1-finger move: Pan
      e.preventDefault();
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      // 2-finger move: Pinch
      e.preventDefault();
      const newDist = getTouchDistance(e.touches[0], e.touches[1]);
      const oldDist = pinchDistRef.current;
      if (oldDist === 0) return;
      const delta = newDist / oldDist;
      setUserZoom(prevZoom => Math.max(1, Math.min(prevZoom * delta, MAX_USER_ZOOM)));
      pinchDistRef.current = newDist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchDistRef.current = null; // 핀치 종료
    }
    if (e.touches.length < 1) {
      handlePanEnd(); // 팬 종료
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8" style={backgroundStyle}>
      
      {/* 'relative'를 추가하여 z-index 스태킹 컨텍스트 생성 */}
      <div className="w-full max-w-[620px] flex flex-col max-h-full relative">
        
        {/* 'z-10' 추가 */}
        <PageHeader title="ASCi!" subtitle="이미지를 텍스트로 표현" onClose={onClose} isAbsolute={false} padding="p-0 pb-2 z-10" />
        
        <div 
          ref={containerRef} 
          className="flex-1 min-h-0 w-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing z-0"
          onWheel={handleWheel}
          onMouseDown={(e) => handlePanStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePanMove(e.clientX, e.clientY)}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd} // 마우스가 영역 밖으로 나가도 패닝 종료
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* [수정] panTargetRef를 이 div(bg-white)에 할당 */}
          <div ref={panTargetRef} className="bg-white p-1.5 shadow-lg">
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <div ref={zoomWrapperRef} className="bg-black overflow-hidden">
                <div ref={artRef} style={{ userSelect: 'none', fontFamily: FONT_FAMILY }}>
                  <canvas 
                    ref={displayCanvasRef}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'block',
                      imageRendering: 'pixelated',
                    }}
                    // 브라우저 기본 이미지 드래그 방지
                    onDragStart={(e) => e.preventDefault()}
                  />
                </div>
              </div>
            </div>
          </div>
        </div> {/* End Art Container */}

        {/* 'relative' 및 'z-10' 추가 */}
        <div className="w-full mt-4 mb-30 relative z-10">
          <div className="flex items-end gap-4">
            <div className="flex-1 min-w-0">
               <div className="flex items-center mb-1 h-5">
                <span className="block text-white text-sm font-normal">{resolution}px</span>
                {isProcessing && <div className="ml-3"><InlineLoadingIndicator text="변환 중..." /></div>}
              </div>
              <ResolutionSlider
                value={resolution}
                min={minRes}
                max={maxRes}
                disabled={isProcessing}
                onChange={setResolution}
                onChangeEnd={handleSliderChangeEnd}
              />
            </div>
            <DownloadOptions {...downloadOptionsProps} />
          </div>
        </div> {/* End Unified Slider Area */}

      </div> {/* End Main Content Wrapper */}

      <canvas ref={downloadCanvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}