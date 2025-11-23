"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import PageHeader from "@/components/ui/PageHeader";
import GraffitiToolbar from "@/components/graffiti/GraffitiToolbar";
import GraffitiToolbarMobile from "@/components/graffiti/GraffitiToolbarMobile";
import { ProjectIntroModal } from "@/components/sections/ProjectIntroSections";

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

  const indexExtended = isFingerExtendedByDistance(lms, 8, 0, 0.20);
  if (!indexExtended) return false;

  const middleExtended = isFingerExtendedByDistance(lms, 12, 0, 0.18);
  const ringExtended = isFingerExtendedByDistance(lms, 16, 0, 0.18);
  const pinkyExtended = isFingerExtendedByDistance(lms, 20, 0, 0.18);

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
  const thumb = lms[4];
  const index = lms[8];
  const middle = lms[12];
  const ring = lms[16];
  const pinky = lms[20];

  // 엄지가 화면 쪽(z가 더 작음)으로 튀어나온 경우도 긍정 신호로 인정.
  const thumbForward =
    thumb && index && thumb.z < index.z - 0.02
      ? true
      : thumb && middle && thumb.z < middle.z - 0.02
        ? true
        : false;

  // 조금만 펴도 엄지로 인정하고, 전방 보너스를 추가.
  const thumbExtended =
    isFingerExtendedByDistance(lms, 4, 0, 0.09) || thumbForward;
  if (!thumbExtended) return false;

  // Allow slight stretch on other fingers; require a bigger distance to mark as "extended".
  const indexExtended = isFingerExtendedByDistance(lms, 8, 0, 0.15);
  const middleExtended = isFingerExtendedByDistance(lms, 12, 0, 0.15);
  const ringExtended = isFingerExtendedByDistance(lms, 16, 0, 0.15);
  const pinkyExtended = isFingerExtendedByDistance(lms, 20, 0, 0.15);

  const othersCount =
    (indexExtended ? 1 : 0) +
    (middleExtended ? 1 : 0) +
    (ringExtended ? 1 : 0) +
    (pinkyExtended ? 1 : 0);

  // 다른 손가락이 살짝 펴져도(최대 2개) 엄지척으로 인정해 인식률을 높임.
  return othersCount <= 2;
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
  const thumb1Ext = isFingerExtendedByDistance(h1, 4, 0, 0.18);
  const thumb2Ext = isFingerExtendedByDistance(h2, 4, 0, 0.18);
  const index1Ext = isFingerExtendedByDistance(h1, 8, 0, 0.18);
  const index2Ext = isFingerExtendedByDistance(h2, 8, 0, 0.18);
  if (!(thumb1Ext && thumb2Ext && index1Ext && index2Ext)) return false;

  const handSpan = dist3(wrist1, wrist2);

  const thumbDist = dist3(thumb1, thumb2);
  const indexDist = dist3(index1, index2);

  // 더 가까이 모여야 하트로 인정 (0.7 → 0.45)
  const closeFactor = 0.18;
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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

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
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showEmojiPop, setShowEmojiPop] = useState(false);
  const emojiTimeoutRef = useRef<number | null>(null);
  const heartBurstTimeoutRef = useRef<number | null>(null);
  const emojiPopTimeoutRef = useRef<number | null>(null);
  const activeEmojiRef = useRef<string | null>(null);

  const triggerEmoji = useCallback((emoji: string, effect: "burst" | "pop" = "burst") => {
    if (activeEmojiRef.current === emoji) return;
    activeEmojiRef.current = emoji;
    setActiveEmoji(emoji);
    setShowHeartBurst(effect === "burst");
    setShowEmojiPop(effect === "pop");
    if (emojiTimeoutRef.current !== null) {
      window.clearTimeout(emojiTimeoutRef.current);
    }
    if (heartBurstTimeoutRef.current !== null) {
      window.clearTimeout(heartBurstTimeoutRef.current);
    }
    if (emojiPopTimeoutRef.current !== null) {
      window.clearTimeout(emojiPopTimeoutRef.current);
    }
    emojiTimeoutRef.current = window.setTimeout(() => {
      activeEmojiRef.current = null;
      setActiveEmoji(null);
      emojiTimeoutRef.current = null;
    }, 1000);
    if (effect === "burst") {
      heartBurstTimeoutRef.current = window.setTimeout(() => {
        setShowHeartBurst(false);
        heartBurstTimeoutRef.current = null;
      }, 1600);
    } else {
      emojiPopTimeoutRef.current = window.setTimeout(() => {
        setShowEmojiPop(false);
        emojiPopTimeoutRef.current = null;
      }, 900);
    }
  }, []);

  /* ---- Graffiti 인트로 상태 ---- */
  const [showIntro, setShowIntro] = useState(true);
  const [showCameraPrompt, setShowCameraPrompt] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [fingerAnimationDone, setFingerAnimationDone] = useState(false);
  const [overlayExpanding, setOverlayExpanding] = useState(false);
  const [overlayExpanded, setOverlayExpanded] = useState(false);
  const fingerAnimationDoneRef = useRef(fingerAnimationDone);

  const handleIntroReady = useCallback(() => {
    setShowCameraPrompt(false);
    setIntroFinished(true);
    if (!fingerAnimationDoneRef.current) {
      fingerAnimationDoneRef.current = false;
      setFingerAnimationDone(false);
    }
  }, []);

  const handleModalClose = useCallback(() => {
    setShowIntro(false);
    setShowCameraPrompt(true);
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

  useEffect(() => {
    if (!introFinished || !fingerAnimationDone || overlayExpanding || overlayExpanded) return;
    const expandTimer = window.setTimeout(() => {
      setOverlayExpanding(true);
    }, 100);
    return () => window.clearTimeout(expandTimer);
  }, [introFinished, fingerAnimationDone, overlayExpanding, overlayExpanded]);

  useEffect(() => {
    if (!overlayExpanding) return;
    const finishTimer = window.setTimeout(() => {
      setOverlayExpanded(true);
    }, 450);
    return () => window.clearTimeout(finishTimer);
  }, [overlayExpanding]);

  const handleFingerAnimationComplete = useCallback(() => {
    if (!introFinished || fingerAnimationDone) return;
    setFingerAnimationDone(true);
  }, [introFinished, fingerAnimationDone]);

  const videoReady = !showIntro && overlayExpanded;

  /* ---- Toolbar / 브러시 상태 ---- */
  const [customPatterns, setCustomPatterns] = useState<string[]>([]);
  const colorPickerRef = useRef<HTMLInputElement | null>(null);
  const [pendingCustomColor, setPendingCustomColor] = useState<string | null>(
    null
  );

  const [brushColor, setBrushColor] = useState<string>("#FFFFFF");
  const [brushSize, setBrushSize] = useState(15);

  // ★ 최신 값을 루프에서 읽기 위한 ref
  const brushColorRef = useRef<string>("#FFFFFF");
  const brushSizeRef = useRef<number>(15);

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

  const handleRemoveCustomColor = useCallback((color: string) => {
    const normalized = color.toLowerCase();
    setCustomPatterns((prev) =>
      prev.filter((pattern) => pattern.toLowerCase() !== normalized)
    );
    setBrushColor((prev) =>
      prev.toLowerCase() === normalized ? COLOR_PALETTE[0] : prev
    );
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
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;
    exportCtx.translate(canvas.width, 0);
    exportCtx.scale(-1, 1);
    exportCtx.drawImage(canvas, 0, 0);
    const url = exportCanvas.toDataURL("image/png");
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
          // Lowered thresholds to help mobile cameras in lower light/quality
          minHandDetectionConfidence: 0.2,
          minHandPresenceConfidence: 0.2,
          minTrackingConfidence: 0.2,
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
      if (heartBurstTimeoutRef.current !== null) {
        window.clearTimeout(heartBurstTimeoutRef.current);
      }
      if (emojiPopTimeoutRef.current !== null) {
        window.clearTimeout(emojiPopTimeoutRef.current);
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
    // 강제 표시 폭 제한: tailwind 클래스(max-w-[180px]/[500px])와 동일한 값으로 맞춰서 inline 스타일이 덮어쓰지 않도록 유지
    const displayMaxWidth = window.innerWidth < 768 ? 180 : 500;
    container.style.maxWidth = `${displayMaxWidth}px`;
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

    // 2) 부드럽게 보정: low-pass
    let drawPoint: { x: number; y: number } | null = null;
    if (rawPoint) {
      const prevSmooth = prevSmoothPoints[handIndex] ?? null;
      const alpha = 0.55; // 0~1 : 값이 작을수록 더 부드럽고, 클수록 즉각적

      if (prevSmooth) {
        drawPoint = {
          x: prevSmooth.x + alpha * (rawPoint.x - prevSmooth.x),
          y: prevSmooth.y + alpha * (rawPoint.y - prevSmooth.y),
        };
      } else {
        // 첫 프레임이면 그냥 raw 사용
        drawPoint = rawPoint;
      }
    }

    const prev = prevLastPoints[handIndex] ?? null;

    if (drawPoint) {
      hasDrawingNow = true;

      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
      drawCtx.strokeStyle = brushColorRef.current;
      drawCtx.lineWidth = brushSizeRef.current;

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
  if (gesture === "HEART") triggerEmoji("💖", "burst");
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

  const startWebcam = useCallback(
    async (mode: "user" | "environment" = facingMode) => {
      if (!isReady) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn("getUserMedia() not supported.");
        return;
      }

      const constraintsPrimary: MediaStreamConstraints = {
        video: {
          facingMode: mode === "environment" ? { ideal: "environment" } : { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const constraintsFallback: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const attemptStream = async (constraints: MediaStreamConstraints) => {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          return null;
        }
      };

      // stop any existing stream before requesting a new one
      stopWebcam();

      let stream = await attemptStream(constraintsPrimary);
      if (!stream && mode === "environment") {
        // fallback to front if back is not available
        stream = await attemptStream(constraintsFallback);
        mode = "user";
      }

      if (!stream) {
        console.error("Webcam access failed: no stream acquired");
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      video.srcObject = stream;
      video.onloadeddata = () => {
        video
          .play()
          .catch(() => {
            // autoplay block error ignored
          });
        setFacingMode(mode);
        isWebcamRunningRef.current = true;
        setIsWebcamRunning(true);
        void predictWebcam();
      };
    },
    [facingMode, isReady, predictWebcam, stopWebcam]
  );

  const handleToggleWebcam = useCallback(async () => {
    if (isWebcamRunning) {
      stopWebcam();
      return;
    }

    void startWebcam(facingMode);
  }, [facingMode, isWebcamRunning, startWebcam, stopWebcam]);

  const handleSwitchCamera = useCallback(async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    stopWebcam();
    await startWebcam(nextMode);
  }, [facingMode, startWebcam, stopWebcam]);

  useEffect(() => {
    if (!isReady || isWebcamRunning) return;
    void startWebcam(facingMode);
  }, [facingMode, isReady, isWebcamRunning, startWebcam]);

  /* ---------------- JSX (예전 Graffiti 디자인 + 새 기능) ---------------- */
  return (
    <div className="relative w-full h-dvh text-slate-50" style={pageBackgroundStyle}>
      <ProjectIntroModal projects={["graffiti"]} open={showIntro} onClose={handleModalClose} />
      {/* 상단 고정 헤더 영역 (인트로 제거, 헤더만 유지) */}
      <div className="pointer-events-none inset-0 flex items-center justify-center p-6 animate-fadeIn z-50">
        <div className="absolute pointer-events-auto w-[90%] h-[90%] translate-x-5 md:translate-x-0 md:w-full md:h-full flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-full h-full pt-[72px] md:pt-[100px] translate-y-0 relative">
              <div className="absolute top-[40px] md:top-6 left-0 right-0 px-4 md:px-0 z-50">
                <PageHeader
                  title="Graff!ti"
                  subtitle="움직임으로만 드로잉"
                  goBack={true}
                  padding="p-0"
                />
              </div>

              {!isReady && (
                <p className="mt-4 text-xs text-amber-200">
                  {/* 로딩 메시지 필요하면 여기 */}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 우상단 웹캠 토글 버튼 */}
      {/* <div className="absolute top-6 right-6 z-40">
        <button
          type="button"
          onClick={() => void handleToggleWebcam()}
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs md:text-sm font-light disabled:opacity-50 bg-[rgba(255,255,255,0.40)] min-w-[72px]
        shadow-[0_0_50px_20px_rgba(0,0,0,0.25)]
        backdrop-blur-[4px]
        border border-white"
          disabled={!isReady}
        >
          {isWebcamRunning ? "OFF" : "ON"}
        </button>
      </div> */}


      {/* 영상+웹캠 토글 & 카메라 전환 (모바일용) */}
      <div className="absolute top-6 right-6 z-40 flex gap-2 md:hidden">
        {/* <button
          type="button"
          onClick={() => void handleToggleWebcam()}
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-light disabled:opacity-50 bg-[rgba(255,255,255,0.40)] min-w-[72px] shadow-[0_0_50px_20px_rgba(0,0,0,0.25)] backdrop-blur-[4px] border border-white"
          disabled={!isReady}
        >
          {isWebcamRunning ? "OFF" : "ON"}
        </button> */}
        <button
          type="button"
          onClick={() => void handleSwitchCamera()}
          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-light disabled:opacity-50 bg-[rgba(255,255,255,0.40)] min-w-[72px] shadow-[0_0_50px_20px_rgba(0,0,0,0.25)] backdrop-blur-[4px] border border-white"
          disabled={!isReady || !isWebcamRunning}
        >
          {facingMode === "user" ? "후면" : "전면"}
        </button>
      </div>

      {/* 비디오 + 인트로 + 툴바: 한 그룹으로 중앙 기준 스케일 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full max-w-[1000px] origin-center md:scale-100 scale-[0.9] flex flex-col items-center">
          {/* Intro 1: camera access prompt */}
          {showCameraPrompt && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <button
                type="button"
                onClick={handleIntroReady}
                className="
                  pointer-events-auto
                  w-[275px] h-[100px]
                  md:w-[500px] md:h-[100px]
                  rounded-[84px]
                  border border-white
                  bg-white/60 backdrop-blur-[4px]
                  shadow-[0_0_50px_20px_rgba(0,0,0,0.25)]
                  flex flex-col items-center justify-center
                  text-center
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-white
                "
              >
                <span className="hidden md:block text-black text-[20px]">
                  손동작 인식을 위해 카메라 접근을 허용해주세요.
                </span>
                <span className="md:hidden text-black text-[18px] leading-snug">
                  손동작 인식을 위해
                  <br />
                  카메라 접근을 허용해주세요.
                </span>
              </button>
            </div>
          )}

          {/* Intro 2: follow the hand pose */}
          {introFinished && !overlayExpanded && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center scale-[0.64] md:scale-100">
                <div
                  className={`
                    pointer-events-auto
                    flex flex-col items-center justify-center
                    px-6 py-8
                    bg-white/40
                    border border-white/80
                    backdrop-blur-[6px]
                    shadow-[0_20px_60px_rgba(0,0,0,0.35)]
                    transition-all duration-[1200ms] ease-in-out
                    w-[500px] h-[480px]
                    gap-6
                    ${overlayExpanding ? "scale-[1.25] opacity-0" : "scale-100 opacity-100"}
                  `}
                >
                  <p className="text-white text-center text-[18px] md:text-[24px] font-semibold scale-[1.5] md:scale-[1.0]">
                    손 모양을 따라 해보세요.
                  </p>
                  <div className="relative w-[200px] h-[180px] flex items-center justify-center">
                    <div className="relative w-full h-full">
                      <img
                        src="/icons/Vector1.png"
                        alt="Hand shape 1"
                        className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_0_4.6px_#fff] pointer-events-none -translate-x-[30px] translate-y-[8px] vector-highlight"
                      />
                      <img
                        src="/icons/Vector2.png"
                        alt="Hand shape 2"
                        className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_0_4.6px_#fff] pointer-events-none translate-x-[120px] -translate-y-[6px] vector-highlight-2"
                      />
                    </div>
                    <img
                      src="/icons/graffiti_finger.png"
                      alt="Demonstration finger"
                      className="finger-trace-icon"
                      style={{ "--finger-trace-size": "100px" } as CSSProperties}
                      onAnimationEnd={handleFingerAnimationComplete}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 비디오 화면 */}
          <div
            ref={containerRef}
            className={`
              relative z-0 w-full mx-auto md:translate-y-0 
              max-w-[180px]
              md:max-w-[500px]
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
            {showHeartBurst && activeEmoji === "💖" && (
              <div className="heart-burst" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`heart-burst-dot heart-burst-dot-${idx + 1}`}
                  >
                    {activeEmoji ?? "💖"}
                  </span>
                ))}
              </div>
            )}
            {showEmojiPop && activeEmoji && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-5xl drop-shadow-[0_0_10px_rgba(0,0,0,0.35)] animate-bounce">
                  {activeEmoji}
                </span>
              </div>
            )}
          </div>

          {/* 하단 툴바 */}
          {videoReady && (
            <div className="pointer-events-auto mt-6 flex justify-center">
              <div className="hidden md:flex">
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
                  onRemoveCustomColor={handleRemoveCustomColor}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={handleClear}
                  onSave={handleSave}
                />
              </div>
              <div className="flex md:hidden">
                <GraffitiToolbarMobile
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
                  onRemoveCustomColor={handleRemoveCustomColor}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={handleClear}
                  onSave={handleSave}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
