"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MPResults = {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function getPalmWidth(landmarks: { x: number; y: number }[]) {
  const a = landmarks[5];
  const b = landmarks[17];
  if (!a || !b) return 0.1;
  return Math.max(0.0001, distance(a, b));
}

function getPalmCenter(landmarks: { x: number; y: number }[]) {
  const idx = [0, 5, 9, 13, 17];
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (const i of idx) {
    const p = landmarks[i];
    if (p) {
      cx += p.x;
      cy += p.y;
      n += 1;
    }
  }
  if (n === 0) return { x: 0.5, y: 0.5 };
  return { x: cx / n, y: cy / n };
}

function isFingerExtended(
  landmarks: { x: number; y: number }[],
  tipIndex: number,
  baseIndex: number,
  palmCenter: { x: number; y: number },
  ref: number,
  threshold: number
) {
  const tip = landmarks[tipIndex];
  const base = landmarks[baseIndex];
  if (!tip || !base) return false;
  const dTipPalm = distance(tip, palmCenter) / Math.max(0.0001, ref);
  return dTipPalm > threshold;
}

function isFingerExtendedByDistance(
  landmarks: { x: number; y: number }[],
  pipIndex: number,
  tipIndex: number,
  palmCenter: { x: number; y: number },
  ref: number,
  minTip: number,
  delta: number
) {
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];
  if (!tip || !pip) return false;
  const norm = Math.max(0.0001, ref);
  const dTip = distance(tip, palmCenter) / norm;
  const dPip = distance(pip, palmCenter) / norm;
  return dTip > Math.max(minTip, dPip + delta);
}

function fingerTipDistance(
  landmarks: { x: number; y: number }[],
  tipIndex: number,
  palmCenter: { x: number; y: number },
  ref: number
) {
  const tip = landmarks[tipIndex];
  if (!tip) return 0;
  return distance(tip, palmCenter) / Math.max(0.0001, ref);
}

export default function GraffitiClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const handsRef = useRef<any | null>(null);
  const handLandmarkerRef = useRef<any | null>(null);
  const usingTasksRef = useRef<boolean>(false);
  const cameraRef = useRef<any | null>(null);
  const drawLandmarksRef = useRef<null | ((ctx: CanvasRenderingContext2D, landmarks: any, opts: any) => void)>(null);
  const smoothLandmarksRef = useRef<Array<Array<{ x: number; y: number; z?: number }>> | null>(null);

  const [ready, setReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState("#ff315a");
  const [brushSize, setBrushSize] = useState(6);
  
  const [gestureEnabled, setGestureEnabled] = useState(true);
  const [pinchActive, setPinchActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [fps, setFps] = useState(0);
  const [handsCount, setHandsCount] = useState(0);

  const lastPointRef = useRef<Array<{ x: number; y: number } | null>>([]);
  const lastPinchRef = useRef<Array<boolean>>([]);
  const gestureOnCountRef = useRef<number[]>([]);
  const gestureOffCountRef = useRef<number[]>([]);
  const fpsCounter = useRef({ frames: 0, last: typeof performance !== "undefined" ? performance.now() : 0 });
  const gestureEnabledRef = useRef(gestureEnabled);
  
  const showOverlayRef = useRef(showOverlay);

  useEffect(() => { gestureEnabledRef.current = gestureEnabled; }, [gestureEnabled]);
  
  useEffect(() => { showOverlayRef.current = showOverlay; }, [showOverlay]);

  const updateCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const draw = drawRef.current;
    if (!video || !overlay || !draw) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    overlay.width = width;
    overlay.height = height;
    draw.width = width;
    draw.height = height;

    const ctx = draw.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctxRef.current = ctx;
    }
  }, [brushColor, brushSize]);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = brushColor;
      ctxRef.current.lineWidth = brushSize;
    }
  }, [brushColor, brushSize]);

  const onResults = useCallback((results: MPResults) => {
    fpsCounter.current.frames += 1;
    const now = performance.now();
    if (now - fpsCounter.current.last >= 1000) {
      setFps(fpsCounter.current.frames);
      fpsCounter.current.frames = 0;
      fpsCounter.current.last = now;
    }

    const overlay = overlayRef.current;
    const octx = overlay?.getContext("2d");
    if (overlay && octx) {
      octx.clearRect(0, 0, overlay.width, overlay.height);
    }

    const drawCtx = ctxRef.current;
    const drawCanvas = drawRef.current;
    if (!drawCtx || !drawCanvas) return;

    const width = drawCanvas.width;
    const height = drawCanvas.height;

    // Normalize/mirror coordinates depending on backend
    let hands = results.multiHandLandmarks ?? [];
    if (usingTasksRef.current && hands.length > 0) {
      // Tasks API does not apply selfie mirroring; our video is mirrored in CSS.
      // Mirror X so drawings/overlays align with the mirrored video.
      hands = hands.map((h) => h.map((p) => ({ ...p, x: 1 - p.x })));
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

    // Temporal smoothing per hand
    const prevHands = smoothLandmarksRef.current;
    const alphaBase = 0.5; // 0..1, higher = more responsive, lower = smoother
    const smoothedHands = hands.map((hand, hi) => {
      const prev = prevHands?.[hi];
      const ref = getPalmWidth(hand);
      return hand.map((p, i) => {
        const prevP = prev?.[i];
        if (!prevP) return p;
        const dx = p.x - prevP.x;
        const dy = p.y - prevP.y;
        const motion = Math.hypot(dx, dy) / Math.max(0.0001, ref);
        const adaptive = clamp(alphaBase + clamp(motion * 0.5, 0, 0.3), 0.4, 0.8);
        return { x: prevP.x + adaptive * (p.x - prevP.x), y: prevP.y + adaptive * (p.y - prevP.y), z: p.z };
      });
    });
    smoothLandmarksRef.current = smoothedHands;

    // Draw landmarks for each detected hand
    if (showOverlayRef.current && octx && drawLandmarksRef.current) {
      for (const lm of smoothedHands) {
        drawLandmarksRef.current(octx, lm, { color: "#00E1FF", lineWidth: 2 });
      }
    }

    // Gesture + drawing per hand (draw when only index is extended)
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

      const indexTipDist = fingerTipDistance(lm, 8, palmCenter, ref);
      const indexExtended = indexTipDist > 0.3;
      const middleTipDist = fingerTipDistance(lm, 12, palmCenter, ref);
      const ringTipDist = fingerTipDistance(lm, 16, palmCenter, ref);
      const pinkyTipDist = fingerTipDistance(lm, 20, palmCenter, ref);
      const thumbTipDist = fingerTipDistance(lm, 4, palmCenter, ref);

      const middleExtended = isFingerExtendedByDistance(lm, 10, 12, palmCenter, ref, 0.5, 0.05);
      const ringExtended = isFingerExtendedByDistance(lm, 14, 16, palmCenter, ref, 0.48, 0.05);
      const pinkyExtended = isFingerExtendedByDistance(lm, 18, 20, palmCenter, ref, 0.46, 0.05);
      const thumbExtended = isFingerExtendedByDistance(lm, 3, 4, palmCenter, ref, 0.54, 0.05);

      const middleDown = (!middleExtended && middleTipDist < 0.36) || middleTipDist + 0.01 < indexTipDist;
      const ringDown = (!ringExtended && ringTipDist < 0.34) || ringTipDist + 0.015 < indexTipDist;
      const pinkyDown = (!pinkyExtended && pinkyTipDist < 0.32) || pinkyTipDist + 0.02 < indexTipDist;
      const thumbDown = (!thumbExtended && thumbTipDist < 0.3) || thumbTipDist + 0.02 < indexTipDist;

      const gestureActive = indexExtended && middleDown && ringDown && pinkyDown && thumbDown;

      // Debounce: require 2 consecutive active frames to turn on, 3 inactive to turn off
      const lastState = lastPinchArr[hi] ?? false;
      onCounts[hi] = onCounts[hi] ?? 0;
      offCounts[hi] = offCounts[hi] ?? 0;
      if (gestureActive) { onCounts[hi] = onCounts[hi] + 1; offCounts[hi] = 0; }
      else { offCounts[hi] = offCounts[hi] + 1; onCounts[hi] = 0; }
      let next = lastState;
      if (!lastState && onCounts[hi] >= 2) next = true;
      if (lastState && offCounts[hi] >= 3) next = false;
      nextPinchArr[hi] = next;

      // Draw using the index fingertip position
      const px = clamp(indexTip.x, 0, 1) * width;
      const py = clamp(indexTip.y, 0, 1) * height;
      const shouldDraw = gestureEnabledRef.current ? next : false;
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

  function loadScriptOnce(src: string) {
    return new Promise<void>((resolve, reject) => {
      const existing = Array.from(document.scripts).find((s) => s.src === src);
      if (existing) {
        if ((existing as any)._loaded) return resolve();
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("failed: " + src)));
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.addEventListener("load", () => {
        (s as any)._loaded = true;
        resolve();
      });
      s.addEventListener("error", () => reject(new Error("failed: " + src)));
      document.head.appendChild(s);
    });
  }

  useEffect(() => {
    let stopped = false;

    async function init() {
      try {
        const video = videoRef.current!;
        const overlay = overlayRef.current!;
        const draw = drawRef.current!;

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (video.srcObject !== stream) {
          (video as any).srcObject = stream;
        }
        await new Promise<void>((resolve) => {
          if (video.readyState >= 1) return resolve();
          const onLoaded = () => { video.removeEventListener("loadedmetadata", onLoaded); resolve(); };
          video.addEventListener("loadedmetadata", onLoaded);
        });
        if (video.paused) {
          try { await video.play(); } catch {}
        }
        updateCanvasSize();

        const base = "https://cdn.jsdelivr.net/npm/@mediapipe";
        await Promise.all([
          loadScriptOnce(`${base}/camera_utils/camera_utils.js`),
          loadScriptOnce(`${base}/drawing_utils/drawing_utils.js`),
        ]);

        const CameraCtor = (window as any).Camera;
        drawLandmarksRef.current = (window as any).drawLandmarks;

        async function tryLoadTasksVision() {
          const candidates = [
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js",
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js",
            "https://unpkg.com/@mediapipe/tasks-vision@0.10.3/vision_bundle.js",
            "https://unpkg.com/@mediapipe/tasks-vision@latest/vision_bundle.js",
          ];
          for (const url of candidates) {
            try {
              const vision = await import(/* webpackIgnore: true */ url);
              const root = url.replace(/\/vision_bundle\.js.*/, "");
              return { vision, root };
            } catch (e) {}
          }
          throw new Error("Failed to load tasks-vision ESM");
        }

        let camera: any;
        try {
          const { vision, root } = await tryLoadTasksVision();
          const { FilesetResolver, HandLandmarker } = vision as any;
          const fileset = await FilesetResolver.forVisionTasks(`${root}/wasm`);
          let handLandmarker: any;
          try {
            handLandmarker = await HandLandmarker.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              numHands: 2,
              minHandDetectionConfidence: 0.5,
              minHandPresenceConfidence: 0.5,
              minTrackingConfidence: 0.6,
            });
          } catch {
            handLandmarker = await HandLandmarker.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task",
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numHands: 2,
              minHandDetectionConfidence: 0.5,
              minHandPresenceConfidence: 0.5,
              minTrackingConfidence: 0.6,
            });
          }
          handLandmarkerRef.current = handLandmarker;
          usingTasksRef.current = true;

          camera = new CameraCtor(video, {
            onFrame: async () => {
              if (stopped) return;
              const ts = performance.now();
              const result = handLandmarker.detectForVideo(video, ts);
              const mpLike = { multiHandLandmarks: result?.landmarks ?? [] } as MPResults;
              onResults(mpLike);
            },
            width: video.videoWidth || 1280,
            height: video.videoHeight || 720,
          });
        } catch (e) {
          // Fallback to legacy MediaPipe Hands
          await loadScriptOnce(`${base}/hands/hands.js`);
          const HandsCtor = (window as any).Hands;
          const hands = new HandsCtor({ locateFile: (file: string) => `${base}/hands/${file}` });
          hands.setOptions({ maxNumHands: 2, modelComplexity: 1, selfieMode: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.6 });
          hands.onResults(onResults);
          handsRef.current = hands;
          usingTasksRef.current = false;

          camera = new CameraCtor(video, {
            onFrame: async () => { if (!stopped) await hands.send({ image: video }); },
            width: video.videoWidth || 1280,
            height: video.videoHeight || 720,
          });
        }
        camera.start();
        cameraRef.current = camera;

        setReady(true);
      } catch (err: any) {
        console.error(err);
        setStreamError(err?.message ?? "Failed to start camera stream");
      }
    }

    init();

    const handleResize = () => updateCanvasSize();
    window.addEventListener("resize", handleResize);

    return () => {
      stopped = true;
      window.removeEventListener("resize", handleResize);
      try { cameraRef.current?.stop(); } catch {}
      try { usingTasksRef.current ? handLandmarkerRef.current?.close?.() : handsRef.current?.close?.(); } catch {}
      const stream = (videoRef.current?.srcObject as MediaStream) || null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleClear = useCallback(() => {
    const draw = drawRef.current; if (!draw) return;
    const ctx = draw.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, draw.width, draw.height);
  }, []);

  

  const ui = useMemo(() => (
    <div className="absolute left-4 top-4 z-20 flex gap-3 items-center bg-black/40 backdrop-blur px-3 py-2 rounded-md text-white">
      <label className="flex items-center gap-2 text-sm">
        Gesture
        <input type="checkbox" checked={gestureEnabled} onChange={(e) => setGestureEnabled(e.target.checked)} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        Color
        <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-8 h-6 p-0 border-0 bg-transparent" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        Size
        <input type="range" min={1} max={30} value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value, 10))} />
      </label>
      <button onClick={handleClear} className="px-3 py-1 rounded bg-rose-600 font-medium">Clear</button>
      <label className="flex items-center gap-2 text-sm">
        Overlay
        <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
      </label>
      <div className="text-xs opacity-80">FPS {fps} ? Hands {handsCount} ? {usingTasksRef.current ? "Tasks" : "Hands"}</div>
      <div className={`text-xs ${pinchActive ? "text-emerald-300" : "text-slate-300"}`}>gesture {pinchActive ? "ON" : "OFF"}</div>
    </div>
  ), [brushColor, brushSize, fps, handleClear, pinchActive, showOverlay, gestureEnabled]);

  return (
    <div className="relative w-full min-h-[calc(100dvh-64px)] flex items-center justify-center bg-stone-900 text-white overflow-hidden">
      <div className="absolute bottom-4 left-4 z-20 text-stone-200 text-sm bg-black/40 backdrop-blur px-3 py-2 rounded-md">
        <div className="font-semibold">Graffiti</div>
        <div>Extend only index to draw. Allow camera.</div>
        <div>Use good lighting for accuracy.</div>
      </div>

      {ui}

      {!ready && !streamError && (
        <div className="absolute z-20 text-sm bg-black/50 px-3 py-2 rounded-md">Initializing camera…</div>
      )}
      {streamError && (
        <div className="absolute z-20 text-sm bg-rose-600/80 px-3 py-2 rounded-md">{streamError}</div>
      )}

      <div className="relative w-full max-w-[1000px] aspect-video">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain -scale-x-100" playsInline muted />
        <canvas ref={overlayRef} className={`absolute inset-0 w-full h-full ${showOverlay ? "opacity-100" : "opacity-0"} pointer-events-none `} />
        <canvas ref={drawRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
