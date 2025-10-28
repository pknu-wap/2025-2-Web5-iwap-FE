// app/ascii/page.tsx
'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useTransition,
} from 'react';
import PageHeader from '../../components/ui/PageHeader';
import PngDownloader from '../../components/ascii/PngDownloader';
import PdfDownloader from '../../components/ascii/PdfDownloader';

// --- 상수 정의 ---

// 아스키 문자 집합
const ASCII_CHARS_LIGHT = ' `^\',.:;-_';
const ASCII_CHARS_MEDIUM_THIN = 'Il!i~+<>()[]{}|\\/│─';
const ASCII_CHARS_MEDIUM_LETTERS = 'tfjrxnuczXYUJCLQ0OZ';
const ASCII_CHARS_MEDIUM_CURVES = 'mwqpdbkhao·○';
const ASCII_CHARS_MEDIUM_SYMBOLS = '1?*±=≤≥×÷≈√ΣΠΩΔδ∞';
const ASCII_CHARS_DARK_LETTERS = 'YV#MW&8%B@$';
const ASCII_CHARS_DARK_BOX = '┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬';
const ASCII_CHARS_DARKEST_BLOCKS = '░▒▓';
const ASCII_CHARS = ASCII_CHARS_LIGHT + ASCII_CHARS_MEDIUM_THIN + ASCII_CHARS_MEDIUM_LETTERS + ASCII_CHARS_MEDIUM_CURVES + ASCII_CHARS_MEDIUM_SYMBOLS + ASCII_CHARS_DARK_LETTERS + ASCII_CHARS_DARK_BOX + ASCII_CHARS_DARKEST_BLOCKS;

// 화면 표시용 문자 크기 및 초기 해상도
const CHAR_WIDTH_PX = 5;
const CHAR_HEIGHT_PX = 7;
const FONT_SIZE_PX = 7;
const DEFAULT_RESOLUTION = 150;

// --- 타입 정의 ---
type ArtDimensions = { w: number; h: number };
type AsciiCell = { char: string; color: string };

// --- 헬퍼 함수 ---
/** 흑백 값을 아스키 문자로 변환 */
const getCharFromGray = (gray: number): string => {
  const len = ASCII_CHARS.length || 1;
  const charIndex = Math.floor((gray / 255) * (len - 1));
  return ASCII_CHARS[charIndex] || ' ';
};

// --- 컴포넌트 ---
export default function AsciiPage() {
  // --- 상태 ---
  const [asciiArt, setAsciiArt] = useState<React.ReactNode | null>(null);
  const [asciiData, setAsciiData] = useState<AsciiCell[][] | null>(null);
  const [artDimensions, setArtDimensions] = useState<ArtDimensions>({ w: 0, h: 0 });
  const [resolution, setResolution] = useState<number>(DEFAULT_RESOLUTION);
  const [debouncedResolution, setDebouncedResolution] = useState<number>(DEFAULT_RESOLUTION);
  const [isPending, startTransition] = useTransition();
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  // --- 참조 ---
  const dataCache = useRef<Record<number, AsciiCell[][]>>({});
  const dimCache = useRef<Record<number, ArtDimensions>>({});
  const jsxCache = useRef<Record<number, React.ReactNode>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null); // 이미지 처리용
  const containerRef = useRef<HTMLDivElement>(null); // 아트 표시 컨테이너
  const artRef = useRef<HTMLDivElement>(null); // 실제 아트 요소
  const zoomWrapperRef = useRef<HTMLDivElement>(null); // 스케일 래퍼
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null); // PNG 다운로드용 (자식에게 전달)

  // --- 배경 ---
  const sectionBackgroundStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(rgba(10, 10, 15, 0.7), rgba(10, 10, 15, 0.7)), url('/images/ascii_background.jpg')`,
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
  };

  // --- 이벤트 핸들러 ---
  const handleResolutionChange: React.ChangeEventHandler<HTMLInputElement> = (e) => setResolution(Number(e.target.value));
  const handleRenderTrigger = (): void => setDebouncedResolution(resolution);
  const handleImageUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(() => { setAsciiArt(null); setAsciiData(null); setArtDimensions({ w: 0, h: 0 }); });
    dataCache.current = {}; dimCache.current = {}; jsxCache.current = {};
    const reader = new FileReader();
    reader.onload = (event) => startTransition(() => { setImgSrc(event.target?.result as string); setResolution(DEFAULT_RESOLUTION); setDebouncedResolution(DEFAULT_RESOLUTION); });
    reader.readAsDataURL(file);
  };

  // --- 핵심 로직 ---
  /** 이미지를 아스키 아트로 변환 (데이터 및 JSX 생성, 캐싱) */
  const convertImageToAscii = useCallback((src: string, maxWidth: number): void => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) { return; }
        const CHAR_ASPECT_RATIO = CHAR_WIDTH_PX / CHAR_HEIGHT_PX;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvasWidth = Math.floor(img.width * scale);
        const canvasHeight = Math.floor((img.height * scale) / (1 / CHAR_ASPECT_RATIO));
        canvas.width = canvasWidth; canvas.height = canvasHeight;
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight); const data = imageData.data;
        const generatedData: AsciiCell[][] = []; const artLines: React.ReactNode[] = [];
        for (let y = 0; y < canvasHeight; y++) {
          const rowData: AsciiCell[] = []; const lineChars: React.ReactNode[] = [];
          for (let x = 0; x < canvasWidth; x++) {
            const index = (y * canvasWidth + x) * 4;
            const r = data[index]; const g = data[index + 1]; const b = data[index + 2];
            const gray = 0.21 * r + 0.72 * g + 0.07 * b;
            const char = getCharFromGray(gray); const color = `rgb(${r}, ${g}, ${b})`;
            rowData.push({ char, color });
            lineChars.push(<span key={x} style={{ color, display: 'inline-block', width: `${CHAR_WIDTH_PX}px`, height: `${CHAR_HEIGHT_PX}px`, fontSize: `${FONT_SIZE_PX}px`, textAlign: 'center', verticalAlign: 'middle', overflow: 'hidden' }}>{char}</span>);
          }
          generatedData.push(rowData);
          artLines.push(<div key={y} style={{ height: `${CHAR_HEIGHT_PX}px`, lineHeight: `${CHAR_HEIGHT_PX}px`, whiteSpace: 'nowrap' }}>{lineChars}</div>);
        }
        const artResult = <>{artLines}</>; const artDims: ArtDimensions = { w: canvasWidth, h: canvasHeight };
        dataCache.current[maxWidth] = generatedData; dimCache.current[maxWidth] = artDims; jsxCache.current[maxWidth] = artResult;
        startTransition(() => { setAsciiData(generatedData); setArtDimensions(artDims); setAsciiArt(artResult); });
      };
      img.onerror = () => console.error("이미지 로딩 실패");
      img.src = src;
    }, [startTransition]
  );

  // --- 이펙트 ---
  /** 해상도 변경 시 캐시 확인 후 렌더링 또는 변환 실행 */
  useEffect(() => {
    if (!imgSrc) return;
    const cachedJsx = jsxCache.current[debouncedResolution]; const cachedDims = dimCache.current[debouncedResolution]; const cachedData = dataCache.current[debouncedResolution];
    if (cachedJsx && cachedDims && cachedData) {
      startTransition(() => { setAsciiArt(cachedJsx); setArtDimensions(cachedDims); setAsciiData(cachedData); });
    } else if (imgSrc) {
      convertImageToAscii(imgSrc, debouncedResolution);
    }
  }, [imgSrc, debouncedResolution, convertImageToAscii, startTransition]);

  /** 아트 크기 변경 시 화면 스케일(줌) 조정 */
  useLayoutEffect(() => {
    const container = containerRef.current; const art = artRef.current; const zoomWrapper = zoomWrapperRef.current;
    if (!container || !art || !zoomWrapper || artDimensions.w === 0) { if(art) art.style.transform = 'scale(1)'; return; }
    const calculateAndApplyScale = () => {
      const containerWidth = container.clientWidth; const containerHeight = container.clientHeight;
      const artNatWidth = artDimensions.w * CHAR_WIDTH_PX; const artNatHeight = artDimensions.h * CHAR_HEIGHT_PX;
      if (artNatWidth === 0 || artNatHeight === 0) return;
      const scale = Math.min(containerWidth / artNatWidth, containerHeight / artNatHeight);
      const scaledWidth = artNatWidth * scale; const scaledHeight = artNatHeight * scale;
      zoomWrapper.style.width = `${scaledWidth}px`; zoomWrapper.style.height = `${scaledHeight}px`;
      art.style.width = `${artNatWidth}px`; art.style.height = `${artNatHeight}px`;
      art.style.transform = `scale(${scale})`; art.style.transformOrigin = 'top left';
    };
    calculateAndApplyScale();
    window.addEventListener('resize', calculateAndApplyScale);
    return () => window.removeEventListener('resize', calculateAndApplyScale);
  }, [artDimensions]);


  // --- 렌더링 ---
  return (
    <div className="relative flex flex-col w-full h-dvh md:h-[calc(100dvh-60px)] text-gray-200 box-border" style={sectionBackgroundStyle}>
      {/* 제목 영역 */}
      <div className="flex-shrink-0 relative m-5 rounded-md overflow-hidden h-[100px] bg-black/50">
        <PageHeader title="ASCi!" subtitle="이미지를 텍스트로 표현" goBack={true} padding="p-5" />
      </div>

      {/* 아트 표시 영역 */}
      <div ref={containerRef} className="flex-1 grid place-items-center overflow-hidden bg-black min-h-0 rounded-md mx-5 mb-5">
        <div ref={zoomWrapperRef}>
          {asciiArt && (<div ref={artRef} style={{ fontFamily: 'monospace' }}>{asciiArt}</div>)}
        </div>
        {isPending && !asciiArt && (<p>변환 중...</p>)}
      </div>

      {/* 숨겨진 캔버스들 */}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <canvas ref={downloadCanvasRef} style={{ display: 'none' }}></canvas> {/* PNG 컴포넌트가 사용 */}

      {/* 설정 영역 */}
      <div className="flex-shrink-0 relative mx-5 mb-5 rounded-md overflow-hidden bg-black/50">
        <div className="p-5">
          <div className="flex gap-5 flex-wrap">
            {/* 파일 선택 */}
            <fieldset className="border border-gray-700 rounded-md p-2.5 bg-black/20">
              <legend className="px-1 font-semibold text-gray-300" style={{ fontSize: 'clamp(0.875rem, 2.5vmin, 1.1rem)' }}>이미지 선택</legend>
              <label htmlFor="file-upload" className="inline-block px-4 py-2 bg-gray-700 border border-gray-600 rounded-md cursor-pointer text-gray-200 hover:bg-gray-600 transition-colors">파일 선택...</label>
              <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden"/>
            </fieldset>

            {/* 해상도 조절 */}
            <fieldset className="border border-gray-700 rounded-md p-2.5 flex-1 min-w-[300px] bg-black/20">
              <legend className="px-1 font-semibold text-gray-300" style={{ fontSize: 'clamp(0.875rem, 2.5vmin, 1.1rem)' }}>
                해상도 조절 {isPending ? (<span className="text-orange-400 ml-2">(변환 중...)</span>) : null}
              </legend>
              <div className="flex items-center gap-2.5">
                <input type="range" min="30" max="500" step="1" value={resolution} onChange={handleResolutionChange} onMouseUp={handleRenderTrigger} onTouchEnd={handleRenderTrigger} disabled={!imgSrc || isPending} className="flex-1"/>
                <span className="w-10 text-right">{resolution}px</span>
                
                {/* === 다운로드 영역 === */}
                <div className="flex items-center gap-2.5 border-l border-gray-600 pl-2.5">
                  <PngDownloader
                    asciiData={asciiData}
                    artDimensions={artDimensions}
                    downloadCanvasRef={downloadCanvasRef}
                    zoomWrapperRef={zoomWrapperRef}
                    disabled={!asciiData || isPending}
                  />
                  <PdfDownloader
                    asciiData={asciiData}
                    artDimensions={artDimensions}
                    disabled={!asciiData || isPending}
                  />
                </div>
                {/* === 다운로드 영역 끝 === */}

              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  );
}