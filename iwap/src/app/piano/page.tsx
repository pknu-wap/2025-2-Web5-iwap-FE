"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import FullScreenView from "@/components/ui/FullScreenView";
import { useRecorder } from "@/components/audio/useRecorder";
import RecorderButton from "@/components/audio/RecorderButton";
import Piano from "@/components/piano/Piano";
import PianoBackendManager, {
  type MidiTransportControls,
} from "@/app/api/piano/PianoBackendManager";
import MidiPlayerBar from "@/components/audio/MidiPlayerBar";

export default function VoiceToPiano() {
  const { isRecording, audioUrl, startRecording, stopRecording } = useRecorder();
  const activeNotesRef = useRef<Set<number>>(new Set());
  const noteTimeoutsRef = useRef<Map<number, number>>(new Map());
  const [, forceRender] = useState(0);
  const [status, setStatus] = useState("");
  const [transport, setTransport] = useState<MidiTransportControls | null>(null);
  const [transportDuration, setTransportDuration] = useState(0);
  const [transportPosition, setTransportPosition] = useState(0);
  const [isTransportPlaying, setIsTransportPlaying] = useState(false);

  // MIDI on/off 이벤트 등록
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
    (window as any).pushMidi = handleMidi;

    // cleanup 함수만 반환
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

  // 🎵 오디오 업로드 및 MIDI 변환 요청은 PianoBackendManager에서 처리됩니다.

  const hasTransport = Boolean(transport);

  return (
    <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]">
      <FullScreenView
      title="P!ano"
      subtitle="음성을 피아노로 변환하기"
      goBack={true}
      className="text-black font-[Pretendard]"
      backgroundUrl="/images/piano_background.png"
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
          <div className="flex flex-col items-center justify-center gap-8">
            <h1 className="text-3xl font-bold text-center">음성을 입력해주세요</h1>
            <RecorderButton
              isRecording={isRecording}
              startRecording={startRecording}
              stopRecording={stopRecording}
            />
          </div>
        ) : (
          <>
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
                    transform: "scale(0.85)",
                    transformOrigin: "top center",
                    overflow: "visible",
                  }}
                >
                  <Piano activeNotes={activeNotesRef.current} />
                </div>
              </div>
            </div>

            <div className="relative flex w-full items-center justify-center md:hidden">
              <div className="relative flex w-full items-center justify-center min-h-[70vh] py-10">
                <div className="transform rotate-90 origin-center scale-[0.4] translate-y-8">
                  <Piano activeNotes={activeNotesRef.current} />
                </div>
                {status ? (
                  <div className="absolute left-6 top-10 transform rotate-90 translate-x-50 md:translate-y-0 translate-y-55 md:translate-y-0">
                    <p className="text-base text-center whitespace-nowrap">{status}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </main>
      {hasTransport ? (
        <MidiPlayerBar
          isPlaying={isTransportPlaying}
          duration={transportDuration}
          position={transportPosition}
          onTogglePlay={handleTogglePlayback}
          onSeek={handleSeek}
          disabled={!hasTransport || transportDuration <= 0}
          className="max-w-4xl"
        />
      ) : null}
      </FullScreenView>
    </div>
  );
}
