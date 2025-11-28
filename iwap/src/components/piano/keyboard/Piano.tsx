"use client";
import { useEffect, useMemo, useState, memo } from "react"; // memo 추가
import PianoKey from "./PianoKey";
import PianoDefs from "./PianoDefs";
import {
  createPianoLayout,
  WHITE_KEY_COUNT_DESKTOP,
  WHITE_KEY_COUNT_MOBILE,
} from "./PianoLayout";

// ... (detectIsMobile 함수 동일) ...

// [수정] props 제거 (activeNotes 불필요)
export default memo(function Piano() { 
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // ... (모바일 감지 로직 동일) ...
    // 초기 마운트 시 확인
    if (typeof window !== 'undefined') {
        setIsMobile(window.matchMedia("(max-width: 1024px)").matches);
    }
    // ...
  }, []);

  // ... (레이아웃 계산 로직 동일) ...
  const whiteKeyCount = isMobile
    ? WHITE_KEY_COUNT_MOBILE
    : WHITE_KEY_COUNT_DESKTOP;

  const { layout, width, height } = useMemo(
    () => createPianoLayout(whiteKeyCount),
    [whiteKeyCount]
  );

  const whites = useMemo(
    () => layout.filter(key => key.type === "white"),
    [layout]
  );
  const blacks = useMemo(
    () => layout.filter(key => key.type === "black"),
    [layout]
  );

  return (
    <div className="relative" style={{ width: `${width}px`, height: `${height}px`, transform: "translateZ(0)" }}>
      <PianoDefs />

      {/* active={...} prop 제거됨 */}
      {whites.map(({ midi, x, y }) => (
        <div key={`w-${midi}`} className="absolute" style={{ left: x, bottom: y - 36, zIndex: 1 }}>
          <PianoKey midi={midi} type="white" />
        </div>
      ))}

      {blacks.map(({ midi, x, y }) => (
        <div key={`b-${midi}`} className="absolute" style={{ left: x + 35, top: y + 24, zIndex: 30 }}>
          <PianoKey midi={midi} type="black" />
        </div>
      ))}
    </div>
  );
});