"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import PageHeader from "@/components/ui/PageHeader";
import GraffitiToolbar from "./GraffitiToolbar";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

/* ------------------------- 배경 스타일 ------------------------- */
const pageBackgroundStyle = {
  backgroundImage: `
    linear-gradient(to bottom, rgba(13, 17, 19, 0), #090223),
    url('/images/instrument_background.jpg')
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

/* ------------------------- Utils (TS 안전) ------------------------- */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getPalmWidth(landmarks: Array<{ x: number; y: number }>): number {
  const a = landmarks[5];
  const b = landmarks[17];
  if (!a || !b) return 0.1;
  return Math.max(0.0001, distance(a, b));
}

function getPalmCenter(
  landmarks: Array<{ x: number; y: number }>
): { x: number; y: number } {
  const ids = [0, 5, 9, 13, 17];
  let cx = 0,
    cy = 0,
    n = 0;
  for (const i of ids) {
    const p = landmarks[i];
    if (p) {
      cx += p.x;
      cy += p.y;
      n++;
    }
  }
  return n === 0 ? { x: 0.5, y: 0.5 } : { x: cx / n, y: cy / n };
}

function fingerTipDistance(
  landmarks: Array<{ x: number; y: number }>,
  tipIndex: number,
  palmCenter: { x: number; y: number },
  ref: number
): number {
  const tip = landmarks[tipIndex];
  if (!tip) return 0;
  return distance(tip, palmCenter) / Math.max(0.0001, ref);
}

/* ------------------------- MP 타입 ------------------------- */
type MPResults = {
  multiHandLandmarks?: Array<
    Array<{ x: number; y: number; z?: number }>
  >;
};

// 어떤 손가락이 펴졌는지/접혔는지 판정용
const OTHER_FINGER_TIP_IDS = [16, 20]; // 약지, 새끼만 "접힘" 체크
const INDEX_EXTENSION_THRESHOLD = 0.2; // 검지 기준 거리
const MIDDLE_EXTENSION_THRESHOLD = 0.2; // 중지 기준 거리

// pinch (엄지-검지) 제스처
const FINGER_FOLDED_THRESHOLD = 0.45;
const PINCH_DISTANCE_THRESHOLD = 0.33;

// 제스처 온/오프 히스테리시스
const GESTURE_ON_FRAMES = 4;
const GESTURE_OFF_FRAMES = 6;

const COLOR_PALETTE = ["#FA4051", "#FDD047", "#2FB665", "#FFFFFF", "#000000"];


// 셀피 카메라 좌우 반전 여부
const FLIP_X = true;

export default function GraffitiClient() {
  const drawConnectorsRef = useRef<any>(null);
  const [customPatterns, setCustomPatterns] = useState<string[]>([]);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const [pendingCustomColor, setPendingCustomColor] = useState<string | null>(
    null
  );

  const handleConfirmPendingCustomColor = useCallback(() => {
    if (!pendingCustomColor) return;
    setCustomPatterns((prev) =>
      prev.includes(pendingCustomColor) ? prev : [...prev, pendingCustomColor]
    );
    setPendingCustomColor(null);
  }, [pendingCustomColor]);

  const handleCustomColorPick = useCallback((color: string) => {
    setPendingCustomColor(color);
    setBrushColor(color);
  }, []);

  /* -------------------- Intro / Camera 상태 -------------------- */
  const [showIntro, setShowIntro] = useState(true);
  const [introFinished, setIntroFinished] = useState(false);
  const [fingerAnimationDone, setFingerAnimationDone] = useState(false);
  const fingerAnimationDoneRef = useRef(fingerAnimationDone);

  /* -------------------- 기존 상태 -------------------- */
  const [brushColor, setBrushColor] = useState<string>("#ff315a");
  const [brushSize, setBrushSize] = useState(6);

  /* -------------------- Undo / Redo 상태 -------------------- */
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  /* -------------------- Refs -------------------- */
  const videoRef = useRef<HTMLVideoElement>(null!);
  const overlayRef = useRef<HTMLCanvasElement>(null!);
  const drawRef = useRef<HTMLCanvasElement>(null!);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const handLandmarkerRef = useRef<any>(null);
  const drawLandmarksRef = useRef<any>(null);
  const smoothLandmarksRef = useRef<
    Array<Array<{ x: number; y: number; z?: number }>> | null
  >(null);

  const lastPointRef = useRef<Array<{ x: number; y: number } | null>>([]);
  const lastPinchRef = useRef<boolean[]>([]);
  const gestureOnCountRef = useRef<number[]>([]);
  const gestureOffCountRef = useRef<number[]>([]);

  /* -------------------- Intro 자동 skip (5초) -------------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
      setIntroFinished(true);
      if (!fingerAnimationDoneRef.current) {
        fingerAnimationDoneRef.current = false;
        setFingerAnimationDone(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fingerAnimationDoneRef.current = fingerAnimationDone;
  }, [fingerAnimationDone]);

  /* -------------------- Intro 애니메이션 완료 대기 -------------------- */
  useEffect(() => {
    if (!introFinished || fingerAnimationDone) return;
    const timer = setTimeout(() => {
      setFingerAnimationDone(true);
    }, 3600);
    return () => clearTimeout(timer);
  }, [fingerAnimationDone, introFinished]);

  const handleFingerAnimationComplete = useCallback(() => {
    if (!introFinished || fingerAnimationDone) return;
    setFingerAnimationDone(true);
  }, [fingerAnimationDone, introFinished]);

  /* -------------------- Mediapipe 결과 처리 -------------------- */
  const onResults = useCallback((results: MPResults) => {
    const overlay = overlayRef.current;
    const octx = overlay.getContext("2d")!;
    octx.clearRect(0, 0, overlay.width, overlay.height);

    const drawCtx = ctxRef.current;
    const drawCanvas = drawRef.current;
    if (!drawCtx || !drawCanvas) return;

    const width = drawCanvas.width;
    const height = drawCanvas.height;

    let hands = results.multiHandLandmarks ?? [];

    // 셀피 카메라 좌우 반전
    if (FLIP_X && hands.length > 0) {
      hands = hands.map((h) => h.map((p) => ({ ...p, x: 1 - p.x })));
    }

    if (hands.length === 0) {
      lastPointRef.current = [];
      smoothLandmarksRef.current = null;
      lastPinchRef.current = [];
      gestureOnCountRef.current = [];
      gestureOffCountRef.current = [];
      return;
    }

    /* ------ Smoothing ------ */
    const prevHands = smoothLandmarksRef.current;
    const alphaBase = 0.18;

    const smoothedHands = hands.map((hand, hi) => {
      const prev = prevHands?.[hi];
      const ref = getPalmWidth(hand);

      return hand.map((p, i) => {
        const prevP = prev?.[i];
        if (!prevP) return p;
        const dx = p.x - prevP.x;
        const dy = p.y - prevP.y;
        const motion = Math.hypot(dx, dy) / Math.max(0.0001, ref);
        const adaptive = clamp(
          alphaBase + clamp(motion * 0.5, 0, 0.3),
          0.4,
          0.8
        );
        return {
          x: prevP.x + adaptive * (p.x - prevP.x),
          y: prevP.y + adaptive * (p.y - prevP.y),
          z: p.z,
        };
      });
    });

    smoothLandmarksRef.current = smoothedHands;

    /* Landmark Overlay */
    if (drawLandmarksRef.current) {
      for (const lm of smoothedHands) {
        drawLandmarksRef.current(octx, lm, {
          color: "#00E1FF",
          lineWidth: 2,
        });
      }
    }

    /* ------ Gesture + Drawing ------ */
    const nextPinchArr: boolean[] = [];
    const lastPinchArr = lastPinchRef.current;
    const lastPoints = lastPointRef.current;

    const onCounts = gestureOnCountRef.current;
    const offCounts = gestureOffCountRef.current;

    smoothedHands.forEach((lm, hi) => {
      const indexTip = lm[8];
      if (!indexTip) {
        nextPinchArr[hi] = false;
        lastPoints[hi] = null;
        return;
      }

      const ref = getPalmWidth(lm);
      const palmCenter = getPalmCenter(lm);

      // ---- 새 제스처 판정 로직 ----
      const dIndex = fingerTipDistance(lm, 8, palmCenter, ref);
      const dMiddle = fingerTipDistance(lm, 12, palmCenter, ref);

      const indexExtended = dIndex > INDEX_EXTENSION_THRESHOLD;
      const middleExtended = dMiddle > MIDDLE_EXTENSION_THRESHOLD;

      const othersFolded = OTHER_FINGER_TIP_IDS.every((tip) => {
        const dist = fingerTipDistance(lm, tip, palmCenter, ref);
        return dist < FINGER_FOLDED_THRESHOLD;
      });

      const thumbTip = lm[4];
      const thumbIndexDistance =
        thumbTip && indexTip
          ? distance(thumbTip, indexTip) / Math.max(0.0001, ref)
          : Infinity;
      const pinchGesture = thumbIndexDistance < PINCH_DISTANCE_THRESHOLD;

      const drawGesture =
        (indexExtended && middleExtended && othersFolded) || pinchGesture;

      const lastState = lastPinchArr[hi] ?? false;
      onCounts[hi] = onCounts[hi] ?? 0;
      offCounts[hi] = offCounts[hi] ?? 0;

      if (drawGesture) {
        onCounts[hi]++;
        offCounts[hi] = 0;
      } else {
        offCounts[hi]++;
        onCounts[hi] = 0;
      }

      let next = lastState;
      if (!lastState && onCounts[hi] >= GESTURE_ON_FRAMES) next = true;
      if (lastState && offCounts[hi] >= GESTURE_OFF_FRAMES) next = false;

      nextPinchArr[hi] = next;

      const px = clamp(indexTip.x, 0, 1) * width;
      const py = clamp(indexTip.y, 0, 1) * height;

      const shouldDraw = next;
      const lastPoint = lastPoints[hi] ?? null;

      // 새로 그리기 시작하는 순간 스냅샷 저장
      if (shouldDraw && !lastPoint) {
        const snapshot = drawCanvas.toDataURL();
        setUndoStack((prev) => [...prev, snapshot]);
        setRedoStack([]); // 새로운 stroke 시작 시 redo 비움
      }

      if (shouldDraw && lastPoint) {
        drawCtx.beginPath();
        drawCtx.moveTo(lastPoint.x, lastPoint.y);
        drawCtx.lineTo(px, py);
        drawCtx.stroke();
      }

      lastPoints[hi] = { x: px, y: py };
    });

    lastPinchRef.current = nextPinchArr;
    lastPointRef.current = lastPoints;
  }, []);

  /* -------------------- Mediapipe + Camera 초기화 -------------------- */
  useEffect(() => {
    let stopped = false;
    let introDelayTimer: number | null = null;

    const loadScriptOnce = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = Array.from(document.scripts).find((s) => s.src === src);
        if (existing) {
          if (existing.getAttribute("data-loaded") === "true") {
            resolve();
          } else {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject());
          }
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.crossOrigin = "anonymous";
        s.onload = () => {
          s.setAttribute("data-loaded", "true");
          resolve();
        };
        s.onerror = () => reject();
        document.head.appendChild(s);
      });

    async function init() {

      /* ------- drawing_utils 로딩 추가 ------- */
await loadScriptOnce(
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
);

// 전역에 등록
drawLandmarksRef.current = (window as any).drawLandmarks;
drawConnectorsRef.current = (window as any).drawConnectors;

      try {
        const video = videoRef.current;

        /* ------- 카메라 접근 요청 ------- */
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        introDelayTimer = window.setTimeout(() => {
          if (stopped) return;
          setShowIntro(false);
          setIntroFinished(true);
          if (!fingerAnimationDoneRef.current) {
            fingerAnimationDoneRef.current = false;
            setFingerAnimationDone(false);
          }
        }, 3000);

        video.srcObject = stream;
        await video.play();

        /* ------- 캔버스 초기화 ------- */
        const overlay = overlayRef.current;
        const draw = drawRef.current;
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        draw.width = video.videoWidth;
        draw.height = video.videoHeight;

        const ctx = draw.getContext("2d")!;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctxRef.current = ctx;

        /* ------- drawing_utils 로딩 (drawLandmarks) ------- */

await loadScriptOnce("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

drawLandmarksRef.current = (window as any).drawLandmarks;
(drawConnectorsRef as any).current = (window as any).drawConnectors;

const fileset = await FilesetResolver.forVisionTasks("/wasm");

        const handLandmarker = await HandLandmarker.createFromOptions(
          fileset,
          {
            baseOptions: {
              modelAssetPath:"/models/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
          }
        );

        handLandmarkerRef.current = handLandmarker;

        /* ------------------ 메인 Tracking Loop ------------------ */
        async function renderLoop() {
          if (stopped) return;
          if (!handLandmarkerRef.current) {
            requestAnimationFrame(renderLoop);
            return;
          }

          const now = performance.now();
          const result = handLandmarkerRef.current.detectForVideo(video, now);

          onResults({
            multiHandLandmarks: result?.landmarks ?? [],
          });

          requestAnimationFrame(renderLoop);
        }

        requestAnimationFrame(renderLoop);
      } catch (err: any) {
        console.error(err);
      }
    }

    init();

    return () => {
      stopped = true;
      if (introDelayTimer) {
        clearTimeout(introDelayTimer);
      }

      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks()?.forEach((t) => t.stop());
    };
  }, [onResults]);

  /* -------------------- 브러시 스타일 반영 -------------------- */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (brushColor !== "pattern") {
      ctx.strokeStyle = brushColor;
    }
    ctx.lineWidth = brushSize;
  }, [brushColor, brushSize]);

  const restoreCanvasSnapshot = useCallback((snapshot: string) => {
    const draw = drawRef.current;
    if (!draw) return;
    const ctx = draw.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.src = snapshot;
    img.onload = () => {
      ctx.clearRect(0, 0, draw.width, draw.height);
      ctx.drawImage(img, 0, 0);
    };
  }, []);

  /* -------------------- Clear 버튼 -------------------- */
  const handleClear = useCallback(() => {
    const draw = drawRef.current;
    const ctx = draw.getContext("2d")!;
    ctx.clearRect(0, 0, draw.width, draw.height);
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  /* -------------------- Undo / Redo -------------------- */
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const draw = drawRef.current;
    if (!draw) return;

    const last = undoStack[undoStack.length - 1];
    const current = draw.toDataURL();
    setRedoStack((prev) => [...prev, current]);
    setUndoStack((prev) => prev.slice(0, -1));
    restoreCanvasSnapshot(last);
  }, [undoStack, restoreCanvasSnapshot]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const draw = drawRef.current;
    if (!draw) return;

    const last = redoStack[redoStack.length - 1];
    const current = draw.toDataURL();
    setUndoStack((prev) => [...prev, current]);
    setRedoStack((prev) => prev.slice(0, -1));
    restoreCanvasSnapshot(last);
  }, [redoStack, restoreCanvasSnapshot]);

  /* -------------------- Save -------------------- */
  const handleSave = useCallback(() => {
    const canvas = drawRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `graffiti-${Date.now()}.png`;
    a.click();
  }, []);

  /* --------------------------------------------------- */
  /*                       UI                           */
  /* --------------------------------------------------- */

  const videoReady = !showIntro && fingerAnimationDone;

  return (
    <div className="relative w-full h-dvh" style={pageBackgroundStyle}>
      {/* ------------------ Persistent Header ------------------ */}
      <div className="pointer-events-none inset-0 flex items-center justify-center p-6 animate-fadeIn">
        <div className="absolute pointer-events-auto w-[90%] h-[90%] translate-x-5 md:translate-x-0 md:w-full md:h-full flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-full h-full pt-[100px] md:translate-y-0 translate-y-40">
              {!videoReady && (
                <PageHeader
                  title="Graff!ti"
                  subtitle="움직임으로만 드로잉"
                  goBack={true}
                  padding="p-0"
                />
              )}

              {/* Intro가 끝난 후 나타나는 박스 */}
              {introFinished && !fingerAnimationDone && (
                <div className="pointer-events-none inset-x-0 top-0 flex justify-center z-30 opacity-0 animate-fadeIn">
                  <div
                    className="
                      pointer-events-auto
                      flex flex-col items-center justify-center gap-6 px-6 py-8
                      w-[260px] h-[280px]
                      sm:w-[380px] sm:h-[400px]
                      md:w-[500px] md:h-[480px]
                      bg-white/40
                      border border-white/80
                      backdrop-blur-[6px]
                      shadow-[0_20px_60px_rgba(0,0,0,0.35)]
                      -translate-x-4 md:translate-x-0
                    "
                  >
                    <p className="text-white text-center text-[18px] md:text-[24px] font-semibold">
                      손 모양을 따라해 보세요.
                    </p>
                    <div className="relative w-[200px] h-[180px] flex items-center justify-center">
                      <svg
                        viewBox="0 0 200 150"
                        className="w-full h-full"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M10 135 L130 15 L175 95"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="finger-trace-path"
                        />
                      </svg>
                      <img
                        src="/icons/graffiti_finger.png"
                        alt="손가락 시연 아이콘"
                        className="finger-trace-icon absolute left-1/2 top-1/2 w-[64px] h-[64px]"
                        onAnimationEnd={handleFingerAnimationComplete}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 카메라 허용 안내 박스 */}
              {showIntro && (
                <div
                  className="
                    mt-10
                    w-[300px] h-[80px]
                    md:w-[500px] md:h-[100px]
                    rounded-[84px]
                    border border-white
                    bg-white/60 backdrop-blur-[4px]
                    shadow-[0_0_50px_20px_rgba(0,0,0,0.25)]
                    flex items-center justify-center md:translate-y-30 -translate-x-3 md:translate-x-0
                  "
                >
                  <p className="hidden md:block text-black text-[20px]">
                    손동작 인식을 위해 카메라 접근을 허용해주세요.
                  </p>
                  <p className="md:hidden text-black text-[18px] text-center">
                    손동작 인식을 위해
                    <br />
                    카메라 접근을 허용해주세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------ 비디오 화면 ------------------ */}
      <div
        className={`
          relative w-full max-w-[1000px] aspect-video mx-auto md:translate-y-0 translate-y-50
          ${videoReady ? "opacity-100 visible" : "opacity-0 invisible"}
          transition-opacity duration-500
        `}
        aria-hidden={!videoReady}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain -scale-x-100"
          playsInline
          muted
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full"
        />
        <canvas
          ref={drawRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {videoReady && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-20 flex justify-center scale-40 sm:scale-100 md:translate-y-0 -translate-y-40">
          <GraffitiToolbar
            colorPalette={COLOR_PALETTE}
            brushColor={brushColor}
            brushSize={brushSize}
            customPatterns={customPatterns}
            pendingCustomColor={pendingCustomColor}
            colorPickerRef={colorPickerRef}
            onBrushColorChange={setBrushColor}
            onSizeChange={setBrushSize}
            onCustomColorPick={handleCustomColorPick}
            onConfirmCustomColor={handleConfirmPendingCustomColor}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
