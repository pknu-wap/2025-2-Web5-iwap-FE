"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PageHeader from "@/components/ui/PageHeader";

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

export default function GraffitiClient() {
  /* -------------------- Intro / Camera 상태 -------------------- */
  const [showIntro, setShowIntro] = useState(true);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [fingerAnimationDone, setFingerAnimationDone] =
    useState(false);

  /* -------------------- 기존 상태 -------------------- */
  const [brushColor, setBrushColor] = useState("#ff315a");
  const [brushSize, setBrushSize] = useState(6);
  const [gestureEnabled, setGestureEnabled] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [pinchActive, setPinchActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [handsCount, setHandsCount] = useState(0);

  /* -------------------- Refs (null 안전 처리!) -------------------- */
  const videoRef = useRef<HTMLVideoElement>(null!);
  const overlayRef = useRef<HTMLCanvasElement>(null!);
  const drawRef = useRef<HTMLCanvasElement>(null!);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const handLandmarkerRef = useRef<any>(null);
  const usingTasksRef = useRef(false);
  const cameraRef = useRef<any>(null);
  const drawLandmarksRef = useRef<any>(null);
  const smoothLandmarksRef = useRef<
    Array<Array<{ x: number; y: number; z?: number }>> | null
  >(null);

  const lastPointRef = useRef<Array<{ x: number; y: number } | null>>([]);
  const lastPinchRef = useRef<boolean[]>([]);
  const gestureOnCountRef = useRef<number[]>([]);
  const gestureOffCountRef = useRef<number[]>([]);
  const gestureEnabledRef = useRef(gestureEnabled);
  const showOverlayRef = useRef(showOverlay);

  const fpsCounter = useRef({
    frames: 0,
    last:
      typeof performance !== "undefined"
        ? performance.now()
        : 0,
  });

  /* -------------------- Intro 자동 skip (5초) -------------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
      setIntroFinished(true);
      setFingerAnimationDone(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  /* -------------------- gesture & overlay ref sync -------------------- */
  useEffect(() => {
    gestureEnabledRef.current = gestureEnabled;
  }, [gestureEnabled]);

  useEffect(() => {
    showOverlayRef.current = showOverlay;
  }, [showOverlay]);

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

  /* -------------------- Mediapipe + Camera 초기화 -------------------- */
  useEffect(() => {
    let stopped = false;

    async function init() {
      try {
        const video = videoRef.current;

        /* ------- 카메라 접근 요청 ------- */
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        /* ------- ★ 허용됨! Intro 종료 ------- */
        setCameraGranted(true);
        setShowIntro(false);
        setIntroFinished(true);
        setFingerAnimationDone(false);

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
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctxRef.current = ctx;

        /* ------- Mediapipe 로딩 ------- */
        const base = "https://cdn.jsdelivr.net/npm/@mediapipe";

        const loadScriptOnce = (src: string) =>
          new Promise<void>((resolve, reject) => {
            const existing = Array.from(document.scripts).find(
              (s) => s.src === src
            );
            if (existing) {
              existing.addEventListener("load", () => resolve());
              return;
            }
            const s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.crossOrigin = "anonymous";
            s.onload = () => resolve();
            s.onerror = () => reject();
            document.head.appendChild(s);
          });

        await loadScriptOnce(`${base}/camera_utils/camera_utils.js`);
        await loadScriptOnce(`${base}/drawing_utils/drawing_utils.js`);

        const CameraCtor = (window as any).Camera;
        drawLandmarksRef.current = (window as any).drawLandmarks;

        /* ------- TasksVision 로드 ------- */

        const tryLoadTasksVision = async () => {
          const candidates = [
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js",
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js",
          ];
          for (const url of candidates) {
            try {
              const vision = await import(/* webpackIgnore: true */ url);
              const root = url.replace(/\/vision_bundle\.js.*/, "");
              return { vision, root };
            } catch {}
          }
          throw new Error("Load failed");
        };

        let camera: any;

        try {
          const { vision, root } = await tryLoadTasksVision();
          const { FilesetResolver, HandLandmarker } =
            vision as any;

          const fileset = await FilesetResolver.forVisionTasks(
            `${root}/wasm`
          );

          let handLandmarker = await HandLandmarker.createFromOptions(
            fileset,
            {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              numHands: 2,
              minHandDetectionConfidence: 0.5,
              minHandPresenceConfidence: 0.5,
              minTrackingConfidence: 0.6,
            }
          );

          handLandmarkerRef.current = handLandmarker;
          usingTasksRef.current = true;

          camera = new CameraCtor(video, {
            onFrame: async () => {
              if (stopped) return;
              const ts = performance.now();
              const result =
                handLandmarker.detectForVideo(video, ts);

              const mpLike: MPResults = {
                multiHandLandmarks: result?.landmarks ?? [],
              };
              onResults(mpLike);
            },
            width: video.videoWidth,
            height: video.videoHeight,
          });
        } catch {
          /* ------- Legacy Hands fallback ------- */
          await loadScriptOnce(`${base}/hands/hands.js`);
          const HandsCtor = (window as any).Hands;

          const hands = new HandsCtor({
            locateFile: (file: string) => `${base}/hands/${file}`,
          });

          hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            selfieMode: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.6,
          });

          hands.onResults(onResults);
          usingTasksRef.current = false;

          camera = new CameraCtor(video, {
            onFrame: async () => {
              if (!stopped) await hands.send({ image: video });
            },
            width: video.videoWidth,
            height: video.videoHeight,
          });
        }

        camera.start();
        cameraRef.current = camera;
      } catch (err: any) {
        console.error(err);
      }
    }

    init();

    return () => {
      stopped = true;
      try {
        cameraRef.current?.stop?.();
      } catch {}

      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks()?.forEach((t) => t.stop());
    };
  }, []);

  /* -------------------- Mediapipe 결과 처리 -------------------- */
  const onResults = useCallback((results: MPResults) => {
    /* FPS 계산 */
    fpsCounter.current.frames += 1;
    const now = performance.now();
    if (now - fpsCounter.current.last >= 1000) {
      setFps(fpsCounter.current.frames);
      fpsCounter.current.frames = 0;
      fpsCounter.current.last = now;
    }

    const overlay = overlayRef.current;
    const octx = overlay.getContext("2d")!;
    octx.clearRect(0, 0, overlay.width, overlay.height);

    const drawCtx = ctxRef.current;
    const drawCanvas = drawRef.current;
    if (!drawCtx || !drawCanvas) return;

    const width = drawCanvas.width;
    const height = drawCanvas.height;

    let hands = results.multiHandLandmarks ?? [];

    if (usingTasksRef.current && hands.length > 0) {
      hands = hands.map((h) =>
        h.map((p) => ({ ...p, x: 1 - p.x }))
      );
    }

    setHandsCount(hands.length);

    if (hands.length === 0) {
      setPinchActive(false);
      lastPointRef.current = [];
      smoothLandmarksRef.current = null;
      lastPinchRef.current = [];
      gestureOnCountRef.current = [];
      gestureOffCountRef.current = [];
      return;
    }

    /* ------ Smoothing ------ */
    const prevHands = smoothLandmarksRef.current;
    const alphaBase = 0.5;

    const smoothedHands = hands.map((hand, hi) => {
      const prev = prevHands?.[hi];
      const ref = getPalmWidth(hand);

      return hand.map((p, i) => {
        const prevP = prev?.[i];
        if (!prevP) return p;
        const dx = p.x - prevP.x;
        const dy = p.y - prevP.y;
        const motion =
          Math.hypot(dx, dy) / Math.max(0.0001, ref);
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
    if (showOverlayRef.current && drawLandmarksRef.current) {
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

      const dIndex = fingerTipDistance(
        lm,
        8,
        palmCenter,
        ref
      );
      const indexExtended = dIndex > 0.3;

      const gestureActive = indexExtended;

      const lastState = lastPinchArr[hi] ?? false;
      onCounts[hi] = onCounts[hi] ?? 0;
      offCounts[hi] = offCounts[hi] ?? 0;

      if (gestureActive) {
        onCounts[hi]++;
        offCounts[hi] = 0;
      } else {
        offCounts[hi]++;
        onCounts[hi] = 0;
      }

      let next = lastState;
      if (!lastState && onCounts[hi] >= 2) next = true;
      if (lastState && offCounts[hi] >= 3) next = false;

      nextPinchArr[hi] = next;

      /* Draw */
      const px = clamp(indexTip.x, 0, 1) * width;
      const py = clamp(indexTip.y, 0, 1) * height;
      const shouldDraw =
        gestureEnabledRef.current ? next : false;
      const lastPoint = lastPoints[hi] ?? null;

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
    setPinchActive(nextPinchArr.some(Boolean));
  }, []);

  /* -------------------- Clear 버튼 -------------------- */
  const handleClear = useCallback(() => {
    const draw = drawRef.current;
    const ctx = draw.getContext("2d")!;
    ctx.clearRect(0, 0, draw.width, draw.height);
  }, []);

  /* --------------------------------------------------- */
  /*                       UI                           */
  /* --------------------------------------------------- */

  return (
    <div
      className="relative w-full h-dvh"
      style={pageBackgroundStyle}
    >
      {/* ------------------ Persistent Header ------------------ */}
      <div className="pointer-events-none translate-y-[50px] inset-0 flex items-center justify-center p-6 animate-fadeIn">
        <div className="pointer-events-auto w-[90%] h-[90%] translate-x-5 md:translate-x-0 md:w-full md:h-full flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-full h-full pt-[100px]">
              <PageHeader
                title="Graff!ti"
                subtitle="움직임으로만 드로잉"
                goBack={true}
                padding="p-0"
              />

                    {/* ------------------ Intro가 끝난 후 나타나는 박스 ------------------ */}
                    {introFinished && !fingerAnimationDone && (
                      <div className="pointer-events-none inset-x-0 top-0 flex justify-center z-30 opacity-0 animate-fadeIn">
                        <div
                          className="
                            pointer-events-auto
                            flex flex-col items-center justify-center gap-6 px-6 py-8
                          
                            /* 모바일 기본 크기 */
                            w-[260px] h-[280px]

                            /* 태블릿 이상 */
                            sm:w-[380px] sm:h-[400px]

                            /* 데스크탑 */
                            md:w-[500px] md:h-[480px]

                            bg-white/40
                            border border-white/80
                            backdrop-blur-[6px]
                            shadow-[0_20px_60px_rgba(0,0,0,0.35)]
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
              {showIntro && !cameraGranted && (
                <div
                  className="
                    mt-10
                    w-[300px] h-[80px]
                    md:w-[500px] md:h-[100px]
                    rounded-[84px]
                    border border-white
                    bg-white/60 backdrop-blur-[4px]
                    shadow-[0_0_50px_20px_rgba(0,0,0,0.25)]
                    flex items-center justify-center translate-y-30
                  "
                >
                  <p className="hidden md:block text-black text-[20px]">
                    손동작 인식을 위해 카메라 접근을 허용해주세요.
                  </p>
                  <p className="md:hidden text-black text-[18px] text-center">
                    손동작 인식을 위해<br />
                    카메라 접근을 허용해주세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------ 비디오 화면 ------------------ */}
      {!showIntro && fingerAnimationDone && (
        <div className="relative w-full max-w-[1000px] aspect-video mx-auto mt-10">
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
      )}
    </div>
  );
}
