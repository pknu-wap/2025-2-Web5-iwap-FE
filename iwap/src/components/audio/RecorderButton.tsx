"use client";
import { useState, useEffect } from "react";
import WavingAnimation from "./WavingAnimation";

export default function RecorderButton({
  isRecording,
  startRecording,
  stopRecording,
}: {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
      s % 60
    ).padStart(2, "0")}`;

  return (
    <div className="relative flex flex-col items-center justify-center pb-28 ">
      {/* 녹음 전 버튼 */}
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="relative w-[180px] h-[180px] rounded-full flex items-center justify-center bg-[#D9D9D9] transition-transform"
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
            <path d="M50.2002 88.1279L49.9922 88.0928C42.2902 86.7909 35.2975 82.8032 30.2559 76.8369C25.2143 70.8706 22.449 63.3111 22.4502 55.5C22.4502 54.0944 23.009 52.7468 24.0029 51.7529C24.9968 50.759 26.3444 50.2002 27.75 50.2002C29.1556 50.2002 30.5041 50.759 31.498 51.7529C32.4918 52.7468 33.0498 54.0946 33.0498 55.5C33.0498 61.4541 35.4158 67.1648 39.626 71.375C43.8361 75.585 49.5461 77.9501 55.5 77.9502C61.4541 77.9502 67.1648 75.5852 71.375 71.375C75.5852 67.1648 77.9502 61.4541 77.9502 55.5C77.9502 54.0944 78.509 52.7468 79.5029 51.7529C80.4968 50.759 81.8444 50.2002 83.25 50.2002C84.6556 50.2002 86.0041 50.759 86.998 51.7529C87.9918 52.7468 88.5498 54.0946 88.5498 55.5C88.551 63.3112 85.7858 70.8706 80.7441 76.8369C75.7025 82.8032 68.7107 86.7908 61.0088 88.0928L60.7998 88.1279V97.125C60.7998 98.5306 60.242 99.8791 59.248 100.873C58.2541 101.867 56.9057 102.425 55.5 102.425C54.0946 102.425 52.7468 101.867 51.7529 100.873C50.759 99.8791 50.2002 98.5306 50.2002 97.125V88.1279Z" fill="url(#paint0_linear_821_412)" stroke="#A4A4A4" strokeWidth="0.5"/>
            <path d="M55.501 11.3501C59.8503 11.3502 64.0212 13.0784 67.0967 16.1538C70.1723 19.2294 71.9004 23.4009 71.9004 27.7505V55.5005C71.9003 59.8499 70.1722 64.0207 67.0967 67.0962C64.0212 70.1717 59.8504 71.8998 55.501 71.8999C51.1514 71.8999 46.9799 70.1718 43.9043 67.0962C40.8289 64.0207 39.1007 59.8499 39.1006 55.5005V27.7505C39.1006 23.4009 40.8287 19.2294 43.9043 16.1538C46.9799 13.0782 51.1514 11.3501 55.501 11.3501Z" fill="url(#paint1_linear_821_412)" stroke="#6A6AA4" strokeWidth="0.5"/>
            <defs>
              <linearGradient id="paint0_linear_821_412" x1="22.2002" y1="27.7502" x2="55.5002" y2="105.45" gradientUnits="userSpaceOnUse"><stop stopColor="#EFEFEF"/><stop offset="1" stopColor="#C1C1C1"/></linearGradient>
              <linearGradient id="paint1_linear_821_412" x1="30.5256" y1="-2.7749" x2="63.8256" y2="105.45" gradientUnits="userSpaceOnUse"><stop stopColor="#89C7E6"/><stop offset="1" stopColor="#DD78E0"/></linearGradient>
            </defs>
          </svg>
        </button>
      ) : (
        // 녹음 중 버튼
        <div
          onClick={stopRecording}
          className="relative w-[180px] h-[180px] rounded-full bg-gradient-to-b from-[#d9d9d9] to-[#a2a2a2] flex items-center justify-center cursor-pointer"
        >
          {/* 정적 SVG 배경 */}
          <div className="absolute inset-[8px] z-10">
            <svg
              xmlns="http://www.w.org/2000/svg"
              width="164"
              height="164"
              viewBox="0 0 164 164"
              fill="none"
            ><rect
        x="2"
        y="2"
        width="160"
        height="160"
        rx="80"
        fill="url(#paint0_linear_821_398_bg)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_821_398_bg"
          x1="82"
          y1="145.5"
          x2="82"
          y2="9.99999"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#B3B3B3" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
      </defs>
    </svg>
  </div>

  <div className="absolute inset-[8px] z-20 flex items-center justify-center overflow-hidden rounded-full">
    <WavingAnimation />
    </div>
      <div className="absolute inset-[8px] z-30 pointer-events-none">
      <svg
      xmlns="http://www.w3.org/2000/svg"
      width="164"
      height="164"
      viewBox="0 0 164 164"
      fill="none"
      >
      <rect
        x="2"
        y="2"
        width="160"
        height="160"
        rx="80"
        stroke="#F7F7F8"
        strokeWidth="3"
      />

    </svg>
      </div>
        </div>
      )}

      {/* 진행 바 */}
      {isRecording && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 lex flex-col items-center -mt-12">
          <div className="w-[550px] h-[12px] bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#89C7E6] to-[#DD78E0] transition-all duration-1000 ease-linear"
              style={{ width: `${(elapsed % 60) * (100 / 60)}%` }}
            />
          </div>
          <p className="text-sm text-gray-700 font-medium tracking-wide">
            {formatTime(elapsed)}
          </p>
        </div>
      )}
    </div>
  );
}