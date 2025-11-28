"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import FullScreenView from "@/components/ui/FullScreenView";
import CloseButton from "@/components/ui/CloseButton";
import { useRecorder } from "@/components/piano/recorder/useRecorder";
import RecorderButton from "@/components/piano/recorder/RecorderButton";
import Piano from "@/components/piano/keyboard/Piano";
import PianoBackendManager, {
  type MidiTransportControls,
  type ConversionContext,
  type MidiReadyPayload,
  getBackendUrl,
} from "@/components/piano/PianoBackendManager";
import MidiPlayerBar from "@/components/piano/player/MidiPlayerBar";
import { ProjectIntroModal } from "@/components/sections/ProjectIntroSections";
import { useTheme } from "@/components/theme/ThemeProvider";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

export default function VoiceToPiano() {
  const { theme } = useTheme();
  const pageTitle = "P!ano";
  const pageSubtitle = "음성을 피아노로 변환하기";

  const {
    isRecording,
    isProcessing,
    audioUrl,
    audioFile,
    startRecording,
    stopRecording,
    setAudioFromFile,
    reset,
  } = useRecorder();

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  // [삭제됨] activeNotesRef, noteTimeoutsRef, forceRender는 더 이상 필요하지 않습니다.
  // 건반 애니메이션은 이제 CustomEvent를 통해 각 건반이 직접 처리합니다.

  const [status, setStatus] = useState("");
  
  const [transport, setTransport] = useState<MidiTransportControls | null>(null);
  const [transportDuration, setTransportDuration] = useState(0);
  const [transportPosition, setTransportPosition] = useState(0);
  const [isTransportPlaying, setIsTransportPlaying] = useState(false);

  const midiDownloadUrlRef = useRef<string | null>(null);
  const [midiDownload, setMidiDownload] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  const [showIntro, setShowIntro] = useState(true);
  const conversionContextRef = useRef<ConversionContext | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    audioUrlRef.current = audioUrl;
    if (audioUrl && !isProcessing && !transport) {
      setStatus("분석 준비 중...");
    }
  }, [audioUrl, isProcessing, transport]);

  useEffect(() => {
    if (audioUrl && isMobile) {
      window.dispatchEvent(
        new CustomEvent("iwap:toggle-theme-btn", { detail: { hidden: true } })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("iwap:toggle-theme-btn", { detail: { hidden: false } })
      );
    }
    return () => {
      window.dispatchEvent(
        new CustomEvent("iwap:toggle-theme-btn", { detail: { hidden: false } })
      );
    };
  }, [audioUrl, isMobile]);

  const router = useRouter();
  const mp3AudioRef = useRef<HTMLAudioElement | null>(null);

  // [핵심 수정] MIDI 이벤트 핸들러 최적화
  // React 상태를 업데이트하지 않고, 브라우저 이벤트를 발송하여 PianoKey가 직접 반응하게 함
  const handleMidi = useCallback(
    ({ type, note }: { type: "on" | "off"; note: number }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("piano:event", {
            detail: { type, note },
          })
        );
      }
    },
    []
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);
    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  useEffect(() => {
    (window as any).pushMidi = handleMidi;
    return () => {
      delete (window as any).pushMidi;
    };
  }, [handleMidi]);

  useEffect(() => {
    if (!transport) return;
    const updateTransportState = () => {
      const state = transport.getState();
      const currentPosition = transport.getPosition();
      const hasDuration = transportDuration > 0;
      const nextPosition = hasDuration
        ? Math.min(transportDuration, currentPosition)
        : currentPosition;
      setTransportPosition(nextPosition);
      setIsTransportPlaying(state === "started");
    };
    const intervalId = window.setInterval(updateTransportState, 100);
    updateTransportState();
    return () => {
      window.clearInterval(intervalId);
    };
  }, [transport, transportDuration]);

  // [삭제됨] 타임아웃 정리 useEffect도 필요 없음

  const headerHiddenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      const file = files && files[0];
      if (!file) return;

      const allowedTypes = new Set([
        "audio/mpeg", "audio/wav", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg", "audio/flac",
      ]);

      if (!allowedTypes.has(file.type)) {
        setStatus("지원되지 않는 오디오 형식입니다.");
        event.target.value = "";
        return;
      }

      const maxSize = 4.6 * 1024 * 1024;
      if (file.size > maxSize) {
        setStatus("파일 크기는 4.5MB를 초과할 수 없습니다.");
        event.target.value = "";
        setTimeout(() => setStatus(""), 3000);
        return;
      }

      setStatus("파일 분석 준비 중...");
      setAudioFromFile(file);
      event.target.value = "";
    },
    [setAudioFromFile, setStatus]
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const hidden = Boolean(audioUrl) && isMobile;
    if (headerHiddenRef.current === hidden) return;
    headerHiddenRef.current = hidden;
    window.dispatchEvent(
      new CustomEvent("iwap:toggle-header", {
        detail: { hidden },
      })
    );
  }, [audioUrl, isMobile]);

  useEffect(() => {
    return () => {
      if (!headerHiddenRef.current || typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent("iwap:toggle-header", {
          detail: { hidden: false },
        })
      );
      headerHiddenRef.current = false;
    };
  }, []);

  const clearMidiDownload = useCallback(() => {
    if (midiDownloadUrlRef.current) {
      URL.revokeObjectURL(midiDownloadUrlRef.current);
      midiDownloadUrlRef.current = null;
    }
    conversionContextRef.current = null;
    setMidiDownload(null);
  }, []);

  const disposeMp3Audio = useCallback(() => {
    const audio = mp3AudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    audio.load();
    mp3AudioRef.current = null;
  }, []);

  const handleTransportReady = useCallback(
    (controls: MidiTransportControls, context?: ConversionContext) => {
      if (!audioUrlRef.current) return;
      if (context) {
        conversionContextRef.current = context;
      }
      setTransport(controls);
      setTransportDuration(controls.duration);
      setTransportPosition(0);
      setIsTransportPlaying(false);
      disposeMp3Audio();

      const currentUrl = audioUrlRef.current;
      const localSource = currentUrl && (currentUrl.startsWith("blob:") || currentUrl.startsWith("data:")) ? currentUrl : null;
      const effectiveContext = context ?? conversionContextRef.current;
      const remoteSource = effectiveContext
        ? getBackendUrl(`/api/piano/mp3/${encodeURIComponent(effectiveContext.requestId)}`)
        : getBackendUrl("/api/piano/mp3");
      const shouldUseRemote = Boolean(effectiveContext) || !localSource;
      const source = shouldUseRemote ? remoteSource : localSource;

      const mp3 = new Audio(source!);
      mp3.preload = "auto";
      if (!localSource) {
        mp3.crossOrigin = "anonymous";
      }
      mp3.volume = 0.2;
      mp3.onended = () => { mp3.currentTime = 0; };
      mp3AudioRef.current = mp3;

      setStatus("");

      setTimeout(() => {
        if (mp3AudioRef.current !== mp3) return;
        setIsTransportPlaying(true);
        void (async () => {
          try {
            await mp3.play();
            // Safari 자동 재생 정책 대응: 
            // Transport 시작을 약간 지연시킴
            requestAnimationFrame(async () => {
                await controls.start();
            });
          } catch (err) {
            console.warn("Auto playback failed", err);
            setIsTransportPlaying(false);
          }
        })();
      }, 750);
    },
    [disposeMp3Audio]
  );

  const handleMidiReady = useCallback(
    ({ blob, filename, requestId, midiFilename, mp3Filename }: MidiReadyPayload) => {
      clearMidiDownload();
      conversionContextRef.current = { requestId, midiFilename, mp3Filename };
      const url = URL.createObjectURL(blob);
      midiDownloadUrlRef.current = url;
      setMidiDownload({ url, filename });
    },
    [clearMidiDownload]
  );

  useEffect(() => {
    return () => {
      clearMidiDownload();
      disposeMp3Audio();
    };
  }, [clearMidiDownload, disposeMp3Audio]);

  const handleTransportReset = useCallback(() => {
    setTransport(null);
    setTransportDuration(0);
    setTransportPosition(0);
    setIsTransportPlaying(false);
    setStatus("");
    clearMidiDownload();
    disposeMp3Audio();
    // 타이머 정리 로직 삭제됨 (불필요)
  }, [clearMidiDownload, disposeMp3Audio]);

  const handleTogglePlayback = useCallback(() => {
    if (!transport) return;
    if (isTransportPlaying) {
      transport.pause();
      mp3AudioRef.current?.pause();
      setIsTransportPlaying(false);
      return;
    }
    setIsTransportPlaying(true);
    void (async () => {
      const audio = mp3AudioRef.current;
      if (audio) {
        const currentAudioTime = audio.currentTime;
        const currentTransportTime = transport.getPosition();
        if (currentAudioTime < 0.1 && currentTransportTime > 0.1) {
          audio.currentTime = currentTransportTime;
          transport.seek(currentTransportTime);
        } else if (Math.abs(currentAudioTime - audio.duration) < 0.1) {
          audio.currentTime = 0;
          transport.seek(0);
        } else {
          transport.seek(currentAudioTime);
        }
        try {
          await audio.play();
          await transport.start();
        } catch (err) {
          console.warn("MP3 playback failed", err);
          await transport.start();
        }
      } else {
        await transport.start();
      }
    })();
  }, [transport, isTransportPlaying]);

  const handleSeek = useCallback((seconds: number, resume: boolean) => {
    if (!transport) return;
    const clamped = Math.max(0, Math.min(transportDuration, seconds));
    setTransportPosition(clamped);
    const audio = mp3AudioRef.current;
    if (audio) audio.currentTime = clamped;
    if (resume) {
      transport.pause();
      transport.seek(clamped, false);
      void (async () => {
        if (audio) {
          try { await audio.play(); await transport.start(); } 
          catch (err) { await transport.start(); }
        } else { await transport.start(); }
      })();
    } else {
      transport.seek(clamped, false);
      if (audio) audio.pause();
    }
  }, [transport, transportDuration]);

  const handleRewind = useCallback(() => {
    if (!transport) return;
    transport.seek(0, isTransportPlaying);
    setTransportPosition(0);
    const audio = mp3AudioRef.current;
    if (audio) {
      audio.currentTime = 0;
      if (isTransportPlaying) void audio.play().catch(() => {});
      else audio.pause();
    }
  }, [transport, isTransportPlaying]);

  const handleDownloadMidi = useCallback(() => {
    if (!midiDownload) return;
    const link = document.createElement("a");
    link.href = midiDownload.url;
    link.download = midiDownload.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [midiDownload]);

  const handleGoBack = () => {
    if (audioUrl) {
      reset();
      handleTransportReset();
    } else {
      router.back();
    }
  };

  const hasTransport = Boolean(transport);
  const isReadyToRenderResult = Boolean(audioUrl);
  const isConversionFinished = Boolean(transport);

  const themeTextClass = theme === "dark" ? "text-white" : "text-black";
  const loadingTextClass = `text-base md:text-lg font-bold text-center break-keep ${themeTextClass}`;
  const smallLoadingTextClass = `text-sm font-bold whitespace-nowrap ${themeTextClass}`;

  return (
    <div className="flex flex-col">
      <ProjectIntroModal
        projects={["piano"]}
        open={showIntro}
        onClose={() => setShowIntro(false)}
      />
      <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]">
        <FullScreenView
          title="P!ano"
          subtitle="음성을 피아노로 변환하기"
          goBack={false}
          onClose={handleGoBack}
          className="font-[Pretendard]"
          backgroundUrl={
            theme === "dark"
              ? "/images/bg-dark/piano_dark.webp"
              : "/images/bg-light/piano_light.webp"
          }
          darkBackground={theme === "dark"}
          titleClassName={`${audioUrl ? "hidden" : ""} md:block md:rotate-0 md:translate-x-0 md:translate-y-0`}
          subtitleClassName={`${audioUrl ? "hidden" : ""} md:block md:rotate-0 md:translate-x-0 md:translate-y-0`}
          closeButtonClassName={`${audioUrl ? "hidden" : ""} md:block md:rotate-0 md:translate-y-0`}
        >
          {isReadyToRenderResult && (
            <PianoBackendManager
              audioUrl={audioUrl}
              audioFile={audioFile}
              onMidiEvent={handleMidi}
              onStatusChange={setStatus}
              onTransportReady={handleTransportReady}
              onTransportReset={handleTransportReset}
              onMidiReady={handleMidiReady}
            />
          )}

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: theme === "dark"
                ? "linear-gradient(to bottom, rgba(139, 139, 188, 0), rgba(139, 139, 188, 0.8))"
                : "linear-gradient(to bottom, rgba(139, 139, 188, 0), rgba(139, 139, 188, 0.8))",
            }}
          />

          <main className="flex flex-col items-center justify-center w-full min-h-[calc(100svh-96px)] gap-4 overflow-visible">
            <>
              <div
                className={`${
                  isReadyToRenderResult ? "hidden" : "flex"
                } flex-col items-center justify-center gap-8 transform translate-y-[35px]`}
              >
                {!audioUrl && (
                  <>
                    {!isProcessing && (
                      <div className="relative flex flex-col items-center justify-center">
                        <h1 className="text-2xl md:text-3xl font-bold text-center">
                          음성을 입력해주세요
                        </h1>
                        {status && !isRecording && (
                          <div className="absolute bottom-full mb-4 w-max max-w-[90vw] z-20">
                            <p className="text-red-500 font-medium text-xs md:text-sm bg-white/90 px-3 py-1 rounded-full shadow-sm backdrop-blur-sm animate-pulse text-center">
                              {status}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {isProcessing ? (
                      <div className="w-[130px] h-[130px] md:w-[170px] md:h-[170px] flex flex-col items-center justify-center gap-3 pb-28">
                         <LoadingIndicator 
                           text="저장 중..." 
                           className={themeTextClass}
                           textClassName={smallLoadingTextClass}
                         />
                      </div>
                    ) : (
                      <RecorderButton
                        isRecording={isRecording}
                        startRecording={startRecording}
                        stopRecording={stopRecording}
                      />
                    )}

                    {!isRecording && !isProcessing && (
                      <>
                        <button
                          type="button"
                          onClick={handlePickUpload}
                          className="w-[144px] h-[32px] md:w-[180px] md:h-[40px] rounded-[6px] text-[16px] md:text-[20px] font-SemiBold border-[1px] border-[#9D9DC5] bg-white text-black transition hover:border-[#9D9DC5] hover:bg-[#9D9DC5] hover:text-white -translate-y-20 inline-flex items-center justify-center gap-2 group"
                        >
                          <img src="/icons/upload_black.svg" alt="" className="w-5 h-5 block group-hover:hidden" aria-hidden="true" />
                          <img src="/icons/upload_white.svg" alt="" className="w-5 h-5 hidden group-hover:block" aria-hidden="true" />
                          <span className="relative top-[1px]">음원 업로드</span>
                        </button>
                        <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileSelected} />
                      </>
                    )}
                    
                    {(isRecording || isProcessing) && (
                      <div className="w-[144px] h-[32px] md:w-[180px] md:h-[40px] -translate-y-20" aria-hidden="true" />
                    )}
                  </>
                )}
              </div>

              {isReadyToRenderResult && (
                <>
                  {(isProcessing || !isConversionFinished) ? (
                     <div className="flex flex-row items-center justify-center h-[50vh] gap-3 px-4">
                       <LoadingIndicator 
                         text={status || "분석 중..."}
                         className={`h-auto ${themeTextClass}`}
                         textClassName={loadingTextClass}
                       />
                     </div>
                  ) : (
                    <>
                      <div className={`hidden w-full flex-col items-center gap-6 ${audioUrl ? "md:flex" : ""}`}>
                         {status && !status.includes("중...") ? <p className="text-lg text-center whitespace-nowrap">{status}</p> : null}
                         
                        <div className="relative flex items-center justify-center w-full overflow-visible md:h-[10px] md:py-6 min-h-[30vh] py-10" style={{ height: "120px", paddingTop: "25px", paddingBottom: "30px" }}>
                          <div className="overflow-visible" style={{ transform: "scale(0.8)", transformOrigin: "top center", overflow: "visible" }}>
                            {/* [수정됨] activeNotes props 제거 */}
                            <Piano />
                          </div>
                        </div>
                      </div>

                      <div className={`${audioUrl ? "" : "hidden"} md:hidden absolute top-1/2 left-1/2 w-dvh h-dvw transform -translate-x-1/2 -translate-y-1/2 rotate-90 flex flex-col items-center justify-center overflow-hidden p-4`}>
                        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: "linear-gradient(to bottom, rgba(139, 139, 188, 0), rgba(139, 139, 188, 0.3))" }} />
                        <header className="w-full flex justify-between items-start px-6 pt-4 z-10">
                          <div className="flex flex-col items-start ">
                            <h1 className="text-[30px] font-semibold">{pageTitle}</h1>
                            <p className="text-[12px] font-semilight">{pageSubtitle}</p>
                          </div>
                          <CloseButton onClick={handleGoBack} darkBackground={theme === "dark"} />
                        </header>

                        <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
                           <div className="h-3 mb-2"></div>
                           <div className="transform origin-center scale-[0.5]">
                            {/* [수정됨] activeNotes props 제거 */}
                            <Piano />
                          </div>
                        </div>

                        {hasTransport && (
                          <footer className="w-full flex justify-center pb-2 z-10">
                            <MidiPlayerBar
                              isPlaying={isTransportPlaying}
                              duration={transportDuration}
                              position={transportPosition}
                              onTogglePlay={handleTogglePlayback}
                              onSeek={handleSeek}
                              onRewind={handleRewind}
                              onDownload={handleDownloadMidi}
                              canDownload={Boolean(midiDownload)}
                              disabled={!hasTransport || transportDuration <= 0}
                              className="max-w-xl"
                            />
                          </footer>
                        )}

                        <div className="absolute bottom-4 right-4 z-50">
                          <ThemeToggle className={theme === "dark" ? "shadow-none" : "shadow-lg shadow-black/10"} />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          </main>

          {hasTransport && isConversionFinished ? (
            <div className="hidden md:flex absolute bottom-6 left-0 right-0 justify-center">
              <MidiPlayerBar
                isPlaying={isTransportPlaying}
                duration={transportDuration}
                position={transportPosition}
                onTogglePlay={handleTogglePlayback}
                onSeek={handleSeek}
                onRewind={handleRewind}
                onDownload={handleDownloadMidi}
                canDownload={Boolean(midiDownload)}
                disabled={!hasTransport || transportDuration <= 0}
                className="max-w-4xl"
              />
            </div>
          ) : null}
        </FullScreenView>
      </div>
    </div>
  );
}