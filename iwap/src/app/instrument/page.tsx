"use client";

import useCameraStream from "@/app/api/instrument/useCameraStream";
import useGestureSocket from "@/app/api/instrument/useGestureSocket";
import useTonePlayer from "@/app/api/instrument/useTonePlayer";
import { useState } from "react";
import FullScreenView from "@/components/ui/FullScreenView";

export default function PianoOrchestraPage() {
  const { buildFromJson } = useTonePlayer();
  const [volume, setVolume] = useState(0);
  const [instrument, setInstrument] = useState("piano");
  const [tempo, setTempo] = useState(120);

  // 서버가 보낸 제스처 결과를 Tone.js 로직에 연결
  const onGesture = (type: string, payload?: any) => {
    console.log("Gesture:", type, payload);
    switch (type) {
      case "orchestra":
        // 예: 연주 시작/정지
        console.log("🎵 오케스트라 재생 토글");
        break;
      case "volumePalm":
        // 예: 볼륨 조절
        setVolume((v) => Math.min(100, Math.max(0, v + (payload?.delta ?? 5))));
        break;
      case "tempoTap":
        // 예: 템포 조절
        setTempo((t) => Math.min(220, Math.max(40, t + 5)));
        break;
      case "nextInstrument":
        // 예: 악기 변경
        setInstrument((prev) => {
          const list = ["piano", "strings", "brass", "woodwind", "percussion"];
          const i = list.indexOf(prev);
          return list[(i + 1) % list.length];
        });
        break;
    }
  };

  // ① 카메라 프레임 → 백엔드 전송 + 미리보기 표시
  useCameraStream(); // 이미 내부에서 미리보기 생성하도록 수정된 버전 사용
  // ② WebSocket → 제스처 결과 수신
  useGestureSocket(onGesture);

  return (
    <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]">
      <FullScreenView
        title="!nstrument"
        subtitle="손으로 하는 악기연주"
        goBack={true}
        backgroundUrl="/images/this-is-for-u_background.jpg"
      >

      <div className="rounded-xl p-4 w-full max-w-md space-y-3 -translate-y-80">
        {/* <p>🎧 현재 볼륨: {volume}</p>
        <p>🎹 현재 악기: {instrument}</p>
        <p>⏱️ 현재 템포: {tempo} BPM</p> */}
      </div>

      </FullScreenView>
    </div>
  );
}