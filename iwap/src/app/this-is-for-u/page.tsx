"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import GraffitiToolbar, { ERASER_TOKEN } from "@/components/graffiti/GraffitiToolbar";
import GraffitiToolbarMobile from "@/components/graffiti/GraffitiToolbarMobile";
import FullScreenView from "@/components/ui/FullScreenView";
import { initFourierSketch, type FourierSketchController } from "@/components/this-is-for-u/fourier-sketch";
import { ProjectIntroModal } from '@/components/sections/ProjectIntroSections';
import { SendAnimation } from "@/components/this-is-for-u/SendAnimation";
import { FrontPreview } from "@/components/this-is-for-u/FrontPreview";
import { BackPreview } from "@/components/this-is-for-u/BackPreview";
import { textToContours, type TextContour } from "@/components/this-is-for-u/textToContours";

/* ===========================
   INTERNAL PREVIEW COMPONENTS
   =========================== */

  async function canvasToMp4(canvas: HTMLCanvasElement, duration = 3000) {
  const stream = canvas.captureStream(30); // 30fps
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  recorder.start();

  await new Promise((resolve) => setTimeout(resolve, duration));
  recorder.stop();

  return await new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
  });
}




/* ===========================
       END INTERNAL COMPONENTS
   =========================== */

type SketchStyles = {
  backgroundColor: string;
  epicycleColor: string;
  epicycleAlpha: number;
  showEpicycles: boolean;
  pathColor: string;
  pathAlpha: number;
  pathWidth: number;
};

const DEFAULT_STYLES: SketchStyles = {
  backgroundColor: "#000000",
  epicycleColor: "#50a0ff",
  epicycleAlpha: 2040,
  showEpicycles: true,
  pathColor: "#ffb6dc",
  pathAlpha: 255,
  pathWidth: 15,
};

const COLOR_PALETTE = ["#FA4051", "#FDD047", "#2FB665", "#FFFFFF", "#000000"];
const BACKGROUND_COLORS = ["#FFFFFF", "#FFFEF0", "#FEF2F2", "#DBEAFE", "#0F172A", "#000000"];
const FONT_URL = "/fonts/static/Pretendard-Regular.otf";
const PREVIEW_SIZE = { width: 600, height: 375 };

export default function ThisIsForUPage() {
  const { theme } = useTheme();
  const [prevPhase, setPrevPhase] = useState<Phase | null>(null);

  const frontContainerRef = useRef<HTMLDivElement | null>(null);
  const backContainerRef = useRef<HTMLDivElement | null>(null);
  const frontInitRef = useRef(false);
  const backInitRef = useRef(false);
  const colorPickerRef = useRef<HTMLInputElement | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [frontController, setFrontController] = useState<FourierSketchController | null>(null);
  const [backController, setBackController] = useState<FourierSketchController | null>(null);
  const [styles, setStyles] = useState<SketchStyles>(DEFAULT_STYLES);
  const [activeSketchCount, setActiveSketchCount] = useState(0);
  const [isFrontReady, setIsFrontReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  type Phase =
  | "front-draw"
  | "front-fourier"
  | "back-write"
  | "back-fourier"
  | "preview"
  | "sent";

const [phase, setPhase] = useState<Phase>("front-draw");
  const [textCanvasMessage, setTextCanvasMessage] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [isTextProcessing, setIsTextProcessing] = useState(false);

  const [brushColor, setBrushColor] = useState(DEFAULT_STYLES.pathColor);
  const [brushSize, setBrushSize] = useState(DEFAULT_STYLES.pathWidth);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [pendingCustomColor, setPendingCustomColor] = useState<string | null>(null);
  const [tokenWords, setTokenWords] = useState<string[]>([]);
  const [activeTokenIndex, setActiveTokenIndex] = useState(0);
  const postcardDate = useMemo(() => new Date().toLocaleDateString(), []);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [frontSketches, setFrontSketches] = useState<
    ReturnType<FourierSketchController["getOriginalSketches"]>
  >([]);
  const [backSketches, setBackSketches] = useState<
    ReturnType<FourierSketchController["getOriginalSketches"]>
  >([]);
  const [showOriginalPreview, setShowOriginalPreview] = useState(false);
  const [showPngPreview, setShowPngPreview] = useState(false);
  const [frontPreviewPng, setFrontPreviewPng] = useState<string | null>(null);
  const [backPreviewPng, setBackPreviewPng] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendStage, setSendStage] = useState<"idle" | "insert" | "closing" | "closed">("idle");
  const isBackside = phase === "back-write" || phase === "back-fourier";
  const isPreview = phase === "preview";
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");

  const frontCanvas = frontContainerRef.current?.querySelector("canvas");
  const backCanvas = backContainerRef.current?.querySelector("canvas");
  const [previewSize, setPreviewSize] = useState({ width: 600, height: 375 });
  const [recipientEmail, setRecipientEmail] = useState("");


  // const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const canSendPostcard =
    frontSketches.length > 0 || backSketches.length > 0 || textCanvasMessage.trim().length > 0;
  const sendButtonClass = `rounded-full bg-emerald-500 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500/80${
    canSendPostcard ? "" : " opacity-50 cursor-not-allowed"
  }`;
  

  useEffect(() => {
    if (!frontContainerRef.current || frontInitRef.current) return;
    frontInitRef.current = true;
    setIsFrontReady(false);
    const sketchController = initFourierSketch(frontContainerRef.current);
    setFrontController(sketchController);
    setIsFrontReady(true);

    return () => {
      sketchController.cleanup();
      setFrontController(null);
      setIsFrontReady(false);
      setActiveSketchCount(0);
      frontInitRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!backContainerRef.current || backInitRef.current) return;
    backInitRef.current = true;
    // back canvas initialization
    const sketchController = initFourierSketch(backContainerRef.current);
    setBackController(sketchController);
    // back canvas initialization complete

    return () => {
      sketchController.cleanup();
      setBackController(null);
      // back canvas cleanup
      backInitRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!frontController) return;
    frontController.updateStyles(styles);
  }, [frontController, styles]);

  useEffect(() => {
    if (!backController) return;
    backController.updateStyles(styles);
  }, [backController, styles]);

  const refreshActiveCount = useCallback(() => {
    if (!frontController) {
      setActiveSketchCount(0);
      return;
    }
    setActiveSketchCount(frontController.getFourierCoefficients().length);
  }, [frontController]);

  const snapshotFrontSketches = useCallback(() => {
    if (!frontController) return [];
    return frontController.getOriginalSketches();
  }, [frontController]);

  const storeFrontSketches = useCallback(() => {
    const originals = snapshotFrontSketches();
    if (!originals.length) return;
    setFrontSketches(originals);
  }, [snapshotFrontSketches, setFrontSketches]);

  const storeBackSketches = useCallback(() => {
    if (!backController) return;
    const originals = backController.getOriginalSketches();
    if (!originals.length) return;
    setBackSketches(originals);
  }, [backController, setBackSketches]);

  const handleConfirmSketches = useCallback(() => {
    frontController?.confirmSketches();
    refreshActiveCount();
    setIsPlaying(false);
    if (phase === "front-draw") {
      storeFrontSketches();
    } else if (phase === "back-write") {
      storeBackSketches();
    }
  }, [frontController, refreshActiveCount, phase, storeBackSketches, storeFrontSketches]);

  const handleStart = useCallback(() => {
    if (phase === "back-write" || phase === "back-fourier") {
      backController?.startPlayback();
      setIsPlaying(true);
      setPhase("back-fourier");
      return;
    }
    if (!frontController) return;
    // 앞면 드로잉에서 시작하면 Fourier 모드로 전환
    if (phase === "front-draw") {
      handleConfirmSketches();
      setPhase("front-fourier");
    }
    frontController.startPlayback();
    const count = frontController.getFourierCoefficients().length;
    setFrontSketches(frontController.getOriginalSketches());
    refreshActiveCount();
    setIsPlaying(count > 0);
  }, [
    backController,
    frontController,
    handleConfirmSketches,
    phase,
    refreshActiveCount,
    setFrontSketches,
  ]);

  const handleStop = useCallback(() => {
    frontController?.stopPlayback();
    backController?.stopPlayback();
    setIsPlaying(false);
  }, [frontController, backController]);

  const handleClearSketches = useCallback(() => {
    frontController?.clearSketches();
    setActiveSketchCount(0);
    setIsPlaying(false);
    setTokenWords([]);
    setActiveTokenIndex(0);
    setFrontSketches([]);
    setBackSketches([]);
    setPhase("front-draw");
  }, [frontController, setBackSketches, setFrontSketches]);

  const handleUndo = useCallback(() => {
    if (!frontController) return;
    // Clear current in-controller sketches only
    frontController.clearSketches();
    setIsPlaying(false);
    // Rehydrate previously locked front sketches so they don't disappear
    if (frontSketches.length) {
      frontSketches.forEach((sketch) => {
        frontController.addCustomSketch(sketch.points, {
          pathColor: sketch.pathColor,
          pathAlpha: sketch.pathAlpha,
          pathWidth: sketch.pathWidth,
          startDelay: sketch.startDelay,
        });
      });
      frontController.confirmSketches();
      setActiveSketchCount(frontSketches.length);
    } else {
      setActiveSketchCount(0);
    }
  }, [frontController, frontSketches]);

  const handleDownloadJson = useCallback(() => {
    if (!frontController) return;
    const data = frontController.getFourierCoefficients();
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
  }, [frontController]);

  // 현재 면(앞/뒤) 캔버스를 PNG로 저장
  const handleSavePng = useCallback(() => {
    const container = (isBackside ? backContainerRef.current : frontContainerRef.current) as
      | HTMLElement
      | null;
    if (!container) return;
    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    const prevAlpha = styles.epicycleAlpha;
    const prevVisibility = styles.showEpicycles ?? true;
    const targetController = isBackside ? backController : frontController;

    setStyles((prev) => ({
      ...prev,
      showEpicycles: false,
      epicycleAlpha: 0,
    }));
    targetController?.updateStyles({ showEpicycles: false, epicycleAlpha: 0 });

    requestAnimationFrame(() => {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = isBackside ? "postcard-back.png" : "postcard-front.png";
      link.click();

      requestAnimationFrame(() => {
        setStyles((prev) => ({
          ...prev,
          showEpicycles: prevVisibility,
          epicycleAlpha: prevAlpha,
        }));
        targetController?.updateStyles({
          showEpicycles: prevVisibility,
          epicycleAlpha: prevAlpha,
        });
      });
    });
  }, [backController, frontController, isBackside, styles.epicycleAlpha, styles.showEpicycles]);

  // 엽서(앞/뒤 스케치 + 메타데이터) 저장
  const handleSavePostcard = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      backgroundColor: styles.backgroundColor,
      recipientName,
      senderName,
      message: textCanvasMessage,
      tokens: tokenWords,
      front: frontSketches,
      back: backSketches,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "postcard.json";
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }, [backSketches, frontSketches, recipientName, senderName, styles.backgroundColor, textCanvasMessage, tokenWords]);

  const handleBrushColorChange = useCallback((color: string) => {
    const isEraser = color === ERASER_TOKEN;
    setBrushColor(color);
    setStyles((prev) => {
      const paintColor = isEraser ? prev.backgroundColor : color;
      return {
        ...prev,
        pathColor: paintColor,
        epicycleColor: paintColor,
      };
    });
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
    setStyles((prev) => ({ ...prev, pathColor: pendingCustomColor }));
    setPendingCustomColor(null);
  }, [pendingCustomColor]);

  const handleEpicycleColorChange = useCallback((color: string) => {
    setStyles((prev) => ({
      ...prev,
      epicycleColor: color,
    }));
  }, []);

  const handleRemoveCustomColor = useCallback(
    (color: string) => {
      setCustomColors((prev) => prev.filter((c) => c.toLowerCase() !== color.toLowerCase()));
      if (brushColor.toLowerCase() === color.toLowerCase()) {
        handleBrushColorChange(DEFAULT_STYLES.pathColor);
      }
    },
    [brushColor, handleBrushColorChange],
  );

  const readyAction = Boolean(frontController && isFrontReady);

  const showBackgroundPalette = !isPlaying && activeSketchCount === 0 && !isPreview;

  const isDarkBg = styles.backgroundColor === "#0F172A" || styles.backgroundColor === "#000000";

  useEffect(() => {
    if (isBackside || isPreview) {
      handleStop();
    }
  }, [isBackside, isPreview, handleStop]);

  const handleBackgroundChange = useCallback((color: string) => {
    setStyles((prev) => ({
      ...prev,
      backgroundColor: color,
    }));
  }, []);

  useEffect(() => {
    if (brushColor !== ERASER_TOKEN) return;
    setStyles((prev) => {
      const matchesBackground =
        prev.pathColor === prev.backgroundColor && prev.epicycleColor === prev.backgroundColor;
      if (matchesBackground) return prev;
      return {
        ...prev,
        pathColor: prev.backgroundColor,
        epicycleColor: prev.backgroundColor,
      };
    });
  }, [brushColor, styles.backgroundColor]);

const handleRestoreFront = () => {
  if (!frontController || !frontSketches.length) return;
  frontController.stopPlayback();
  setIsPlaying(false);
  frontController.clearSketches();
  // 원본 스트로크만 다시 넣음
  frontSketches.forEach((s) => {
    frontController.addCustomSketch(s.points, {
      pathColor: s.pathColor,
      pathAlpha: s.pathAlpha,
      pathWidth: s.pathWidth,
      startDelay: s.startDelay,
    });
  });
  // confirmSketches() 호출하지 않음 → fourier 모드로 안 넘어감
};



const layoutAndApplySentence = useCallback(
  (
    contourGroups: TextContour[][],
    override?: { pathWidth?: number; pathAlpha?: number; pathColor?: string; scale?: number },
  ) => {
    if (!backController) return;
    backController.clearSketches();
    const scale = override?.scale ?? 1;
      const maxLineWidth = PREVIEW_SIZE.width;
      const lineHeight = 80;
      const wordSpacing = 24;

    type LineWord = { contours: TextContour[]; width: number };
    const lines: { words: LineWord[]; width: number }[] = [];
    let currentLine: LineWord[] = [];
    let currentWidth = 0;

    const pushLine = () => {
      if (currentLine.length) {
        lines.push({ words: currentLine, width: currentWidth });
        currentLine = [];
        currentWidth = 0;
      }
    };

    contourGroups.forEach((wordContours: TextContour[]) => {
      if (!wordContours.length) return;
      let minX = Infinity;
      let maxX = -Infinity;
      wordContours.forEach((c: TextContour) =>
        c.forEach((p: { x: number; y: number }) => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
        }),
      );
      const wordW = (maxX - minX) * scale;
      const nextWidth = currentWidth === 0 ? wordW : currentWidth + wordSpacing + wordW;
      if (nextWidth > maxLineWidth && currentLine.length) {
        pushLine();
      }
      currentLine.push({ contours: wordContours, width: wordW });
      currentWidth = currentWidth === 0 ? wordW : currentWidth + wordSpacing + wordW;
    });
    pushLine();

      const totalHeight = lines.length * lineHeight;
      const lineStartY = -totalHeight / 2;
      lines.forEach((line, lineIdx) => {
        // Fourier 중심에 정확히 놓기 위한 중앙 배치
        let cursorX = -line.width / 2;
        const cursorY = lineStartY + lineIdx * lineHeight;

      line.words.forEach(({ contours, width }) => {
        let minX = Infinity;
        let minY = Infinity;
        contours.forEach((c: TextContour) =>
          c.forEach((p: { x: number; y: number }) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
          }),
        );
        const shifted = contours.map((c) =>
          c.map((p) => ({
            x: (p.x - minX) * scale + cursorX,
            y: (p.y - minY) * scale + cursorY,
          })),
        );
        shifted.forEach((points) => {
          backController.addCustomSketch(points, {
            pathColor: override?.pathColor ?? styles.pathColor,
            pathAlpha: override?.pathAlpha ?? styles.pathAlpha,
            pathWidth: override?.pathWidth ?? styles.pathWidth,
            startDelay: 0,
          });
        });
        cursorX += width + wordSpacing;
      });
    });

    backController.confirmSketches();
    backController.startPlayback();
    refreshActiveCount();
    setIsPlaying(true);
    storeBackSketches();
  },
  [
    backController,
    refreshActiveCount,
    storeBackSketches,
    styles.pathAlpha,
    styles.pathColor,
    styles.pathWidth,
    textAlign,
  ],
);


const handleTextToFourier = useCallback(async () => {
  if (!backController) return;

  const text = textCanvasMessage.trim();
  if (!text) return;

  setIsTextProcessing(true);

  try {
    // 1) 정확히 5글자씩 토큰 분할
    const tokens = text.match(/.{1,5}/g) ?? [];

    type WordBundle = { contours: TextContour[]; width: number };

    const bundles: WordBundle[] = [];

    // 2) 각 토큰을 contour로 변환
    for (const token of tokens) {
      const contours = await textToContours(token, {
        boxWidth: 400,
        boxHeight: 450,
      });

      if (!contours.length) continue;

      // width 계산
      let minX = Infinity;
      let maxX = -Infinity;
      contours.forEach((c) =>
        c.forEach((p) => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
        }),
      );

      bundles.push({
        contours,
        width: (maxX - minX) || 1,
      });
    }

    // 3) 5글자씩 2줄로 제한
    const lines: WordBundle[][] = [];
    for (let i = 0; i < bundles.length && lines.length < 2; i++) {
      const lineIndex = Math.floor(i / 1); // 1토큰 = 1줄 (이미 토큰은 5글자)
      if (!lines[lineIndex]) lines[lineIndex] = [];
      lines[lineIndex].push(bundles[i]);
    }

    // 4) Fourier 배치를 위해 이전 내용 제거
    backController.clearSketches();

    const LINE_HEIGHT = 120;
    const totalLines = lines.length;
    const startY = -(totalLines - 1) * LINE_HEIGHT * 0.5;

    // 5) 각 줄 전체 중앙 정렬 후 Fourier로 변환
    lines.forEach((line, row) => {
      const lineWidth = line.reduce((acc, b) => acc + b.width, 0);
      let cursorX = -lineWidth / 2; // 중앙 정렬

      const y = startY + row * LINE_HEIGHT;

      line.forEach((bundle) => {
        // 각 글자 → minX, minY 원점 이동 후 배치
        let minX = Infinity;
        let minY = Infinity;
        bundle.contours.forEach((c) =>
          c.forEach((p) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
          }),
        );

        const shifted = bundle.contours.map((c) =>
          c.map((p) => ({
            x: (p.x - minX) + cursorX,
            y: (p.y - minY) + y,
          })),
        );

        // Fourier stroke 추가
        shifted.forEach((points) => {
          backController.addCustomSketch(points, {
            pathColor: styles.pathColor,
            pathAlpha: styles.pathAlpha,
            pathWidth: 1.2, // 얇게
            startDelay: 0,
          });
        });

        cursorX += bundle.width;
      });
    });

    // 6) Fourier 시작
    backController.confirmSketches();
    backController.startPlayback();

    refreshActiveCount();
    setIsPlaying(true);
    storeBackSketches();
    setPhase("back-fourier");
  } catch (err) {
    console.error(err);
  } finally {
    setIsTextProcessing(false);
  }
}, [
  backController,
  refreshActiveCount,
  setIsPlaying,
  storeBackSketches,
  styles.pathAlpha,
  styles.pathColor,
  textCanvasMessage,
]);

  const handleGoToBackside = useCallback(() => {
    handleConfirmSketches();
    handleStop();
    setPhase("back-write");
  }, [handleConfirmSketches, handleStop]);

  const handleTextPlay = useCallback(() => {
    if (!backController) return;
    backController.startPlayback();
    setIsPlaying(true);
  }, [backController]);

  const handleTextStop = useCallback(() => {
    backController?.stopPlayback();
    setIsPlaying(false);
  }, [backController]);
  
  const handlePreviewToggleSide = useCallback(() => {
  setPreviewSide((prev) => (prev === "front" ? "back" : "front"));
}, []);


  const toggleTextPlayback = useCallback(() => {
  if (isPlaying) {
    handleTextStop();
  } else {
    handleTextPlay();
  }
}, [handleTextPlay, handleTextStop, isPlaying]);


  const captureCanvasDataUrl = useCallback((container: HTMLElement | null) => {
    if (!container) return null;
    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  }, []);

const handleShowPreview = useCallback(() => {
  storeBackSketches();

  const frontCanvas = frontContainerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
  const backCanvas = backContainerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;

  // 기본 front 기준
  const base = frontCanvas ?? backCanvas;

  if (base) {
    setPreviewSize({ width: base.width, height: base.height });
  }

  const frontPng = captureCanvasDataUrl(frontContainerRef.current);
  const backPng = captureCanvasDataUrl(backContainerRef.current);

  setFrontPreviewPng(frontPng);
  setBackPreviewPng(backPng);

  setShowPngPreview(true);
  handleStop();
  setPrevPhase(phase);
  setPhase("preview");
}, [
  phase,
  captureCanvasDataUrl,
  handleStop,
  storeBackSketches
]);

const handleClosePreview = () => {
  setShowPngPreview(false);
  if (prevPhase) {
    setPhase(prevPhase);
  } else {
    setPhase("front-draw");
  }
};
const handleSendPostcard = async () => {
  const frontCanvas = frontContainerRef.current?.querySelector("canvas");
  const backCanvas = backContainerRef.current?.querySelector("canvas");

  if (!frontCanvas || !backCanvas) {
    alert("캔버스를 찾을 수 없습니다.");
    return;
  }

  if (!recipientEmail.includes("@")) {
    alert("기능 구현 중 입니다.");
    return;
  }

  // 애니메이션을 재생 상태로 만들어야 Fourier가 움직임
  frontController?.startPlayback();
  backController?.startPlayback();

  // webm으로 캡처 — 브라우저는 mp4 불가능
  const frontVideoBlob = await canvasToMp4(frontCanvas, 3000);
  const backVideoBlob = await canvasToMp4(backCanvas, 3000);

  const formData = new FormData();
  formData.append("templateId", "this-is-for-u");
  formData.append("templateName", "Custom Postcard");
  formData.append("createdAt", new Date().toISOString());
  formData.append("frontBackground", styles.backgroundColor);

  // 이메일 제대로 넣기
  formData.append("recipient", recipientEmail);

  formData.append("sender", senderName);
  formData.append("message", textCanvasMessage);

  // webm 그대로 보내야 FastAPI가 처리 가능
  formData.append(
    "frontMp4",
    new File([frontVideoBlob], "front.webm", { type: "video/webm" })
  );
  formData.append(
    "backMp4",
    new File([backVideoBlob], "back.webm", { type: "video/webm" })
  );

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/postcards/send`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(text);
      alert("전송 실패: " + text);
      return;
    }

    alert("메일 전송 완료!");

  } catch (err) {
    console.error(err);
    alert("메일 전송 중 오류");
  }
};

  const handleSendAnim = useCallback(() => {
    if (isSending) return;
    setIsSending(true);
    setSendStage("insert");
    setTimeout(() => setSendStage("closing"), 600);
    setTimeout(() => setSendStage("closed"), 1200);
    setTimeout(() => {
      setIsSending(false);
      setSendStage("idle");
    }, 2000);
  }, [isSending]);

  const handleResetToFront = useCallback(() => {
    setPhase("front-draw");
    handleStop();
  }, [handleStop]);

  const handlePrimaryAction = useCallback(() => {
    if (isPlaying) {
      handleStop();
      return;
    }
    if (phase === "back-write") {
      handleTextToFourier();
      return;
    }
    handleStart();
  }, [handleStart, handleStop, handleTextToFourier, isPlaying, phase]);

  const handleToggleSide = useCallback(() => {
    handleStop();
    setPhase(isBackside ? "front-draw" : "back-write");
  }, [handleStop, isBackside]);

  const handleEditAction = useCallback(() => {
    handleStop();
    if (phase === "front-fourier") {
      handleRestoreFront();
      setPhase("front-draw");
    } else if (phase === "back-fourier") {
      setPhase("back-write");
    }
  }, [handleRestoreFront, handleStop, phase]);

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
      onUndo: handleUndo,
      onRedo: handleConfirmSketches,
      onClear: handleClearSketches,
      onSave: handleSavePng,
      onSaveWithVideo: handleSavePng,
      showSceneSave: false,
      paletteTone: "dark" as const,
      showEraser: false,
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
      handleUndo,
      handleRemoveCustomColor,
      handleSizeChange,
      handleSavePng,
    ],
  );

  const hasFrontContent = frontSketches.length > 0 || activeSketchCount > 0;
  const hasBackContent = backSketches.length > 0 || textCanvasMessage.trim().length > 0;
  const startDisabled =
    isPlaying
      ? false
      : (phase === "front-draw" && !readyAction) ||
        (phase === "front-fourier" && !hasFrontContent) ||
        (phase === "back-write" && !textCanvasMessage.trim()) ||
        (phase === "back-fourier" && !hasBackContent);
  const editDisabled = phase === "front-draw" || phase === "back-write";

  const handleTokenNavigate = useCallback(() => {
    // navigation disabled in sentence mode
  }, []);

const getButtons = () => {
  return {
    startStop: {
      label: isPlaying ? "정지" : "변환 시작",
      onClick: handlePrimaryAction,
    },
    toggleSide: {
      label: isBackside ? "앞면 전환" : "뒷면 전환",
      onClick: handleToggleSide,
    },
    edit: {
      disabled: editDisabled,
      onClick: handleEditAction,
    },
    preview: {
      onClick: handleShowPreview,
    }
  };
};
const { startStop, toggleSide, edit, preview } = getButtons();

  return (
    <div className="flex flex-col">
      <ProjectIntroModal
        projects={["this-is-for-u"]}
        open={showIntro}
        onClose={() => setShowIntro(false)}
      />
      <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)] overflow-hidden">
      <FullScreenView
        title="Th!s !s for u"
        subtitle="엽서 제작하기"
        goBack={true}
        backgroundUrl={theme === 'dark' ? "/images/bg-dark/this-is-for-u_dark.webp" : "/images/bg-light/this-is-for-u_light.webp"}
        darkBackground={theme === 'dark'}
        titleClassName="translate-y-[60px] translate-x-[9px] md:translate-x-0 md:translate-y-0 font-semibold"
        subtitleClassName="translate-y-[60px] translate-x-[10px] md:translate-x-0 md:translate-y-0 font-semilight"
        closeButtonClassName="translate-y-[60px] md:translate-y-0"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              theme === "dark"
                ? "linear-gradient(to bottom, rgba(139, 139, 188, 0), rgba(139, 139, 188, 0.8))"
                : "linear-gradient(to bottom, rgba(139, 139, 188, 0), rgba(139, 139, 188, 0.8))",
          }}
        ></div>

        <div className="relative z-90 flex flex-col items-center gap-6 md:mt-16 w-[90vw] max-w-[1200px] px-2">
              <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-center translate-y-[40px]">
                <div
  className={
    phase === "back-write"
      ? "hidden"
      : "relative flex-shrink-0 mx-auto w-[320px] h-[200px] md:w-[600px] md:h-[375px] border border-white/30 overflow-hidden"
  }
  style={
    isPreview
      ? {
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -74%)",
          zIndex: 2000,
        }
      : undefined
  }
>
                  <div
                    ref={frontContainerRef}
                    className={isPreview || isBackside ? "hidden" : "absolute inset-0"}
                    style={{ backgroundColor: styles.backgroundColor }}
                  />
                  <div
                    ref={backContainerRef}
                    className={!isPreview && phase === "back-fourier" ? "absolute inset-0" : "hidden"}
                    style={{ backgroundColor: styles.backgroundColor }}
                  />
                  {isPreview && (
  <div className="absolute inset-0 z-[2000] pointer-events-auto">

    {previewSide === "front" ? (
      <FrontPreview
        frontPreviewPng={frontPreviewPng}
        frontSketches={frontSketches}
        backgroundColor={styles.backgroundColor}
      />
    ) : (
      <BackPreview
        backPreviewPng={backPreviewPng}
        messageText={textCanvasMessage.trim()}
  recipientName={recipientName}
        backgroundColor={styles.backgroundColor}
textAlign={textAlign}
textColor={styles.pathColor}
textAlpha={styles.pathAlpha}
      />
    )}

    <button
      onClick={handleClosePreview}
      className="
        absolute top-2 right-2
        w-8 h-8 flex items-center justify-center
        bg-black/40 backdrop-blur-sm text-white rounded-full
        border border-white/40 hover:bg-black/60
      "
    >
      ×
    </button>

    <button
      onClick={handlePreviewToggleSide}
      className="
        absolute bottom-2 right-2
        px-3 py-1 text-xs text-white rounded-full border border-white/40
        bg-black/30 hover:bg-black/50
      "
    >
      {previewSide === "front" ? "Show back" : "Show front"}
    </button>
{/* ⬇ 새로 추가: 메일 전송 버튼 */}
    <button
      onClick={handleSendPostcard}
      className="
        absolute bottom-2 left-2
        px-4 py-2 rounded-full
        bg-emerald-500 text-white
        border border-white/40
        hover:bg-emerald-600
      "
    >
      메일로 보내기
    </button>
  </div>
)}

                  {!readyAction && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.4em] text-white/60">
                      Loading...
                    </div>
                  )}
                </div>
                {!isBackside && (
<div
  className="
    hidden md:flex
    flex-col gap-[5px]
    absolute
    translate-y-[97px] translate-x-[350px]
  "
  style={
    isPreview
      ? {
          top: "50%",
          transform: "translate(0px, -180px)", // 원하는 위치로 조정
          zIndex: 3000,
        }
      : undefined
  }
>

                    {BACKGROUND_COLORS.map((color) => {
                      const isActive = styles.backgroundColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleBackgroundChange(color)}
                          className={`w-[56px] h-[26px] border border-white transition ${isActive ? "opacity-70" : "opacity-100 hover:opacity-100"}`}
                          style={{ backgroundColor: color }}
                          aria-label={`Set background to ${color}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
{(phase === "front-draw" ||
  phase === "front-fourier" ||
  // phase === "back-write" ||
  // phase === "preview" ||
  phase === "back-fourier") && (
  <div
  className="flex flex-nowrap items-center justify-center gap-3 text-[10px] md:text-xs text-slate-200 z-90 translate-y-[32px] md:translate-y-[52px]"
>

    <button
      onClick={startStop.onClick}
      className="rounded-full bg-rose-500 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-rose-500/80"
    >
      {startStop.label}
    </button>

    <button
      onClick={toggleSide.onClick}
      className="rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white hover:border-white/60"
    >
      {toggleSide.label}
    </button>

    <button
      onClick={edit.onClick}
      disabled={edit.disabled}
      className={`rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white ${
        edit.disabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/60"
      }`}
    >
      수정
    </button>

    <button
      onClick={preview.onClick}
      className="rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white hover:border-white/60"
    >
      엽서 미리보기
    </button>

  </div>
)}


{/* 데스크탑 */}
{phase !== "preview" && !isBackside && (
  <>
    {/* 데스크탑 */}
    <div
      className="hidden md:flex w-full justify-center mt-4 translate-y-[25px]"
    >
      <GraffitiToolbar {...toolbarProps} />
    </div>

    {/* 모바일 */}
    <div className="block md:hidden w-full -translate-x-[8px] translate-y-[90px]">
      <GraffitiToolbarMobile {...toolbarProps} />
    </div>
  </>
)}

{phase === "back-write" && (
  <div className="absolute top-0 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 -translate-y-[300px] md:w-[400px] md:h-[750px] w-[80vw] flex justify-center z-40">

    {/* 카드 박스 */}
    <div
      className="
        text-slate-50
        w-[340px] h-auto
        md:w-[400px] md:h-auto
        md:px-4 py-6
        translate-y-[130px]
        -trasnslate-x-[5px] md:-trasnslate-x-[5px]
      "
      style={{
        background: "rgba(255, 255, 255, 0.40)",
        border: "1px solid #FFF",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >

      {/* 타이틀 */}
      <p className="text-[18px] md:text-[20px] text-white font-normal mb-3 pl-5">
        메세지를 작성하세요
      </p>

      {/* To 영역 */}
      <div className="flex items-center gap-2 text-sm text-white/70 mb-3 pl-5">
        <img src="/icons/To_white.svg" alt="To" className="w-[30px] h-[28px]" />

        <div className="relative">
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="받는 사람 이름"
            autoComplete="off"
            className="
              px-3 py-2
              w-[260px]
              text-[18px] font-normal
              text-white/70 bg-transparent outline-none border-0
              placeholder:text-white/70
            "
          />
          {/* 밑줄 */}
<div
  className="
    absolute left-0 bg-white
    w-[220px]        /* 기본: 모바일 */
    md:w-[290px]     /* md 이상에서 290px */
    h-[1px] 
    opacity-100
  "
  style={{ top: "42px" }}
/>
        </div>
      </div>


      {/* 텍스트 + 정렬 버튼 */}
      <div className="flex flex-col mb-3 pl-5">

        {/* 정렬 버튼 */}
        <div className="flex items-center gap-2 bg-[#CECECE] px-2 h-[30px] w-[270px] md:w-[330px]">
          <button type="button" onClick={() => setTextAlign("left")}>
            <img src="/icons/Align_left.svg" className="w-[20px] h-[20px]" />
          </button>
          <button type="button" onClick={() => setTextAlign("center")}>
            <img src="/icons/Align_center.svg" className="w-[20px] h-[20px]" />
          </button>
          <button type="button" onClick={() => setTextAlign("right")}>
            <img src="/icons/Align_right.svg" className="w-[20px] h-[20px]" />
          </button>
        </div>

        {/* 텍스트 박스 */}
        <textarea
          value={textCanvasMessage}
          onChange={(e) => setTextCanvasMessage(e.target.value)}
          maxLength={10}
          className="
            w-[270px] h-[200px]
            md:w-[330px] md:h-[240px]
            bg-white resize-none outline-none
            text-[18px] leading-tight text-black
            placeholder:text-slate-500
            px-3 py-2
          "
          style={{ textAlign }}
        />
      </div>

      {/* From 영역 */}
      <div className="flex items-center gap-2 text-sm text-white/70 pl-5">
        <img
          src="/icons/From_white.svg"
          alt="From"
          className="w-[68px] h-[28px]"
        />

        <div className="relative">
          <input
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="보내는 사람 이름"
            autoComplete="off"
            className="
              px-3 
              text-[18px]
              font-normal text-white/70
              bg-transparent outline-none
              placeholder:text-white/70
              w-[250px]
            "
          />

          {/* 밑줄 */}
<div
  className="
    absolute left-0 bg-white
    w-[180px]        /* 기본: 모바일 */
    md:w-[250px]     /* md 이상에서 290px */
    h-[1px] 
    opacity-100
  "
  style={{ top: "35px" }}
/>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-nowrap items-center justify-center gap-3 mt-6">
        <button
          onClick={startStop.onClick}
          className="rounded-full bg-rose-500 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-rose-500/80 text-[9px] md:text-xs"
        >
          {startStop.label}
        </button>

        <button
          onClick={toggleSide.onClick}
          className="rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white hover:border-white/60 text-[9px] md:text-xs"
        >
          {toggleSide.label}
        </button>

        <button
          onClick={edit.onClick}
          disabled={edit.disabled}
          className={`rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white text-[9px] md:text-xs ${
            edit.disabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/60"
          }`}
        >
          수정
        </button>

        <button
          onClick={preview.onClick}
          className="rounded-full border border-white/30 px-4 py-2 font-semibold uppercase tracking-wide text-white hover:border-white/60 text-[9px] md:text-xs"
        >
          엽서 미리보기
        </button>
      </div>
    </div>
  </div>
)}
        </div>
      </FullScreenView>
      {showOriginalPreview && (
        <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="relative w-full max-w-6xl bg-slate-900/85 border border-white/10 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setShowOriginalPreview(false)}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/10 border border-white/30 text-white text-lg leading-9 text-center hover:bg-white/20"
              aria-label="Close original preview"
            >
              ×
            </button>
            <h3 className="text-white font-semibold text-lg text-center uppercase tracking-[0.2em]">
              Postcard Preview (Original)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black/40 border border-white/10 rounded-lg p-3">
                <div className="text-xs uppercase text-white/70 mb-2">Front</div>
                <svg
                  className="w-full h-[320px] bg-black/60 rounded"
                  viewBox="-300 -187.5 600 375"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {frontSketches.length === 0 && (
                    <text x="0" y="0" fill="#94a3b8" fontSize="18" textAnchor="middle">
                      No front sketch
                    </text>
                  )}
                  {frontSketches.map((sketch, idx) => (
                    <polyline
                      key={`front-preview-${idx}`}
                      points={sketch.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={sketch.pathColor}
                      strokeWidth={sketch.pathWidth}
                      opacity={Math.max(0, Math.min(1, sketch.pathAlpha / 255))}
                    />
                  ))}
                </svg>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-lg p-3">
                <div className="text-xs uppercase text-white/70 mb-2">Back</div>
                <div className="w-full h-[320px] bg-black/60 rounded flex items-center justify-center px-4">
                  {textCanvasMessage ? (
                    <p className="text-white text-base leading-6 whitespace-pre-wrap break-words text-center">
                      {textCanvasMessage}
                    </p>
                  ) : (
                    <span className="text-white/60 text-sm">No back message</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <SendAnimation
        isSending={isSending}
        sendStage={sendStage}
        frontSketches={frontSketches}
        recipientName={recipientEmail}
        senderName={senderName}
        textCanvasMessage={textCanvasMessage}
        tokenWords={tokenWords}
      />
      </div>
    </div>
  );
}
