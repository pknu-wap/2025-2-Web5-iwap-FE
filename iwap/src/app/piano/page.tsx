"use client";

import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation"; //  1. useRouter import
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
    audioUrl,
    startRecording,
    stopRecording,
    setAudioFromFile,
    reset,
  } = useRecorder();
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const activeNotesRef = useRef<Set<number>>(new Set());
  const noteTimeoutsRef = useRef<Map<number, number>>(new Map());
  const [, forceRender] = useState(0);
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
  }, [audioUrl]);

  // 모바일 가로모드(회전된 뷰) 진입 시 글로벌 테마 토글 숨기기
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

  const router = useRouter(); //  2. router 선언
  const mp3AudioRef = useRef<HTMLAudioElement | null>(null);

  // ... (handleMidi 및 기타 useEffect, useCallback 함수들은 이전과 동일) ...
  // (생략된 코드는 이전 답변과 동일하게 유지해 주세요)
  // handleMidi, useEffect들, handleTransport... 함수들
  
  // (여기부터 handleMidi)
  const handleMidi = useCallback(
    ({ type, note }: { type: "on" | "off"; note: number }) => {
      const activeNotes = activeNotesRef.current;
      const timeouts = noteTimeoutsRef.current;

      if (type === "on") {
        activeNotes.add(note);
        const existingTimeout = timeouts.get(note);
        if (existingTimeout !== undefined) {
          clearTimeout(existingTimeout);
        }
        const timeoutId = window.setTimeout(() => {
          activeNotes.delete(note);
          timeouts.delete(note);
          forceRender((t) => t ^ 1);
        }, 600);
        timeouts.set(note, timeoutId);
        forceRender((t) => t ^ 1);
        return;
      }

      const existingTimeout = timeouts.get(note);
      if (existingTimeout !== undefined) {
        clearTimeout(existingTimeout);
        timeouts.delete(note);
      }
      if (activeNotes.delete(note)) {
        forceRender((t) => t ^ 1);
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

  useEffect(() => {
    return () => {
      noteTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      noteTimeoutsRef.current.clear();
    };
  }, []);

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
        "audio/mpeg",
        "audio/wav",
      ]);

      if (!allowedTypes.has(file.type)) {
        setStatus("MP3, WAV 파일만 업로드할 수 있습니다.");
        event.target.value = "";
        return;
      }

      const maxSize = 4.6 * 1024 * 1024; // 4.6MB
      if (file.size > maxSize) {
        setStatus("파일 크기는 4.5MB를 초과할 수 없습니다.");
        event.target.value = "";
        return;
      }

      setStatus("파일 업로드 준비 중...");
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
    mp3AudioRef.current = null;
  }, []);

  const syncMp3Position = useCallback(
    (nextPosition?: number) => {
      const audio = mp3AudioRef.current;
      if (!audio) return;
      const fallbackPosition = transport?.getPosition() ?? 0;
      const target =
        typeof nextPosition === "number" ? nextPosition : fallbackPosition;
      if (!Number.isFinite(target)) return;
      if (Math.abs(audio.currentTime - target) > 0.05) {
        audio.currentTime = target;
      }
    },
    [transport]
  );

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
      const localSource =
        currentUrl && (currentUrl.startsWith("blob:") || currentUrl.startsWith("data:"))
          ? currentUrl
          : null;
      const effectiveContext = context ?? conversionContextRef.current;
      const remoteSource = effectiveContext
        ? getBackendUrl(
            `/api/piano/mp3/${encodeURIComponent(
              effectiveContext.requestId
            )}`
          )
        : getBackendUrl("/api/piano/mp3");
      const shouldUseRemote = Boolean(effectiveContext) || !localSource;
      const source = shouldUseRemote ? remoteSource : localSource;

      const mp3 = new Audio(source!);
      mp3.preload = "auto";
      if (!localSource) {
        mp3.crossOrigin = "anonymous";
      }
      mp3.volume = 0.2; // keep slightly under the MIDI sampler
      
      // 오디오 재생이 끝나면 시간을 0으로 초기화 (다음 재생 시 처음부터 시작)
      mp3.onended = () => {
        mp3.currentTime = 0;
      };

      mp3AudioRef.current = mp3;
    },
    [disposeMp3Audio]
  );

  const handleMidiReady = useCallback(
    ({
      blob,
      filename,
      requestId,
      midiFilename,
      mp3Filename,
    }: MidiReadyPayload) => {
      clearMidiDownload();
      conversionContextRef.current = {
        requestId,
        midiFilename,
        mp3Filename,
      };
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
    noteTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    noteTimeoutsRef.current.clear();
    activeNotesRef.current.clear();
    forceRender((t) => t ^ 1);
  }, [clearMidiDownload, disposeMp3Audio, forceRender]);

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
        
        // 오디오가 0초 부근인데 Transport(UI)는 진행된 상태라면, Transport 위치를 신뢰하여 오디오를 이동
        // (일시정지 상태에서 Seek 후 재생 시 오디오가 0초로 인식되는 문제 방지)
        if (currentAudioTime < 0.1 && currentTransportTime > 0.1) {
            audio.currentTime = currentTransportTime;
            transport.seek(currentTransportTime);
        } 
        // 오디오가 끝에 도달해 있다면 처음으로 리셋
        else if (Math.abs(currentAudioTime - audio.duration) < 0.1) {
            audio.currentTime = 0;
            transport.seek(0);
        } 
        // 그 외의 경우 오디오 시간을 기준으로 Transport 동기화
        else {
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

  const handleSeek = useCallback(
    (seconds: number, resume: boolean) => {
      if (!transport) return;
      const clamped = Math.max(0, Math.min(transportDuration, seconds));
      
      setTransportPosition(clamped);
      
      const audio = mp3AudioRef.current;
      if (audio) {
        audio.currentTime = clamped;
      }

      if (resume) {
        transport.pause();
        transport.seek(clamped, false);
        
        void (async () => {
          if (audio) {
            try {
              await audio.play();
              await transport.start();
            } catch (err) {
              console.warn("MP3 seek resume failed", err);
              await transport.start();
            }
          } else {
            await transport.start();
          }
        })();
      } else {
        transport.seek(clamped, false);
        if (audio) {
          audio.pause();
        }
      }
    },
    [transport, transportDuration]
  );

  const handleRewind = useCallback(() => {
    if (!transport) return;
    transport.seek(0, isTransportPlaying);
    setTransportPosition(0);
    const audio = mp3AudioRef.current;
    if (audio) {
      audio.currentTime = 0;
      if (isTransportPlaying) {
        void audio.play().catch((err) => {
          console.warn("MP3 rewind failed", err);
        });
      } else {
        audio.pause();
      }
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
  // (여기까지 handle... 함수들)

  //  3. 뒤로 가기 핸들러 함수
  const handleGoBack = () => {
    if (audioUrl) {
      reset();
      handleTransportReset();
    } else {
      router.back();
    }
  };

  const hasTransport = Boolean(transport);

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
        goBack={false} // 커스텀 핸들러 사용을 위해 false로 설정
        onClose={handleGoBack} // 닫기 버튼 핸들러 연결
        className="font-[Pretendard]"
        backgroundUrl={theme === 'dark' ? "/images/bg-dark/piano_dark.webp" : "/images/bg-light/piano_light.webp"}
        darkBackground={theme === 'dark'}
        
        // 모바일 재생 뷰에서 '기본' 헤더 숨김
        titleClassName={`${audioUrl ? "hidden" : ""} 
                          md:block md:rotate-0 md:translate-x-0 md:translate-y-0`}
        subtitleClassName={`${audioUrl ? "hidden" : ""} 
                             md:block md:rotate-0 md:translate-x-0 md:translate-y-0`}
        closeButtonClassName={`${audioUrl ? "hidden" : ""} 
                                md:block md:rotate-0 md:translate-y-0`}
      >
        <PianoBackendManager
          audioUrl={audioUrl}
          onMidiEvent={handleMidi}
          onStatusChange={setStatus}
          onTransportReady={handleTransportReady}
          onTransportReset={handleTransportReset}
          onMidiReady={handleMidiReady}
        />
        {audioUrl && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(13, 17, 19, 0), rgba(13, 17, 19, 0.5))' }}
          />
        )}

        <main className="flex flex-col items-center justify-center w-full min-h-[calc(100svh-96px)] gap-4 overflow-visible">
          <>
            <div className={`${audioUrl ? "hidden" : "flex"} flex-col items-center justify-center gap-8 transform translate-y-[35px]`}>
              <h1 className="text-2xl md:text-3xl font-bold text-center">음성을 입력해주세요</h1>
                <RecorderButton
                  isRecording={isRecording}
                  startRecording={startRecording}
                  stopRecording={stopRecording}
                />
                {!isRecording ? (
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/mpeg,audio/wav"
                      className="hidden"
                      onChange={handleFileSelected}
                    />
                  </>
                ) : (
                  <div className="w-[144px] h-[32px] md:w-[180px] md:h-[40px]" aria-hidden="true" />
                )}
              </div>
          
            <>
              {/* === 데스크탑 뷰 (md:flex) === */}
              {/* (기존 코드와 동일) */}
              <div className={`hidden w-full flex-col items-center gap-6 ${audioUrl ? "md:flex" : ""}`}>
                {status ? (
                  status.includes("중...") ? (
                    <LoadingIndicator
                      text={status}
                      className={`h-auto ${theme === "dark" ? "text-white" : "text-black"}`}
                      textClassName="text-lg whitespace-nowrap"
                    />
                  ) : (
                    <p className="text-lg text-center whitespace-nowrap">{status}</p>
                  )
                ) : null}
                <div
                  className="relative flex items-center justify-center w-full overflow-visible md:h-[10px] md:py-6 min-h-[30vh] py-10"
                  style={{
                    height: "120px",
                    paddingTop: "25px",
                    paddingBottom: "30px",
                  }}
                >
                  <div
                    className="overflow-visible"
                    style={{
                      transform: "scale(0.8)",
                      transformOrigin: "top center",
                      overflow: "visible",
                    }}
                  >
                    <Piano activeNotes={activeNotesRef.current} />
                  </div>
                </div>
              </div>

              {/* === 💡 모바일 뷰 (md:hidden) === */}
              <div className={`${audioUrl ? "" : "hidden"}
                md:hidden /* 모바일에서만 보임 */
                absolute top-1/2 left-1/2 
                w-dvh h-dvw 
                transform 
                -translate-x-1/2 -translate-y-1/2
                rotate-90
                
                flex flex-col items-center justify-center
                overflow-hidden p-4
              `}>
                {/* 배경 그라디언트 (데스크탑과 동일) */}
                <div 
                  className="absolute inset-0 pointer-events-none z-0"
                  style={{ background: 'linear-gradient(to bottom, rgba(13, 17, 19, 0), rgba(13, 17, 19, 0.5))' }}
                />
                
                {/* 1. 모바일용 헤더 */}
                <header className="w-full flex justify-between items-start px-6 pt-4 z-10">
                  
                  {/* 2. 제목/부제목 (왼쪽) */}
                  <div className="flex flex-col items-start ">
                    <h1 className="text-[30px] font-semibold">{pageTitle}</h1>
                    {/* 3. 부제목 고정 */}
                    <p className="text-[12px] font-semilight">{pageSubtitle}</p>
                  </div>
                  
                  {/*  4. 닫기 버튼 (오른쪽) - onClick 추가 */}
                  <CloseButton onClick={handleGoBack} darkBackground={theme === 'dark'} /> 
                </header>

                {/* 5. 피아노 + Status 래퍼 */}
                <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
                  
                  {/* 6. Status 메시지를 피아노 위로 이동 */}
                  {status ? (
                    status.includes("중...") ? (
                      <div className="mb-2">
                        <LoadingIndicator
                          text={status}
                          className={`h-auto ${theme === "dark" ? "text-white" : "text-black"}`}
                          textClassName="text-sm whitespace-nowrap"
                        />
                      </div>
                    ) : (
                      <p className="text-sm whitespace-nowrap mb-2">{status}</p>
                    )
                  ) : (
                    // Status가 없을 때도 공간을 차지해 레이아웃이 밀리지 않게 함
                    <div className="h-3 mb-2"></div> 
                  )}

                  {/* 피아노 */}
                  <div className="transform origin-center scale-[0.5]">
                    <Piano activeNotes={activeNotesRef.current} />
                  </div>
                </div>

                {/* 모바일용 MIDI 플레이어 바 (하단) */}
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

                {/* 다크모드 토글 (우하단) */}
                <div className="absolute bottom-4 right-4 z-50">
                  <ThemeToggle className={theme === 'dark' ? "shadow-none" : "shadow-lg shadow-black/10"} />
                </div>
              </div>
            </>
          </>
        </main>
        
        {/* === 데스크탑용 MIDI 플레이어 바 === */}
        {hasTransport ? (
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
