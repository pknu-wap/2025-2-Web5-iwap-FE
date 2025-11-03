// "use client";

// import useCameraStream from "@/app/api/instrument/useCameraStream";
// import useGestureSocket from "@/app/api/instrument/useGestureSocket";
// import useTonePlayer from "@/app/api/instrument/useTonePlayer";
// import { useState } from "react";
// import FullScreenView from "@/components/ui/FullScreenView";

// export default function PianoOrchestraPage() {
//   const { buildFromJson } = useTonePlayer();
//   const [volume, setVolume] = useState(0);
//   const [instrument, setInstrument] = useState("piano");
//   const [tempo, setTempo] = useState(120);

//   // 서버가 보낸 제스처 결과를 Tone.js 로직에 연결
//   const onGesture = (type: string, payload?: any) => {
//     console.log("Gesture:", type, payload);
//     switch (type) {
//       case "orchestra":
//         // 예: 연주 시작/정지
//         console.log("🎵 오케스트라 재생 토글");
//         break;
//       case "volumePalm":
//         // 예: 볼륨 조절
//         setVolume((v) => Math.min(100, Math.max(0, v + (payload?.delta ?? 5))));
//         break;
//       case "tempoTap":
//         // 예: 템포 조절
//         setTempo((t) => Math.min(220, Math.max(40, t + 5)));
//         break;
//       case "nextInstrument":
//         // 예: 악기 변경
//         setInstrument((prev) => {
//           const list = ["piano", "strings", "brass", "woodwind", "percussion"];
//           const i = list.indexOf(prev);
//           return list[(i + 1) % list.length];
//         });
//         break;
//     }
//   };

//   // ① 카메라 프레임 → 백엔드 전송 + 미리보기 표시
//   useCameraStream(); // 이미 내부에서 미리보기 생성하도록 수정된 버전 사용
//   // ② WebSocket → 제스처 결과 수신
//   useGestureSocket(onGesture);

//   return (
//     <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]">
//       <FullScreenView
//         title="!nstrument"
//         subtitle="손으로 하는 악기연주"
//         goBack={true}
//         backgroundUrl="/images/slides/slide6.svg"
//       >

//       <div className="rounded-xl p-4 w-full max-w-md space-y-3 -translate-y-80">
//         {/* <p>🎧 현재 볼륨: {volume}</p>
//         <p>🎹 현재 악기: {instrument}</p>
//         <p>⏱️ 현재 템포: {tempo} BPM</p> */}
//       </div>

//       </FullScreenView>
//     </div>
//   );
// }

"use client";
import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Image from "next/image";

  const pageBackgroundStyle = {
    backgroundImage: `
      linear-gradient(to bottom, rgba(13, 17, 19, 0), #090223),
      url('/images/instrument_background.jpg')
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

export default function BlankPage() {
  return (
      <div className="relative w-full h-dvh md:h-[calc(100dvh-60px)]" style={pageBackgroundStyle}>
        <div className="w-[90%] h-[90%] translate-x-5 md:translate-x-0 md:w-full md:h-full flex items-center justify-center p-4 sm:p-8">
          <div className="flex flex-col w-full max-w-lg max-h-full aspect-[5/6] relative">
            <div className="w-full h-full pt-[10px]">
      <PageHeader title="!nstrument" subtitle="손동작으로 음악을 연주하는 오케스트라" goBack={true} padding='p-0' />
      <div className="pt-[70px] text-white text-[28px]">
        <p>!nstrument to be cont!nued !</p>
        </div>
      <div className="pt-[50px] text-white">
        <p>익명의 누군가에게</p>
  <p>안녕하세요! 여러분 벌써 2025년이 2달도 안남았다는 사실 믿겨지시나요?</p>
  <p>네 사실 지금 이걸 적고있는 저도 안믿기네요...</p>
  <p>여러분들의 한 해는 어떠셨나요?</p>
  <p>때로는 벅차고, 또 때로는 웃음이 많았던 시간들이었겠죠.</p>
  <p>그래도 여기까지 잘 걸어온 여러분, 참 대단합니다!!</p>
  <p>남은 2025년, 후회없는 나날 보내시길 바랄게요</p>
  <p>그리고 iWAP 시연때 많관부 부탁드려요 그럼 20000</p>
  <p>익명의 누군가가</p>
</div>
    </div>
    </div>
    </div>
    </div>
  );
}
