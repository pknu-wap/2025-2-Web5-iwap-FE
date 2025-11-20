"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import opentype from "opentype.js";
import GraffitiToolbar from "@/components/graffiti/GraffitiToolbar";
import FullScreenView from "@/components/ui/FullScreenView";
import { initFourierSketch, type FourierSketchController } from "./fourier-sketch";

type SketchStyles = {
  backgroundColor: string;
  epicycleColor: string;
  epicycleAlpha: number;
  pathColor: string;
  pathAlpha: number;
  pathWidth: number;
};

const DEFAULT_STYLES: SketchStyles = {
  backgroundColor: "#000000",
  epicycleColor: "#50a0ff",
  epicycleAlpha: 120,
  pathColor: "#ffb6dc",
  pathAlpha: 255,
  pathWidth: 6,
};

const COLOR_PALETTE = ["#ffffff", "#f43f5e", "#fb7185", "#facc15", "#22c55e", "#38bdf8", "#6366f1", "#a855f7", "#111827"];
const BACKGROUND_COLORS = ["#FFFFFF", "#FFFEF0", "#FEF2F2", "#DBEAFE", "#0F172A", "#000000"];
const FONT_URL = "/fonts/static/Pretendard-Regular.otf";

type TextPoint = { x: number; y: number };
type TextContour = TextPoint[];

async function textToContours(
  text: string,
  {
    boxWidth = 400,
    boxHeight = 450,
    samplesPerCurve = 24,
  }: { boxWidth?: number; boxHeight?: number; samplesPerCurve?: number } = {},
): Promise<TextContour[]> {
  const font = await opentype.load(FONT_URL);
  const fontSize = Math.min(boxWidth, boxHeight) * 0.55;
  const path = font.getPath(text, 0, 0, fontSize);
  const box = path.getBoundingBox();
  const width = box.x2 - box.x1 || 1;
  const height = box.y2 - box.y1 || 1;
  const scale = Math.min((boxWidth * 0.8) / width, (boxHeight * 0.8) / height);
  const offsetX = -box.x1 - width / 2;
  const offsetY = -box.y1 - height / 2;

  const contours: TextContour[] = [];
  let currentContour: TextContour | null = null;
  let current: TextPoint | null = null;

  const addPoint = (x: number, y: number) => {
    currentContour?.push({
      x: (x + offsetX) * scale,
      y: (y + offsetY) * scale,
    });
  };

  const sampleCubic = (p0: TextPoint, p1: TextPoint, p2: TextPoint, p3: TextPoint) => {
    for (let i = 1; i <= samplesPerCurve; i += 1) {
      const t = i / samplesPerCurve;
      const mt = 1 - t;
      const x = mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x;
      const y = mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y;
      addPoint(x, y);
    }
  };

  const sampleQuadratic = (p0: TextPoint, p1: TextPoint, p2: TextPoint) => {
    for (let i = 1; i <= samplesPerCurve; i += 1) {
      const t = i / samplesPerCurve;
      const mt = 1 - t;
      const x = mt ** 2 * p0.x + 2 * mt * t * p1.x + t ** 2 * p2.x;
      const y = mt ** 2 * p0.y + 2 * mt * t * p1.y + t ** 2 * p2.y;
      addPoint(x, y);
    }
  };

  for (const cmd of path.commands) {
    if (cmd.type === "M") {
      currentContour = [];
      contours.push(currentContour);
      current = { x: cmd.x, y: cmd.y };
      addPoint(cmd.x, cmd.y);
    } else if (cmd.type === "L" && current && currentContour) {
      addPoint(cmd.x, cmd.y);
      current = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === "C" && current && currentContour) {
      sampleCubic(
        current,
        { x: cmd.x1, y: cmd.y1 },
        { x: cmd.x2, y: cmd.y2 },
        { x: cmd.x, y: cmd.y },
      );
      current = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === "Q" && current && currentContour) {
      sampleQuadratic(current, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x, y: cmd.y });
      current = { x: cmd.x, y: cmd.y };
    } else if (cmd.type === "Z") {
      current = null;
      currentContour = null;
    }
  }

  return contours.filter((c) => c.length);
}

export default function ThisIsForUPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const colorPickerRef = useRef<HTMLInputElement | null>(null);
  const [controller, setController] = useState<FourierSketchController | null>(null);
  const [styles, setStyles] = useState<SketchStyles>(DEFAULT_STYLES);
  const [activeSketchCount, setActiveSketchCount] = useState(0);
  const [isSketchReady, setIsSketchReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBackside, setIsBackside] = useState(false);
  const [backMessage, setBackMessage] = useState("");
  const [textCanvasMessage, setTextCanvasMessage] = useState("");
  const [isTextProcessing, setIsTextProcessing] = useState(false);

  const [brushColor, setBrushColor] = useState(DEFAULT_STYLES.pathColor);
  const [brushSize, setBrushSize] = useState(DEFAULT_STYLES.pathWidth);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [pendingCustomColor, setPendingCustomColor] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    setIsSketchReady(false);
    const sketchController = initFourierSketch(containerRef.current);
    setController(sketchController);
    setIsSketchReady(true);

    return () => {
      sketchController.cleanup();
      setController(null);
      setIsSketchReady(false);
      setActiveSketchCount(0);
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!controller) return;
    controller.updateStyles(styles);
  }, [controller, styles]);

  const refreshActiveCount = useCallback(() => {
    if (!controller) {
      setActiveSketchCount(0);
      return;
    }
    setActiveSketchCount(controller.getFourierCoefficients().length);
  }, [controller]);

  const handleConfirmSketches = useCallback(() => {
    controller?.confirmSketches();
    refreshActiveCount();
    setIsPlaying(false);
  }, [controller, refreshActiveCount]);

  const handleStart = useCallback(() => {
    if (!controller) return;
    controller.startPlayback();
    const count = controller.getFourierCoefficients().length;
    refreshActiveCount();
    setIsPlaying(count > 0);
  }, [controller, refreshActiveCount]);

  const handleStop = useCallback(() => {
    controller?.stopPlayback();
    setIsPlaying(false);
  }, [controller]);

  const handleClearSketches = useCallback(() => {
    controller?.clearSketches();
    setActiveSketchCount(0);
    setIsPlaying(false);
  }, [controller]);

  const handleDownloadJson = useCallback(() => {
    if (!controller) return;
    const data = controller.getFourierCoefficients();
    if (!data.length) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      sketches: data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fourier-sketches.json";
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }, [controller]);

  const handleBrushColorChange = useCallback((color: string) => {
    setBrushColor(color);
    setStyles((prev) => ({
      ...prev,
      pathColor: color,
      epicycleColor: color,
    }));
  }, []);

  const handleSizeChange = useCallback((size: number) => {
    setBrushSize(size);
    setStyles((prev) => ({
      ...prev,
      pathWidth: size,
    }));
  }, []);

  const handleCustomColorPick = useCallback((color: string) => {
    setPendingCustomColor(color);
  }, []);

  const handleConfirmCustomColor = useCallback(() => {
    if (!pendingCustomColor) return;
    const normalized = pendingCustomColor.toLowerCase();
    setCustomColors((prev) => {
      if (prev.some((c) => c.toLowerCase() === normalized)) return prev;
      return [...prev, pendingCustomColor];
    });
    setBrushColor(pendingCustomColor);
    setStyles((prev) => ({ ...prev, pathColor: pendingCustomColor, epicycleColor: pendingCustomColor }));
    setPendingCustomColor(null);
  }, [pendingCustomColor]);

  const handleRemoveCustomColor = useCallback(
    (color: string) => {
      setCustomColors((prev) => prev.filter((c) => c.toLowerCase() !== color.toLowerCase()));
      if (brushColor.toLowerCase() === color.toLowerCase()) {
        handleBrushColorChange(DEFAULT_STYLES.pathColor);
      }
    },
    [brushColor, handleBrushColorChange],
  );

  const readyAction = Boolean(controller && isSketchReady);

  useEffect(() => {
    if (isBackside) {
      handleStop();
    }
  }, [isBackside, handleStop]);

  const handleBackgroundChange = useCallback((color: string) => {
    // 잠시 색상 변경을 막습니다. (버튼은 비활성화)
    setStyles((prev) => ({
      ...prev,
      backgroundColor: prev.backgroundColor,
    }));
  }, []);

  const handleTextToFourier = useCallback(async () => {
    if (!controller) return;
    const text = textCanvasMessage.trim();
    if (!text) return;
    setIsTextProcessing(true);
    try {
      const contours = await textToContours(text, { boxWidth: 400, boxHeight: 450 });
      contours.forEach((points) => {
        controller.addCustomSketch(points, {
          pathColor: styles.pathColor,
          pathAlpha: styles.pathAlpha,
          pathWidth: styles.pathWidth,
        });
      });
      controller.confirmSketches();
      refreshActiveCount();
      setIsPlaying(false);
      setIsBackside(false);
    } catch (error) {
      console.error("Text to Fourier failed", error);
    } finally {
      setIsTextProcessing(false);
    }
  }, [controller, textCanvasMessage, styles.pathColor, styles.pathAlpha, styles.pathWidth, refreshActiveCount]);

  const toolbarProps = useMemo(
    () => ({
      colorPalette: COLOR_PALETTE,
      brushColor,
      brushSize,
      customPatterns: customColors,
      pendingCustomColor,
      colorPickerRef,
      onBrushColorChange: handleBrushColorChange,
      onSizeChange: handleSizeChange,
      onCustomColorPick: handleCustomColorPick,
      onConfirmCustomColor: handleConfirmCustomColor,
      onRemoveCustomColor: handleRemoveCustomColor,
      onUndo: handleClearSketches,
      onRedo: handleConfirmSketches,
      onClear: handleClearSketches,
      onSave: handleDownloadJson,
    }),
    [
      brushColor,
      brushSize,
      customColors,
      pendingCustomColor,
      handleBrushColorChange,
      handleClearSketches,
      handleConfirmCustomColor,
      handleConfirmSketches,
      handleCustomColorPick,
      handleDownloadJson,
      handleRemoveCustomColor,
      handleSizeChange,
    ],
  );

  return (
    <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)] overflow-hidden">
      <FullScreenView
        title="Th!s !s for u"
        subtitle="함수로 하트 그리기"
        goBack={true}
        backgroundUrl="/images/this-is-for-u_background.jpg"
        titleClassName="translate-y-[60px] translate-x-[9px] md:translate-x-0 md:translate-y-0 font-semibold"
        subtitleClassName="translate-y-[60px] translate-x-[10px] md:translate-x-0 md:translate-y-0 font-semilight"
        closeButtonClassName="translate-y-[60px] md:translate-y-0"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/95 to-black"></div>

        <div className="relative z-20 flex flex-col items-center gap-6 md:mt-16 w-[90vw] max-w-[1200px] px-2">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur overflow-hidden" style={{ width: isBackside ? "400px" : "800px", height: isBackside ? "450px" : "500px" }}>
              <div
                ref={containerRef}
                className={isBackside ? "hidden" : "absolute inset-0"}
                style={{ backgroundColor: styles.backgroundColor }}
              />
              {!isBackside && !readyAction && (
                <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.4em] text-white/60">
                  초기화 중...
                </div>
              )}
              {isBackside && (
                <div className="absolute inset-0 bg-white/95 text-slate-800 p-4">
                  <div className="flex items-center justify-between mb-2 text-sm text-slate-600">
                    <span className="font-semibold">입력 캔버스 (글자)</span>
                    <span className="text-[12px] text-slate-500">키보드 입력</span>
                  </div>
                  <textarea
                    value={textCanvasMessage}
                    onChange={(e) => setTextCanvasMessage(e.target.value)}
                    className="w-full h-full bg-transparent resize-none outline-none text-base placeholder:text-slate-400"
                    placeholder="키보드로 글자를 입력하세요"
                  />
                </div>
              )}
            </div>
            <div className="hidden md:flex flex-col gap-[5px] translate-y-[160px]">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleBackgroundChange(color)}
                  disabled
                  className="w-[56px] h-[26px] border border-white transition opacity-40 cursor-not-allowed"
                  style={{ backgroundColor: color }}
                  aria-label={`Set background to ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-200">
            <button
              type="button"
              onClick={() => setIsBackside((prev) => !prev)}
              className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/60"
            >
              {isBackside ? "앞면으로" : "뒷면으로"}
            </button>
            {isBackside && (
              <button
                type="button"
                onClick={handleTextToFourier}
                disabled={!textCanvasMessage.trim() || isTextProcessing}
                className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isTextProcessing ? "변환 중..." : "글자 Fourier 변환"}
              </button>
            )}
            <button
              type="button"
              onClick={handleStart}
              disabled={!readyAction || isBackside}
              className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-rose-500/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={!readyAction || !isPlaying || isBackside}
              className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={handleClearSketches}
              disabled={!readyAction}
              className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              클리어
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              disabled={!readyAction || activeSketchCount === 0}
              className="rounded-full border border-rose-400/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              JSON 다운로드
            </button>
          </div>

          <GraffitiToolbar {...toolbarProps} />
        </div>
      </FullScreenView>
    </div>
  );
}
