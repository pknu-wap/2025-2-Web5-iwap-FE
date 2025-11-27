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
  backgroundColor: "#FFFFFF",
  epicycleColor: "#50a0ff",
  epicycleAlpha: 2040,
  showEpicycles: true,
  pathColor: "#000000",
  pathAlpha: 255,
  pathWidth: 10,
};

const COLOR_PALETTE = ["#FA4051", "#FDD047", "#2FB665", "#FFFFFF", "#000000"];
const BACKGROUND_COLORS = ["#FFFFFF", "#FFFEF0", "#FEF2F2", "#DBEAFE", "#0F172A", "#000000"];
const FONT_URL = "/fonts/static/Pretendard-Regular.otf";
const PREVIEW_SIZE = { width: 600, height: 375 };

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
  const [isMailSending, setIsMailSending] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);
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
    frontController?.undo();
  }, [frontController]);

  const handleRedo = useCallback(() => {
    frontController?.redo();
  }, [frontController]);

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
    const isMobile = window.innerWidth < 768;
    const scale = isMobile ? 0.33 : 1.0;
    const pathWidth = isMobile ? 0.8 : 1.2;

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

      // width 계산 (스케일 미적용)
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
      const lineIndex = Math.floor(i / 1); // 1토큰 = 1줄
      if (!lines[lineIndex]) lines[lineIndex] = [];
      lines[lineIndex].push(bundles[i]);
    }

    // 4) Fourier 배치를 위해 이전 내용 제거
    backController.clearSketches();

    const LINE_HEIGHT = 120; // 원본 좌표계 기준 라인 높이
    const totalLines = lines.length;
    const startY = -(totalLines - 1) * LINE_HEIGHT * 0.5;

    // 5) 각 줄 전체 중앙 정렬 후 Fourier로 변환
    lines.forEach((line, row) => {
      const lineWidth = line.reduce((acc, b) => acc + b.width, 0);
      let cursorX = -lineWidth / 2; // 중앙 정렬

      const y = startY + row * LINE_HEIGHT;

      line.forEach((bundle) => {
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
            x: ((p.x - minX) + cursorX) * scale,
            y: ((p.y - minY) + y) * scale,
          })),
        );

        // Fourier stroke 추가
        shifted.forEach((points) => {
          backController.addCustomSketch(points, {
            pathColor: styles.pathColor,
            pathAlpha: styles.pathAlpha,
            pathWidth: pathWidth, // 스케일에 따라 조정된 두께
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

  useEffect(() => {
    if (phase === "back-fourier" && backController) {
      // 캔버스가 표시된 후 실제 크기에 맞게 리사이즈
      setTimeout(() => backController.resize(), 0);
    }
  }, [phase, backController]);

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
  if (isMailSending) {
    alert("메일 전송이 이미 진행 중입니다.");
    return;
  }

  if (lastSentTime && Date.now() - lastSentTime < 30000) {
    const remaining = Math.ceil((30000 - (Date.now() - lastSentTime)) / 1000);
    alert(`메일을 다시 보내려면 ${remaining}초 더 기다려주세요.`);
    return;
  }

  const frontCanvas = frontContainerRef.current?.querySelector("canvas");
  const backCanvas = backContainerRef.current?.querySelector("canvas");
  const errors: string[] = [];

  if (!frontCanvas || !backCanvas) {
    alert("예상치 못한 오류가 발생했습니다: 캔버스를 찾을 수 없습니다.");
    return;
  }

  // 필드 유효성 검사
  if (!isValidEmail(recipientEmail)) {
    errors.push("올바른 수신자 이메일이 필요합니다.");
  }
  if (!textCanvasMessage.trim()) {
    errors.push("메시지를 입력해야 합니다.");
  }
  if (frontSketches.length === 0) {
    errors.push("엽서 앞면을 변환해주세요.");
  }
  if (backSketches.length === 0 && !textCanvasMessage.trim()) {
    errors.push("엽서 뒷면을 변환해주세요.");
  }

  if (errors.length > 0) {
    alert(`다음 문제를 해결해주세요:\n- ${errors.join("\n- ")}`);
    return;
  }

  setIsMailSending(true);

  // Helper to convert data URL to Blob
  const dataURLtoBlob = (dataurl: string): Blob | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Get PNGs from state and convert
  const frontPngBlob = frontPreviewPng ? dataURLtoBlob(frontPreviewPng) : null;
  const backPngBlob = backPreviewPng ? dataURLtoBlob(backPreviewPng) : null;

  if (!frontPngBlob || !backPngBlob) {
    alert("미리보기 이미지를 찾을 수 없습니다. 다시 시도해주세요.");
    setIsMailSending(false);
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

  // Append PNG files
  formData.append(
    "frontPng",
    new File([frontPngBlob], "front.png", { type: "image/png" })
  );
  formData.append(
    "backPng",
    new File([backPngBlob], "back.png", { type: "image/png" })
  );

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
    setLastSentTime(Date.now());
  } catch (err) {
    console.error(err);
    alert("메일 전송 중 오류");
  } finally {
    setIsMailSending(false);
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
    handleConfirmSketches();
    handleStop();
    setPhase(isBackside ? "front-draw" : "back-write");
  }, [handleStop, isBackside, handleConfirmSketches]);

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
      onRedo: handleRedo,
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
      handleCustomColorPick,
      handleUndo,
      handleRedo,
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
        titleClassName="translate-y-[60px] md:translate-y-0 font-semibold"
        subtitleClassName="translate-y-[60px] md:translate-y-0 font-semilight"
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
              <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center translate-y-[40px]">
                {/* Mobile background palette */}
                {!isBackside && !isPreview && (
                  <div className="flex flex-row justify-center gap-2.5 md:hidden">
                    {BACKGROUND_COLORS.map((color) => {
                      const isActive = styles.backgroundColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleBackgroundChange(color)}
                          className={`w-11 h-7 border border-white/30 transition ${isActive ? 'ring-1 ring-white' : 'hover:opacity-80'}`}
                          style={{ backgroundColor: color }}
                          aria-label={`Set background to ${color}`}
                        />
                      );
                    })}
                  </div>
                )}
                <div
                  className={
                    phase === "back-write" || phase === "preview"
                      ? "hidden"
                      : "relative flex-shrink-0 w-[320px] h-[200px] md:w-[600px] md:h-[375px] border border-white/30 overflow-hidden"
                  }
                >
                  <div
                    ref={frontContainerRef}
                    className={isBackside ? "hidden" : "absolute inset-0"}
                    style={{ backgroundColor: styles.backgroundColor }}
                  />
                  <div
                    ref={backContainerRef}
                    className={phase === "back-fourier" ? "absolute inset-0" : "hidden"}
                    style={{ backgroundColor: styles.backgroundColor }}
                  />
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
    translate-y-[97px] left-1/2 ml-80
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
  className="z-30 flex flex-nowrap items-center justify-center gap-3 text-[10px] md:text-[14px] text-slate-200 z-90 translate-y-[32px] md:translate-y-[42px]"
>

    <button
      onClick={startStop.onClick}
      className="rounded-full border border-white/30 px-3 py-1.5 font-light text-white transition hover:border-white/60"
    >
      {startStop.label}
    </button>

    <button
      onClick={toggleSide.onClick}
      className="rounded-full border border-white/30 px-3 py-1.5 font-light text-white hover:border-white/60"
    >
      {toggleSide.label}
    </button>

    <button
      onClick={edit.onClick}
      disabled={edit.disabled}
      className={`rounded-full border border-white/30 px-3 py-1.5 font-light text-white ${
        edit.disabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/60"
      }`}
    >
      수정
    </button>

    <button
      onClick={preview.onClick}
      className="rounded-full border border-white/30 px-3 py-1.5 font-light text-white hover:border-white/60"
    >
      엽서 전송하기
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
    <div className="block md:hidden w-full translate-y-[90px] z-[100] justify-center flex">
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
        w-[420px] h-[450px]
        md:w-[400px] md:h-auto
        md:px-4 py-6
        translate-y-[130px]
        flex flex-col items-center
      "
      style={{
        background: "rgba(255, 255, 255, 0.40)",
        border: "1px solid #FFF",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >

      {/* 타이틀 */}
      <p className="w-[270px] md:w-[330px] text-left text-[18px] md:text-[20px] text-white font-normal mb-2">
        메세지를 작성하세요
      </p>

      {/* To 영역 */}
      <div className="flex items-center gap-2 text-sm text-white/70 mb-2 md:mb-5 md:translate-x-[-11px] px-4">
        <img src="/icons/To_white.svg" alt="To" className="w-[20px] h-[21px] md:w-[30px] md:h-[28px]" />

        <div className="relative">
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="받는 사람 이름"
            autoComplete="off"
            className="
              px-3 py-2
              w-[260px]
              md:text-[16px] font-normal
              text-[14px]
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
    md:top-[34px]
    top-[33px]
  "
/>
        </div>
      </div>


      {/* 텍스트 + 정렬 버튼 */}
      <div className="flex flex-col">

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
        <div className="relative">
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
              px-2 py-2
            "
            style={{ textAlign }}
          />
          <div className="absolute bottom-2 right-2 text-xs text-slate-400">
            {textCanvasMessage.length}/10
          </div>
        </div>
      </div>

      {/* From 영역 */}
      <div className="flex items-center gap-2 text-sm text-white/70 px-4 mt-4">
        <img
          src="/icons/From_white.svg"
          alt="From"
          className="md:w-[68px] md:h-[28px] w-[43px] h-[17px]"
        />

        <div className="relative">
          <input
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="보내는 사람 이름"
            autoComplete="off"
            className="
              px-3 
              md:text-[16px]
              text-[14px]
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
    md:top-[27px]
    top-[25px]
  "
/>
        </div>
      </div>

      {/* 버튼 영역 */}
  <div
  className="z-30 flex flex-nowrap items-center justify-center gap-3 text-[10px] md:text-[14px] text-slate-200 z-90 translate-y-[20px] md:translate-y-[42px]"
>

    <button
      onClick={startStop.onClick}
      className="rounded-full border border-white px-3 py-1.5 font-light text-white transition  hover:border-white/60"
    >
      {startStop.label}
    </button>

    <button
      onClick={toggleSide.onClick}
      className="rounded-full border border-white px-3 py-1.5 font-light text-white hover:border-white/60"
    >
      {toggleSide.label}
    </button>

    <button
      onClick={edit.onClick}
      disabled={edit.disabled}
      className={`rounded-full border border-white px-3 py-1.5 font-light text-white ${
        edit.disabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/60"
      }`}
    >
      수정
    </button>

    <button
      onClick={preview.onClick}
      className="rounded-full border border-white px-3 py-1.5 font-light text-white hover:border-white/60"
    >
      엽서 전송하기
    </button>

  </div>
    </div>
  </div>
)}
{isPreview && (
        <div className="relative w-full">
          <h2 className="text-2xl font-bold text-white text-center mb-6">엽서 미리보기 및 전송</h2>
          
          <div className="flex flex-col md:flex-row gap-8 justify-center">
              {/* Previews */}
              <div className="flex flex-col gap-6 items-center">
                  {frontPreviewPng && (
                      <div>
                          <h3 className="text-lg text-white mb-2 text-center font-semibold">앞면</h3>
                          <img src={frontPreviewPng} alt="Postcard Front Preview" className="w-[400px] h-[250px] object-contain border-2 border-white/30 rounded-md" />
                      </div>
                  )}
                  {backPreviewPng && (
                       <div>
                          <h3 className="text-lg text-white mb-2 text-center font-semibold">뒷면</h3>
                          <img src={backPreviewPng} alt="Postcard Back Preview" className="w-[400px] h-[250px] object-contain border-2 border-white/30 rounded-md" />
                      </div>
                  )}
              </div>
    
              {/* Form */}
              <div className="flex flex-col justify-center gap-6 p-6 bg-white/10 rounded-lg w-full md:w-[320px]">
                  <div>
                      <label htmlFor="recipientEmail" className="block text-sm font-medium text-white/90 mb-2">받는 사람 이메일</label>
                      <input
                          id="recipientEmail"
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full bg-black/30 border border-white/30 rounded-md text-white p-2 placeholder:text-white/50 outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                  </div>
                  <div>
                      <label htmlFor="senderNamePreview" className="block text-sm font-medium text-white/90 mb-2">보내는 사람 이름</label>
                      <input
                          id="senderNamePreview"
                          type="text"
                          value={senderName}
                          className="w-full bg-black/30 border border-white/30 rounded-md text-white/70 p-2 outline-none"
                          readOnly
                      />
                  </div>
    
                  <button
                      onClick={handleSendPostcard}
                      disabled={isMailSending || !isValidEmail(recipientEmail)}
                      className="w-full rounded-full bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isMailSending ? "전송 중..." : "엽서 전송하기"}
                  </button>
              </div>
          </div>
    
          <button
            onClick={handleClosePreview}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 border border-white/30 text-white text-xl flex items-center justify-center hover:bg-white/20"
            aria-label="Close Preview"
          >
            &times;
          </button>
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
