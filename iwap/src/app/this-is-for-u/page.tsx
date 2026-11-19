"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import { useTheme } from "@/components/theme/ThemeProvider";
import GraffitiToolbar from "@/components/graffiti/GraffitiToolbar";
import GraffitiToolbarMobile from "@/components/graffiti/GraffitiToolbarMobile";
import FullScreenView from "@/components/ui/FullScreenView";
import { ProjectIntroModal } from "@/components/sections/ProjectIntroSections";
import { BackgroundColorPicker } from "@/components/this-is-for-u/BackgroundColorPicker";
import { BackMessageForm } from "@/components/this-is-for-u/BackMessageForm";
import { BackPreview } from "@/components/this-is-for-u/BackPreview";
import { EnvelopePreview } from "@/components/this-is-for-u/EnvelopePreview";
import { FrontPreview } from "@/components/this-is-for-u/FrontPreview";
import {
  PostcardActionBar,
  type PostcardAction,
} from "@/components/this-is-for-u/PostcardActionBar";
import {
  COLOR_PALETTE,
  DEFAULT_STYLES,
  HIDDEN_EPICYCLES,
  MESSAGE_RENDER,
  MOBILE_BREAKPOINT,
} from "@/components/this-is-for-u/constants";
import type { FourierSketchController } from "@/components/this-is-for-u/fourier-sketch";
import {
  downloadUrl,
  getCanvas,
  layoutMessageStrokes,
  wait,
} from "@/components/this-is-for-u/postcardUtils";
import type {
  EpicycleVisibility,
  Phase,
  SketchSnapshot,
  SketchStyles,
  TextAlign,
} from "@/components/this-is-for-u/types";
import { useFourierSketch } from "@/components/this-is-for-u/useFourierSketch";
import { usePostcardBrush } from "@/components/this-is-for-u/usePostcardBrush";
import { usePostcardSender } from "@/components/this-is-for-u/usePostcardSender";

const OVERLAY_GRADIENT =
  "linear-gradient(to bottom, rgba(139, 139, 188, 0), rgba(139, 139, 188, 0.8))";

/** 안내 문구를 밝은 색으로 보여줘야 하는 어두운 배경색 */
const DARK_BACKGROUNDS = ["#0F172A", "#000000"];

export default function ThisIsForUPage() {
  const { theme } = useTheme();
  const router = useRouter();

  const frontContainerRef = useRef<HTMLDivElement | null>(null);
  const backContainerRef = useRef<HTMLDivElement | null>(null);
  const backPreviewRef = useRef<HTMLDivElement | null>(null);
  const colorPickerRef = useRef<HTMLInputElement | null>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase] = useState<Phase>("front-draw");
  const [prevPhase, setPrevPhase] = useState<Phase | null>(null);
  const [styles, setStyles] = useState<SketchStyles>(DEFAULT_STYLES);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // 뒷면 메시지 & 수신 정보
  const [message, setMessage] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [textAlign, setTextAlign] = useState<TextAlign>("left");

  // 미리보기 / 전송에 쓰이는 앞·뒷면 스냅샷
  const [frontSketches, setFrontSketches] = useState<SketchSnapshot[]>([]);
  const [backSketches, setBackSketches] = useState<SketchSnapshot[]>([]);
  const [frontPreviewPng, setFrontPreviewPng] = useState<string | null>(null);
  const [backPreviewPng, setBackPreviewPng] = useState<string | null>(null);

  /** 앞면 캔버스에 그려진 획 수 (변환 버튼 활성화 판단용) */
  const [frontStrokeCount, setFrontStrokeCount] = useState(0);
  /** 앞면을 Fourier로 변환한 상태인지 (뒷면에서 돌아올 때 그 상태로 복귀) */
  const [isFrontConverted, setIsFrontConverted] = useState(false);
  /** 마지막으로 Fourier 변환한 메시지 (메시지가 바뀌면 다시 변환해야 함) */
  const [convertedMessage, setConvertedMessage] = useState<string | null>(null);

  const frontController = useFourierSketch(frontContainerRef, styles);
  const backController = useFourierSketch(backContainerRef, styles);
  const brush = usePostcardBrush(setStyles, styles.backgroundColor);
  const { sendAnimStage, isMailSending, isSent, startSend, resetSent } = usePostcardSender({
    frontContainerRef,
    backContainerRef,
    frontController,
    backController,
    epicycleAlpha: styles.epicycleAlpha,
    onFailure: () => setPhase(isFrontConverted ? "front-fourier" : "front-draw"),
  });

  const isBackside = phase === "back-write" || phase === "back-fourier";
  const isPreview = phase === "preview";
  const isFrontside = !isBackside && !isPreview;
  const trimmedMessage = message.trim();
  const hasMessage = trimmedMessage.length > 0;
  const hasFrontStrokes = frontStrokeCount > 0;
  const isMessageConverted = hasMessage && convertedMessage === trimmedMessage;

  /* ===========================
     스냅샷 / 스타일 헬퍼
     =========================== */

  const storeFrontSketches = useCallback(() => {
    setFrontSketches(frontController?.getOriginalSketches() ?? []);
  }, [frontController]);

  /** epicycle 표시 여부를 state와 컨트롤러에 동시에 반영 (PNG 캡처 시 숨기는 용도) */
  const applyEpicycleVisibility = useCallback(
    (visibility: EpicycleVisibility, controllers: (FourierSketchController | null)[]) => {
      setStyles((prev) => ({ ...prev, ...visibility }));
      controllers.forEach((c) => c?.updateStyles(visibility));
    },
    [],
  );

  /* ===========================
     재생 제어
     =========================== */

  const handleStop = useCallback(() => {
    frontController?.stopPlayback();
    backController?.stopPlayback();
    setIsPlaying(false);
  }, [frontController, backController]);

  const playSide = useCallback(
    (side: "front" | "back") => {
      const controller = side === "front" ? frontController : backController;
      if (!controller) return;
      controller.startPlayback();
      setIsPlaying(controller.getFourierCoefficients().length > 0);
    },
    [backController, frontController],
  );

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      handleStop();
    } else {
      playSide(phase === "back-fourier" ? "back" : "front");
    }
  }, [handleStop, isPlaying, phase, playSide]);

  /* ===========================
     앞면
     =========================== */

  /** 앞면 드로잉 → Fourier 변환 재생 */
  const handleConvertFront = useCallback(() => {
    if (!frontController || !hasFrontStrokes) return;
    frontController.confirmSketches();
    storeFrontSketches();
    setIsFrontConverted(true);
    setPhase("front-fourier");
    playSide("front");
  }, [frontController, hasFrontStrokes, playSide, storeFrontSketches]);

  /** Fourier 결과를 지우고 원본 스트로크를 다시 그려 드로잉 모드로 돌아간다 */
  const handleRedrawFront = useCallback(() => {
    if (!frontController) return;
    handleStop();
    const originals = frontController.getOriginalSketches();
    frontController.clearSketches();
    originals.forEach(({ points, pathColor, pathAlpha, pathWidth, startDelay }) =>
      frontController.addCustomSketch(points, { pathColor, pathAlpha, pathWidth, startDelay }),
    );
    setIsFrontConverted(false);
    setPhase("front-draw");
  }, [frontController, handleStop]);

  const goToFront = useCallback(() => {
    handleStop();
    if (isFrontConverted) {
      setPhase("front-fourier");
      playSide("front");
    } else {
      setPhase("front-draw");
    }
  }, [handleStop, isFrontConverted, playSide]);

  /* ===========================
     뒷면
     =========================== */

  /** 뒷면 메시지를 글자 외곽선으로 바꿔 뒷면 컨트롤러에 올린다. 성공 여부 반환 */
  const convertMessage = useCallback(async () => {
    if (!backController || !trimmedMessage) return false;

    setIsConverting(true);
    try {
      const { scale, pathWidth } =
        window.innerWidth < MOBILE_BREAKPOINT ? MESSAGE_RENDER.mobile : MESSAGE_RENDER.desktop;
      const strokes = await layoutMessageStrokes(trimmedMessage, scale);

      backController.stopPlayback();
      backController.clearSketches();
      strokes.forEach((points) =>
        backController.addCustomSketch(points, {
          pathColor: styles.pathColor,
          pathAlpha: styles.pathAlpha,
          pathWidth,
          startDelay: 0,
        }),
      );
      backController.confirmSketches();

      setBackSketches(backController.getOriginalSketches());
      setConvertedMessage(trimmedMessage);
      return true;
    } catch (err) {
      console.error(err);
      alert("메시지를 변환하지 못했습니다. 다시 시도해주세요.");
      return false;
    } finally {
      setIsConverting(false);
    }
  }, [backController, styles.pathAlpha, styles.pathColor, trimmedMessage]);

  const handleConvertBack = useCallback(async () => {
    if (!(await convertMessage())) return;
    setPhase("back-fourier");
    playSide("back");
  }, [convertMessage, playSide]);

  const handleEditMessage = useCallback(() => {
    handleStop();
    setPhase("back-write");
  }, [handleStop]);

  const goToBack = useCallback(() => {
    handleStop();
    storeFrontSketches();
    // 이미 변환한 메시지 그대로라면 변환 결과 화면으로 복귀
    if (isMessageConverted) {
      setPhase("back-fourier");
      playSide("back");
    } else {
      setPhase("back-write");
    }
  }, [handleStop, isMessageConverted, playSide, storeFrontSketches]);

  /* ===========================
     툴바 (앞면 드로잉)
     =========================== */

  const handleClearSketches = useCallback(() => {
    frontController?.clearSketches();
    setIsPlaying(false);
    setFrontSketches([]);
    setIsFrontConverted(false);
    setPhase("front-draw");
  }, [frontController]);

  /** 앞면 캔버스를 epicycle 없이 PNG로 저장 */
  const handleSavePng = useCallback(() => {
    const canvas = getCanvas(frontContainerRef.current);
    if (!canvas) return;
    const restore = { showEpicycles: styles.showEpicycles, epicycleAlpha: styles.epicycleAlpha };

    applyEpicycleVisibility(HIDDEN_EPICYCLES, [frontController]);
    requestAnimationFrame(() => {
      downloadUrl(canvas.toDataURL("image/png"), "postcard-front.png");
      requestAnimationFrame(() => applyEpicycleVisibility(restore, [frontController]));
    });
  }, [applyEpicycleVisibility, frontController, styles.epicycleAlpha, styles.showEpicycles]);

  const toolbarProps = useMemo(
    () => ({
      ...brush,
      colorPalette: COLOR_PALETTE,
      colorPickerRef,
      onUndo: () => frontController?.undo(),
      onRedo: () => frontController?.redo(),
      onClear: handleClearSketches,
      onSave: handleSavePng,
      onSaveWithVideo: handleSavePng,
      showSceneSave: false,
      paletteTone: "dark" as const,
      showEraser: false,
    }),
    [brush, frontController, handleClearSketches, handleSavePng],
  );

  /* ===========================
     미리보기 / 전송
     =========================== */

  const handleShowPreview = useCallback(async () => {
    handleStop();

    // 빠진 단계가 있으면 미리보기 대신 해당 단계로 안내
    if (!hasFrontStrokes) {
      alert("엽서 앞면에 그림을 먼저 그려주세요.");
      setIsFrontConverted(false);
      setPhase("front-draw");
      return;
    }
    if (!hasMessage) {
      alert("엽서 뒷면에 메시지를 작성해주세요.");
      setPhase("back-write");
      return;
    }
    // 메시지를 아직 변환하지 않았거나 변환 후 수정했다면 자동으로 다시 변환
    if (!isMessageConverted && !(await convertMessage())) return;

    storeFrontSketches();
    // 앞면은 캔버스를 바로 캡처, 뒷면은 preview 진입 후 effect에서 다시 캡처
    setFrontPreviewPng(getCanvas(frontContainerRef.current)?.toDataURL("image/png") ?? null);
    setBackPreviewPng(null);
    setPrevPhase(phase);
    setPhase("preview");
  }, [
    convertMessage,
    handleStop,
    hasFrontStrokes,
    hasMessage,
    isMessageConverted,
    phase,
    storeFrontSketches,
  ]);

  const handleClosePreview = () => {
    resetSent();
    const target = prevPhase ?? "front-draw";
    setPhase(target);
    if (target === "front-fourier") playSide("front");
    if (target === "back-fourier") playSide("back");
  };

  const handleSendClick = () =>
    startSend({ recipientEmail, message, frontSketches, backSketches, frontPreviewPng, backPreviewPng });

  /* ===========================
     Effects
     =========================== */

  // 앞면 획 수 추적 (그리기 / undo / redo / clear)
  useEffect(() => {
    if (!frontController) return;
    const sync = () => setFrontStrokeCount(frontController.getOriginalSketches().length);
    sync();
    return frontController.onChange(sync);
  }, [frontController]);

  // 앞면 드로잉 단계에서만 캔버스 입력 허용 (p5는 window 이벤트를 받아 숨겨진 캔버스에도 그려진다)
  useEffect(() => {
    frontController?.setInputEnabled(phase === "front-draw");
  }, [frontController, phase]);

  useEffect(() => {
    backController?.setInputEnabled(false);
  }, [backController]);

  // 미리보기 중에는 페이지 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = isPreview ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isPreview]);

  // 뒷면 캔버스가 표시된 뒤 실제 크기에 맞게 리사이즈
  useEffect(() => {
    if (phase === "back-fourier" && backController) {
      setTimeout(() => backController.resize(), 0);
    }
  }, [phase, backController]);

  // 미리보기 진입 시 뒷면 카드 DOM을 PNG로 캡처
  useEffect(() => {
    if (phase !== "preview" || !backPreviewRef.current || backPreviewPng) return;

    const restore = { showEpicycles: styles.showEpicycles, epicycleAlpha: styles.epicycleAlpha };
    const controllers = [frontController, backController];

    const capture = async () => {
      applyEpicycleVisibility(HIDDEN_EPICYCLES, controllers);
      await wait(50); // 리페인트 대기

      try {
        const target = backPreviewRef.current;
        if (!target) return;
        const canvas = await html2canvas(target, {
          backgroundColor: styles.backgroundColor,
          useCORS: true,
          scale: 2, // 캡처 해상도 2배로 화질 개선
        });
        setBackPreviewPng(canvas.toDataURL("image/png"));
      } catch (error) {
        console.error("Error capturing back preview with html2canvas:", error);
      } finally {
        applyEpicycleVisibility(restore, controllers);
      }
    };
    capture();
  }, [
    phase,
    backPreviewPng,
    frontController,
    backController,
    applyEpicycleVisibility,
    styles.backgroundColor,
    styles.epicycleAlpha,
    styles.showEpicycles,
  ]);

  /* ===========================
     단계별 버튼 구성
     =========================== */

  const playAction: PostcardAction = {
    key: "play",
    label: isPlaying ? "정지" : "재생",
    onClick: handleTogglePlay,
  };
  const sendAction = (pulse = false): PostcardAction => ({
    key: "send",
    label: isConverting ? "변환 중..." : "엽서 보내기",
    onClick: () => void handleShowPreview(),
    disabled: isConverting || !hasMessage,
    title: hasMessage ? undefined : "뒷면에 메시지를 먼저 작성해주세요",
    pulse,
  });

  const actionsByPhase: Record<Exclude<Phase, "preview">, PostcardAction[]> = {
    "front-draw": [
      {
        key: "convert",
        label: "변환 시작",
        onClick: handleConvertFront,
        disabled: !hasFrontStrokes,
        title: hasFrontStrokes ? undefined : "캔버스에 먼저 그림을 그려주세요",
        pulse: hasFrontStrokes,
      },
      { key: "to-back", label: "뒷면 작성 →", onClick: goToBack },
      ...(hasMessage ? [sendAction()] : []),
    ],
    "front-fourier": [
      playAction,
      { key: "redraw", label: "다시 그리기", onClick: handleRedrawFront },
      { key: "to-back", label: "뒷면 작성 →", onClick: goToBack, pulse: !hasMessage },
      ...(hasMessage ? [sendAction(true)] : []),
    ],
    "back-write": [
      { key: "to-front", label: "← 앞면", onClick: goToFront, disabled: isConverting },
      {
        key: "convert",
        label: isConverting ? "변환 중..." : "변환 시작",
        onClick: () => void handleConvertBack(),
        disabled: isConverting || !hasMessage,
        title: hasMessage ? undefined : "메시지를 먼저 작성해주세요",
        pulse: hasMessage,
      },
      sendAction(),
    ],
    "back-fourier": [
      { key: "to-front", label: "← 앞면", onClick: goToFront },
      playAction,
      { key: "edit-message", label: "메시지 수정", onClick: handleEditMessage },
      sendAction(true),
    ],
  };
  const actions = isPreview ? [] : actionsByPhase[phase];

  /* ===========================
     Render
     =========================== */

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
          backgroundUrl={
            theme === "dark"
              ? "/images/bg-dark/this-is-for-u_dark.webp"
              : "/images/bg-light/this-is-for-u_light.webp"
          }
          darkBackground={theme === "dark"}
          titleClassName="translate-y-[60px] md:translate-y-0 font-semibold"
          subtitleClassName="translate-y-[60px] md:translate-y-0 font-semilight"
          closeButtonClassName="translate-y-[60px] md:translate-y-0"
        >
          <div className="absolute inset-0" style={{ background: OVERLAY_GRADIENT }} />

          <div className="relative z-90 flex flex-col items-center gap-6 md:mt-16 w-[90vw] max-w-[1200px] px-2">
            {/* 캔버스 영역 (앞면 드로잉 / 앞면·뒷면 Fourier) */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center translate-y-[40px]">
              {isFrontside && (
                <BackgroundColorPicker
                  variant="mobile"
                  value={styles.backgroundColor}
                  onChange={(color) => setStyles((prev) => ({ ...prev, backgroundColor: color }))}
                />
              )}

              <div
                className={
                  phase === "back-write" || isPreview
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
                {!frontController && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.4em] text-white/60">
                    Loading...
                  </div>
                )}
                {phase === "front-draw" && frontController && !hasFrontStrokes && (
                  <div
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center text-xs md:text-sm ${
                      DARK_BACKGROUNDS.includes(styles.backgroundColor) ? "text-white/40" : "text-black/30"
                    }`}
                  >
                    여기에 그림을 그려보세요
                  </div>
                )}
              </div>

              {isFrontside && (
                <BackgroundColorPicker
                  variant="desktop"
                  value={styles.backgroundColor}
                  onChange={(color) => setStyles((prev) => ({ ...prev, backgroundColor: color }))}
                />
              )}
            </div>

            {(isFrontside || phase === "back-fourier") && (
              <PostcardActionBar variant="canvas" actions={actions} />
            )}

            {isFrontside && (
              // 변환 재생 중에는 드로잉 도구를 잠근다 (다시 그리기로 돌아가야 편집 가능)
              <div
                className={`contents ${phase === "front-fourier" ? "[&>*]:opacity-40 [&>*]:pointer-events-none" : ""}`}
                aria-disabled={phase === "front-fourier"}
              >
                <div className="hidden md:flex w-full justify-center mt-4 translate-y-[25px]">
                  <GraffitiToolbar {...toolbarProps} />
                </div>
                <div className="block md:hidden w-full translate-y-[90px] z-[100] justify-center flex">
                  <GraffitiToolbarMobile {...toolbarProps} />
                </div>
              </div>
            )}

            {phase === "back-write" && (
              <BackMessageForm
                recipientName={recipientName}
                onRecipientNameChange={setRecipientName}
                message={message}
                onMessageChange={setMessage}
                senderName={senderName}
                onSenderNameChange={setSenderName}
                textAlign={textAlign}
                onTextAlignChange={setTextAlign}
              >
                <PostcardActionBar variant="form" actions={actions} />
              </BackMessageForm>
            )}

            {isPreview && (
              <EnvelopePreview
                sendAnimStage={sendAnimStage}
                isMailSending={isMailSending}
                isSent={isSent}
                recipientEmail={recipientEmail}
                onRecipientEmailChange={setRecipientEmail}
                onSend={handleSendClick}
                onClose={handleClosePreview}
                onGoToOtherProjects={() => router.push("/slides")}
                frontCard={
                  frontPreviewPng ? (
                    <FrontPreview
                      frontSketches={frontSketches}
                      frontPreviewPng={frontPreviewPng}
                      backgroundColor={styles.backgroundColor}
                    />
                  ) : null
                }
                backCard={
                  <BackPreview
                    ref={backPreviewRef}
                    messageText={message}
                    recipientName={recipientName}
                    senderName={senderName}
                    backgroundColor={styles.backgroundColor}
                    textAlign={textAlign}
                    textColor={styles.pathColor}
                    textAlpha={styles.pathAlpha}
                  />
                }
                isBackCardReady={Boolean(backPreviewPng)}
              />
            )}
          </div>
        </FullScreenView>
      </div>
    </div>
  );
}
