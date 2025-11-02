// src/app/piano/hooks/useCameraStream.ts
"use client";

import { useEffect } from "react";

export default function useCameraStream() {
  useEffect(() => {
    let timer: number;


// 카메라 영상 미리보기를 담을 영역 생성
  const previewContainer = document.createElement("div");
  previewContainer.style.position = "fixed";
  previewContainer.style.bottom = "15vh"; // 화면 높이 기준
  previewContainer.style.right = "20vw";
  previewContainer.style.zIndex = "9999";
  previewContainer.style.border = "1px solid #555";
  previewContainer.style.borderRadius = "5px";
  previewContainer.style.overflow = "hidden";
  previewContainer.style.background = "#000";
  previewContainer.style.aspectRatio = "4 / 3"; // 가로세로비 고정
  previewContainer.style.width = "min(60vw, 1300px)";
  previewContainer.style.height = "min(45vw, 600px)"; // 비율에 따라 자동
  document.body.appendChild(previewContainer);


    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = "100%";
    video.style.height = "100%";
    previewContainer.appendChild(video);

    // 카메라 접근
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      video.srcObject = stream;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // 1초에 5번(200ms마다) 프레임 캡처해서 전송
      timer = window.setInterval(async () => {
        if (!ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.5)
        );
        await fetch("https://pukyong-iwap.duckdns.org/api/gesture/frame", {
          method: "POST",
          body: blob,
        });
      }, 200);
    });

    // cleanup
    return () => {
      window.clearInterval(timer);
      previewContainer.remove();
    };
  }, []);
}