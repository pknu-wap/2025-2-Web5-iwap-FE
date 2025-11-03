"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation"; // ✅ 1. useRouter import
import FullScreenView from "@/components/ui/FullScreenView";
import CloseButton from "@/components/ui/CloseButton";
import { useRecorder } from "@/components/audio/useRecorder";
import RecorderButton from "@/components/audio/RecorderButton";
import Piano from "@/components/piano/Piano";
import PianoBackendManager, {
  type MidiTransportControls,
} from "@/app/api/piano/PianoBackendManager";
import MidiPlayerBar from "@/components/audio/MidiPlayerBar";
import * as Tone from "tone";

export default function VoiceToPiano() {
  useEffect(() => {
    const startTone = async () => await Tone.start();
    document.addEventListener("click", startTone, { once: true });
    return () => document.removeEventListener("click", startTone);
  }, []);
  
  const { isRecording, audioUrl, startRecording, stopRecording } = useRecorder();
  const [isMobile, setIsMobile] = useState(false);
  const activeNotesRef = useRef<Set<number>>(new Set());
  const noteTimeoutsRef = useRef<Map<number, number>>(new Map());
  const [, forceRender] = useState(0);
  const [status, setStatus] = useState("");
  const [transport, setTransport] = useState<MidiTransportControls | null>(null);
  const [transportDuration, setTransportDuration] = useState(0);
  const [transportPosition, setTransportPosition] = useState(0);
  const [isTransportPlaying, setIsTransportPlaying] = useState(false);

  const router = useRouter(); // ✅ 2. router 선언

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

  useEffect(() => {
    const hidden = Boolean(audioUrl) && isMobile;
    window.dispatchEvent(
      new CustomEvent("iwap:toggle-header", {
        detail: { hidden },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("iwap:toggle-header", {
          detail: { hidden: false },
        })
      );
    };
  }, [audioUrl, isMobile]);

  const handleTransportReady = useCallback((controls: MidiTransportControls) => {
    setTransport(controls);
    setTransportDuration(controls.duration);
    setTransportPosition(0);
    setIsTransportPlaying(false);
  }, []);

  const handleTransportReset = useCallback(() => {
    setTransport(null);
    setTransportDuration(0);
    setTransportPosition(0);
    setIsTransportPlaying(false);
    setStatus("");
    noteTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    noteTimeoutsRef.current.clear();
    activeNotesRef.current.clear();
    forceRender((t) => t ^ 1);
  }, [forceRender]);

  const handleTogglePlayback = useCallback(() => {
    if (!transport) return;
    if (isTransportPlaying) {
      transport.pause();
      setIsTransportPlaying(false);
    } else {
      void transport.start();
      setIsTransportPlaying(true);
    }
  }, [transport, isTransportPlaying]);

  const handleSeek = useCallback(
    (seconds: number, resume: boolean) => {
      if (!transport) return;
      const clamped = Math.max(0, Math.min(transportDuration, seconds));
      transport.seek(clamped, resume);
      setTransportPosition(clamped);
    },
    [transport, transportDuration]
  );
  // (여기까지 handle... 함수들)

  // ✅ 3. 뒤로 가기 핸들러 함수
  const handleGoBack = () => {
    router.back();
  };

  const hasTransport = Boolean(transport);

  return (
    <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]">
      <FullScreenView
        title="P!ano"
        subtitle="음성을 피아노로 변환하기"
        goBack={true} // 이 goBack은 FullScreenView의 기본 버튼에만 적용됩니다.
        className="text-black font-[Pretendard]"
        backgroundUrl="/images/piano_background.png"
        
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
        />
        {audioUrl && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[10%] to-[#1D263D]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[60%] to-[#00020B]"></div>
          </>
        )}

        <main className="flex flex-col items-center justify-center w-full min-h-[calc(100svh-96px)] gap-4 overflow-visible">
          {!audioUrl ? (
            // === '녹음' 뷰 (변경 없음) ===
            <div className="flex flex-col items-center justify-center gap-8">
              <h1 className="text-2xl md:text-3xl font-bold text-center">음성을 입력해주세요</h1>
              <RecorderButton
                isRecording={isRecording}
                startRecording={startRecording}
                stopRecording={stopRecording}
              />
            </div>
          ) : (
            // === '피아노/재생' 뷰 ===
            <>
              {/* === 데스크탑 뷰 (md:flex) === */}
              {/* (기존 코드와 동일) */}
              <div className="hidden w-full flex-col items-center gap-6 md:flex">
                {status ? (
                  <p className="text-lg text-center whitespace-nowrap">{status}</p>
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
              <div className="
                md:hidden /* 모바일에서만 보임 */
                absolute top-1/2 left-1/2 
                w-dvh h-dvw 
                transform 
                -translate-x-1/2 -translate-y-1/2
                rotate-90
                
                flex flex-col items-center justify-center
                overflow-hidden p-4 text-white
              ">
                
                {/* 1. 모바일용 헤더 */}
                <header className="w-full flex justify-between items-start px-6 pt-4">
                  
                  {/* 2. 제목/부제목 (왼쪽) */}
                  <div className="flex flex-col items-start ">
                    <h1 className="text-[30px] font-semibold">{pageTitle}</h1>
                    {/* 3. 부제목 고정 */}
                    <p className="text-[12px] font-semilight">{pageSubtitle}</p>
                  </div>
                  
                  {/* ✅ 4. 닫기 버튼 (오른쪽) - onClick 추가 */}
                  <CloseButton onClick={handleGoBack} /> 
                </header>

                {/* 5. 피아노 + Status 래퍼 */}
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  
                  {/* 6. Status 메시지를 피아노 위로 이동 */}
                  {status ? (
                    <p className="text-sm whitespace-nowrap mb-2">{status}</p>
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
                  <footer className="w-full flex justify-center pb-2">
                    <MidiPlayerBar
                      isPlaying={isTransportPlaying}
                      duration={transportDuration}
                      position={transportPosition}
                      onTogglePlay={handleTogglePlayback}
                      onSeek={handleSeek}
                      disabled={!hasTransport || transportDuration <= 0}
                      className="max-w-xl" 
                    />
                  </footer>
                )}
              </div>
            </>
          )}
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
              disabled={!hasTransport || transportDuration <= 0}
              className="max-w-4xl"
            />
          </div>
        ) : null}

      </FullScreenView>
    </div>
  );
}