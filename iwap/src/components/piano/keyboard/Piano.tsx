"use client";
import { useEffect, useMemo, useState } from "react";
import PianoKey from "./PianoKey";
import PianoDefs from "./PianoDefs"; // [추가]
import {
  createPianoLayout,
  WHITE_KEY_COUNT_DESKTOP,
  WHITE_KEY_COUNT_MOBILE,
} from "./PianoLayout";

const detectIsMobile = () => {
  if (typeof window === "undefined") return false;
  const nav =
    typeof navigator !== "undefined" ? navigator : undefined;
  const uaMobile = nav ? /Android|iPhone|iPad|iPod/i.test(nav.userAgent) : false;
  const hasTouch = nav ? nav.maxTouchPoints > 0 : false;
  const coarse =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : false;
  const narrow = window.innerWidth <= 1024;
  return uaMobile || hasTouch || coarse || narrow;
};

export default function Piano({ activeNotes }: { activeNotes: Set<number> }) {
  const [isMobile, setIsMobile] = useState<boolean>(() => detectIsMobile());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const coarseQuery = window.matchMedia("(pointer: coarse)");

    const computeIsMobile = () => {
      const nav =
        typeof navigator !== "undefined" ? navigator : undefined;
      const uaMobile = nav ? /Android|iPhone|iPad|iPod/i.test(nav.userAgent) : false;
      const hasTouch = nav ? nav.maxTouchPoints > 0 : false;
      const coarse = coarseQuery.matches;
      const narrow = window.innerWidth <= 1024;
      const next = uaMobile || hasTouch || coarse || narrow;
      setIsMobile(prev => (prev === next ? prev : next));
    };

    computeIsMobile();

    const handleResize = () => computeIsMobile();
    const handlePointerChange = () => computeIsMobile();

    window.addEventListener("resize", handleResize);
    if (typeof coarseQuery.addEventListener === "function") {
      coarseQuery.addEventListener("change", handlePointerChange);
    } else {
      coarseQuery.addListener(handlePointerChange);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (typeof coarseQuery.removeEventListener === "function") {
        coarseQuery.removeEventListener("change", handlePointerChange);
      } else {
        coarseQuery.removeListener(handlePointerChange);
      }
    };
  }, []);

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
    // [최적화] GPU 가속을 위해 translateZ(0) 추가
    <div className="relative" style={{ width: `${width}px`, height: `${height}px`, transform: "translateZ(0)" }}>
      
      {/* [추가] 필터 정의를 한 번만 로드 */}
      <PianoDefs />

      {/* White keys */}
      {whites.map(({ midi, x, y }) => (
        <div key={`w-${midi}`} className="absolute" style={{ left: x, bottom: y - 36, zIndex: 1 }}>
          <PianoKey midi={midi} active={activeNotes.has(midi)} type="white" />
        </div>
      ))}

      {/* Black keys */}
      {blacks.map(({ midi, x, y }) => (
        <div key={`b-${midi}`} className="absolute" style={{ left: x + 35, top: y + 24, zIndex: 30 }}>
          <PianoKey midi={midi} active={activeNotes.has(midi)} type="black" />
        </div>
      ))}
    </div>
  );
}