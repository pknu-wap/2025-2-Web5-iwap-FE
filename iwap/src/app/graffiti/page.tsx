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
// ??? ?? ????
function isIndexFingerOnlyExtended(lms: Landmark[]): boolean {
  if (!lms || lms.length < 21) return false;

  const indexExtended = isFingerExtendedByDistance(lms, 8, 0, 0.20);
  if (!indexExtended) return false;

  // ?? ??? ?? ?? ???? ?? '???'? ???? ??? ?? + 1??? ??
  const middleExtended = isFingerExtendedByDistance(lms, 12, 0, 0.28);
  const ringExtended = isFingerExtendedByDistance(lms, 16, 0, 0.28);
  const pinkyExtended = isFingerExtendedByDistance(lms, 20, 0, 0.28);

  const othersCount =
    (middleExtended ? 1 : 0) +
    (ringExtended ? 1 : 0) +
    (pinkyExtended ? 1 : 0);

  // ?? ??, ???? ?? 1???? ?? ??? ??
  return othersCount <= 1;
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
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [isDesktopDevMobile, setIsDesktopDevMobile] = useState(false);
  const fingerAnimationDoneRef = useRef(fingerAnimationDone);
  const toolbarWrapperRef = useRef<HTMLDivElement | null>(null);
  const toolbarDragRef = useRef(false);
  const toolbarDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape =
        window.matchMedia?.("(orientation: landscape)")?.matches || w > h;
      const landscapeMobile = isLandscape && w < 1024;

      setIsMobileLandscape(landscapeMobile);
      if (landscapeMobile) {
        setToolbarPos({
          x: w - 72,
          y: h / 2,
        });
      } else {
        setToolbarPos(null);
      }

      const ua = navigator.userAgent || "";
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
      const hasTouch = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
      const isPortraitViewport = h > w;
      const viewportLooksMobile = Math.min(w, h) < 850 && Math.max(w, h) < 1500;
      // DevTools 모바일 에뮬이면 UA는 모바일처럼 바뀌지만 터치포인트가 0이고 뷰포트가 작음
      const isDevToolsMobile =
        !hasTouch && viewportLooksMobile && isPortraitViewport;
      const isDesktopButSmall = !isMobileUA && isDevToolsMobile;
      setIsDesktopDevMobile(isDesktopButSmall);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  const handleToolbarPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileLandscape) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.closest("button") || target.closest("[data-palette]"))) return;
    const rect = toolbarWrapperRef.current?.getBoundingClientRect();
    const baseX = rect?.left ?? event.clientX;
    const baseY = rect?.top ?? event.clientY;
    toolbarDragOffsetRef.current = {
      x: event.clientX - baseX,
      y: event.clientY - baseY,
    };
    toolbarDragRef.current = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }, [isMobileLandscape]);

  const handleToolbarPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!toolbarDragRef.current || !isMobileLandscape) return;
    if (typeof window === "undefined") return;
    const min = 40;
    const maxX = window.innerWidth - 40;
    const maxY = window.innerHeight - 40;
    const nextX = Math.min(Math.max(event.clientX - toolbarDragOffsetRef.current.x, min), maxX);
    const nextY = Math.min(Math.max(event.clientY - toolbarDragOffsetRef.current.y, min), maxY);
    setToolbarPos({ x: nextX, y: nextY });
  }, [isMobileLandscape]);

  const handleToolbarPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileLandscape) return;
    toolbarDragRef.current = false;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }, [isMobileLandscape]);

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
    const snapshot = canvas.toDataURL();
    setUndoStack((prev) => [...prev, snapshot]);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  const handleSaveWithVideo = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    if (!canvas || !video) return;
    const width = video.videoWidth || canvas.width;
    const height = video.videoHeight || canvas.height;
    if (!width || !height) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // mirror to match on-screen view (-scale-x CSS)
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.drawImage(canvas, 0, 0, width, height);
    if (overlay) {
      ctx.drawImage(overlay, 0, 0, width, height);
    }
    ctx.restore();

    const url = exportCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `graffiti-full-${Date.now()}.png`;
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
    // 강제 표시 폭 제한: 모바일/데스크탑 별로 최대치를 고정해 비디오 해상도(1080 등)와 무관하게 작게 유지
    const isMobile = window.innerWidth < 768;
    const displayMaxWidth = isMobile
      ? isMobileLandscape
        ? 720 // mobile landscape 더 크게
        : 360
      : 900; // 데스크탑 뷰도 여유 있게
    container.style.maxWidth = `${displayMaxWidth}px`;
    // 높이 클램프 제거해 비율 그대로 유지
    container.style.maxHeight = "";
    container.style.aspectRatio = `${videoWidth} / ${videoHeight}`;

    // 비디오/캔버스 스타일을 컨테이너에 맞춰 100%로 유지
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

      const constraintsExactEnv: MediaStreamConstraints = {
        video: {
          facingMode: { exact: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const constraintsIdealEnv: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const constraintsIdealUser: MediaStreamConstraints = {
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

      let selectedMode: "user" | "environment" = mode;
      let stream: MediaStream | null = null;

      if (mode === "environment") {
        stream =
          (await attemptStream(constraintsExactEnv)) ||
          (await attemptStream(constraintsIdealEnv)) ||
          (await attemptStream(constraintsIdealUser));
        if (stream && stream.getVideoTracks()[0]?.getSettings()?.facingMode !== "environment") {
          selectedMode = "user";
        }
      } else {
        stream = await attemptStream(constraintsIdealUser);
        if (!stream) {
          stream = await attemptStream(constraintsIdealEnv);
          selectedMode = stream ? "environment" : "user";
        }
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
        setFacingMode(selectedMode);
        isWebcamRunningRef.current = true;
        setIsWebcamRunning(true);
        void predictWebcam();
      };
    },
    [facingMode, isReady, predictWebcam, stopWebcam]
  );

  useEffect(() => {
    if (!isReady || isWebcamRunning) return;
    void startWebcam(facingMode);
  }, [facingMode, isReady, isWebcamRunning, startWebcam]);

  /* ---------------- JSX (예전 Graffiti 디자인 + 새 기능) ---------------- */
  return (
    <div className="relative w-full h-dvh text-slate-50" style={pageBackgroundStyle}>
      <ProjectIntroModal projects={["graffiti"]} open={showIntro} onClose={handleModalClose} />
      {/* 모바일 가로 전용 헤더 */}
      {!showIntro && isMobileLandscape && (
        <div
          className="fixed z-[80] md:hidden pointer-events-none flex justify-start"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 12px)",
            left: "calc(env(safe-area-inset-left, 0px) + 12px)",
          }}
        >
          <div className="pointer-events-auto px-3 py-2">
            <PageHeader
              title="Graff!ti"
              subtitle="움직임으로만 드로잉"
              goBack={true}
              padding="p-0"
              inlineClose
              isAbsolute={false}
              titleClassName="text-[22px] font-semibold"
              subtitleClassName="text-[11px]"
            />
          </div>
        </div>
      )}
      {/* 상단 고정 헤더 영역 (인트로 제거, 헤더만 유지) */}
      <div className="relative inset-0 pointer-events-none flex items-center justify-center p-6 animate-fadeIn z-50">
        <div className="absolute pointer-events-none w-[90%] h-[90%] translate-x-5 md:translate-x-0 md:w-full md:h-full flex items-center justify-center p-4 sm:p-8">
          <div className="pointer-events-auto flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
              {!showIntro && !isMobileLandscape && (
                <div className="z-[70] absolute top-[40px] md:top-6 left-0 right-0 px-4 md:px-0 pointer-events-none">
                  <div className="pointer-events-auto">
                    <PageHeader
                      title="Graff!ti"
                      subtitle="움직임으로만 드로잉"
                      goBack={true}
                      padding="p-0"
                      titleClassName="-translate-x-[10px]"
                      subtitleClassName="-translate-x-[10px]"
                    />
                  </div>
                </div>
              )}

              {!isReady && (
                <p className="mt-4 text-xs text-amber-200">
                  {/* 로딩 메시지 필요하면 여기 */}
                </p>
              )}
            </div>
          </div>
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
              relative z-10 w-full mx-auto md:-translate-y-[10px]
              max-w-[720px]
              md:max-w-[1080px]
              ${isMobileLandscape ? "scale-[1.8]" : ""}
              ${videoReady ? "opacity-100 visible" : "opacity-0 invisible"}
              transition-opacity duration-500
            `}
            aria-hidden={!videoReady}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-contain -scale-x-100 pointer-events-none"
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
            <div className="pointer-events-auto mt-6 flex justify-center relative">
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
                  onSaveWithVideo={handleSaveWithVideo}
                />
              </div>
        <div
          ref={toolbarWrapperRef}
          className={
            isMobileLandscape
              ? "md:hidden fixed z-[100] flex flex-col items-center gap-3"
              : "md:hidden fixed left-1/2 bottom-4 -translate-x-1/2 z-[80] w-full flex justify-center px-4"
          }
                style={
                  isMobileLandscape
                    ? toolbarPos
                      ? { left: toolbarPos.x, top: toolbarPos.y, right: "auto", bottom: "auto", transform: "translate(-50%, -50%)" }
                      : { right: "calc(env(safe-area-inset-right, 0px) + 16px)", top: "50%", transform: "translateY(-50%)" }
                    : { bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }
                }
                onPointerDown={handleToolbarPointerDown}
                onPointerMove={handleToolbarPointerMove}
                onPointerUp={handleToolbarPointerUp}
                onPointerCancel={handleToolbarPointerUp}
              >
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
                  onSaveWithVideo={handleSaveWithVideo}
                  desktopDevMobile={isDesktopDevMobile}
                  rotate={isMobileLandscape}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
