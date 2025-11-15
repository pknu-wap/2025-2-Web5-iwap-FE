"use client";

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
import {
  type PostcardTemplate,
  type Stroke,
  type StrokeMode,
  type StrokePoint,
  type Tool,
} from "./types";
import {
  initFourierSketch,
  type FourierSketchController,
} from "./fourier-sketch";

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
  {
    stage: "송신",
    action: "감정을 '그림·글'로 표현",
    feeling: '"내 마음을 전송한다"',
  },
  {
    stage: "변환",
    action: "Fourier로 파형화",
    feeling: '"내 마음이 신호로 바뀐다"',
  },
  {
    stage: "수신",
    action: "Fourier를 재생",
    feeling: '"상대의 감정이 내 앞에서 풀린다"',
  },
];

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

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
  const [canvasSize, setCanvasSize] = useState({ width: 720, height: 480 });

  const fourierDemoRef = useRef<HTMLDivElement>(null);
  const fourierSketchRef = useRef<FourierSketchController | null>(null);

  const [fourierBackgroundColor, setFourierBackgroundColor] = useState("#000000");
  const [fourierEpicycleColor, setFourierEpicycleColor] = useState("#50a0ff");
  const [fourierEpicycleAlpha, setFourierEpicycleAlpha] = useState(120);
  const [fourierPathColor, setFourierPathColor] = useState("#ffb6dc");
  const [fourierPathAlpha, setFourierPathAlpha] = useState(255);

  // 색상 입력 normalize/validation
  const normalizedBrushHex = normalizeHex(customBrushHex);
  const normalizedBackgroundHex = normalizeHex(backgroundHexInput);
  const isCustomBrushHexValid = HEX_PATTERN.test(normalizedBrushHex);
  const isBackgroundHexValid = HEX_PATTERN.test(normalizedBackgroundHex);

  const normalizedTextHex = normalizeHex(customTextHex);
  const isCustomTextHexValid = HEX_PATTERN.test(normalizedTextHex);

  const activeFontOption = useMemo(
    () =>
      FONT_OPTIONS.find((option) => option.id === fontFamily) ??
      FONT_OPTIONS[0],
    [fontFamily],
  );

  // 색상 적용 관련
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
      prev.includes(normalizedBrushHex) ? prev : [...prev, normalizedBrushHex],
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
        drawSegment(
          absolutePoint,
          previousPoint,
          stroke.mode,
          stroke.color,
          lineWidth,
        );
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
        Math.min(
          1,
          ((point.x - start.x) * dx + (point.y - start.y) * dy) /
            (dx * dx + dy * dy),
        ),
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

        const strokeWidth = Math.max(
          stroke.sizeRatio * canvasSize.width * dpr,
          STROKE_ERASER_MIN_PX * dpr,
        );

        for (let i = 0; i < stroke.points.length; i += 1) {
          const currentPoint = {
            x: stroke.points[i].x * canvasSize.width * dpr,
            y: stroke.points[i].y * canvasSize.height * dpr,
          };

          if (stroke.points.length === 1) {
            if (
              Math.hypot(
                currentPoint.x - target.x,
                currentPoint.y - target.y,
              ) <= strokeWidth
            ) {
              return true;
            }
          } else if (i > 0) {
            const previousPoint = {
              x: stroke.points[i - 1].x * canvasSize.width * dpr,
              y: stroke.points[i - 1].y * canvasSize.height * dpr,
            };
            if (
              distanceToSegment(target, previousPoint, currentPoint) <=
              strokeWidth
            ) {
              return true;
            }
          }
        }

        return false;
      });

      if (hitIndex === -1) return;

      updateStrokeState((prev) =>
        prev.filter((_, index) => index !== hitIndex),
      );
    },
    [canvasSize.height, canvasSize.width, distanceToSegment, updateStrokeState],
  );

  // 템플릿 변경 시 색/팔레트 초기화
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

  // 캔버스 사이즈 갱신
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

  // front canvas 픽셀 사이즈 & 리드로우
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

  // 템플릿이 바뀌면 앞면 드로잉 초기화
  useEffect(() => {
    if (lastTemplateIdRef.current !== template.id) {
      resetFrontCanvas();
      lastTemplateIdRef.current = template.id;
    }
  }, [resetFrontCanvas, template.id]);

  // 앞/뒤면 전환 시 드로잉 상태 정리
  useEffect(() => {
    isDrawingRef.current = false;
    previousPointRef.current = null;
  }, [activeSide]);

  // strokes 상태 바뀔 때마다 캔버스 리드로우
  useEffect(() => {
    redrawStrokes();
  }, [redrawStrokes, strokes]);

  // 포인터 이벤트 핸들러
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

      drawSegment(
        absolutePoint,
        previousPoint,
        stroke.mode,
        stroke.color,
        lineWidth,
      );

      previousPointRef.current = absolutePoint;
    },
    [activeSide, canvasSize.width, drawSegment, handleStrokeErase, tool],
  );

  const stopDrawing = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
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
    },
    [updateStrokeState],
  );

  // 뒷면 렌더링
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

    // 장식 라인 색 (현재는 구분선 없음)
    ctx.strokeStyle = template.lineColor;
    ctx.lineWidth = 2 * dpr;

    // 우표 영역
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

    // 받는 사람
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

    // 메시지/시그니처
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

      const availableHeight = Math.max(
        heightPx - margin * 2 - signatureReserve,
        0,
      );
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

  // 메시지 입력 시, 실제 엽서 영역에 들어갈 수 있을 때만 허용
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

      const availableHeight = Math.max(
        heightPx - margin * 2 - signatureReserve,
        0,
      );
      const maxLines = Math.max(Math.floor(availableHeight / lineHeight), 0);

      const fittingPrefix = computeFittingPrefixLength(
        ctx,
        next,
        writingWidth,
        maxLines,
      );

      if (fittingPrefix >= next.length && next.length <= MESSAGE_LIMIT) {
        setMessage(next);
      }
      // 초과 입력은 무시
    },
    [activeFontOption, canvasSize.height, canvasSize.width, signature],
  );

  // status 토스트 정리
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

  // 앞/뒷면 고해상도 스냅샷 생성 (PNG/PDF용)
  const createFrontExportSnapshot = useCallback(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return null;

    const baseWidthPx = Math.max(
      1,
      Math.floor(canvasSize.width * dprRef.current),
    );
    const baseHeightPx = Math.max(
      1,
      Math.floor(canvasSize.height * dprRef.current),
    );

    const scale = 3; // 3배 해상도
    const exportWidth = baseWidthPx * scale;
    const exportHeight = baseHeightPx * scale;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, exportWidth, exportHeight);

    // 배경
    ctx.fillStyle = frontBackgroundColor;
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // 드로잉 재렌더링 (정규화 좌표 사용)
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
    const baseWidthPx = Math.max(
      1,
      Math.floor(canvasSize.width * dprRef.current),
    );
    const baseHeightPx = Math.max(
      1,
      Math.floor(canvasSize.height * dprRef.current),
    );

    const scale = 3;
    const widthPx = baseWidthPx * scale;
    const heightPx = baseHeightPx * scale;

    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const dpr = dprRef.current * scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, widthPx, heightPx);

    ctx.fillStyle = frontBackgroundColor;
    ctx.fillRect(0, 0, widthPx, heightPx);

    const margin = 48 * dpr;
    ctx.strokeStyle = template.lineColor;
    ctx.lineWidth = 2 * dpr;

    // 우표
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

    // 받는 사람
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

    // 메시지
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

      const availableHeight = Math.max(
        heightPx - margin * 2 - signatureReserve,
        0,
      );
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
        side === "front"
          ? createFrontExportSnapshot()
          : createBackExportSnapshot();
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

  // Fourier p5 데모 초기화
  useEffect(() => {
    if (!fourierDemoRef.current) return;
    const controller = initFourierSketch(fourierDemoRef.current);
    fourierSketchRef.current = controller;
    return () => {
      controller.cleanup();
      fourierSketchRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = fourierSketchRef.current;
    if (!controller) return;
    controller.updateStyles({
      backgroundColor: fourierBackgroundColor,
      epicycleColor: fourierEpicycleColor,
      epicycleAlpha: fourierEpicycleAlpha,
      pathColor: fourierPathColor,
      pathAlpha: fourierPathAlpha,
    });
  }, [
    fourierBackgroundColor,
    fourierEpicycleColor,
    fourierEpicycleAlpha,
    fourierPathColor,
    fourierPathAlpha,
  ]);

  return (
    <div className="min-h-dvh overflow-y-auto bg-gradient-to-br from-[#fdf2ec] via-white to-[#f4f9ff] text-slate-900">
      {/* Hero 섹션 */}
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
          </div>
        </div>
        <div className="relative flex-1 rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-2xl shadow-rose-100/80 backdrop-blur-md">
          <div className="text-sm font-medium text-rose-500">서비스 키워드</div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>• 직접 그릴 수 있는 앞면 캔버스</li>
            <li>• 감성적인 뒷면 메시지 레이아웃</li>
            <li>• PNG &amp; PDF 다운로드 지원</li>
            <li>• Fourier 기반 감정 파형 시각화 데모</li>
          </ul>
        </div>
      </section>

      {/* 엽서 빌더 */}
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

              {/* Fourier 데모 블록 (Shiffman 스타일 epicycles) */}
              <section className="space-y-5 rounded-[28px] border border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 p-5 shadow-inner shadow-white/70">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">
                    Fourier Sketch
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    직접 그린 선을 Fourier epicycles로 다시 그리기
                  </h3>
                  <p className="text-sm text-slate-600">
                    아래 캔버스 위에 자유롭게 그림을 그린 뒤 마우스를 떼면,
                    그 궤적이 복소수 신호로 변환되고, 여러 개의 원 궤적
                   (epicycles)이 합쳐져 원래 그림을 다시 그리는 과정을 볼 수
                    있습니다.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-900/30 bg-slate-950/90 p-3 shadow-2xl shadow-slate-900/60">
                  <div
                    ref={fourierDemoRef}
                    className="h-80 w-full rounded-xl bg-black"
                  />
                  <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-[0.7rem] text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">
                        Background
                      </span>
                      <input
                        type="color"
                        value={fourierBackgroundColor}
                        onChange={(event) =>
                          setFourierBackgroundColor(event.target.value)
                        }
                        className="h-8 w-8 cursor-pointer rounded-full border border-white/30 bg-white/10 p-1"
                        aria-label="Fourier background color"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">
                        Epicycle
                      </span>
                      <input
                        type="color"
                        value={fourierEpicycleColor}
                        onChange={(event) =>
                          setFourierEpicycleColor(event.target.value)
                        }
                        className="h-8 w-8 cursor-pointer rounded-full border border-white/30 bg-white/10 p-1"
                        aria-label="Epicycle color"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[0.6rem] text-slate-400">
                      <span className="uppercase tracking-[0.4em]">
                        Epicycle opacity
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={255}
                        value={fourierEpicycleAlpha}
                        onChange={(event) =>
                          setFourierEpicycleAlpha(Number(event.target.value))
                        }
                        className="h-1 flex-1 cursor-pointer accent-rose-400"
                      />
                      <span className="min-w-[36px] text-right">
                        {fourierEpicycleAlpha}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">
                        Path
                      </span>
                      <input
                        type="color"
                        value={fourierPathColor}
                        onChange={(event) =>
                          setFourierPathColor(event.target.value)
                        }
                        className="h-8 w-8 cursor-pointer rounded-full border border-white/30 bg-white/10 p-1"
                        aria-label="Path color"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[0.6rem] text-slate-400">
                      <span className="uppercase tracking-[0.4em]">
                        Path opacity
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={255}
                        value={fourierPathAlpha}
                        onChange={(event) =>
                          setFourierPathAlpha(Number(event.target.value))
                        }
                        className="h-1 flex-1 cursor-pointer accent-rose-400"
                      />
                      <span className="min-w-[36px] text-right">
                        {fourierPathAlpha}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => fourierSketchRef.current?.clearSketches()}
                        className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-white/20"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  마우스를 누른 채로 선을 그리고, 손을 떼면 Fourier 변환 결과가
                  epicycles로 재생됩니다. 원의 반지름과 회전 속도(freq, amp,
                  phase)가 합쳐져서 원래 궤적(path)을 복원하는 모습을 관찰할 수
                  있습니다.
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>

      {/* 전달 구조 설명 (기획용 표) */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-200/60">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-400">
              Transmission Map
            </p>
            <h3 className="text-2xl font-semibold text-slate-900">
              This-is-for-U 전달 구조
            </h3>
            <p className="text-sm text-slate-600">
              감정을 ‘그림·글’로 표현하고 → Fourier 계수를 통해 파형으로
              변환하고 → 수신자가 재생하는 3단계를 표로 정리했어요. (amp, freq,
              phase) 배열은 추후 확장 시 metadata.json 형태로도 담을 수
              있습니다.
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
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.stage}
                    </td>
                    <td className="px-4 py-3">{row.action}</td>
                    <td className="px-4 py-3 text-rose-500">{row.feeling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 rounded-2xl bg-gradient-to-r from-rose-50 to-white p-4 text-sm font-medium text-rose-500">
            보내는 이는 감정을 수학으로 부호화하고, 받는 이는 그것을
            시각·청각적으로 복원한다.
          </p>
        </div>
      </section>

      {/* 이메일 전송 (기획 placeholder) */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <EmailDeliveryPlaceholder />
      </section>

      {/* 토스트 메시지 */}
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
        • SMTP 또는 트랜잭셔널 메일 서비스 연동 · 발신자 인증 · 보내기 전
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
      lines += 1;
      if (lines > maxLines) return used;
      used += 1; // newline
      continue;
    }

    const words = paragraph.trim().split(/\s+/);
    let currentLine = "";

    for (let w = 0; w < words.length; w += 1) {
      const word = words[w];
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (ctx.measureText(candidate).width > maxWidth && currentLine) {
        lines += 1;
        if (lines > maxLines) return used;

        currentLine = word;
        used += word.length + 1;
      } else {
        used += currentLine ? word.length + 1 : word.length;
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines += 1;
      if (lines > maxLines) return used;
    }

    if (p < paragraphs.length - 1) {
      used += 1;
    }
  }

  return text.length;
}
