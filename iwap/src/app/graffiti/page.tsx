"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import PageHeader from "@/components/ui/PageHeader";
import GraffitiToolbar from "@/components/graffiti/GraffitiToolbar";

type RunningMode = "IMAGE" | "VIDEO";
type Landmark = { x: number; y: number; z: number };

/* ---------------- 배경 스타일 (예전 Graffiti 스타일) ---------------- */
const pageBackgroundStyle = {
  backgroundImage: `
    linear-gradient(to bottom, rgba(13, 17, 19, 0), #090223),
    url('/images/instrument_background.jpg')
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

/* ---------------- 공통 유틸 ---------------- */
function dist3(a: Landmark, b: Landmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

/* ---------------- 손가락 제스처 유틸 ---------------- */

// 손가락이 "쭉 펴졌는지" – 손목에서의 거리만 봄
function isFingerExtendedByDistance(
  lms: Landmark[],
  tipIndex: number,
  wristIndex = 0,
  threshold = 0.18
): boolean {
  const wrist = lms[wristIndex];
  const tip = lms[tipIndex];
  if (!wrist || !tip) return false;
  return dist3(wrist, tip) > threshold;
}

// 검지를 주로 펴고 있는지
function isIndexFingerOnlyExtended(lms: Landmark[]): boolean {
  if (!lms || lms.length < 21) return false;

  const indexExtended = isFingerExtendedByDistance(lms, 8, 0, 0.25);
  if (!indexExtended) return false;

  const middleExtended = isFingerExtendedByDistance(lms, 12, 0, 0.22);
  const ringExtended = isFingerExtendedByDistance(lms, 16, 0, 0.22);
  const pinkyExtended = isFingerExtendedByDistance(lms, 20, 0, 0.22);

  const othersCount =
    (middleExtended ? 1 : 0) +
    (ringExtended ? 1 : 0) +
    (pinkyExtended ? 1 : 0);

  if (middleExtended) return false;

  // 나머지 손가락도 되도록 접혀 있는 상태에서만 그리도록 꽤 빡세게 조임
  if (ringExtended || pinkyExtended) return false;

  // 엄지는 여기서는 신경 안 씀 (펴져 있어도 드로잉 허용)
  return true;
}

// 엄지척
function isThumbsUp(lms: Landmark[]): boolean {
  if (!lms || lms.length < 21) return false;
  const thumbExtended = isFingerExtendedByDistance(lms, 4, 0, 0.13);
  if (!thumbExtended) return false;

  const indexExtended = isFingerExtendedByDistance(lms, 8, 0, 0.14);
  const middleExtended = isFingerExtendedByDistance(lms, 12, 0, 0.14);
  const ringExtended = isFingerExtendedByDistance(lms, 16, 0, 0.14);
  const pinkyExtended = isFingerExtendedByDistance(lms, 20, 0, 0.14);

  const othersCount =
    (indexExtended ? 1 : 0) +
    (middleExtended ? 1 : 0) +
    (ringExtended ? 1 : 0) +
    (pinkyExtended ? 1 : 0);

  return othersCount === 0;
}

// 두 손 하트
// 두 손 하트: "양손의 엄지+검지만 펴져 있고, 서로 꽤 가까이 모여 있는 하트 포즈"에서만 true
function isHeartGesture(hands: Landmark[][]): boolean {
  if (!hands || hands.length < 2) return false;

  const h1 = hands[0];
  const h2 = hands[1];
  if (!h1 || !h2 || h1.length < 21 || h2.length < 21) return false;

  const thumb1 = h1[4];
  const thumb2 = h2[4];
  const index1 = h1[8];
  const index2 = h2[8];
  const wrist1 = h1[0];
  const wrist2 = h2[0];

  // 하트일 때는 엄지/검지가 더 확실히 펴져 있어야 함
  const thumb1Ext = isFingerExtendedByDistance(h1, 4, 0, 0.20);
  const thumb2Ext = isFingerExtendedByDistance(h2, 4, 0, 0.20);
  const index1Ext = isFingerExtendedByDistance(h1, 8, 0, 0.20);
  const index2Ext = isFingerExtendedByDistance(h2, 8, 0, 0.20);
  if (!(thumb1Ext && thumb2Ext && index1Ext && index2Ext)) return false;

  const handSpan = dist3(wrist1, wrist2);

  const thumbDist = dist3(thumb1, thumb2);
  const indexDist = dist3(index1, index2);

  // 더 가까이 모여야 하트로 인정 (0.7 → 0.45)
  const closeFactor = 0.15;
  const thumbsClose = thumbDist < handSpan * closeFactor;
  const indexesClose = indexDist < handSpan * closeFactor;

  // 검지가 엄지보다 "확실히 위"에 있어야 함 (y는 위가 더 작음)
  const indexAboveThumb =
    index1.y < thumb1.y + 0.01 && index2.y < thumb2.y + 0.01;

  return thumbsClose && indexesClose && indexAboveThumb;
}



/* ---------------- 제스처 → 이모지 ---------------- */
type Gesture = "HEART" | "THUMBS_UP" | null;

function detectGesture(hands: Landmark[][]): Gesture {
  if (!hands || hands.length === 0) return null;

  if (hands.length >= 2 && isHeartGesture(hands)) {
    return "HEART";
  }

  for (const hand of hands) {
    if (isThumbsUp(hand)) return "THUMBS_UP";
  }

  return null;
}

/* ---------------- Toolbar 관련 (색·두께·undo/redo) ---------------- */

const COLOR_PALETTE = ["#FA4051", "#FDD047", "#2FB665", "#FFFFFF", "#000000"];

export default function HandLandmarkerPage() {
  const [isReady, setIsReady] = useState(false);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);

  const visionModuleRef = useRef<any>(null);
  const handLandmarkerRef = useRef<any>(null);
  const runningModeRef = useRef<RunningMode>("IMAGE");
  const animationFrameRef = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const imageContainerRefs = useRef<HTMLDivElement[]>([]);

  const isWebcamRunningRef = useRef(false);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Array<{ x: number; y: number } | null>>([]);
  const smoothPointRef = useRef<Array<{ x: number; y: number } | null>>([]);

  // 이모지
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);
  const emojiTimeoutRef = useRef<number | null>(null);
  const activeEmojiRef = useRef<string | null>(null);

  const triggerEmoji = useCallback((emoji: string) => {
    if (activeEmojiRef.current === emoji) return;
    activeEmojiRef.current = emoji;
    setActiveEmoji(emoji);
    if (emojiTimeoutRef.current !== null) {
      window.clearTimeout(emojiTimeoutRef.current);
    }
    emojiTimeoutRef.current = window.setTimeout(() => {
      activeEmojiRef.current = null;
      setActiveEmoji(null);
      emojiTimeoutRef.current = null;
    }, 1000);
  }, []);

  /* ---- Graffiti 인트로 상태 ---- */
  const [showIntro, setShowIntro] = useState(true);
  const [introFinished, setIntroFinished] = useState(false);
  const [fingerAnimationDone, setFingerAnimationDone] = useState(false);
  const fingerAnimationDoneRef = useRef(fingerAnimationDone);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowIntro(false);
      setIntroFinished(true);
      if (!fingerAnimationDoneRef.current) {
        fingerAnimationDoneRef.current = false;
        setFingerAnimationDone(false);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fingerAnimationDoneRef.current = fingerAnimationDone;
  }, [fingerAnimationDone]);

  useEffect(() => {
    if (!introFinished || fingerAnimationDone) return;
    const timer = window.setTimeout(() => {
      setFingerAnimationDone(true);
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [introFinished, fingerAnimationDone]);

  const handleFingerAnimationComplete = useCallback(() => {
    if (!introFinished || fingerAnimationDone) return;
    setFingerAnimationDone(true);
  }, [introFinished, fingerAnimationDone]);

  const videoReady = !showIntro && fingerAnimationDone;

  /* ---- Toolbar / 브러시 상태 ---- */
  const [customPatterns, setCustomPatterns] = useState<string[]>([]);
  const colorPickerRef = useRef<HTMLInputElement | null>(null);
  const [pendingCustomColor, setPendingCustomColor] = useState<string | null>(
    null
  );

  const [brushColor, setBrushColor] = useState<string>("#00FF88");
  const [brushSize, setBrushSize] = useState(6);

  // ★ 최신 값을 루프에서 읽기 위한 ref
  const brushColorRef = useRef<string>("#00FF88");
  const brushSizeRef = useRef<number>(6);

  useEffect(() => {
    brushColorRef.current = brushColor;
  }, [brushColor]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

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

  const restoreCanvasSnapshot = useCallback((snapshot: string) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.src = snapshot;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }, []);

  const handleClear = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const current = canvas.toDataURL();
    const last = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, current]);
    setUndoStack((prev) => prev.slice(0, -1));
    restoreCanvasSnapshot(last);
  }, [undoStack, restoreCanvasSnapshot]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const current = canvas.toDataURL();
    const last = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, current]);
    setRedoStack((prev) => prev.slice(0, -1));
    restoreCanvasSnapshot(last);
  }, [redoStack, restoreCanvasSnapshot]);

  const handleSave = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `graffiti-${Date.now()}.png`;
    a.click();
  }, []);

  /* ---------- HandLandmarker 초기화 ---------- */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (typeof window === "undefined") return;

      const visionModule: any = await import("@mediapipe/tasks-vision");
      const vision = await visionModule.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      const handLandmarker = await visionModule.HandLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: runningModeRef.current,
          numHands: 2,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        }
      );

      if (cancelled) {
        handLandmarker.close();
        return;
      }

      visionModuleRef.current = visionModule;
      handLandmarkerRef.current = handLandmarker;
      setIsReady(true);
    };

    init();

    return () => {
      cancelled = true;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (emojiTimeoutRef.current !== null) {
        window.clearTimeout(emojiTimeoutRef.current);
      }
    };
  }, []);

  /* ---------- Demo 1: 이미지 클릭 (그대로) ---------- */
  const handleImageClick = useCallback(async (index: number) => {
    const handLandmarker = handLandmarkerRef.current;
    const visionModule = visionModuleRef.current;
    if (!handLandmarker || !visionModule) return;

    const container = imageContainerRefs.current[index];
    if (!container) return;

    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) return;

    if (runningModeRef.current === "VIDEO") {
      runningModeRef.current = "IMAGE";
      await handLandmarker.setOptions({ runningMode: "IMAGE" });
    }

    container.querySelectorAll("canvas.landmark-canvas").forEach((c) =>
      c.remove()
    );

    const result = handLandmarker.detect(img);
    if (!result || !result.landmarks || result.landmarks.length === 0) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.className =
      "landmark-canvas absolute left-0 top-0 pointer-events-none";
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.width = `${img.clientWidth}px`;
    canvas.style.height = `${img.clientHeight}px`;

    container.style.position = "relative";
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawingUtils = new visionModule.DrawingUtils(ctx);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const landmarks of result.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        visionModule.HandLandmarker.HAND_CONNECTIONS,
        { lineWidth: 5 }
      );
      drawingUtils.drawLandmarks(landmarks, { radius: 3 });
    }
  }, []);

  /* ---------- Demo 2: 웹캠 ---------- */
  const stopWebcam = useCallback(() => {
    const video = videoRef.current;
    if (video && video.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const overlayCanvas = overlayCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    [overlayCanvas, drawCanvas].forEach((c) => {
      if (!c) return;
      const ctx = c.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    });

    isWebcamRunningRef.current = false;
    isDrawingRef.current = false;
    lastPointRef.current = [];
    smoothPointRef.current = [];
    setIsWebcamRunning(false);
  }, []);

  const predictWebcam = useCallback(async () => {
    const handLandmarker = handLandmarkerRef.current;
    const visionModule = visionModuleRef.current;
    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const container = containerRef.current;

    if (
      !handLandmarker ||
      !visionModule ||
      !video ||
      !overlayCanvas ||
      !drawCanvas ||
      !container
    ) {
      return;
    }

    const overlayCtx = overlayCanvas.getContext("2d");
    const drawCtx = drawCanvas.getContext("2d");
    if (!overlayCtx || !drawCtx) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      if (isWebcamRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          void predictWebcam();
        });
      }
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    container.style.width = "100%";
    container.style.maxWidth = `${videoWidth}px`;
    container.style.aspectRatio = `${videoWidth} / ${videoHeight}`;

    video.style.width = "100%";
    video.style.height = "100%";

    overlayCanvas.style.width = "100%";
    overlayCanvas.style.height = "100%";
    drawCanvas.style.width = "100%";
    drawCanvas.style.height = "100%";

    if (
      overlayCanvas.width !== videoWidth ||
      overlayCanvas.height !== videoHeight
    ) {
      overlayCanvas.width = videoWidth;
      overlayCanvas.height = videoHeight;
    }
    if (
      drawCanvas.width !== videoWidth ||
      drawCanvas.height !== videoHeight
    ) {
      drawCanvas.width = videoWidth;
      drawCanvas.height = videoHeight;
    }

    if (runningModeRef.current === "IMAGE") {
      runningModeRef.current = "VIDEO";
      await handLandmarker.setOptions({ runningMode: "VIDEO" });
    }

    const startTimeMs = performance.now();
    const results = handLandmarker.detectForVideo(video, startTimeMs);
    if (!results) {
      if (isWebcamRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          void predictWebcam();
        });
      }
      return;
    }

    overlayCtx.save();
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

const landmarksList = (results.landmarks || []) as Landmark[][];

const prevLastPoints = lastPointRef.current || [];
const newLastPoints: Array<{ x: number; y: number } | null> = [];

// 추가: 이전 프레임의 “부드럽게 필터링된 포인트”
const prevSmoothPoints = smoothPointRef.current || [];
const newSmoothPoints: Array<{ x: number; y: number } | null> = [];

// 이전 프레임에 “어떤 손이든” 그리고 있었는지
const hadDrawingPrev = prevLastPoints.some((p) => p != null);
let hasDrawingNow = false;

if (landmarksList.length > 0) {
  const drawingUtils = new visionModule.DrawingUtils(overlayCtx);

  landmarksList.forEach((lms, handIndex) => {
    drawingUtils.drawConnectors(
      lms,
      visionModule.HandLandmarker.HAND_CONNECTIONS,
      {
        color: "#00FFFF",
        lineWidth: 4,
      }
    );
    drawingUtils.drawLandmarks(lms, {
      color: "#FFFF00",
      lineWidth: 1,
      radius: 3,
    });

    // 1) 검지로 그릴지 여부
    let rawPoint: { x: number; y: number } | null = null;
    if (isIndexFingerOnlyExtended(lms)) {
      const tip = lms[8];
      rawPoint = {
        x: tip.x * drawCanvas.width,
        y: tip.y * drawCanvas.height,
      };
    }

    // 2) 부드럽게 필터링 (low-pass)
    let drawPoint: { x: number; y: number } | null = null;
    if (rawPoint) {
      const prevSmooth = prevSmoothPoints[handIndex] ?? null;
      const alpha = 0.35; // 0~1 : 작을수록 더 부드럽고, 클수록 즉각적

      if (prevSmooth) {
        drawPoint = {
          x: prevSmooth.x + alpha * (rawPoint.x - prevSmooth.x),
          y: prevSmooth.y + alpha * (rawPoint.y - prevSmooth.y),
        };
      } else {
        // 첫 프레임은 그냥 raw 사용
        drawPoint = rawPoint;
      }
    }

    const prev = prevLastPoints[handIndex] ?? null;

    if (drawPoint) {
      hasDrawingNow = true;

      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
      drawCtx.strokeStyle = brushColor;
      drawCtx.lineWidth = brushSize;

      if (prev) {
        drawCtx.beginPath();
        drawCtx.moveTo(prev.x, prev.y);
        drawCtx.lineTo(drawPoint.x, drawPoint.y);
        drawCtx.stroke();
      }
    }

    newLastPoints[handIndex] = drawPoint;
    newSmoothPoints[handIndex] = drawPoint; // 이번 프레임의 부드러운 포인트 저장
  });

  const gesture = detectGesture(landmarksList);
  if (gesture === "HEART") triggerEmoji("💖");
  else if (gesture === "THUMBS_UP") triggerEmoji("👍");
}

overlayCtx.restore();

/** ---- stroke 시작/종료 상태 업데이트 ---- **/
if (!hadDrawingPrev && hasDrawingNow) {
  const snapshot = drawCanvas.toDataURL();
  setUndoStack((prev) => [...prev, snapshot]);
  setRedoStack([]);
}

isDrawingRef.current = hasDrawingNow;
lastPointRef.current = newLastPoints;
smoothPointRef.current = newSmoothPoints; // ← 추가


    if (isWebcamRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(() => {
        void predictWebcam();
      });
    }
  }, [triggerEmoji]); // ★ brushColor/Size 제거, triggerEmoji만 deps

  const handleToggleWebcam = useCallback(async () => {
    if (!isReady) return;

    if (isWebcamRunning) {
      stopWebcam();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("getUserMedia() 미지원 브라우저");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.onloadeddata = () => {
        video
          .play()
          .catch(() => {
            // autoplay 정책 에러 무시
          });
        isWebcamRunningRef.current = true;
        setIsWebcamRunning(true);
        void predictWebcam();
      };
    } catch (e) {
      console.error("웹캠 접근 실패:", e);
    }
  }, [isReady, isWebcamRunning, predictWebcam, stopWebcam]);

  /* ---------------- JSX (예전 Graffiti 디자인 + 새 기능) ---------------- */
  return (
    <div className="relative w-full h-dvh text-slate-50" style={pageBackgroundStyle}>
      {/* 상단 고정 헤더 영역 */}
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

              {!isReady && (
                <p className="mt-4 text-xs text-amber-200">
                  HandLandmarker 모델 로딩 중입니다…
                </p>
              )}

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

      {/* 우상단 웹캠 토글 버튼 */}
      <div className="absolute top-6 right-6 z-40">
        <button
          type="button"
          onClick={() => void handleToggleWebcam()}
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs md:text-sm font-medium bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors disabled:opacity-50 border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          disabled={!isReady}
        >
          {isWebcamRunning ? "웹캠 끄기" : "웹캠 켜기"}
        </button>
      </div>

      {/* 비디오 화면 */}
      <div
        ref={containerRef}
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
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
        />
        <canvas
          ref={drawCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
        />
        {activeEmoji && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none text-7xl drop-shadow-[0_0_20px_rgba(0,0,0,0.7)]">
            {activeEmoji}
          </div>
        )}
      </div>

      {/* 하단 툴바 */}
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
