import { keyOffsets } from "./Whiteoffsets";
import { blackOffsets } from "./Blackoffsets";

export const WHITE_W = 85;
export const WHITE_H = 186;
export const BLACK_W = 35;
export const BLACK_H = 110;
const STEP = 26;

const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
const isWhiteKey = (midi: number) => !isBlackKey(midi);

// 검은건반 비율 위치 (좌측 흰건반 대비)
const BLACK_ANCHOR: Record<number, number> = {
  1: 0.64, // C#
  3: 0.36, // D#
  6: 0.64, // F#
  8: 0.40, // G#
  10: 0.70, // A#
};

// === 타입 ===
export type PianoKeyData = { midi: number; type: "white" | "black"; x: number; y: number };
export const pianoLayout: PianoKeyData[] = [];

const FIRST = 0;
const LAST = 119;

// === 1) 흰건반 ===
let whiteX = 0;
let whiteKeyIndex = 0;
const whiteXMap: Record<number, number> = {}; // 검은건반 계산용

for (let m = FIRST; m <= LAST; m++) {
  if (isWhiteKey(m)) {
    const { x: dx, y: dy } = keyOffsets[whiteKeyIndex] ?? { x: 0, y: 0 };
    const x = whiteX + dx;
    pianoLayout.push({
      midi: m,
      type: "white",
      x,
      y: dy,
    });
    whiteXMap[m] = x;
    whiteX += STEP;
    whiteKeyIndex++;
    if (whiteKeyIndex >= 70) break;
  }
}

// === 2) 검은건반 ===
function getNeighborWhites(m: number): [number, number] | null {
  const pc = m % 12;
  const base = m - pc;
  if (pc === 1) return [base + 0, base + 2]; // C–D
  if (pc === 3) return [base + 2, base + 4]; // D–E
  if (pc === 6) return [base + 5, base + 7]; // F–G
  if (pc === 8) return [base + 7, base + 9]; // G–A
  if (pc === 10) return [base + 9, base + 11]; // A–B
  return null;
}

for (let m = FIRST; m <= LAST; m++) {
  if (!isBlackKey(m)) continue;

  const pair = getNeighborWhites(m);
  if (!pair) continue;
  const [left, right] = pair;
  if (whiteXMap[left] == null || whiteXMap[right] == null) continue;

  const t = BLACK_ANCHOR[m % 12] ?? 0.5;
  const xl = whiteXMap[left];
  const xr = whiteXMap[right];
  const { x: dx, y: dy } = blackOffsets[m] ?? { x: 0, y: 0 };

  const x = xl + (xr - xl) * t + dx - BLACK_W / 2;
  const y = dy;

  pianoLayout.push({ midi: m, type: "black", x, y });
}

export const PIANO_WIDTH = whiteX + WHITE_W;
export const PIANO_HEIGHT = WHITE_H;
