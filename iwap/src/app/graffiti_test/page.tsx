"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RunningMode = "IMAGE" | "VIDEO";

export default function HandLandmarkerPage() {
  const [isReady, setIsReady] = useState(false);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);

  // Mediapipe 모듈/인스턴스
  const visionModuleRef = useRef<any>(null);      // @mediapipe/tasks-vision 전체 모듈
  const handLandmarkerRef = useRef<any>(null);    // HandLandmarker 인스턴스
  const runningModeRef = useRef<RunningMode>("IMAGE");
  const lastVideoTimeRef = useRef(-1);
  const animationFrameRef = useRef<number | null>(null);

  // DOM refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageContainerRefs = useRef<HTMLDivElement[]>([]);
  const isWebcamRunningRef = useRef(false);


  // ---------------- Mediapipe HandLandmarker 초기화 ----------------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (typeof window === "undefined") return;

      // 동적 import (any 타입으로 취급)
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
    };
  }, []);

  // ---------------- Demo 1: 이미지 클릭 검출 ----------------
  const handleImageClick = useCallback(async (index: number) => {
    const handLandmarker = handLandmarkerRef.current;
    const visionModule = visionModuleRef.current;
    if (!handLandmarker || !visionModule) {
      return;
    }

    const container = imageContainerRefs.current[index];
    if (!container) return;

    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) return;

    // VIDEO 모드였다면 다시 IMAGE 모드로
    if (runningModeRef.current === "VIDEO") {
      runningModeRef.current = "IMAGE";
      await handLandmarker.setOptions({ runningMode: "IMAGE" });
    }

    // 이전 캔버스 제거
    container.querySelectorAll("canvas.landmark-canvas").forEach((c) => c.remove());

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

  // ---------------- Demo 2: 웹캠 ----------------
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
  isWebcamRunningRef.current = false;  // ★ ref도 false
  setIsWebcamRunning(false);           // UI용 state
}, []);


const predictWebcam = useCallback(async () => {
  const handLandmarker = handLandmarkerRef.current;
  const visionModule = visionModuleRef.current;
  const video = videoRef.current;
  const canvas = canvasRef.current;
  if (!handLandmarker || !visionModule || !video || !canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    if (isWebcamRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(() => {
        void predictWebcam();
      });
    }
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  if (runningModeRef.current === "IMAGE") {
    runningModeRef.current = "VIDEO";
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
  }

  const startTimeMs = performance.now();
  const results = handLandmarker.detectForVideo(video, startTimeMs);

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "lime";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  if (results.landmarks && results.landmarks.length > 0) {
    const drawingUtils = new visionModule.DrawingUtils(ctx);
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        visionModule.HandLandmarker.HAND_CONNECTIONS,
        {
          color: "#00FFFF",
          lineWidth: 4,
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#FFFF00",
        lineWidth: 1,
        radius: 3,
      });
    }
  }

  ctx.restore();

  // ★ ref 기준으로 루프 유지
  if (isWebcamRunningRef.current) {
    animationFrameRef.current = requestAnimationFrame(() => {
      void predictWebcam();
    });
  }
}, []); // ★ deps 비움 (ref만 사용)




const handleToggleWebcam = useCallback(async () => {
  if (!isReady) {
    return;
  }

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
      isWebcamRunningRef.current = true; // ★ 루프용 ref
      setIsWebcamRunning(true);          // UI용 state
      void predictWebcam();
    };
  } catch (e) {
    console.error("웹캠 접근 실패:", e);
  }
}, [isReady, isWebcamRunning, predictWebcam, stopWebcam]);


  // ---------------- JSX ----------------
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold text-cyan-300">
            Hand landmark detection using MediaPipe HandLandmarker
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Next.js + TypeScript + Tailwind 환경용 포팅 버전.
          </p>
          {!isReady && (
            <p className="mt-2 text-xs text-amber-300">
              모델 로딩 중입니다…
            </p>
          )}
        </header>

        <section className={isReady ? "transition-opacity" : "opacity-30 transition-opacity"}>
          {/* Demo 1: 이미지 클릭 */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold text-cyan-200">
              Demo: Detecting Images
            </h2>
            <p className="text-sm text-slate-200">
              이미지를 클릭하면 손 랜드마크를 캔버스로 오버레이합니다.
            </p>

            {/* <div className="flex flex-col md:flex-row gap-4">
              {[
                "https://assets.codepen.io/9177687/hand-ge4ca13f5d_1920.jpg",
                "https://assets.codepen.io/9177687/couple-gb7cb5db4c_1920.jpg",
              ].map((src, idx) => (
                <div
                  key={src}
                  ref={(el) => {
                    if (el) imageContainerRefs.current[idx] = el;
                  }}
                  className="relative w-full md:w-1/2 cursor-pointer border border-slate-700 rounded-lg overflow-hidden"
                  onClick={() => void handleImageClick(idx)}
                >
                  <p className="absolute left-2 top-2 z-10 bg-cyan-600/90 text-xs px-2 py-1 rounded text-white border border-white/60">
                    Click to get detection!
                  </p>
                  <img
                    src={src}
                    alt={`Demo image ${idx + 1}`}
                    className="block w-full h-auto"
                    crossOrigin="anonymous"
                  />
                </div>
              ))}
            </div> */}
          </div>

          {/* Demo 2: 웹캠 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-200">
              Demo: Webcam continuous hands landmarks detection
            </h2>
            <p className="text-sm text-slate-200">
              웹캠 앞에 손을 두면 실시간으로 랜드마크가 그려집니다.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void handleToggleWebcam()}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors disabled:opacity-50"
                disabled={!isReady}
              >
                {isWebcamRunning ? "DISABLE PREDICTIONS" : "ENABLE WEBCAM"}
              </button>

              <div className="relative w-full max-w-2xl aspect-video bg-slate-900/70 rounded-xl overflow-hidden border border-slate-700">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 z-0 w-full h-full object-cover transform -scale-x-100"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 z-10 w-full h-full pointer-events-none transform -scale-x-100"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
