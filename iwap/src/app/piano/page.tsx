"use client";
import { useRef, useState, useEffect } from "react";
import FullScreenView from "@/components/ui/FullScreenView";
import { useRecorder } from "@/components/audio/useRecorder";
import RecorderButton from "@/components/audio/RecorderButton";
import Octave from "@/components/piano/Octave";

export default function VoiceToPiano() {
  const { isRecording, audioUrl, startRecording, stopRecording } = useRecorder();
  const activeNotesRef = useRef<Set<number>>(new Set());
  const [tick, setTick] = useState(0);

  const handleMidi = ({ type, note }: { type: "on" | "off"; note: number }) => {
    const s = activeNotesRef.current;
    if (type === "on") s.add(note);
    else s.delete(note);
    setTick((t) => t ^ 1);
  };

  useEffect(() => {
  (window as any).pushMidi = handleMidi;
  return () => {
    delete (window as any).pushMidi;
  };
}, []);

  return (
    <FullScreenView
      title="P!ano"
      subtitle="음성을 피아노로 변환하기"
      goBack={true}
      className="text-black font-[Pretendard]"
      backgroundUrl="/images/piano_background.png"
    >
      <main className="flex flex-col items-center justify-center w-full h-dvh md:h-[calc(100dvh-96px)]">
        {!audioUrl ? (
          <div className="flex flex-col items-center justify-center gap-10">
            <h1 className="text-3xl font-bold text-center">음성을 입력해주세요</h1>
            <RecorderButton
              isRecording={isRecording}
              startRecording={startRecording}
              stopRecording={stopRecording}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full gap-8 bg-white mt-56">
            <audio src={audioUrl} controls autoPlay />
            <div className="bg-white flex items-center justify-center p-4 overflow-x-auto rounded-lg shadow-lg">
              <div className="scale-[0.6] md:scale-[0.8] lg:scale-100 origin-center">
                <div className="piano-body relative h-[18.875em] w-fit my-[2em] mx-auto border rounded-[1em]">
                  <ul className="flex flex-row">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Octave key={i} start={24 + i * 12} />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </FullScreenView>
  );
}
