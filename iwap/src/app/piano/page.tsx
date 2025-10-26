"use client";
import { useRef, useState, useEffect } from "react";
import FullScreenView from "@/components/ui/FullScreenView";
import { useRecorder } from "@/components/audio/useRecorder";
import RecorderButton from "@/components/audio/RecorderButton";
import Piano from "@/components/piano/Piano";

export default function VoiceToPiano() {
  const { isRecording, audioUrl, startRecording, stopRecording } = useRecorder();
  const activeNotesRef = useRef<Set<number>>(new Set());
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState(""); // 업로드 상태 표시용

  const handleMidi = ({ type, note }: { type: "on" | "off"; note: number }) => {
    const s = activeNotesRef.current;
    if (type === "on") s.add(note);
    else s.delete(note);
    setTick((t) => t ^ 1);
  };

  useEffect(() => {
    (window as any).pushMidi = handleMidi;
    return () => { delete (window as any).pushMidi; };
  }, []);

  // 🎵 녹음 완료 시 MP3 업로드 → MIDI 변환 요청
  useEffect(() => {
    if (!audioUrl) return;

    const sendAudioToBackend = async () => {
      try {
        setStatus("업로드 중...");
        const res = await fetch(audioUrl);
        const blob = await res.blob();
        const mp3Blob = new Blob([blob], { type: "audio/mp3" });
        const formData = new FormData();
        formData.append("voice", blob, "voice.mp3");

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/piano/`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadRes.ok) throw new Error("업로드 실패");
        const data = await uploadRes.json();
        setStatus(data.message || "MIDI 변환 완료");
      } catch (err) {
        console.error(err);
        setStatus("오류 발생");
      }
    };

    sendAudioToBackend();
  }, [audioUrl]);

  // 피아노 스크롤 중앙 정렬
  const pianoScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!audioUrl) return;
    const el = pianoScrollRef.current;
    if (!el) return;
    const to = el.scrollWidth / 2 - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, to);
  }, [audioUrl, tick]);

  return (
    <FullScreenView
      title="P!ano"
      subtitle="음성을 피아노로 변환하기"
      goBack={true}
      className="text-black font-[Pretendard]"
      backgroundUrl="/images/piano_background.png"
    >
      <main className="flex flex-col items-center justify-center w-full min-h-[calc(100dvh-96px)] gap-6">
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
            <audio src={audioUrl} controls autoPlay className="rounded-xl backdrop-blur" />
            <p className="text-lg">{status}</p>

            <div
              ref={pianoScrollRef}
              className="
                relative
                w-full
                overflow-x-auto
                [overflow-y-visible]
                py-10
                flex items-center justify-center
                [scrollbar-width:none] [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
                <div className="scale-[0.6] md:scale-[0.85] lg:scale-100 origin-center">
                  <Piano activeNotes={activeNotesRef.current} />
                </div>
              </div>
          </div>
        )}
      </main>
    </FullScreenView>
  );
}
