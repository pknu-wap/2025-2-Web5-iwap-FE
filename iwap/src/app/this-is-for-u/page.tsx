"use client";



import Link from "next/link";

import { CanvasSection } from "./components/CanvasSection";

import { MessageSection } from "./components/MessageSection";

import { TemplateSelectorSection } from "./components/TemplateSelectorSection";

import { ToolControlsSection } from "./components/ToolControlsSection";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import {
  type FontOption,
  type PostcardTemplate,
  type Tool,
} from "./types";


const POSTCARD_RATIO = 3 / 2;

const MAX_CANVAS_WIDTH = 860;

const MESSAGE_LIMIT = 320;

const SIGNATURE_LIMIT = 48;

const RECIPIENT_LIMIT = 48;



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

    css: '"Playfair Display", Georgia, serif',

  },

  {

    id: "sans",

    label: "Clean Sans",

    css: '"SUIT", "Noto Sans KR", sans-serif',

  },

  {

    id: "script",

    label: "Script",

    css: '"Dancing Script", "Nanum Pen Script", cursive',

  },
];

const BACKGROUND_COLORS = [
  "#fde7db",
  "#fff9f5",
  "#f5fbf6",
  "#ffffff",
  "#fef2f2",
  "#dbeafe",
  "#ede9fe",
  "#0f172a",
];

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

type StrokeMode = "draw" | "erase";

type StrokePoint = {
  x: number;
  y: number;
};

type Stroke = {
  id: number;
  mode: StrokeMode;
  color: string;
  sizeRatio: number;
  points: StrokePoint[];
};

const STROKE_ERASER_MIN_PX = 12;

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
  const [brushPalette, setBrushPalette] = useState(BRUSH_COLORS);
  const [frontBackgroundColor, setFrontBackgroundColor] = useState(
    template.frontColor,
  );
  const [customBrushHex, setCustomBrushHex] = useState(template.accentColor);
  const [backgroundHexInput, setBackgroundHexInput] = useState(
    template.frontColor,
  );
  const [backgroundPalette, setBackgroundPalette] =
    useState(BACKGROUND_COLORS);
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [recipient, setRecipient] = useState("");

  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].id);

  const [backAlignment, setBackAlignment] = useState<

    "left" | "center" | "right"

  >("left");

  const [statusMessage, setStatusMessage] = useState<string | null>(null);



  const frontCanvasRef = useRef<HTMLCanvasElement>(null);

  const backCanvasRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const builderRef = useRef<HTMLDivElement>(null);



  const dprRef = useRef(1);

  const isDrawingRef = useRef(false);

  const previousPointRef = useRef<{ x: number; y: number } | null>(null);

  const activeStrokeRef = useRef<Stroke | null>(null);
  const strokeIdRef = useRef(0);
  const strokesRef = useRef<Stroke[]>([]);

  const statusTimeoutRef = useRef<number | null>(null);

  const lastTemplateIdRef = useRef<string | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);



  const [canvasSize, setCanvasSize] = useState({ width: 720, height: 480 });
  const normalizedBrushHex = normalizeHex(customBrushHex);
  const normalizedBackgroundHex = normalizeHex(backgroundHexInput);
  const isCustomBrushHexValid = HEX_PATTERN.test(normalizedBrushHex);
  const isBackgroundHexValid = HEX_PATTERN.test(normalizedBackgroundHex);
  const applyBackgroundColor = useCallback((color: string) => {
    const normalized = normalizeHex(color);
    if (!HEX_PATTERN.test(normalized)) return;
    setFrontBackgroundColor(normalized);
    setBackgroundHexInput(normalized);
    setBackgroundPalette((prev) =>
      prev.includes(normalized) ? prev : [...prev, normalized],
    );
  }, []);
  const applyCustomBrushHex = useCallback(() => {
    if (!isCustomBrushHexValid) return;
    setBrushColor(normalizedBrushHex);
    setBrushPalette((prev) =>
      prev.includes(normalizedBrushHex)
        ? prev
        : [...prev, normalizedBrushHex],
    );
  }, [isCustomBrushHexValid, normalizedBrushHex]);
  const applyCustomBackgroundHex = useCallback(() => {
    if (!isBackgroundHexValid) return;
    applyBackgroundColor(normalizedBackgroundHex);
  }, [applyBackgroundColor, isBackgroundHexValid, normalizedBackgroundHex]);
  const handleBrushColorPicked = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = normalizeHex(event.target.value);
      if (!HEX_PATTERN.test(value)) return;
      setCustomBrushHex(value);
    },
    [],
  );
  const handleBrushPaletteSelect = useCallback((color: string) => {
    setBrushColor(color);
    setCustomBrushHex(color);
  }, []);
  const handleBackgroundColorPicked = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = normalizeHex(event.target.value);
      if (!HEX_PATTERN.test(value)) return;
      setBackgroundHexInput(value);
    },
    [],
  );

  const updateStrokeState = useCallback(
    (updater: Stroke[] | ((previous: Stroke[]) => Stroke[])) => {
      setStrokes((previous) => {
        const next =
          typeof updater === "function"
            ? (updater as (value: Stroke[]) => Stroke[])(previous)
            : updater;
        strokesRef.current = next;
        return next;
      });
    },
    [],
  );

  const drawSegment = useCallback(
    (
      point: { x: number; y: number },
      previousPoint: { x: number; y: number } | null,
      mode: StrokeMode,
      color: string,
      lineWidth: number,
    ) => {
      const canvas = frontCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = lineWidth;

      if (mode === "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.fillStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
      }

      if (!previousPoint) {
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
    },
    [],
  );

  const redrawStrokes = useCallback(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dpr = dprRef.current;
    const width = canvasSize.width;
    const height = canvasSize.height;

    strokesRef.current.forEach((stroke) => {
      const lineWidth = stroke.sizeRatio * width * dpr;
      let previousPoint: { x: number; y: number } | null = null;

      stroke.points.forEach((point) => {
        const absolutePoint = {
          x: point.x * width * dpr,
          y: point.y * height * dpr,
        };
        drawSegment(absolutePoint, previousPoint, stroke.mode, stroke.color, lineWidth);
        previousPoint = absolutePoint;
      });
    });
  }, [canvasSize.height, canvasSize.width, drawSegment]);

  const distanceToSegment = useCallback(
    (
      point: { x: number; y: number },
      start: { x: number; y: number },
      end: { x: number; y: number },
    ) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (dx === 0 && dy === 0) {
        return Math.hypot(point.x - start.x, point.y - start.y);
      }
      const t = Math.max(
        0,
        Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)),
      );
      const projX = start.x + t * dx;
      const projY = start.y + t * dy;
      return Math.hypot(point.x - projX, point.y - projY);
    },
    [],
  );

  const handleStrokeErase = useCallback(
    (normalizedPoint: StrokePoint) => {
      if (!canvasSize.width || !canvasSize.height) return;
      const dpr = dprRef.current;
      const target = {
        x: normalizedPoint.x * canvasSize.width * dpr,
        y: normalizedPoint.y * canvasSize.height * dpr,
      };

      const hitIndex = strokesRef.current.findIndex((stroke) => {
        if (stroke.mode === "erase") return false;
        const strokeWidth = Math.max(stroke.sizeRatio * canvasSize.width * dpr, STROKE_ERASER_MIN_PX * dpr);
        for (let i = 0; i < stroke.points.length; i += 1) {
          const currentPoint = {
            x: stroke.points[i].x * canvasSize.width * dpr,
            y: stroke.points[i].y * canvasSize.height * dpr,
          };
          if (stroke.points.length === 1) {
            if (Math.hypot(currentPoint.x - target.x, currentPoint.y - target.y) <= strokeWidth) {
              return true;
            }
          } else if (i > 0) {
            const previousPoint = {
              x: stroke.points[i - 1].x * canvasSize.width * dpr,
              y: stroke.points[i - 1].y * canvasSize.height * dpr,
            };
            if (distanceToSegment(target, previousPoint, currentPoint) <= strokeWidth) {
              return true;
            }
          }
        }
        return false;
      });

      if (hitIndex === -1) return;

      updateStrokeState((prev) => prev.filter((_, index) => index !== hitIndex));
    },
    [canvasSize.height, canvasSize.width, distanceToSegment, updateStrokeState],
  );


  useEffect(() => {
    setBrushColor(template.accentColor);
    setCustomBrushHex(template.accentColor);
    setBrushPalette((prev) =>
      prev.includes(template.accentColor)
        ? prev
        : [...prev, template.accentColor],
    );
  }, [template.accentColor]);
  useEffect(() => {
    setFrontBackgroundColor(template.frontColor);
    setBackgroundHexInput(template.frontColor);
    setBackgroundPalette((prev) =>
      prev.includes(template.frontColor)
        ? prev
        : [...prev, template.frontColor],
    );
  }, [template.frontColor]);


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

    const widthPx = Math.floor(canvasSize.width * dpr);

    const heightPx = Math.floor(canvasSize.height * dpr);



    if (canvas.width !== widthPx || canvas.height !== heightPx) {

      canvas.width = widthPx;

      canvas.height = heightPx;

    }



    canvas.style.width = `${canvasSize.width}px`;

    canvas.style.height = `${canvasSize.height}px`;

    redrawStrokes();

  }, [canvasSize.height, canvasSize.width, redrawStrokes]);



  const resetFrontCanvas = useCallback(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    previousPointRef.current = null;
    activeStrokeRef.current = null;
    updateStrokeState([]);
  }, [updateStrokeState]);



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



  useEffect(() => {

    redrawStrokes();

  }, [redrawStrokes, strokes]);



  const handlePointerDown = useCallback(

    (event: PointerEvent<HTMLCanvasElement>) => {

      if (activeSide !== "front") return;

      const canvas = frontCanvasRef.current;

      if (!canvas) return;



      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      canvas.setPointerCapture(event.pointerId);

      const dpr = dprRef.current;
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const absolutePoint = {
        x: offsetX * dpr,
        y: offsetY * dpr,
      };
      const normalizedPoint = {
        x: offsetX / rect.width,
        y: offsetY / rect.height,
      };

      if (tool === "stroke-eraser") {
        isDrawingRef.current = true;
        handleStrokeErase(normalizedPoint);
        return;
      }

      isDrawingRef.current = true;

      const mode: StrokeMode = tool === "eraser" ? "erase" : "draw";
      const stroke: Stroke = {
        id: strokeIdRef.current + 1,
        mode,
        color: brushColor,
        sizeRatio: brushSize / Math.max(canvasSize.width, 1),
        points: [normalizedPoint],
      };
      strokeIdRef.current = stroke.id;
      activeStrokeRef.current = stroke;
      previousPointRef.current = absolutePoint;

      drawSegment(absolutePoint, null, mode, brushColor, brushSize * dpr);
    },
    [
      activeSide,
      brushColor,
      brushSize,
      canvasSize.width,
      drawSegment,
      handleStrokeErase,
      tool,
    ],
  );



  const handlePointerMove = useCallback(

    (event: PointerEvent<HTMLCanvasElement>) => {

      if (!isDrawingRef.current || activeSide !== "front") return;

      const canvas = frontCanvasRef.current;

      if (!canvas) return;



      const rect = canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) return;

      const dpr = dprRef.current;

      const offsetX = event.clientX - rect.left;

      const offsetY = event.clientY - rect.top;

      const absolutePoint = {

        x: offsetX * dpr,

        y: offsetY * dpr,

      };

      const normalizedPoint = {

        x: offsetX / rect.width,

        y: offsetY / rect.height,

      };



      if (tool === "stroke-eraser") {

        handleStrokeErase(normalizedPoint);

        return;

      }



      const stroke = activeStrokeRef.current;

      if (!stroke) return;



      stroke.points.push(normalizedPoint);

      const lineWidth = stroke.sizeRatio * canvasSize.width * dpr;

      const previousPoint = previousPointRef.current;

      drawSegment(absolutePoint, previousPoint, stroke.mode, stroke.color, lineWidth);

      previousPointRef.current = absolutePoint;

    },

    [activeSide, canvasSize.width, drawSegment, handleStrokeErase, tool],

  );



  const stopDrawing = useCallback((event: PointerEvent<HTMLCanvasElement>) => {

    const canvas = frontCanvasRef.current;

    if (canvas?.hasPointerCapture(event.pointerId)) {

      canvas.releasePointerCapture(event.pointerId);

    }

    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;

    if (activeStrokeRef.current) {

      const completedStroke = activeStrokeRef.current;

      activeStrokeRef.current = null;

      updateStrokeState((prev) => [...prev, completedStroke]);

    }

    previousPointRef.current = null;

  }, [updateStrokeState]);



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

    // Keep style for decorative lines (no divider drawn)
    ctx.strokeStyle = template.lineColor;
    ctx.lineWidth = 2 * dpr;

    // Stamp design (restored)
    ctx.save();
    ctx.globalAlpha = 0.18;
    const stampSize = 96 * dpr;
    ctx.fillStyle = template.stampColor;
    ctx.fillRect(widthPx - margin - stampSize, margin, stampSize, stampSize);
    ctx.restore();



    const fontOption =

      FONT_OPTIONS.find((option) => option.id === fontFamily) ??

      FONT_OPTIONS[0];

    const fontSize = 24 * dpr;

    const lineHeight = fontSize * 1.4;

    const writingWidth = widthPx - margin * 2;

    ctx.save();

    ctx.font = `${20 * dpr}px ${fontOption.css}`;

    ctx.fillStyle = template.textColor;

    ctx.textBaseline = "top";

    ctx.textAlign = "left";

    const recipientLabelX = margin;

    const recipientLabelY = margin * 0.2;

    if (recipient.trim()) {

      ctx.fillText(`To. ${recipient.trim()}`, recipientLabelX, recipientLabelY);

    } else {

      ctx.globalAlpha = 0.3;

      ctx.fillText("받는 사람 이름", recipientLabelX, recipientLabelY);

    }

    ctx.restore();



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
          `from.${signature.trim()}`,
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

    recipient,

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



  const createFrontExportSnapshot = useCallback(() => {

    const canvas = frontCanvasRef.current;

    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;



    const exportCanvas = document.createElement("canvas");

    exportCanvas.width = canvas.width;

    exportCanvas.height = canvas.height;



    const exportCtx = exportCanvas.getContext("2d");

    if (!exportCtx) return null;



    exportCtx.fillStyle = frontBackgroundColor;

    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    exportCtx.drawImage(canvas, 0, 0);



    return exportCanvas;

  }, [frontBackgroundColor]);



  const downloadSide = useCallback(

    (side: "front" | "back") => {

      const canvas =

        side === "front" ? createFrontExportSnapshot() : backCanvasRef.current;

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

    [createFrontExportSnapshot, showStatus],

  );



  const downloadPdf = useCallback(async () => {

    const frontCanvas = createFrontExportSnapshot();

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

  }, [createFrontExportSnapshot, showStatus]);



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

            <li>? 직접 그릴 수 있는 앞면 캔버스</li>

            <li>? 감성적인 뒷면 메시지 레이아웃</li>

            <li>? PNG &amp; PDF 다운로드 지원</li>

            <li>? 추후 이메일 전송 확장 계획</li>

          </ul>

        </div>

      </section>



      <section

        ref={builderRef}

        className="mx-auto max-w-6xl px-6 pb-12 md:pb-16 lg:pb-24"

      >

        <div className="rounded-[36px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">

          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">

            <CanvasSection

                activeSide={activeSide}

                onActiveSideChange={setActiveSide}

                containerRef={containerRef}

                frontCanvasRef={frontCanvasRef}

                backCanvasRef={backCanvasRef}

                frontBackgroundColor={frontBackgroundColor}

                handlePointerDown={handlePointerDown}

                handlePointerMove={handlePointerMove}

                stopDrawing={stopDrawing}

              />



            <div className="space-y-8">

              <TemplateSelectorSection

                templates={POSTCARD_TEMPLATES}

                activeTemplateId={template.id}

                onSelect={setSelectedTemplateId}

              />



              <ToolControlsSection

                tool={tool}

                onToolChange={setTool}

                brushSize={brushSize}

                onBrushSizeChange={setBrushSize}

                brushColor={brushColor}

                onBrushColorSelect={handleBrushPaletteSelect}

                brushPalette={brushPalette}

                customBrushHex={customBrushHex}

                normalizedCustomBrushHex={normalizedBrushHex}

                onCustomBrushHexChange={setCustomBrushHex}

                onApplyCustomBrushHex={applyCustomBrushHex}

                isCustomBrushHexValid={isCustomBrushHexValid}

                onBrushColorPicked={handleBrushColorPicked}

                frontBackgroundColor={frontBackgroundColor}

                backgroundPalette={backgroundPalette}

                onBackgroundColorSelect={applyBackgroundColor}

                backgroundHexInput={backgroundHexInput}

                normalizedBackgroundHex={normalizedBackgroundHex}

                onBackgroundHexChange={setBackgroundHexInput}

                onApplyBackgroundHex={applyCustomBackgroundHex}

                isBackgroundHexValid={isBackgroundHexValid}

                onBackgroundColorPicked={handleBackgroundColorPicked}

                onResetCanvas={resetFrontCanvas}

                onDownloadFront={() => downloadSide("front")}

              />



              <MessageSection

                message={message}

                messageLimit={MESSAGE_LIMIT}

                onMessageChange={setMessage}

                recipient={recipient}

                recipientLimit={RECIPIENT_LIMIT}

                onRecipientChange={setRecipient}

                signature={signature}

                signatureLimit={SIGNATURE_LIMIT}

                onSignatureChange={setSignature}

                backAlignment={backAlignment}

                onBackAlignmentChange={setBackAlignment}

                onDownloadBack={() => downloadSide("back")}

                onDownloadPdf={downloadPdf}

              />

            </div>

          </div>

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

        ? SMTP 또는 트랜잭셔널 메일 서비스 연동 · 발신자 인증 · 보내기 전

        미리보기 확인 흐름 설계

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

