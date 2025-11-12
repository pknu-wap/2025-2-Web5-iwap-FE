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
  const [isDrawing, setIsDrawing] = useState(false);
  const [gestureEnabled, setGestureEnabled] = useState(true);
  const [pinchActive, setPinchActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [fps, setFps] = useState(0);
  const [handsCount, setHandsCount] = useState(0);

  const lastPointRef = useRef<Array<{ x: number; y: number } | null>>([]);
  const lastPinchRef = useRef<Array<boolean>>([]);
  const fpsCounter = useRef({ frames: 0, last: typeof performance !== "undefined" ? performance.now() : 0 });
  const gestureEnabledRef = useRef(gestureEnabled);
  const isDrawingRef = useRef(isDrawing);
  const showOverlayRef = useRef(showOverlay);

  useEffect(() => { gestureEnabledRef.current = gestureEnabled; }, [gestureEnabled]);
  useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);
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

    // Pinch + drawing per hand
    const onThresh = 0.5;
    const offThresh = 0.6;
    const nextPinchArr: boolean[] = [];
    const lastPinchArr = lastPinchRef.current;
    const lastPoints = lastPointRef.current;

    smoothedHands.forEach((lm, hi) => {
      const thumb = lm[4];
      const index = lm[8];
      const ref = getPalmWidth(lm);
      const d = distance(thumb, index);
      const dn = d / ref;
      const currentlyPinching = dn < onThresh;
      const lastPin = lastPinchArr[hi] ?? false;
      const pinchOn = currentlyPinching || (lastPin && dn < onThresh * 1.05);
      const pinchOff = !currentlyPinching && dn > offThresh;
      let next = lastPin;
      if (!lastPin && pinchOn) next = true;
      if (lastPin && pinchOff) next = false;
      nextPinchArr[hi] = next;

      const px = clamp(index.x, 0, 1) * width;
      const py = clamp(index.y, 0, 1) * height;
      const shouldDraw = (gestureEnabledRef.current ? next : false) || isDrawingRef.current;
      const last = lastPoints[hi] ?? null;
      if (shouldDraw && last) {
        drawCtx.beginPath();
        drawCtx.moveTo(last.x, last.y);
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

  const toggleDrawing = useCallback(() => setIsDrawing((v) => !v), []);

  const ui = useMemo(() => (
    <div className="absolute left-4 top-4 z-20 flex gap-3 items-center bg-black/40 backdrop-blur px-3 py-2 rounded-md text-white">
      <button onClick={toggleDrawing} className={`px-3 py-1 rounded font-medium ${isDrawing ? "bg-emerald-500" : "bg-slate-600"}`} title="Toggle drawing manually">
        {isDrawing ? "Drawing" : "Idle"}
      </button>
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
      <div className="text-xs opacity-80">FPS {fps} • Hands {handsCount} • {usingTasksRef.current ? "Tasks" : "Hands"}</div>
      <div className={`text-xs ${pinchActive ? "text-emerald-300" : "text-slate-300"}`}>pinch {pinchActive ? "ON" : "OFF"}</div>
    </div>
  ), [brushColor, brushSize, fps, handleClear, isDrawing, pinchActive, showOverlay, toggleDrawing, gestureEnabled]);

  return (
    <div className="relative w-full min-h-[calc(100dvh-64px)] flex items-center justify-center bg-stone-900 text-white overflow-hidden">
      <div className="absolute bottom-4 left-4 z-20 text-stone-200 text-sm bg-black/40 backdrop-blur px-3 py-2 rounded-md">
        <div className="font-semibold">Graffiti</div>
        <div>Pinch thumb+index to draw. Allow camera.</div>
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
