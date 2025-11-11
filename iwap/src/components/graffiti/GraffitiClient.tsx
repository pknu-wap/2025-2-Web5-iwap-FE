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
  const cameraRef = useRef<any | null>(null);
  const drawLandmarksRef = useRef<null | ((ctx: CanvasRenderingContext2D, landmarks: any, opts: any) => void)>(null);

  const [ready, setReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState("#ff315a");
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gestureEnabled, setGestureEnabled] = useState(true);
  const [pinchActive, setPinchActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [fps, setFps] = useState(0);

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchRef = useRef(false);
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

    if (showOverlayRef.current && results.multiHandLandmarks && octx && drawLandmarksRef.current) {
      for (const landmarks of results.multiHandLandmarks) {
        drawLandmarksRef.current(octx, landmarks, { color: "#00E1FF", lineWidth: 2 });
      }
    }

    const hand = results.multiHandLandmarks?.[0];
    if (!hand) {
      setPinchActive(false);
      lastPointRef.current = null;
      return;
    }

    const thumb = hand[4];
    const index = hand[8];
    const ref = getPalmWidth(hand);
    const d = distance(thumb, index);
    const dn = d / ref;
    const onThresh = 0.5;
    const offThresh = 0.6;

    const currentlyPinching = dn < onThresh;
    const pinchOn = currentlyPinching || (lastPinchRef.current && dn < onThresh * 1.05);
    const pinchOff = !currentlyPinching && dn > offThresh;

    let nextPinch = lastPinchRef.current;
    if (!lastPinchRef.current && pinchOn) nextPinch = true;
    if (lastPinchRef.current && pinchOff) nextPinch = false;
    lastPinchRef.current = nextPinch;
    setPinchActive(nextPinch);

    const shouldDraw = (gestureEnabledRef.current ? nextPinch : false) || isDrawingRef.current;

    const px = clamp(index.x, 0, 1) * width;
    const py = clamp(index.y, 0, 1) * height;

    if (shouldDraw) {
      const last = lastPointRef.current;
      if (last) {
        drawCtx.beginPath();
        drawCtx.moveTo(last.x, last.y);
        drawCtx.lineTo(px, py);
        drawCtx.stroke();
      }
      lastPointRef.current = { x: px, y: py };
    } else {
      lastPointRef.current = { x: px, y: py };
    }
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
          loadScriptOnce(`${base}/hands/hands.js`),
          loadScriptOnce(`${base}/camera_utils/camera_utils.js`),
          loadScriptOnce(`${base}/drawing_utils/drawing_utils.js`),
        ]);

        const HandsCtor = (window as any).Hands;
        const CameraCtor = (window as any).Camera;
        drawLandmarksRef.current = (window as any).drawLandmarks;

        const hands = new HandsCtor({ locateFile: (file: string) => `${base}/hands/${file}` });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, selfieMode: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
        hands.onResults(onResults);
        handsRef.current = hands;

        const camera = new CameraCtor(video, {
          onFrame: async () => { if (!stopped) await hands.send({ image: video }); },
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
        });
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
      try { handsRef.current?.close(); } catch {}
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
      <div className="text-xs opacity-80">FPS {fps}</div>
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
