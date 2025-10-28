"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import FullScreenView from "@/components/ui/FullScreenView";
import { useRecorder } from "@/components/audio/useRecorder";
import RecorderButton from "@/components/audio/RecorderButton";
import Piano from "@/components/piano/Piano";
import PianoBackendManager from "@/app/api/piano/PianoBackendManager";

export default function VoiceToPiano() {
  const { isRecording, audioUrl, startRecording, stopRecording } = useRecorder();
  const activeNotesRef = useRef<Set<number>>(new Set());
  const [, forceRender] = useState(0);
  const [status, setStatus] = useState("");

  // MIDI on/off 이벤트 등록
  const handleMidi = useCallback(
    ({ type, note }: { type: "on" | "off"; note: number }) => {
    const s = activeNotesRef.current;
    if (type === "on") s.add(note);
    else s.delete(note);
    forceRender((t) => t ^ 1);
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

  // 🎵 오디오 업로드 및 MIDI 변환 요청은 PianoBackendManager에서 처리됩니다.


  return (
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
      />
      {audioUrl && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[10%] to-[#1D263D]"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[60%] to-[#00020B]"></div>
        </>
      )}
      <main className="flex flex-col items-center justify-center w-full min-h-[calc(100dvh-96px)] gap-6 overflow-visible">
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
          <div className="flex flex-col items-center w-full gap-6">
            <p className="text-lg">{status}</p>

            {/* {midiLoaded ? (
              <p className="text-sm text-gray-400">
                MIDI 재생 중...
                </p>
            ) : (
              <audio
                src={audioUrl}
                controls
                autoPlay
                className="rounded-xl backdrop-blur"
              />
            )} */}

            <div
              className="relative flex items-center justify-center w-full overflow-visible"
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
        )}
      </main>
    </FullScreenView>
  );
}
