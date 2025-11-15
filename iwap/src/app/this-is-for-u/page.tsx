"use client";



import JSZip from "jszip";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";

import { CanvasSection } from "./components/CanvasSection";
import { MessageSection } from "./components/MessageSection";
import { TemplateSelectorSection } from "./components/TemplateSelectorSection";
import { ToolControlsSection } from "./components/ToolControlsSection";
import { computeDrawingFourier, computeTextFourier } from "./fourier-utils";
import {
  type FourierCoefficient,
  type FourierMetadata,
  type PostcardTemplate,
  type Stroke,
  type StrokeMode,
  type StrokePoint,
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
const TRANSMISSION_STEPS = [
  { stage: "송신", action: "감정을 '그림·글'로 표현", feeling: "\"내 마음을 전송한다\"" },
  { stage: "변환", action: "Fourier로 파형화", feeling: "\"내 마음이 신호로 바뀐다\"" },
  { stage: "수신", action: "Fourier를 재생", feeling: "\"상대의 감정이 내 앞에서 풀린다\"" },
];

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

const STROKE_ERASER_MIN_PX = 12;
type FourierMetadataDraft = Omit<FourierMetadata, "createdAt">;

function formatTimestampForFile(value: string) {
  return value.replace(/[:.]/g, "-");
}

type RgbColor = { r: number; g: number; b: number };
const WHITE_RGB: RgbColor = { r: 255, g: 255, b: 255 };

function hexToRgbColor(hex: string): RgbColor | null {
  const normalized = hex.replace("#", "");
  if (![3, 6].includes(normalized.length)) return null;
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split("").map((char) => Number.parseInt(char + char, 16));
    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    return { r, g, b };
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
}

function mixRgbColor(base: RgbColor, target: RgbColor, ratio: number): RgbColor {
  const clampRatio = Math.max(0, Math.min(1, ratio));
  return {
    r: base.r + (target.r - base.r) * clampRatio,
    g: base.g + (target.g - base.g) * clampRatio,
    b: base.b + (target.b - base.b) * clampRatio,
  };
}

function rgbToCss(rgb: RgbColor, alpha: number) {
  return `rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},${alpha})`;
}

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
  const [textColor, setTextColor] = useState(template.textColor);
  const [textPalette, setTextPalette] = useState(BRUSH_COLORS);
  const [frontBackgroundColor, setFrontBackgroundColor] = useState(
    template.frontColor,
  );
  const [customBrushHex, setCustomBrushHex] = useState(template.accentColor);
  const [customTextHex, setCustomTextHex] = useState(template.textColor);
  const [backgroundHexInput, setBackgroundHexInput] = useState(
    template.frontColor,
  );
  const [backgroundPalette, setBackgroundPalette] =
    useState(BACKGROUND_COLORS);
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [recipient, setRecipient] = useState("");

  const [fontFamily] = useState(FONT_OPTIONS[0].id);

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
  const [receiverMetadata, setReceiverMetadata] = useState<FourierMetadata | null>(null);
  const [receiverPreviewUrl, setReceiverPreviewUrl] = useState<string | null>(null);
  const receiverCanvasRef = useRef<HTMLCanvasElement>(null);
  const receiverAnimationRef = useRef<number | null>(null);
  const [isPlayingEmotion, setIsPlayingEmotion] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [lastFourierTimestamp, setLastFourierTimestamp] = useState<string | null>(null);



  const [canvasSize, setCanvasSize] = useState({ width: 720, height: 480 });
  const normalizedBrushHex = normalizeHex(customBrushHex);
  const normalizedBackgroundHex = normalizeHex(backgroundHexInput);
  const isCustomBrushHexValid = HEX_PATTERN.test(normalizedBrushHex);
  const isBackgroundHexValid = HEX_PATTERN.test(normalizedBackgroundHex);
  const normalizedTextHex = normalizeHex(customTextHex);
  const isCustomTextHexValid = HEX_PATTERN.test(normalizedTextHex);
  const activeFontOption = useMemo(
    () =>
      FONT_OPTIONS.find((option) => option.id === fontFamily) ?? FONT_OPTIONS[0],
    [fontFamily],
  );
  const drawingFourier = useMemo(
    () => computeDrawingFourier(strokes),
    [strokes],
  );
  const textFourier = useMemo(
    () => computeTextFourier(message, activeFontOption.css),
    [message, activeFontOption.css],
  );
  const textFourierCoefficientCount = useMemo(
    () => textFourier.reduce((sum, segment) => sum + segment.length, 0),
    [textFourier],
  );
  const drawingPointCount = useMemo(
    () =>
      strokes.reduce((total, stroke) => {
        if (stroke.mode === "erase") return total;
        return total + stroke.points.length;
      }, 0),
    [strokes],
  );
  const brushColorPalette = useMemo(() => {
    const fallback: RgbColor = { r: 248, g: 113, b: 113 };
    const baseRgb = hexToRgbColor(brushColor) ?? fallback;
    const circleRgb = mixRgbColor(baseRgb, WHITE_RGB, 0.35);
    const headRgb = mixRgbColor(baseRgb, WHITE_RGB, 0.15);
    return {
      circle: rgbToCss(circleRgb, 0.78),
      vector: rgbToCss(baseRgb, 0.92),
      trail: rgbToCss(baseRgb, 0.95),
      head: rgbToCss(headRgb, 1),
    };
  }, [brushColor]);
  const metadataDraft = useMemo<FourierMetadataDraft>(
    () => ({
      version: 1,
      templateId: template.id,
      templateName: template.name,
      background: frontBackgroundColor,
      drawingFourier,
      textFourier,
      recipient: recipient.trim() || undefined,
      signature: signature.trim() || undefined,
      messagePreview: message.trim() ? message.trim().slice(0, 160) : undefined,
    }),
    [
      drawingFourier,
      frontBackgroundColor,
      message,
      recipient,
      signature,
      template.id,
      template.name,
      textFourier,
    ],
  );
  const hasFourierData =
    drawingFourier.length > 0 || textFourier.some((segment) => segment.length > 0);
  const lastEncodedLabel = useMemo(() => {
    if (!lastFourierTimestamp) return "대기 중";
    const date = new Date(lastFourierTimestamp);
    if (Number.isNaN(date.getTime())) return lastFourierTimestamp;
    return date.toLocaleString();
  }, [lastFourierTimestamp]);
  const buildMetadataPayload = useCallback(
    (): FourierMetadata => ({
      ...metadataDraft,
      createdAt: new Date().toISOString(),
    }),
    [metadataDraft],
  );
  const metadataPreviewString = useMemo(
    () =>
      JSON.stringify(
        { ...metadataDraft, createdAt: "YYYY-MM-DDTHH:mmZ" },
        null,
        2,
      ),
    [metadataDraft],
  );
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
  const applyCustomTextHex = useCallback(() => {
    if (!isCustomTextHexValid) return;
    setTextColor(normalizedTextHex);
    setTextPalette((prev) =>
      prev.includes(normalizedTextHex) ? prev : [...prev, normalizedTextHex],
    );
  }, [isCustomTextHexValid, normalizedTextHex]);
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
  const handleTextColorPicked = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = normalizeHex(event.target.value);
      if (!HEX_PATTERN.test(value)) return;
      setCustomTextHex(value);
    },
    [],
  );
  const handleTextPaletteSelect = useCallback((color: string) => {
    setTextColor(color);
    setCustomTextHex(color);
  }, []);
  const handleBackgroundColorPicked = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = normalizeHex(event.target.value);
      if (!HEX_PATTERN.test(value)) return;
      setBackgroundHexInput(value);
    },
    [],
  );
  const captureFrontPreview = useCallback(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return null;
    try {
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.warn("Failed to capture front preview", error);
      return null;
    }
  }, []);
  const canvasToBlob = useCallback(
    (canvas: HTMLCanvasElement) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("blob이 만들어지지 않았어요."));
            }
          },
          "image/png",
          1,
        );
      }),
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
  useEffect(() => {
    setTextColor(template.textColor);
    setCustomTextHex(template.textColor);
    setTextPalette((prev) =>
      prev.includes(template.textColor) ? prev : [...prev, template.textColor],
    );
  }, [template.textColor]);


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



    ctx.fillStyle = frontBackgroundColor;

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



    const fontOption = activeFontOption;

    const fontSize = 24 * dpr;

    const lineHeight = fontSize * 1.4;

    const writingWidth = widthPx - margin * 2;

    ctx.save();

    ctx.font = `${20 * dpr}px ${fontOption.css}`;

    ctx.fillStyle = textColor;

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

      ctx.fillStyle = textColor;

      ctx.textBaseline = "top";

      ctx.textAlign = "left";

      ctx.fillText("여기에 메시지를 적어볼까요?", margin, margin);

      ctx.restore();

    } else {

      ctx.font = `${fontSize}px ${fontOption.css}`;

      ctx.fillStyle = textColor;

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

      const signatureReserve = signature.trim()
        ? Math.max(fontSize * 0.85, 16 * dpr) + lineHeight * 0.6
        : 0;
      const availableHeight = Math.max(heightPx - margin * 2 - signatureReserve, 0);
      const maxLines = Math.max(Math.floor(availableHeight / lineHeight), 0);

      const linesToRender = lines.slice(0, maxLines);

      linesToRender.forEach((line) => {
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
    activeFontOption,
    backAlignment,
    canvasSize.height,
    canvasSize.width,
    message,
    recipient,
    signature,
    frontBackgroundColor,
    template.lineColor,
    template.stampColor,
    textColor,
  ]);



  useEffect(() => {

    renderBackSide();

  }, [renderBackSide]);

  // On message input, accept only if it fits inside the postcard area
  const handleMessageChange = useCallback(
    (next: string) => {
      const canvas = backCanvasRef.current;
      if (!canvas) {
        setMessage(next);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setMessage(next);
        return;
      }

      const dpr = dprRef.current;
      const widthPx = Math.floor(canvasSize.width * dpr);
      const heightPx = Math.floor(canvasSize.height * dpr);
      const margin = 48 * dpr;
      const fontOption = activeFontOption;
      const fontSize = 24 * dpr;
      const lineHeight = fontSize * 1.4;
      const writingWidth = widthPx - margin * 2;

      ctx.font = `${fontSize}px ${fontOption.css}`;

      const signatureReserve = signature.trim()
        ? Math.max(fontSize * 0.85, 16 * dpr) + lineHeight * 0.6
        : 0;
      const availableHeight = Math.max(heightPx - margin * 2 - signatureReserve, 0);
      const maxLines = Math.max(Math.floor(availableHeight / lineHeight), 0);

      const fittingPrefix = computeFittingPrefixLength(
        ctx,
        next,
        writingWidth,
        maxLines,
      );

      if (fittingPrefix >= next.length && next.length <= MESSAGE_LIMIT) {
        setMessage(next);
      } // else ignore extra input
    },
    [
      activeFontOption,
      canvasSize.height,
      canvasSize.width,
      signature,
    ],
  );



  useEffect(() => {

    return () => {

      if (statusTimeoutRef.current) {

        window.clearTimeout(statusTimeoutRef.current);

        statusTimeoutRef.current = null;

      }

    };

  }, []);
  useEffect(() => {
    return () => {
      if (receiverAnimationRef.current) {
        window.cancelAnimationFrame(receiverAnimationRef.current);
        receiverAnimationRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!isPlayingEmotion || !receiverMetadata) {
      if (receiverAnimationRef.current) {
        window.cancelAnimationFrame(receiverAnimationRef.current);
        receiverAnimationRef.current = null;
      }
      return;
    }
    const canvas = receiverCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 480;
    const height = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const drawingTrail: Array<{ x: number; y: number }> = [];
    const drawingCoeffs = receiverMetadata.drawingFourier.slice(0, 28);
    const textSegments = receiverMetadata.textFourier.map((segment) => segment.slice(0, 28));
    const textTrails = textSegments.map(() => [] as Array<{ x: number; y: number }>);
    let time = 0;

    const drawEpicycles = (
      coefficients: FourierCoefficient[],
      originX: number,
      originY: number,
      scale: number,
      circleColor: string,
      vectorColor: string,
    ) => {
      let centerX = originX;
      let centerY = originY;
      coefficients.forEach((coeff, index) => {
        const radius = Math.max(0, coeff.amp * scale);
        const angle = coeff.freq * time + coeff.phase;
        if (radius > 0.2) {
          ctx.save();
          ctx.strokeStyle = circleColor;
          ctx.globalAlpha = index === 0 ? 0.85 : 0.6;
          ctx.lineWidth = index === 0 ? 2.4 : 1.4;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        const tipX = centerX + Math.cos(angle) * radius;
        // flip Y so reconstructed path matches original canvas orientation
        const tipY = centerY - Math.sin(angle) * radius;
        ctx.save();
        ctx.strokeStyle = vectorColor;
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.restore();
        centerX = tipX;
        centerY = tipY;
      });
      return { x: centerX, y: centerY };
    };

    const render = () => {
      receiverAnimationRef.current = window.requestAnimationFrame(render);
      time += 0.015;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#020617");
      gradient.addColorStop(1, "#0f172a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.strokeRect(0, 0, width, height);

      if (drawingCoeffs.length) {
        const head = drawEpicycles(
          drawingCoeffs,
          width * 0.32,
          height * 0.42,
          Math.min(width, height) * 0.48,
          brushColorPalette.circle,
          brushColorPalette.vector,
        );
        drawingTrail.push(head);
        if (drawingTrail.length > 720) drawingTrail.shift();
        ctx.save();
        ctx.strokeStyle = brushColorPalette.trail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        drawingTrail.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = brushColorPalette.head;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(248,250,252,0.8)";
        ctx.font = "11px 'SUIT', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("앞면 · Fourier epicycles", 12, 20);
      }

      if (textSegments.some((segment) => segment.length > 0)) {
        textSegments.forEach((segmentCoeffs, segmentIndex) => {
          if (!segmentCoeffs.length) return;
          const circleOpacity = Math.max(0.15, 0.35 - segmentIndex * 0.04);
          const vectorOpacity = Math.max(0.5, 0.95 - segmentIndex * 0.08);
          const head = drawEpicycles(
            segmentCoeffs,
            width * 0.72,
            height * 0.65,
            Math.min(width, height) * 0.32,
            `rgba(226,232,240,${circleOpacity.toFixed(2)})`,
            `rgba(165,180,252,${vectorOpacity.toFixed(2)})`,
          );
          const trail = textTrails[segmentIndex];
          trail.push(head);
          if (trail.length > 560) trail.shift();
          ctx.save();
          const trailOpacity = Math.max(0.35, 0.9 - segmentIndex * 0.15);
          ctx.strokeStyle = `rgba(191,219,254,${trailOpacity.toFixed(2)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          trail.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "#e0e7ff";
          ctx.beginPath();
          ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = "rgba(226,232,240,0.85)";
        ctx.font = "11px 'SUIT', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("뒷면 · 텍스트 epicycles", width - 12, height - 12);
      }
    };

    render();

    return () => {
      if (receiverAnimationRef.current) {
        window.cancelAnimationFrame(receiverAnimationRef.current);
        receiverAnimationRef.current = null;
      }
    };
  }, [brushColorPalette, isPlayingEmotion, receiverMetadata]);
  useEffect(() => {
    if (isPlayingEmotion) return;
    const canvas = receiverCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = 480;
    const height = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "14px 'SUIT', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const message = receiverMetadata
      ? "재생(Play Emotion) 버튼으로 Fourier epicycles를 복원해요."
      : "먼저 Fourier 패키지를 생성해 주세요.";
    ctx.fillText(message, width / 2, height / 2);
  }, [isPlayingEmotion, receiverMetadata]);



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

    if (!canvas) return null;

    const baseWidthPx = Math.max(1, Math.floor(canvasSize.width * dprRef.current));
    const baseHeightPx = Math.max(1, Math.floor(canvasSize.height * dprRef.current));
    const scale = 3; // export at 3x resolution to reduce blur
    const exportWidth = baseWidthPx * scale;
    const exportHeight = baseHeightPx * scale;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return null;

    // Fill background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, exportWidth, exportHeight);
    ctx.fillStyle = frontBackgroundColor;
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Redraw strokes at high resolution using normalized points
    strokesRef.current.forEach((stroke) => {
      const lineWidth = stroke.sizeRatio * exportWidth;
      let prev: { x: number; y: number } | null = null;

      const drawPoint = (p: { x: number; y: number }) => {
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = lineWidth;
        if (stroke.mode === "erase") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
          ctx.fillStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = stroke.color;
          ctx.fillStyle = stroke.color;
        }

        if (!prev) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        ctx.restore();
        prev = p;
      };

      stroke.points.forEach((np) => {
        const abs = { x: np.x * exportWidth, y: np.y * exportHeight };
        drawPoint(abs);
      });
    });

    return exportCanvas;

  }, [canvasSize.height, canvasSize.width, frontBackgroundColor]);



  const createBackExportSnapshot = useCallback(() => {
    const baseWidthPx = Math.max(1, Math.floor(canvasSize.width * dprRef.current));
    const baseHeightPx = Math.max(1, Math.floor(canvasSize.height * dprRef.current));
    const scale = 3; // match front export scale
    const widthPx = baseWidthPx * scale;
    const heightPx = baseHeightPx * scale;

    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Reconstruct back side rendering at export scale
    const dpr = dprRef.current * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, widthPx, heightPx);

    ctx.fillStyle = frontBackgroundColor;
    ctx.fillRect(0, 0, widthPx, heightPx);

    const margin = 48 * dpr;
    ctx.strokeStyle = template.lineColor;
    ctx.lineWidth = 2 * dpr;

    // Stamp
    ctx.save();
    ctx.globalAlpha = 0.18;
    const stampSize = 96 * dpr;
    ctx.fillStyle = template.stampColor;
    ctx.fillRect(widthPx - margin - stampSize, margin, stampSize, stampSize);
    ctx.restore();

    const fontOption = activeFontOption;
    const fontSize = 24 * dpr;
    const lineHeight = fontSize * 1.4;
    const writingWidth = widthPx - margin * 2;

    ctx.save();
    ctx.font = `${20 * dpr}px ${fontOption.css}`;
    ctx.fillStyle = textColor;
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
      ctx.fillStyle = textColor;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText("여기에 메시지를 적어볼까요?", margin, margin);
      ctx.restore();
    } else {
      ctx.font = `${fontSize}px ${fontOption.css}`;
      ctx.fillStyle = textColor;
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

      const signatureReserve = signature.trim()
        ? Math.max(fontSize * 0.85, 16 * dpr) + lineHeight * 0.6
        : 0;
      const availableHeight = Math.max(heightPx - margin * 2 - signatureReserve, 0);
      const maxLines = Math.max(Math.floor(availableHeight / lineHeight), 0);
      const linesToRender = lines.slice(0, maxLines);

      linesToRender.forEach((line) => {
        ctx.fillText(line, textX, textY);
        textY += lineHeight;
      });

      if (signature.trim()) {
        ctx.textAlign = "right";
        ctx.font = `${Math.max(fontSize * 0.85, 16 * dpr)}px ${fontOption.css}`;
        ctx.fillText(`from.${signature.trim()}`, margin + writingWidth, heightPx - margin);
      }
    }

    return canvas;
  }, [
    backAlignment,
    canvasSize.height,
    canvasSize.width,
    activeFontOption,
    frontBackgroundColor,
    message,
    recipient,
    signature,
    template.lineColor,
    template.stampColor,
    textColor,
  ]);

  const downloadSide = useCallback(

    (side: "front" | "back") => {

      const canvas =

        side === "front" ? createFrontExportSnapshot() : createBackExportSnapshot();

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

    [createBackExportSnapshot, createFrontExportSnapshot, showStatus],

  );



  const downloadPdf = useCallback(async () => {

    const frontCanvas = createFrontExportSnapshot();

    const backCanvas = createBackExportSnapshot();

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

  }, [createBackExportSnapshot, createFrontExportSnapshot, showStatus]);



  const handleStart = useCallback(() => {

    builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  }, []);
  const handleDownloadMetadataJson = useCallback(() => {
    if (!hasFourierData) {
      showStatus("먼저 앞면 그림이나 메시지로 Fourier 데이터를 만들어주세요.");
      return;
    }
    const metadata = buildMetadataPayload();
    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const filename = `this-is-for-u-metadata-${formatTimestampForFile(metadata.createdAt)}.json`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setReceiverMetadata(metadata);
    setLastFourierTimestamp(metadata.createdAt);
    const preview = captureFrontPreview();
    if (preview) {
      setReceiverPreviewUrl(preview);
    }
    showStatus("Fourier metadata JSON을 저장했어요.");
  }, [buildMetadataPayload, captureFrontPreview, hasFourierData, showStatus]);
  const handleReceiverPreviewUpdate = useCallback(() => {
    if (!hasFourierData) {
      showStatus("먼저 그림과 메시지를 담아서 Fourier 데이터를 만들어주세요.");
      return;
    }
    const metadata = buildMetadataPayload();
    setReceiverMetadata(metadata);
    setLastFourierTimestamp(metadata.createdAt);
    const preview = captureFrontPreview();
    if (preview) {
      setReceiverPreviewUrl(preview);
    }
    showStatus("수신자 미리보기를 최신 Fourier 데이터로 맞췄어요.");
  }, [buildMetadataPayload, captureFrontPreview, hasFourierData, showStatus]);
  const handleDownloadEmotionPackage = useCallback(async () => {
    if (!hasFourierData) {
      showStatus("Fourier 데이터를 먼저 생성해주세요.");
      return;
    }
    const frontCanvas = createFrontExportSnapshot();
    const backCanvas = createBackExportSnapshot();
    if (!frontCanvas || !backCanvas) {
      showStatus("PNG 스냅샷을 만들 수 없어요.");
      return;
    }
    const metadata = buildMetadataPayload();
    try {
      setIsPackaging(true);
      const [frontBlob, backBlob] = await Promise.all([
        canvasToBlob(frontCanvas),
        canvasToBlob(backCanvas),
      ]);
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: "application/json",
      });
      const zip = new JSZip();
      zip.file("metadata.json", metadataBlob);
      zip.file("front.png", frontBlob);
      zip.file("back.png", backBlob);
      const archive = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(archive);
      const filename = `this-is-for-u-${formatTimestampForFile(metadata.createdAt)}.zip`;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setReceiverMetadata(metadata);
      setLastFourierTimestamp(metadata.createdAt);
      setReceiverPreviewUrl(frontCanvas.toDataURL("image/png"));
      showStatus("앞·뒷면 PNG와 Fourier 데이터를 한 번에 묶었어요.");
    } catch (error) {
      console.error("Failed to export Fourier package", error);
      showStatus("Fourier 패키지를 만드는 데 실패했어요.");
    } finally {
      setIsPackaging(false);
    }
  }, [
    buildMetadataPayload,
    canvasToBlob,
    createBackExportSnapshot,
    createFrontExportSnapshot,
    hasFourierData,
    showStatus,
  ]);
  const handleToggleEmotionPlayback = useCallback(() => {
    if (!receiverMetadata) {
      showStatus("먼저 Fourier 패키지를 생성하고 미리보기를 준비해주세요.");
      return;
    }
    setIsPlayingEmotion((previous) => {
      const next = !previous;
      showStatus(
        next ? "Fourier epicycles를 재생하고 있어요." : "epicycles 재생을 멈췄어요.",
      );
      return next;
    });
  }, [receiverMetadata, showStatus]);



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

                textColor={textColor}
                textPalette={textPalette}
                onTextColorSelect={handleTextPaletteSelect}
                customTextHex={customTextHex}
                normalizedTextHex={normalizedTextHex}
                onTextHexChange={setCustomTextHex}
                onApplyTextHex={applyCustomTextHex}
                isTextHexValid={isCustomTextHexValid}
                onTextColorPicked={handleTextColorPicked}

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

                onMessageChange={handleMessageChange}

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

              <section className="space-y-5 rounded-[28px] border border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 p-5 shadow-inner shadow-white/70 w-200">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">
                    Fourier Transmission
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Sender ↔ Receiver 감정 부호화 실험실
                  </h3>
                  <p className="text-sm text-slate-600">
                    앞면 드로잉을 원 궤적의 Fourier 계수로 분해하고, 뒷면 메시지 윤곽도 파동 데이터로 저장해요.
                    JSON + PNG 패키지를 만들거나, 바로 아래에서 수신자 미리보기를 재생할 수 있어요.
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg shadow-rose-100/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Sender · 부호화</p>
                        <p className="text-xs text-slate-500">그림 &amp; 텍스트 → (amp, freq, phase)</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${hasFourierData ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                      >
                        {hasFourierData ? "READY" : "EMPTY"}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                        <dt className="font-semibold text-slate-600">포인트 샘플</dt>
                        <dd className="mt-1 text-base font-semibold text-slate-900">{drawingPointCount}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                        <dt className="font-semibold text-slate-600">그림 계수</dt>
                        <dd className="mt-1 text-base font-semibold text-slate-900">{drawingFourier.length}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                        <dt className="font-semibold text-slate-600">텍스트 계수</dt>
                        <dd className="mt-1 text-base font-semibold text-slate-900">
                          {textFourierCoefficientCount}
                          <span className="ml-2 text-[11px] font-medium text-slate-500">
                            · {textFourier.length} segments
                          </span>
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                        <dt className="font-semibold text-slate-600">최근 생성</dt>
                        <dd className="mt-1 text-base font-semibold text-slate-900">{lastEncodedLabel}</dd>
                      </div>
                    </dl>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleReceiverPreviewUpdate}
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                      >
                        Receiver 미리보기 준비
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadMetadataJson}
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                      >
                        metadata.json 저장
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadEmotionPackage}
                        disabled={isPackaging}
                        className="sm:col-span-2 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-200 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPackaging ? "압축 중..." : "PNG ×2 + Fourier ZIP"}
                      </button>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-600">
                      <p className="font-semibold text-slate-700">metadata.json preview</p>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-white/80 p-3 text-[10px] text-slate-700">
                        {metadataPreviewString}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-900/30 bg-slate-950/90 p-4 text-slate-100 shadow-2xl shadow-slate-900/60">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Receiver · 복원</p>
                        <p className="text-xs text-slate-400">
                          정적 엽서 → Fourier epicycles · 앞/뒷면 파형 복원
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleEmotionPlayback}
                        disabled={!receiverMetadata}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          receiverMetadata
                            ? "border border-white/20 text-white hover:bg-white/10"
                            : "cursor-not-allowed border border-white/10 text-slate-500"
                        }`}
                      >
                        {isPlayingEmotion ? "Stop Emotion" : "Play Emotion"}
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        {receiverPreviewUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={receiverPreviewUrl}
                              alt="Latest postcard front preview"
                              className="h-full w-full object-cover"
                            />
                          </>
                        ) : (
                          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-slate-400">
                            Fourier 패키지를 만들면 정적 엽서가 여기에 미리보기로 표시돼요.
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-2">
                        <canvas
                          ref={receiverCanvasRef}
                          className="h-full w-full rounded-xl bg-slate-900/40"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {receiverMetadata
                        ? `템플릿 ${receiverMetadata.templateName} · ${receiverMetadata.drawingFourier.length} 계수로 궤적을 다시 그립니다.`
                        : "Fourier metadata를 생성하면 'Play Emotion'으로 감정 파형을 복원할 수 있어요."}
                    </p>
                  </div>
                </div>

                <blockquote className="rounded-2xl border border-dashed border-rose-200/80 bg-white/70 p-4 text-sm text-rose-500">
                  “이 엽서는 내 감정의 파형을 담고 있어요. 당신의 화면에서 복원해보세요.”
                </blockquote>
              </section>

            </div>

          </div>

        </div>

      </section>



      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">
              Transmission Map
            </p>
            <h3 className="text-2xl font-semibold text-slate-900">This-is-for-U 전달 구조</h3>
            <p className="text-sm text-slate-600">
              감정을 ‘그림·글’로 표현하고 → Fourier 계수를 통해 파형으로 변환하고 → 수신자가 재생하는
              3단계를 표로 정리했어요. (amp, freq, phase) 배열은 metadata.json 안에 포함됩니다.
            </p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[480px] text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">단계</th>
                  <th className="px-4 py-3">동작</th>
                  <th className="px-4 py-3">사용자 감정</th>
                </tr>
              </thead>
              <tbody>
                {TRANSMISSION_STEPS.map((row) => (
                  <tr key={row.stage} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.stage}</td>
                    <td className="px-4 py-3">{row.action}</td>
                    <td className="px-4 py-3 text-rose-500">{row.feeling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 rounded-2xl bg-gradient-to-r from-rose-50 to-white p-4 text-sm font-medium text-rose-500">
            보내는 이는 감정을 수학으로 부호화하고, 받는 이는 그것을 시각·청각적으로 복원한다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">

        <EmailDeliveryPlaceholder />

      </section>

      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-xl shadow-slate-900/40">
          {statusMessage}
        </div>
      )}

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

function computeFittingPrefixLength(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): number {
  let used = 0;
  let lines = 0;
  const paragraphs = text.split("\n");

  for (let p = 0; p < paragraphs.length; p += 1) {
    const paragraph = paragraphs[p];
    if (!paragraph.trim()) {
      // empty line consumes one line
      lines += 1;
      if (lines > maxLines) return used;
      used += 1; // counts the newline
      continue;
    }

    const words = paragraph.trim().split(/\s+/);
    let currentLine = "";
    for (let w = 0; w < words.length; w += 1) {
      const word = words[w];
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && currentLine) {
        // commit current line
        lines += 1;
        if (lines > maxLines) return used; // do not include this word
        currentLine = word;
        used += word.length + 1; // +1 for the space/newline between words
      } else {
        // keep building the line
        used += currentLine ? word.length + 1 : word.length; // +1 for space
        currentLine = candidate;
      }
    }
    if (currentLine) {
      lines += 1;
      if (lines > maxLines) return used;
    }
    // account for explicit newline between paragraphs
    if (p < paragraphs.length - 1) used += 1;
  }
  return text.length;
}

