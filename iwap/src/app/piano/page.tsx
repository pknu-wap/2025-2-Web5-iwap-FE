"use client";

import { useRef, useState, useEffect } from "react";
import FullScreenView from "@/components/ui/FullScreenView";
import { useRecorder } from "@/components/audio/useRecorder";
import RecorderButton from "@/components/audio/RecorderButton";
import Piano from "@/components/piano/Piano";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

export default function VoiceToPiano() {
  const { isRecording, audioUrl, startRecording, stopRecording } = useRecorder();
  const activeNotesRef = useRef<Set<number>>(new Set());
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState("");
  const [midiLoaded, setMidiLoaded] = useState(false);

  // MIDI on/off 이벤트 등록
  const handleMidi = ({ type, note }: { type: "on" | "off"; note: number }) => {
    const s = activeNotesRef.current;
    if (type === "on") s.add(note);
    else s.delete(note);
    setTick((t) => t ^ 1);
  };

  useEffect(() => {
  (window as any).pushMidi = handleMidi;

  // cleanup 함수만 반환
  return () => {
    delete (window as any).pushMidi;
  };
  }, []);

  // 🎵 오디오 업로드 및 MIDI 변환 요청
  useEffect(() => {
    if (!audioUrl) return;

    const sendAudioToBackend = async () => {
      try {
        // setStatus("업로드 중...");
        const res = await fetch(audioUrl);
        const blob = await res.blob();

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
        // setStatus("MIDI 변환 완료. 재생 준비 중...");
        await fetchAndPlayMidi(); // ✅ 변환 완료 후 MIDI 다운로드 및 재생
      } catch (err) {
        console.error(err);
        // setStatus("오류 발생");
      }
    };

    sendAudioToBackend();
  }, [audioUrl]);

  // 🎼 MIDI 다운로드 후 Tone.js로 재생
const fetchAndPlayMidi = async () => {
  try {
    const midiRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/piano/`);
    if (!midiRes.ok) throw new Error("MIDI 파일 다운로드 실패");

    const midiArray = await midiRes.arrayBuffer();
    const midi = new Midi(midiArray);

    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();

    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    midi.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        const midiNum = note.midi;
        const start = note.time;
        const duration = Math.max(note.duration, 0.05);

        Tone.Transport.schedule((time) => {
          synth.triggerAttackRelease(note.name, duration, time, note.velocity);

          // ✅ 정확한 타이밍에 건반 on/off
          handleMidi({ type: "on", note: midiNum });
          Tone.Transport.scheduleOnce(() => {
            handleMidi({ type: "off", note: midiNum });
          }, start + duration);
        }, start);
      });
    });

    Tone.Transport.start("+0.05");
    // setStatus("🎹 MIDI 재생 중...");
  } catch (err) {
    console.error("MIDI 재생 실패:", err);
    setStatus("MIDI 재생 실패");
  }
};


  return (
    <FullScreenView
      title="P!ano"
      subtitle="음성을 피아노로 변환하기"
      goBack={true}
      className="text-black font-[Pretendard]"
      backgroundUrl="/images/piano_background.png"
    >
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
