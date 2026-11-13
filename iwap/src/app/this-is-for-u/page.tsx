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
import { PostcardActionBar } from "@/components/this-is-for-u/PostcardActionBar";
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

  const frontController = useFourierSketch(frontContainerRef, styles);
  const backController = useFourierSketch(backContainerRef, styles);
  const brush = usePostcardBrush(setStyles, styles.backgroundColor);
  const { sendAnimStage, isMailSending, isSent, startSend, resetSent } = usePostcardSender({
    frontContainerRef,
    backContainerRef,
    frontController,
    backController,
    epicycleAlpha: styles.epicycleAlpha,
    onFailure: () => setPhase("front-draw"),
  });

  const isBackside = phase === "back-write" || phase === "back-fourier";
  const isPreview = phase === "preview";
  const isFrontside = !isBackside && !isPreview;
  const hasMessage = message.trim().length > 0;
  const canSendPostcard = frontSketches.length > 0 || backSketches.length > 0 || hasMessage;

  /* ===========================
     스냅샷 / 스타일 헬퍼
     =========================== */

  const storeFrontSketches = useCallback(() => {
    const originals = frontController?.getOriginalSketches() ?? [];
    if (originals.length) setFrontSketches(originals);
  }, [frontController]);

  const storeBackSketches = useCallback(() => {
    const originals = backController?.getOriginalSketches() ?? [];
    if (originals.length) setBackSketches(originals);
  }, [backController]);

  /** epicycle 표시 여부를 state와 컨트롤러에 동시에 반영 (PNG 캡처 시 숨기는 용도) */
  const applyEpicycleVisibility = useCallback(
    (visibility: EpicycleVisibility, controllers: (FourierSketchController | null)[]) => {
      setStyles((prev) => ({ ...prev, ...visibility }));
      controllers.forEach((c) => c?.updateStyles(visibility));
    },
    [],
  );

  /* ===========================
     재생 / 단계 전환
     =========================== */

  const handleStop = useCallback(() => {
    frontController?.stopPlayback();
    backController?.stopPlayback();
    setIsPlaying(false);
  }, [frontController, backController]);

  const handleConfirmSketches = useCallback(() => {
    frontController?.confirmSketches();
    setIsPlaying(false);
    if (phase === "front-draw") {
      storeFrontSketches();
    } else if (phase === "back-write") {
      storeBackSketches();
    }
  }, [frontController, phase, storeBackSketches, storeFrontSketches]);

  const handleStart = useCallback(() => {
    if (isBackside) {
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
    setFrontSketches(frontController.getOriginalSketches());
    setIsPlaying(frontController.getFourierCoefficients().length > 0);
  }, [backController, frontController, handleConfirmSketches, isBackside, phase]);

  /** 뒷면 메시지를 글자 외곽선으로 바꿔 Fourier 재생 */
  const handleTextToFourier = useCallback(async () => {
    if (!backController) return;
    const text = message.trim();
    if (!text) return;

    try {
      const { scale, pathWidth } =
        window.innerWidth < MOBILE_BREAKPOINT ? MESSAGE_RENDER.mobile : MESSAGE_RENDER.desktop;
      const strokes = await layoutMessageStrokes(text, scale);

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
      backController.startPlayback();

      setIsPlaying(true);
      storeBackSketches();
      setPhase("back-fourier");
    } catch (err) {
      console.error(err);
    }
  }, [backController, message, storeBackSketches, styles.pathAlpha, styles.pathColor]);

  const handlePrimaryAction = useCallback(() => {
    if (isPlaying) {
      handleStop();
    } else if (phase === "back-write") {
      handleTextToFourier();
    } else {
      handleStart();
    }
  }, [handleStart, handleStop, handleTextToFourier, isPlaying, phase]);

  /** Fourier 결과를 지우고 원본 스트로크만 다시 그린다 (드로잉 모드 유지) */
  const handleRestoreFront = useCallback(() => {
    if (!frontController || !frontSketches.length) return;
    frontController.stopPlayback();
    setIsPlaying(false);
    frontController.clearSketches();
    frontSketches.forEach(({ points, pathColor, pathAlpha, pathWidth, startDelay }) =>
      frontController.addCustomSketch(points, { pathColor, pathAlpha, pathWidth, startDelay }),
    );
  }, [frontController, frontSketches]);

  const handleEditAction = useCallback(() => {
    handleStop();
    if (phase === "front-fourier") {
      handleRestoreFront();
      setPhase("front-draw");
    } else if (phase === "back-fourier") {
      setPhase("back-write");
    }
  }, [handleRestoreFront, handleStop, phase]);

  const handleToggleSide = useCallback(() => {
    handleConfirmSketches();
    handleStop();
    setPhase(isBackside ? "front-draw" : "back-write");
  }, [handleConfirmSketches, handleStop, isBackside]);

  /* ===========================
     툴바 (앞면 드로잉)
     =========================== */

  const handleClearSketches = useCallback(() => {
    frontController?.clearSketches();
    setIsPlaying(false);
    setFrontSketches([]);
    setBackSketches([]);
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

  const handleShowPreview = useCallback(() => {
    storeBackSketches();
    handleStop();
    // 앞면은 캔버스를 바로 캡처, 뒷면은 preview 진입 후 effect에서 캡처
    setFrontPreviewPng(getCanvas(frontContainerRef.current)?.toDataURL("image/png") ?? null);
    setPrevPhase(phase);
    setPhase("preview");
  }, [handleStop, phase, storeBackSketches]);

  const handleClosePreview = () => {
    resetSent();
    setPhase(prevPhase ?? "front-draw");
  };

  const handleSendClick = () =>
    startSend({ recipientEmail, message, frontSketches, backSketches, frontPreviewPng, backPreviewPng });

  /* ===========================
     Effects
     =========================== */

  // 뒷면/미리보기로 넘어가면 재생 정지
  useEffect(() => {
    if (isBackside || isPreview) handleStop();
  }, [isBackside, isPreview, handleStop]);

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
     Render
     =========================== */

  const actionBarProps = {
    isPlaying,
    isBackside,
    editDisabled: phase === "front-draw" || phase === "back-write",
    onStartStop: handlePrimaryAction,
    onToggleSide: handleToggleSide,
    onEdit: handleEditAction,
    onSend: handleShowPreview,
  };

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
              <PostcardActionBar
                variant="canvas"
                {...actionBarProps}
                pulse={{
                  startStop: phase === "front-draw" && !isPlaying,
                  toggleSide: phase === "front-fourier" && !isPlaying,
                  send: phase === "back-fourier" && canSendPostcard,
                }}
              />
            )}

            {isFrontside && (
              <>
                <div className="hidden md:flex w-full justify-center mt-4 translate-y-[25px]">
                  <GraffitiToolbar {...toolbarProps} />
                </div>
                <div className="block md:hidden w-full translate-y-[90px] z-[100] justify-center flex">
                  <GraffitiToolbarMobile {...toolbarProps} />
                </div>
              </>
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
                <PostcardActionBar
                  variant="form"
                  {...actionBarProps}
                  pulse={{ startStop: hasMessage && !isPlaying, send: canSendPostcard }}
                />
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
