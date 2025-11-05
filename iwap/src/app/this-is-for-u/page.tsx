
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";

type Tool = "brush" | "eraser";

type PostcardTemplate = {
  id: string;
  name: string;
  description: string;
  frontColor: string;
  backColor: string;
  textColor: string;
  lineColor: string;
  accentColor: string;
  stampColor: string;
};

const POSTCARD_RATIO = 3 / 2;
const MAX_CANVAS_WIDTH = 860;
const MESSAGE_LIMIT = 320;
const SIGNATURE_LIMIT = 48;

const POSTCARD_TEMPLATES: PostcardTemplate[] = [
  {
    id: "sunset",
    name: "Sunset Glow",
    description: "따뜻한 분홍빛 노을과 부드러운 그라데이션 포근함",
    frontColor: "#fde7db",
    backColor: "#fff9f5",
    textColor: "#4f2a22",
    lineColor: "#f3b39a",
    accentColor: "#f28f86",
    stampColor: "#f28f86",
  },
  {
    id: "forest",
    name: "Forest Whisper",
    description: "잎새 사이로 스며든 평온한 초록빛",
    frontColor: "#e4f1ec",
    backColor: "#f5fbf6",
    textColor: "#1e4633",
    lineColor: "#8bc29f",
    accentColor: "#4c9a7a",
    stampColor: "#8bc29f",
  },
  {
    id: "midnight",
    name: "Midnight Letter",
    description: "깊은 남청색 하늘 위에 떠 있는 작은 빛",
    frontColor: "#1b2a4b",
    backColor: "#f8f6ff",
    textColor: "#1f1b2e",
    lineColor: "#c6b5ff",
    accentColor: "#6c63ff",
    stampColor: "#c6b5ff",
  },
];

const BRUSH_COLORS = [
  "#4f2a22",
  "#c75c5c",
  "#f4a261",
  "#ffe5a4",
  "#64b6ac",
  "#5a91bf",
  "#8e7cc3",
  "#ffffff",
  "#0f172a",
];

const FONT_OPTIONS = [
  {
    id: "serif",
    label: "Serif",
    css: "\"Playfair Display\", Georgia, serif",
  },
  {
    id: "sans",
    label: "Clean Sans",
    css: "\"SUIT\", \"Noto Sans KR\", sans-serif",
  },
  {
    id: "script",
    label: "Script",
    css: "\"Dancing Script\", \"Nanum Pen Script\", cursive",
  },
];

export default function ThisIsForUPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    POSTCARD_TEMPLATES[0].id,
  );
  const template = useMemo(
    () =>
      POSTCARD_TEMPLATES.find((item) => item.id === selectedTemplateId) ??
      POSTCARD_TEMPLATES[0],
    [selectedTemplateId],
  );

  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(6);
  const [brushColor, setBrushColor] = useState(template.accentColor);
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].id);
  const [backAlignment, setBackAlignment] =
    useState<"left" | "center" | "right">("left");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);

  const dprRef = useRef(1);
  const isDrawingRef = useRef(false);
  const previousPointRef = useRef<{ x: number; y: number } | null>(null);
  const statusTimeoutRef = useRef<number | null>(null);
  const lastTemplateIdRef = useRef<string | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 720, height: 480 });

  useEffect(() => {
    setBrushColor(template.accentColor);
  }, [template.accentColor]);

  const updateCanvasDimensions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (!rect.width) return;

    const targetWidth = Math.min(rect.width, MAX_CANVAS_WIDTH);
    const targetHeight = targetWidth / POSTCARD_RATIO;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;

    setCanvasSize((prev) => {
      if (
        Math.abs(prev.width - targetWidth) < 0.5 &&
        Math.abs(prev.height - targetHeight) < 0.5
      ) {
        return prev;
      }
      return { width: targetWidth, height: targetHeight };
    });
  }, []);

  useEffect(() => {
    updateCanvasDimensions();
    const observer = new ResizeObserver(() => updateCanvasDimensions());
    const node = containerRef.current;
    if (node) observer.observe(node);

    window.addEventListener("orientationchange", updateCanvasDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", updateCanvasDimensions);
    };
  }, [updateCanvasDimensions]);

  useEffect(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;

    const dpr = dprRef.current;
    const snapshot = canvas.toDataURL();
    const widthPx = Math.floor(canvasSize.width * dpr);
    const heightPx = Math.floor(canvasSize.height * dpr);

    if (canvas.width === widthPx && canvas.height === heightPx) {
      return;
    }

    canvas.width = widthPx;
    canvas.height = heightPx;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (snapshot && snapshot !== "data:,") {
      const image = new Image();
      image.src = snapshot;
      image.onload = () => ctx.drawImage(image, 0, 0, widthPx, heightPx);
      image.onerror = () => {
        ctx.fillStyle = template.frontColor;
        ctx.fillRect(0, 0, widthPx, heightPx);
      };
    } else {
      ctx.fillStyle = template.frontColor;
      ctx.fillRect(0, 0, widthPx, heightPx);
    }
  }, [canvasSize.height, canvasSize.width, template.frontColor]);

  const resetFrontCanvas = useCallback(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = template.frontColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    previousPointRef.current = null;
  }, [template.frontColor]);

  useEffect(() => {
    if (lastTemplateIdRef.current !== template.id) {
      resetFrontCanvas();
      lastTemplateIdRef.current = template.id;
    }
  }, [resetFrontCanvas, template.id]);

  useEffect(() => {
    isDrawingRef.current = false;
    previousPointRef.current = null;
  }, [activeSide]);

  const drawStroke = useCallback(
    (point: { x: number; y: number }, isInitial = false) => {
      const canvas = frontCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const previousPoint = previousPointRef.current;
      const lineWidth = brushSize * dprRef.current;

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = lineWidth;

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.fillStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = brushColor;
        ctx.fillStyle = brushColor;
      }

      if (isInitial || !previousPoint) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(previousPoint.x, previousPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      ctx.restore();

      previousPointRef.current = point;
    },
    [brushColor, brushSize, tool],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (activeSide !== "front") return;
      const canvas = frontCanvasRef.current;
      if (!canvas) return;

      canvas.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;

      const rect = canvas.getBoundingClientRect();
      const dpr = dprRef.current;
      const point = {
        x: (event.clientX - rect.left) * dpr,
        y: (event.clientY - rect.top) * dpr,
      };

      drawStroke(point, true);
    },
    [activeSide, drawStroke],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || activeSide !== "front") return;
      const canvas = frontCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = dprRef.current;
      const point = {
        x: (event.clientX - rect.left) * dpr,
        y: (event.clientY - rect.top) * dpr,
      };

      drawStroke(point);
    },
    [activeSide, drawStroke],
  );

  const stopDrawing = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = frontCanvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    isDrawingRef.current = false;
    previousPointRef.current = null;
  }, []);

  const renderBackSide = useCallback(() => {
    const canvas = backCanvasRef.current;
    if (!canvas) return;

    const dpr = dprRef.current;
    const widthPx = Math.floor(canvasSize.width * dpr);
    const heightPx = Math.floor(canvasSize.height * dpr);

    if (canvas.width !== widthPx || canvas.height !== heightPx) {
      canvas.width = widthPx;
      canvas.height = heightPx;
    }

    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, widthPx, heightPx);

    ctx.fillStyle = template.backColor;
    ctx.fillRect(0, 0, widthPx, heightPx);

    const margin = 48 * dpr;
    const dividerX = widthPx / 2;

    ctx.strokeStyle = template.lineColor;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(dividerX, margin * 0.7);
    ctx.lineTo(dividerX, heightPx - margin * 0.7);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.18;
    const stampSize = 96 * dpr;
    ctx.fillStyle = template.stampColor;
    ctx.fillRect(widthPx - margin - stampSize, margin, stampSize, stampSize);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.2 * dpr;
    let guideY = margin * 2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(dividerX + margin * 0.5, guideY);
      ctx.lineTo(widthPx - margin, guideY);
      ctx.stroke();
      guideY += 30 * dpr;
    }
    ctx.restore();

    const fontOption =
      FONT_OPTIONS.find((option) => option.id === fontFamily) ??
      FONT_OPTIONS[0];
    const fontSize = 24 * dpr;
    const lineHeight = fontSize * 1.4;
    const writingWidth = dividerX - margin * 1.4;

    if (!message.trim()) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.font = `${18 * dpr}px ${fontOption.css}`;
      ctx.fillStyle = template.textColor;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText("여기에 메시지를 적어볼까요?", margin, margin);
      ctx.restore();
    } else {
      ctx.font = `${fontSize}px ${fontOption.css}`;
      ctx.fillStyle = template.textColor;
      ctx.textBaseline = "top";

      if (backAlignment === "center") {
        ctx.textAlign = "center";
      } else if (backAlignment === "right") {
        ctx.textAlign = "right";
      } else {
        ctx.textAlign = "left";
      }

      let textX = margin;
      if (backAlignment === "center") {
        textX = margin + writingWidth / 2;
      } else if (backAlignment === "right") {
        textX = margin + writingWidth;
      }

      const lines = buildWrappedLines(ctx, message, writingWidth);
      let textY = margin;

      lines.forEach((line) => {
        ctx.fillText(line, textX, textY);
        textY += lineHeight;
      });

      if (signature.trim()) {
        ctx.textAlign = "right";
        ctx.font = `${Math.max(fontSize * 0.85, 16 * dpr)}px ${fontOption.css}`;
        ctx.fillText(
          `- ${signature.trim()}`,
          margin + writingWidth,
          heightPx - margin,
        );
      }
    }
  }, [
    backAlignment,
    canvasSize.height,
    canvasSize.width,
    fontFamily,
    message,
    signature,
    template.backColor,
    template.lineColor,
    template.stampColor,
    template.textColor,
  ]);

  useEffect(() => {
    renderBackSide();
  }, [renderBackSide]);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = null;
      }
    };
  }, []);

  const showStatus = useCallback((text: string) => {
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }
    setStatusMessage(text);
    statusTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      statusTimeoutRef.current = null;
    }, 4000);
  }, []);

  const downloadSide = useCallback(
    (side: "front" | "back") => {
      const canvas =
        side === "front" ? frontCanvasRef.current : backCanvasRef.current;
      if (!canvas) return;

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `this-is-for-u-${side}.png`;
      link.click();
      showStatus(
        side === "front"
          ? "앞면을 PNG로 저장했어요."
          : "뒷면을 PNG로 저장했어요.",
      );
    },
    [showStatus],
  );

  const downloadPdf = useCallback(async () => {
    const frontCanvas = frontCanvasRef.current;
    const backCanvas = backCanvasRef.current;
    if (!frontCanvas || !backCanvas) return;

    try {
      const { jsPDF } = await import("jspdf");
      const frontOrientation =
        frontCanvas.width >= frontCanvas.height ? "landscape" : "portrait";
      const backOrientation =
        backCanvas.width >= backCanvas.height ? "landscape" : "portrait";

      const pdf = new jsPDF({
        orientation: frontOrientation,
        unit: "px",
        format: [frontCanvas.width, frontCanvas.height],
      });

      pdf.addImage(
        frontCanvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        frontCanvas.width,
        frontCanvas.height,
      );

      pdf.addPage([backCanvas.width, backCanvas.height], backOrientation);
      pdf.addImage(
        backCanvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        backCanvas.width,
        backCanvas.height,
      );

      pdf.save("this-is-for-u-postcard.pdf");
      showStatus("앞·뒷면을 PDF로 저장했어요.");
    } catch (error) {
      console.error("Failed to create PDF", error);
      showStatus("PDF 생성에 실패했어요. jspdf 설치 여부를 확인해주세요.");
    }
  }, [showStatus]);

  const handleStart = useCallback(() => {
    builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-dvh overflow-y-auto bg-gradient-to-br from-[#fdf2ec] via-white to-[#f4f9ff] text-slate-900">
      <section className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-20 md:flex-row md:items-center md:gap-16 md:pb-24 md:pt-28">
        <div className="flex-1 space-y-6">
          <p className="text-sm uppercase tracking-[0.45em] text-rose-400">
            This is for u
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            감정을 담는 인터랙티브 엽서 스튜디오
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            따뜻한 색감의 캔버스에 직접 그림을 그리고, 뒷면에는 전하고 싶은
            마음을 적어보세요. 한 장의 엽서가 감정을 전하는 가장 사적인 수단이
            되도록, 앞면과 뒷면 모두 당신의 손길로 완성됩니다.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              type="button"
              onClick={handleStart}
              className="rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-amber-300 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-rose-200 transition hover:shadow-xl hover:shadow-rose-200/70"
            >
              Create my postcard
            </button>
            {/* <Link
              href="/projects"
              className="rounded-full border border-rose-200 px-6 py-3 text-sm font-medium text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
            >
              Back to home
            </Link> */}
          </div>
        </div>
        <div className="relative flex-1 rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-2xl shadow-rose-100/80 backdrop-blur-md">
          <div className="text-sm font-medium text-rose-500">서비스 키워드</div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>• 직접 그릴 수 있는 앞면 캔버스</li>
            <li>• 감성적인 뒷면 메시지 레이아웃</li>
            <li>• PNG &amp; PDF 다운로드 지원</li>
            <li>• 추후 이메일 전송 확장 계획</li>
          </ul>
        </div>
      </section>

      <section
        ref={builderRef}
        className="mx-auto max-w-6xl px-6 pb-12 md:pb-16 lg:pb-24"
      >
        <div className="rounded-[36px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveSide("front")}
                    className={`rounded-full px-4 py-2 transition ${
                      activeSide === "front"
                        ? "bg-white shadow border border-slate-200 text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    앞면 · Canvas
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSide("back")}
                    className={`rounded-full px-4 py-2 transition ${
                      activeSide === "back"
                        ? "bg-white shadow border border-slate-200 text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    뒷면 · Text
                  </button>
                </div>
                <div className="text-xs text-slate-500">
                  PNG 저장 또는 PDF 병합 다운로드 가능
                </div>
              </div>

              <div
                ref={containerRef}
                className="relative aspect-[3/2] w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-white via-white to-slate-50 shadow-xl"
              >
                <canvas
                  ref={frontCanvasRef}
                  className={`absolute inset-0 h-full w-full rounded-[28px] transition-opacity duration-300 ${
                    activeSide === "front"
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
                <canvas
                  ref={backCanvasRef}
                  className={`absolute inset-0 h-full w-full rounded-[28px] transition-opacity duration-300 ${
                    activeSide === "back"
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-8">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Postcard Template
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {POSTCARD_TEMPLATES.map((item) => {
                    const isActive = item.id === template.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(item.id)}
                        className={`min-w-[180px] rounded-2xl border p-4 text-left transition ${
                          isActive
                            ? "border-rose-300 bg-rose-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-rose-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-10 w-10 rounded-full border border-white shadow-inner"
                            style={{ background: item.frontColor }}
                          />
                          <div>
                            <div className="text-sm font-semibold text-slate-700">
                              {item.name}
                            </div>
                            <p className="text-xs text-slate-500">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <header className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">
                    앞면 캔버스
                  </h3>
                  <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setTool("brush")}
                      className={`rounded-full px-3 py-1.5 transition ${
                        tool === "brush"
                          ? "bg-white text-slate-800 shadow"
                          : "text-slate-500"
                      }`}
                    >
                      브러시
                    </button>
                    <button
                      type="button"
                      onClick={() => setTool("eraser")}
                      className={`rounded-full px-3 py-1.5 transition ${
                        tool === "eraser"
                          ? "bg-white text-slate-800 shadow"
                          : "text-slate-500"
                      }`}
                    >
                      지우개
                    </button>
                  </div>
                </header>
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>브러시 크기</span>
                      <span>{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={28}
                      step={1}
                      value={brushSize}
                      onChange={(event) =>
                        setBrushSize(parseInt(event.target.value, 10))
                      }
                      className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-rose-100 accent-rose-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-500">
                      색상 팔레트
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {BRUSH_COLORS.map((color) => {
                        const isActive = color === brushColor;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setBrushColor(color)}
                            className={`h-9 w-9 rounded-full border transition ${
                              isActive
                                ? "border-slate-900 ring-2 ring-offset-2 ring-slate-900/70"
                                : "border-slate-200 hover:border-slate-400"
                            }`}
                            style={{ background: color }}
                          >
                            <span className="sr-only">{color}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={resetFrontCanvas}
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs font-medium text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      캔버스 초기화
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSide("front")}
                      className="rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-rose-500/90"
                    >
                      앞면 PNG 저장
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <header className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">
                    뒷면 메시지
                  </h3>
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setBackAlignment("left")}
                      className={`rounded-full px-3 py-1.5 transition ${
                        backAlignment === "left"
                          ? "bg-white text-slate-800 shadow"
                          : "text-slate-500"
                      }`}
                    >
                      왼쪽
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackAlignment("center")}
                      className={`rounded-full px-3 py-1.5 transition ${
                        backAlignment === "center"
                          ? "bg-white text-slate-800 shadow"
                          : "text-slate-500"
                      }`}
                    >
                      중앙
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackAlignment("right")}
                      className={`rounded-full px-3 py-1.5 transition ${
                        backAlignment === "right"
                          ? "bg-white text-slate-800 shadow"
                          : "text-slate-500"
                      }`}
                    >
                      오른쪽
                    </button>
                  </div>
                </header>
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="flex items-center justify-between text-xs font-medium text-slate-500"
                    >
                      <span>메시지 작성</span>
                      <span>
                        {message.length}/{MESSAGE_LIMIT}
                      </span>
                    </label>
                    <textarea
                      id="message"
                      maxLength={MESSAGE_LIMIT}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="엽서에 담고 싶은 이야기를 적어보세요."
                      className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-inner outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="signature"
                      className="flex items-center justify-between text-xs font-medium text-slate-500"
                    >
                      <span>서명 / 닉네임</span>
                      <span>
                        {signature.length}/{SIGNATURE_LIMIT}
                      </span>
                    </label>
                    <input
                      id="signature"
                      maxLength={SIGNATURE_LIMIT}
                      value={signature}
                      onChange={(event) => setSignature(event.target.value)}
                      placeholder="from. 누구에게서"
                      className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-xs font-medium text-slate-500">
                      글꼴 스타일
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {FONT_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setFontFamily(option.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition ${
                            fontFamily === option.id
                              ? "border-rose-300 bg-rose-100/70 text-rose-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-rose-200"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => downloadSide("back")}
                      className="rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-rose-500/90"
                    >
                      뒷면 PNG 저장
                    </button>
                    <button
                      type="button"
                      onClick={downloadPdf}
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs font-medium text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      앞 · 뒷면 PDF 병합 다운로드
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {statusMessage && (
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100/80 px-4 py-2 text-xs font-medium text-rose-600 shadow-sm">
                {statusMessage}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <EmailDeliveryPlaceholder />
      </section>
    </div>
  );
}

function EmailDeliveryPlaceholder() {
  return (
    <div className="rounded-[32px] border border-dashed border-rose-200 bg-rose-50/70 p-8 text-sm leading-6 text-rose-700 shadow-inner">
      <h3 className="text-lg font-semibold text-rose-600">
        이메일 전송 기능 (생각중)
      </h3>
      <p className="mt-2 text-rose-600/90">
        완성한 엽서를 바로 이메일로 전송할 수 있도록 백엔드 연동을 준비하고
        있어요. 인증과 메일 전송 API가 마련되면, 여기에서 수신자 정보를 입력하고
        엽서를 보낼 수 있도록 확장할 예정입니다.
      </p>
      <p className="mt-4 text-xs text-rose-500">
        • SMTP 또는 트랜잭셔널 메일 서비스 연동 · 발신자 인증 · 보내기 전 미리보기
        확인 흐름 설계
      </p>
      <button
        type="button"
        className="mt-6 inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-400 opacity-70"
      >
        준비 중
      </button>
    </div>
  );
}

function buildWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  paragraphs.forEach((paragraph, index) => {
    if (!paragraph.trim()) {
      lines.push("");
      return;
    }

    const words = paragraph.trim().split(/\s+/);
    let currentLine = words[0];

    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${currentLine} ${words[i]}`;
      if (ctx.measureText(candidate).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (index < paragraphs.length - 1) {
      lines.push("");
    }
  });

  return lines;
}


