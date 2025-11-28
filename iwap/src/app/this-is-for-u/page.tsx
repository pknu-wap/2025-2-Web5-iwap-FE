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
import html2canvas from "html2canvas";

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
  const backPreviewDivRef = useRef<HTMLDivElement | null>(null);
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
  const [sendAnimStage, setSendAnimStage] = useState("idle");
const [isClosedEnvelope, setIsClosedEnvelope] = useState(false);
const [earlyFade, setEarlyFade] = useState(false);



  // const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const canSendPostcard =
    frontSketches.length > 0 || backSketches.length > 0 || textCanvasMessage.trim().length > 0;
  const sendButtonClass = `rounded-full bg-emerald-500 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500/80${ 
    canSendPostcard ? "" : " opacity-50 cursor-not-allowed" 
    
  }`;
  
useEffect(() => {
  if (isClosedEnvelope) {
    // 봉투가 닫히는 순간 엽서 사라짐 (0ms 즉시)
    setEarlyFade(true);
  }
}, [isClosedEnvelope]);


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
      recipientEmail,
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

const handleSendClick = async () => {
  // 1) 프리뷰 박스 약간 흐려짐
  setSendAnimStage("fadePreview");

  // 2) 아래로 들어가는 애니메이션 시작 (0.6초 뒤)
  setTimeout(() => setSendAnimStage("insert"), 600);

  // 3) 봉투 닫힘(open → close) — insert 시작 후 2초 뒤
  setTimeout(() => {
    setIsClosedEnvelope(true);
    setSendAnimStage("closed");
  }, 2600);

  // 4) 엽서 보내기
  handleSendPostcard();
};




  useEffect(() => {
    if (isBackside || isPreview) {
      handleStop();
    }
  }, [isBackside, isPreview, handleStop]);

  useEffect(() => {
    if (isPreview) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isPreview]);

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

const handleRestoreFront = useCallback(() => {
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
}, [frontController, frontSketches]);



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

const handleShowPreview = useCallback(async () => {
  storeBackSketches();

  const prevEpicycleVisibility = styles.showEpicycles;
  const prevEpicycleAlpha = styles.epicycleAlpha;

  setStyles((prev) => ({
    ...prev,
    showEpicycles: false,
    epicycleAlpha: 0,
  }));
  frontController?.updateStyles({ showEpicycles: false, epicycleAlpha: 0 });
  backController?.updateStyles({ showEpicycles: false, epicycleAlpha: 0 });

  requestAnimationFrame(() => {
    setTimeout(async () => { // Ensure repaint before capturing
      const frontPng = captureCanvasDataUrl(frontContainerRef.current);

      let backPng: string | null = null;
      if (backPreviewDivRef.current) {
        try {
          const canvas = await html2canvas(backPreviewDivRef.current, {
            backgroundColor: styles.backgroundColor,
            useCORS: true, // If any images are loaded from external sources
          });
          backPng = canvas.toDataURL("image/png");
          console.log("Generated backPng (html2canvas):", backPng.substring(0, 100) + "..."); // Log first 100 chars
        } catch (error) {
          console.error("Error capturing back preview with html2canvas:", error);
          // Fallback to canvas capture if html2canvas fails, or set to null
          backPng = captureCanvasDataUrl(backContainerRef.current);
        }
      } else {
        // Fallback if ref is not available for some reason
        backPng = captureCanvasDataUrl(backContainerRef.current);
      }

      setFrontPreviewPng(frontPng);
      setBackPreviewPng(backPng);

      setShowPngPreview(true);
      handleStop();
      setPrevPhase(phase);
      setPhase("preview");

      // Restore original epicycle settings
      setStyles((prev) => ({
        ...prev,
        showEpicycles: prevEpicycleVisibility,
        epicycleAlpha: prevEpicycleAlpha,
      }));
      frontController?.updateStyles({ showEpicycles: prevEpicycleVisibility, epicycleAlpha: prevEpicycleAlpha });
      backController?.updateStyles({ showEpicycles: prevEpicycleVisibility, epicycleAlpha: prevEpicycleAlpha });
    }, 0);
  });
}, [
  phase,
  captureCanvasDataUrl,
  handleStop,
  storeBackSketches,
  frontController,
  backController,
  styles.showEpicycles,
  styles.epicycleAlpha,
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
  // MODIFIED VALIDATION: If text is present but not Fourier transformed,
  // either warn the user or auto-transform it.
  if (textCanvasMessage.trim().length > 0 && backSketches.length === 0) {
    errors.push("뒷면 메시지를 변환해주세요 (변환 시작 버튼 클릭).");
  }
  if (backSketches.length === 0 && !textCanvasMessage.trim()) { // Original logic for empty back
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

  // Temporarily hide epicycles for video capture
  const prevEpicycleVisibility = styles.showEpicycles;
  const prevEpicycleAlpha = styles.epicycleAlpha;

  setStyles((prev) => ({
    ...prev,
    showEpicycles: false,
    epicycleAlpha: 0,
  }));
  frontController?.updateStyles({ showEpicycles: false, epicycleAlpha: 0 });
  backController?.updateStyles({ showEpicycles: false, epicycleAlpha: 0 });

  // Give a moment for the canvas to repaint
  await new Promise((resolve) => setTimeout(resolve, 50));

  // webm으로 캡처 — 브라우저는 mp4 불가능
  const frontVideoBlob = await canvasToMp4(frontCanvas, 3000);
  const backVideoBlob = await canvasToMp4(backCanvas, 3000);

  // Restore original epicycle settings
  setStyles((prev) => ({
    ...prev,
    showEpicycles: prevEpicycleVisibility,
    epicycleAlpha: prevEpicycleAlpha,
  }));
  frontController?.updateStyles({ showEpicycles: prevEpicycleVisibility, epicycleAlpha: prevEpicycleAlpha });
  backController?.updateStyles({ showEpicycles: prevEpicycleVisibility, epicycleAlpha: prevEpicycleAlpha });

  const MIN_VIDEO_SIZE = 1024; // 1KB, 비어있는 webm 파일 헤더 크기보다 큰 값
  if (
    !frontPngBlob ||
    frontPngBlob.size === 0 ||
    !backPngBlob ||
    backPngBlob.size === 0 ||
    !frontVideoBlob ||
    frontVideoBlob.size < MIN_VIDEO_SIZE ||
    !backVideoBlob ||
    backVideoBlob.size < MIN_VIDEO_SIZE
  ) {
    alert("엽서 파일(이미지/비디오) 생성에 실패했거나 영상이 비어있습니다. 다시 시도해주세요.");
    setIsMailSending(false);
    frontController?.stopPlayback();
    backController?.stopPlayback();
    return;
  }

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
    "frontCard",
    new File([frontPngBlob], "front.png", { type: "image/png" })
  );
  formData.append(
    "backCard",
    new File([backPngBlob], "back.png", { type: "image/png" })
  );

  // webm 그대로 보내야 FastAPI가 처리 가능
  formData.append(
    "frontVideo",
    new File([frontVideoBlob], "front.webm", { type: "video/webm" })
  );
  formData.append(
    "backVideo",
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
                {!isBackside && !isPreview && (
                  <div
                    className="
                      hidden md:flex
                      flex-col gap-[5px]
                      absolute
                      translate-y-[97px] left-1/2 ml-80
                    "
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
      className={`rounded-full border border-white/30 px-3 py-1.5 font-light text-white transition hover:border-white/60 ${
        phase === "front-draw" && !isPlaying ? "animate-shadow-pulse" : ""
      }`}
    >
      {startStop.label}
    </button>

    <button
      onClick={toggleSide.onClick}
      className={`rounded-full border border-white/30 px-3 py-1.5 font-light text-white hover:border-white/60 ${
        phase === "front-fourier" && !isPlaying ? "animate-shadow-pulse" : ""
      }`}
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
      className={`rounded-full border border-white/30 px-3 py-1.5 font-light text-white hover:border-white/60 ${
        phase === "back-fourier" && canSendPostcard ? "animate-shadow-pulse" : ""
      }`}
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
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
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
      className={`rounded-full border border-white px-3 py-1.5 font-light text-white transition  hover:border-white/60 ${
        phase === "back-write" && textCanvasMessage.trim().length > 0 && !isPlaying ? "animate-shadow-pulse" : ""
      }`}
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
      className={`rounded-full border border-white px-3 py-1.5 font-light text-white hover:border-white/60 ${
        canSendPostcard ? "animate-shadow-pulse" : ""
      }`}
    >
      엽서 전송하기
    </button>

  </div>
    </div>
  </div>
)}

{isPreview && (
  <div className="relative w-full md:scale-90 scale-80">

    {/* 바닥 봉투 (open → close 자동 전환) */}
    <img
      src={
        isClosedEnvelope
          ? "/images/This-is-for-u/close.svg"
          : "/images/This-is-for-u/open.svg"
      }
      className={`
        absolute left-1/2 -translate-x-1/2 z-10
        md:w-[600px] w-[360px] h-auto max-w-[600px]
        transition-all duration-700
        ${isClosedEnvelope ? "translate-y-[230px]" : "translate-y-[15px]"}
      `}
      alt="envelope-base"
    />


    {/* =============================
        Preview 박스 (fade-out)
       ============================= */}
    <div
      className={`
        absolute top-0
        left-1/2 -translate-x-1/2
        md:-translate-y-[360px] -translate-y-[300px]
        w-[80vw]
        md:w-[500px] md:h-[820px]
        w-[320px] h-[600px]
        z-20

        flex flex-col items-start gap-6 p-6
        transition-all duration-[600ms] ease-out

        ${sendAnimStage !== "idle" ? "opacity-0 pointer-events-none" : "opacity-100"}
      `}
      style={{
        background: "rgba(255, 255, 255, 0.40)",
        border: "1px solid #FFF",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      {/* 메일 UI */}
      <p className="text-white text-[18px] md:text-[20px] font-normal ml-2">
        메일 주소를 작성하세요
      </p>

      <div className="flex items-center gap-2 text-sm text-white/70 ml-2 mt-[-10px]">
        <img
          src="/icons/To_white.svg"
          alt="To"
          className="w-[20px] h-[21px] md:w-[30px] md:h-[28px]"
        />
        <div className="relative">
          <input
            id="recipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="받는 사람 메일"
            autoComplete="off"
            className="
              px-3
              w-[220px] md:w-[290px]
              md:text-[16px] text-[14px]
              font-normal
              text-white/70 bg-transparent outline-none border-0
              placeholder:text-white/70
            "
          />
          <div
            className="
              absolute left-0 bg-white
              w-[220px] md:w-[380px]
              h-[1px]
              opacity-100
              md:top-[34px] top-[22px]
            "
          />
        </div>
        <button
          onClick={handleSendClick}
          disabled={isMailSending || !isValidEmail(recipientEmail)}
          className="
            flex items-center justify-center
            w-[30px] h-[30px] md:w-[34px] md:h-[34px]
            hover:bg-white/20 transition md:translate-x-[40px] -translate-x-[0px]
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <img src="/icons/Send.svg" className="w-[28px] h-[29px]" />
        </button>
      </div>
    </div>


    {/* ==============================================
        ✔ 엽서 박스를 Preview 박스 아래로 분리 (SIBLING)
        ✔ z-index를 올려서 봉투 위로 오게 변경 (z-30)
       ============================================== */}
{/* ==============================================
    ✔ 엽서 박스 (Front / Back PNG 미리보기)
    ✔ Preview 박스와 같은 depth가 아닌 SIBLING
    ✔ front/back 각각 투명도, 이동 애니메이션 포함
   ============================================== */}
<div
  className={`
    absolute left-1/2 -translate-x-1/2
    md:-translate-y-[40px] -translate-y-[20px]
    flex flex-col gap-6 items-center w-full
    transition-all duration-[900ms] ease-out
    z-30

    ${sendAnimStage === "insert" ? "translate-y-[250px]" : ""}
    ${sendAnimStage === "closed" ? "translate-y-[300px]" : ""}

  `}
>

  {/* =========================
        FRONT PREVIEW
     ========================= */}
  {frontPreviewPng && (
    <div
      className={`
        border border-white/30
        md:w-[400px] md:h-[250px]
        w-[270px] h-[168px]
        -translate-y-[175px]
        overflow-hidden
        bg-white
        transition-transform duration-[900ms] ease-out

        ${sendAnimStage === "insert" ? "md:translate-y-[260px] translate-y-[5px]" : ""}
        ${sendAnimStage === "closed" ? "md:translate-y-[220px]" : ""}
                ${earlyFade ? "opacity-0 pointer-events-none" : "opacity-100"}
      `}
    >
      <FrontPreview
        frontSketches={frontSketches}
        frontPreviewPng={frontPreviewPng}
        backgroundColor={styles.backgroundColor}
      />
    </div>
  )}

  {/* =========================
        BACK PREVIEW
     ========================= */}
  {backPreviewPng && (
    <div
      className={`
        border border-white/30
        md:w-[400px] md:h-[250px]
        w-[270px] h-[168px]
        -translate-y-[175px]
        overflow-hidden
        bg-white
        transition-transform duration-[900ms] ease-out

        ${sendAnimStage === "insert" ? "md:translate-y-[20px]" : ""}
        ${sendAnimStage === "closed" ? "md:translate-y-[80px] translate-y-[80px]" : ""}
        ${earlyFade ? "opacity-0 pointer-events-none" : "opacity-100"}

      `}
    >
      <BackPreview
        ref={backPreviewDivRef}
        backPreviewPng={backPreviewPng}
        messageText={textCanvasMessage}
        recipientName={recipientEmail}
        senderName={senderName}
        backgroundColor={styles.backgroundColor}
        textAlign={textAlign}
        textColor={styles.pathColor}
        textAlpha={styles.pathAlpha}
      />
    </div>
  )}

</div>

    {/* 봉투 덮개 */}
    <div className="relative w-full h-full">
      <img
        src="/images/This-is-for-u/open2.svg"
        className={`
          absolute translate-y-1/2 left-1/2 -translate-x-1/2 z-90
          h-auto md:w-[640px] w-[380px] max-w-[640px]
          transition-transform duration-[700ms] ease-in-out origin-top
          ${isClosedEnvelope ? "opacity-0 pointer-events-none" : ""}
        `}
        alt="open2"
      />

      {isMailSending && sendAnimStage === "closed" && (
        <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur-sm">
          <p className="text-white text-[30px] font-light -translate-y-[30px]">메일 전송중...</p>
        </div>
      )}

      <button
        onClick={handleClosePreview}
        className={`
          absolute z-[100]
          left-1/2 -translate-x-1/2
          bottom-10
          px-5 py-2
          rounded-full
          bg-white/10 border border-black/90
          text-black/90 text-sm hover:bg-white/20 transition translate-y-[400px]
          ${sendAnimStage !== "idle" ? "opacity-0 pointer-events-none" : ""}
        `}
      >
        수정하러 가기
      </button>
    </div>

  </div>
)}


        </div>
      </FullScreenView>
      {isPreview && (
        <div
          className={`
            absolute bottom-10 left-1/2 -translate-x-1/2 z-50 w-full flex justify-center
            transition-opacity duration-[600ms] ease-out
            ${
              sendAnimStage === "fadePreview"
                ? "opacity-70"
                : ""
            }
            ${
              sendAnimStage === "insert"
                ? "opacity-30"
                : ""
            }
            ${
              sendAnimStage === "closed"
                ? "opacity-0 pointer-events-none"
                : ""
            }
          `}
        >
        </div>
      )}
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
        recipientEmail={recipientEmail}
        senderName={senderName}
        textCanvasMessage={textCanvasMessage}
        tokenWords={tokenWords}
      />
      </div>
    </div>
  );
}