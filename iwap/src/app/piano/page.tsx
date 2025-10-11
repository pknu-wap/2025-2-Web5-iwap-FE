"use client";

import { useState, useEffect, useRef } from "react";
import FullScreenView from "@/components/ui/FullScreenView";
import SiriWave from "siriwave";

// === 유틸 ===
const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const freqToMidi = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);

function estimatePitchACF(timeData: Float32Array, sampleRate: number): number | null {
  const N = timeData.length;
  let mean = 0;
  for (let i = 0; i < N; i++) mean += timeData[i];
  mean /= N;
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++)
    x[i] = (timeData[i] - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));

  const acf = new Float32Array(N);
  for (let lag = 0; lag < N; lag++) {
    let sum = 0;
    for (let i = 0; i < N - lag; i++) sum += x[i] * x[i + lag];
    acf[lag] = sum;
  }

  const maxLag = Math.floor(sampleRate / 80);
  const minLag = Math.floor(sampleRate / 1000);
  let peakLag = -1;
  let peakVal = 0;
  let i = 1;
  while (i < acf.length - 1 && acf[i] >= acf[i - 1]) i++;
  for (; i < Math.min(acf.length - 1, maxLag); i++) {
    if (i < minLag) continue;
    if (acf[i] > acf[i - 1] && acf[i] > acf[i + 1] && acf[i] > peakVal) {
      peakVal = acf[i];
      peakLag = i;
    }
  }
  if (peakLag <= 0) return null;
  return sampleRate / peakLag;
}

// === MIDI 이벤트 기반 피아노 ===
type MidiEvt = { type: "on" | "off"; note: number };

const isBlack = (n: number) => [1, 3, 6, 8, 10].includes(n % 12);

export default function VoiceToPiano() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const activeNotesRef = useRef<Set<number>>(new Set());

  // window.pushMidi({type:"on", note:60}) 형태로 외부 호출
  const handleMidi = ({ type, note }: MidiEvt) => {
    if (note < 0 || note > 127) return;
    const s = activeNotesRef.current;
    if (type === "on") s.add(note);
    else s.delete(note);
    setTick((t) => t ^ 1);
  };

  useEffect(() => {
    // @ts-ignore
    window.pushMidi = handleMidi;
    return () => {
      // @ts-ignore
      delete window.pushMidi;
    };
  }, []);

  // SiriWave 설정
  const siriRef = useRef<HTMLDivElement | null>(null);
  const siriWaveRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (isRecording && siriRef.current) {
      siriWaveRef.current = new SiriWave({
        container: siriRef.current,
        width: 130,
        height: 100,
        speed: 0.15,
        amplitude: 0.4,
        autostart: true,
        style: "ios9",
      });
      const anim = setInterval(() => {
        siriWaveRef.current?.setAmplitude(0.2 + Math.random() * 0.6);
      }, 120);
      return () => {
        clearInterval(anim);
        siriWaveRef.current?.stop();
        siriWaveRef.current = null;
      };
    }
  }, [isRecording]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setAudioUrl(URL.createObjectURL(blob));
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // === 피아노 건반 컴포넌트 ===
  const PianoKey = ({ midi }: { midi: number }) => {
    const black = isBlack(midi);
    const active = activeNotesRef.current.has(midi);

    const baseWhite =
      "white h-[16em] w-[4em] z-10 border-l border-b border-[#bbb] rounded-b-[5px] " +
      "shadow-[-1px_0_0_rgba(255,255,255,0.8)_inset,0_0_5px_#ccc_inset,0_0_3px_rgba(0,0,0,0.2)] " +
      "bg-gradient-to-b from-[#eee] to-white active:border-t-[#777] active:border-l-[#999] active:border-b-[#999] " +
      "active:shadow-[2px_0_3px_rgba(0,0,0,0.1)_inset,-5px_5px_20px_rgba(0,0,0,0.2)_inset,0_0_3px_rgba(0,0,0,0.2)] " +
      "active:bg-gradient-to-b active:from-white active:to-[#e9e9e9]";
    const baseBlack =
      "black h-[8em] w-[2em] ml-[-1em] mr-[-1em] z-20 border border-black rounded-b-[3px] " +
      "shadow-[-1px_-1px_2px_rgba(255,255,255,0.2)_inset,0_-5px_2px_3px_rgba(0,0,0,0.6)_inset,0_2px_4px_rgba(0,0,0,0.5)] " +
      "bg-gradient-to-tr from-[#222] to-[#555] active:shadow-[-1px_-1px_2px_rgba(255,255,255,0.2)_inset,0_-2px_2px_3px_rgba(0,0,0,0.6)_inset,0_1px_2px_rgba(0,0,0,0.5)] " +
      "active:bg-gradient-to-r active:from-[#444] to-[#222]";

    const activeWhite = active ? " !from-white !to-[#e0e0e0] active:bg-gradient-to-b active:from-white active:to-[#e9e9e9]" : "";
    const activeBlack = active ? " translate-y-[2px] ring-2 active:bg-gradient-to-r active:from-[#444] to-[#222]" : "";

    return <li className={(black ? baseBlack + activeBlack : baseWhite + activeWhite)} />;
  };

  const Octave = ({ start }: { start: number }) => (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <PianoKey key={i} midi={start + i} />
      ))}
    </>
  );

  return (
    <FullScreenView
      title="P!ano"
      subtitle="음성을 피아노로 변환하기"
      goBack={true}
      className="bg-white text-black font-[Pretendard]"
    >
      <main className="flex flex-col items-center justify-center w-full h-full">
        {!audioUrl && (
          <div className="flex flex-col items-center justify-center gap-10 mt-56">
            <h1 className="text-3xl font-Pretendard">음성을 입력해주세요</h1>

            {!isRecording ? (
              <button
                onClick={startRecording}
                className="relative w-[180px] h-[180px] rounded-full flex items-center justify-center bg-gradient-to-b from-[#E5E7EB] to-[#A1A1AA] transition-transform"
              >
                <div className="absolute inset-[8px] rounded-full bg-gradient-to-b from-white to-[#F3F4F6]" />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="111"
                  height="111"
                  viewBox="0 0 111 111"
                  fill="none"
                  className="relative z-10"
                >
                  <path
                    d="M22.2002 55.5002C22.2002 54.0282 22.7849 52.6166 23.8258 51.5758C24.8666 50.5349 26.2782 49.9502 27.7502 49.9502C29.2221 49.9502 30.6338 50.5349 31.6746 51.5758C32.7155 52.6166 33.3002 54.0282 33.3002 55.5002C33.3002 61.388 35.6391 67.0347 39.8024 71.198C43.9657 75.3613 49.6124 77.7002 55.5002 77.7002C61.388 77.7002 67.0347 75.3613 71.198 71.198C75.3613 67.0347 77.7002 61.388 77.7002 55.5002C77.7002 54.0282 78.2849 52.6166 79.3258 51.5758C80.3666 50.5349 81.7783 49.9502 83.2502 49.9502C84.7222 49.9502 86.1338 50.5349 87.1746 51.5758C88.2155 52.6166 88.8002 54.0282 88.8002 55.5002C88.8014 63.3705 86.015 70.9869 80.9351 76.9984C75.8553 83.0099 68.8105 87.0278 61.0502 88.3395V97.1252C61.0502 98.5971 60.4655 100.009 59.4246 101.05C58.3838 102.09 56.9722 102.675 55.5002 102.675C54.0282 102.675 52.6166 102.09 51.5758 101.05C50.5349 100.009 49.9502 98.5971 49.9502 97.1252V88.3395C42.1899 87.0278 35.1451 83.0099 30.0653 76.9984C24.9854 70.9869 22.199 63.3705 22.2002 55.5002Z"
                    fill="url(#paint0_linear_821_412)"
                  />
                  <path
                    d="M38.8506 27.7501C38.8506 23.3342 40.6048 19.0993 43.7273 15.9768C46.8497 12.8543 51.0847 11.1001 55.5006 11.1001C59.9164 11.1001 64.1514 12.8543 67.2739 15.9768C70.3964 19.0993 72.1506 23.3342 72.1506 27.7501V55.5001C72.1506 59.916 70.3964 64.1509 67.2739 67.2734C64.1514 70.3959 59.9164 72.1501 55.5006 72.1501C51.0847 72.1501 46.8497 70.3959 43.7273 67.2734C40.6048 64.1509 38.8506 59.916 38.8506 55.5001V27.7501Z"
                    fill="url(#paint1_linear_821_412)"
                  />
                  <defs>
                    <linearGradient
                      id="paint0_linear_821_412"
                      x1="22.2002"
                      y1="27.7502"
                      x2="55.5002"
                      y2="105.45"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#EFEFEF" />
                      <stop offset="1" stopColor="#C1C1C1" />
                    </linearGradient>
                    <linearGradient
                      id="paint1_linear_821_412"
                      x1="30.5256"
                      y1="-2.7749"
                      x2="63.8256"
                      y2="105.45"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#89C7E6" />
                      <stop offset="1" stopColor="#DD78E0" />
                    </linearGradient>
                  </defs>
                </svg>
              </button>
            ) : (
              <div className="relative w-[180px] h-[180px] rounded-full bg-gradient-to-b from-[#d9d9d9] to-[#a2a2a2] flex items-center justify-center">
                <div className="absolute inset-[8px] rounded-full bg-gradient-to-b from-white to-[#f3f3f3]" />
                <div ref={siriRef} className="relative w-[120px] h-[60px] -translate-y-1" />
                <button
                  onClick={stopRecording}
                  className="absolute bottom-4 text-sm bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-1 shadow active:scale-95"
                >
                  정지
                </button>
              </div>
            )}
          </div>
        )}

        {/* 녹음 후 피아노 */}
        {audioUrl && (
          <div className="flex flex-col items-center justify-center w-full h-full gap-8 bg-white mt-56">
            <audio src={audioUrl} controls autoPlay />
            <div className="bg-white flex items-center justify-center p-4 overflow-x-auto rounded-lg shadow-lg">
              <div className="scale-[0.6] md:scale-[0.8] lg:scale-100 origin-center">
                <div className="piano-body relative h-[18.875em] w-fit my-[2em] mx-auto pt-[3em] pl-[3em] border border-[#160801] rounded-[1em] shadow-[0_0_30px_rgba(0,0,0,0.2)_inset,0_1px_rgba(212,152,125,0.2)_inset,0_5px_10px_rgba(0,0,0,0.3)] bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.5)]">
                  <ul className="flex flex-row">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Octave key={i} start={24 + i * 12} />
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 테스트용 버튼 */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleMidi({ type: "on", note: 60 })}
                className="px-3 py-1 rounded bg-gray-900 text-white"
              >
                C4 ON
              </button>
              <button
                onClick={() => handleMidi({ type: "off", note: 60 })}
                className="px-3 py-1 rounded bg-gray-200"
              >
                C4 OFF
              </button>
            </div>
          </div>
        )}
      </main>
    </FullScreenView>
  );
}
