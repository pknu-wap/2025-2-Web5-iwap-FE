"use client";

import { useState, useEffect, useRef } from "react";
import FullScreenView from "@/components/ui/FullScreenView";

// ====== 피아노 컴포넌트 ======
const WhiteKey = () => (
  <li className="white h-[16em] w-[4em] z-10 border-l border-b border-[#bbb] rounded-b-[5px] shadow-[-1px_0_0_rgba(255,255,255,0.8)_inset,0_0_5px_#ccc_inset,0_0_3px_rgba(0,0,0,0.2)] bg-gradient-to-b from-[#eee] to-white active:border-t-[#777] active:border-l-[#999] active:border-b-[#999] active:shadow-[2px_0_3px_rgba(0,0,0,0.1)_inset,-5px_5px_20px_rgba(0,0,0,0.2)_inset,0_0_3px_rgba(0,0,0,0.2)] active:bg-gradient-to-b active:from-white active:to-[#e9e9e9]"></li>
);
const BlackKey = () => (
  <li className="black h-[8em] w-[2em] ml-[-1em] mr-[-1em] z-20 border border-black rounded-b-[3px] shadow-[-1px_-1px_2px_rgba(255,255,255,0.2)_inset,0_-5px_2px_3px_rgba(0,0,0,0.6)_inset,0_2px_4px_rgba(0,0,0,0.5)] bg-gradient-to-tr from-[#222] to-[#555] active:shadow-[-1px_-1px_2px_rgba(255,255,255,0.2)_inset,0_-2px_2px_3px_rgba(0,0,0,0.6)_inset,0_1px_2px_rgba(0,0,0,0.5)] active:bg-gradient-to-r active:from-[#444] to-[#222]"></li>
);
const Octave = () => (
  <>
    <WhiteKey />
    <BlackKey />
    <WhiteKey />
    <BlackKey />
    <WhiteKey />
    <WhiteKey />
    <BlackKey />
    <WhiteKey />
    <BlackKey />
    <WhiteKey />
    <BlackKey />
    <WhiteKey />
  </>
);

// ====== 메인 페이지 ======
export default function VoiceToPiano() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [wavePhase, setWavePhase] = useState(0);
  const numberOfOctaves = 4;

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setWavePhase((p) => p + 0.1), 50);
    return () => clearInterval(t);
  }, [isRecording]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <main className="h-screen w-full flex flex-col items-center justify-center bg-white text-black font-[Pretendard]">
      {!audioUrl && (
        <div className="flex flex-col items-center justify-center w-full h-full pb-32">
          <FullScreenView
            title="P!ano"
            subtitle="음성을 피아노로 변환하기"
            goBack={true}
            className="text-black"
          >
            <h1 className="text-3xl font-bold font-[Pretendard]">
              음성을 입력해주세요
            </h1>
          </FullScreenView>

          {/* Siri 파형 */}
          <div className="transform -translate-y-50 relative w-[240px] h-[80px] mb-10 overflow-hidden">
            <svg viewBox="0 0 240 80" className="absolute inset-0">
              <path
                d={`M0 40 Q 60 ${40 + 20 * Math.sin(wavePhase)}, 120 40 Q 180 ${
                  40 - 20 * Math.sin(wavePhase)
                }, 240 40`}
                stroke="url(#waveGradient)"
                strokeWidth="4"
                fill="none"
              />
              <defs>
                <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7B61FF" />
                  <stop offset="50%" stopColor="#61DAFB" />
                  <stop offset="100%" stopColor="#A1E3A1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

{/* 녹음 버튼 */}
{!isRecording ? (
  <button
    onClick={startRecording}
    className="transform -translate-y-40 active:scale-95 transition-transform"
    aria-label="녹음 시작"
  >
    {/* 하나로 합쳐진 SVG입니다.
      이제 이 SVG는 내부 요소들이 항상 완벽하게 정렬된 단일 이미지처럼 작동합니다.
    */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="182"
      height="182"
      viewBox="0 0 182 182"
      fill="none"
    >
      {/* 레이어 1: 회색 원 */}
      <circle cx="91" cy="91" r="91" fill="url(#paint0_linear_grey_circle)" />
      
      {/* 레이어 2: 흰색 원 (중앙 정렬을 위해 cx, cy를 91로 수정) */}
      <circle cx="91" cy="91" r="84" fill="url(#paint1_linear_white_circle)" />
      
      {/* 레이어 3: 마이크 아이콘 (중앙 정렬을 위해 <g> 태그와 transform 사용) */}
      <g transform="translate(35.5, 35.5)">
        <path
          d="M22.2002 55.5002C22.2002 54.0282 22.7849 52.6166 23.8258 51.5758C24.8666 50.5349 26.2782 49.9502 27.7502 49.9502C29.2221 49.9502 30.6338 50.5349 31.6746 51.5758C32.7155 52.6166 33.3002 54.0282 33.3002 55.5002C33.3002 61.388 35.6391 67.0347 39.8024 71.198C43.9657 75.3613 49.6124 77.7002 55.5002 77.7002C61.388 77.7002 67.0347 75.3613 71.198 71.198C75.3613 67.0347 77.7002 61.388 77.7002 55.5002C77.7002 54.0282 78.2849 52.6166 79.3258 51.5758C80.3666 50.5349 81.7783 49.9502 83.2502 49.9502C84.7222 49.9502 86.1338 50.5349 87.1746 51.5758C88.2155 52.6166 88.8002 54.0282 88.8002 55.5002C88.8014 63.3705 86.015 70.9869 80.9351 76.9984C75.8553 83.0099 68.8105 87.0278 61.0502 88.3395V97.1252C61.0502 98.5971 60.4655 100.009 59.4246 101.05C58.3838 102.09 56.9722 102.675 55.5002 102.675C54.0282 102.675 52.6166 102.09 51.5758 101.05C50.5349 100.009 49.9502 98.5971 49.9502 97.1252V88.3395C42.1899 87.0278 35.1451 83.0099 30.0653 76.9984C24.9854 70.9869 22.199 63.3705 22.2002 55.5002Z"
          fill="url(#paint2_linear_mic)"
        />
        <path
          d="M38.8506 27.7501C38.8506 23.3342 40.6048 19.0993 43.7273 15.9768C46.8497 12.8543 51.0847 11.1001 55.5006 11.1001C59.9164 11.1001 64.1514 12.8543 67.2739 15.9768C70.3964 19.0993 72.1506 23.3342 72.1506 27.7501V55.5001C72.1506 59.916 70.3964 64.1509 67.2739 67.2734C64.1514 70.3959 59.9164 72.1501 55.5006 72.1501C51.0847 72.1501 46.8497 70.3959 43.7273 67.2734C40.6048 64.1509 38.8506 59.916 38.8506 55.5001V27.7501Z"
          fill="url(#paint3_linear_mic)"
        />
      </g>

      {/* 모든 Gradient 정의를 <defs> 안에 모아둡니다. ID 충돌을 피하기 위해 이름을 수정했습니다. */}
      <defs>
        <linearGradient
          id="paint0_linear_grey_circle"
          x1="91" y1="0" x2="91" y2="182"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D9D9D9" />
          <stop offset="1" stopColor="#A2A2A2" />
        </linearGradient>
        
        <linearGradient
          id="paint1_linear_white_circle"
          x1="84" y1="0" x2="84" y2="168"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#F3F3F3" />
        </linearGradient>
        
        <linearGradient
          id="paint2_linear_mic"
          x1="22.2" y1="27.75" x2="55.5" y2="105.45"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EFEFEF" />
          <stop offset="1" stopColor="#C1C1C1" />
        </linearGradient>
        
        <linearGradient
          id="paint3_linear_mic"
          x1="30.52" y1="-2.77" x2="63.82" y2="105.45"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#89C7E6" />
          <stop offset="1" stopColor="#DD78E0" />
        </linearGradient>
      </defs>
    </svg>
  </button>

          ) : (
            <button
      onClick={stopRecording}
      className="flex items-center justify-center w-15 h-15 rounded-full bg-red-500 text-white font-Pretendard text-sm shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all duration-200 ease-in-out transform active:scale-95"
              >
        정지
        </button>

          )}
        </div>
      )}

      {/* 녹음 완료 후 피아노와 오디오 출력 */}
      {audioUrl && (
        <div className="flex flex-col items-center justify-center w-full h-full gap-8 bg-white">
          <audio src={audioUrl} controls autoPlay />
          <div className="bg-white flex items-center justify-center p-4 overflow-x-auto rounded-lg shadow-lg">
            <div className="scale-[0.6] md:scale-[0.8] lg:scale-100 origin-center">
              <div className="piano-body relative h-[18.875em] w-fit my-[2em] mx-auto pt-[3em] pl-[3em] border border-[#160801] rounded-[1em] shadow-[0_0_30px_rgba(0,0,0,0.2)_inset,0_1px_rgba(212,152,125,0.2)_inset,0_5px_10px_rgba(0,0,0,0.3)] bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.5)]">
                <ul className="flex flex-row">
                  {Array.from({ length: numberOfOctaves }).map((_, i) => (
                    <Octave key={i} />
                  ))}
                  <WhiteKey />
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}