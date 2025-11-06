import { keyOffsets } from "./Whiteoffsets";
import { blackOffsets } from "./Blackoffsets";

export const WHITE_W = 85;
export const WHITE_H = 186;
export const BLACK_W = 35;
export const BLACK_H = 110;
const STEP = 26;

export const WHITE_KEY_COUNT_DESKTOP = 70;
const MOBILE_KEY_RATIO = 2 / 3;
export const WHITE_KEY_COUNT_MOBILE = Math.floor(
  WHITE_KEY_COUNT_DESKTOP * MOBILE_KEY_RATIO
);

const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
const isWhiteKey = (midi: number) => !isBlackKey(midi);

const BLACK_ANCHOR: Record<number, number> = {
  1: 0.64,
  3: 0.36,
  6: 0.64,
  8: 0.40,
  10: 0.70,
};

export type PianoKeyData = {
  midi: number;
  type: "white" | "black";
  x: number;
  y: number;
};

const FIRST = 0;
const LAST = 119;

function getNeighborWhites(m: number): [number, number] | null {
  const pc = m % 12;
  const base = m - pc;
  if (pc === 1) return [base + 0, base + 2];
  if (pc === 3) return [base + 2, base + 4];
  if (pc === 6) return [base + 5, base + 7];
  if (pc === 8) return [base + 7, base + 9];
  if (pc === 10) return [base + 9, base + 11];
  return null;
}

export type PianoLayoutResult = {
  layout: PianoKeyData[];
  width: number;
  height: number;
};

export function createPianoLayout(whiteKeyCount: number): PianoLayoutResult {
  const layout: PianoKeyData[] = [];
  let whiteX = 0;
  let whiteKeyIndex = 0;
  const whiteXMap: Record<number, number> = {};

  for (let m = FIRST; m <= LAST; m++) {
    if (!isWhiteKey(m)) continue;

    const { x: dx, y: dy } = keyOffsets[whiteKeyIndex] ?? { x: 0, y: 0 };
    const x = whiteX + dx;
    layout.push({ midi: m, type: "white", x, y: dy });
    whiteXMap[m] = x;
    whiteX += STEP;
    whiteKeyIndex++;
    if (whiteKeyIndex >= whiteKeyCount) break;
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

    layout.push({ midi: m, type: "black", x, y });
  }

  return {
    layout,
    width: whiteX + WHITE_W,
    height: WHITE_H,
  };
}

export const PIANO_HEIGHT = WHITE_H;