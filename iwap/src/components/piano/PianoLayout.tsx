import { keyOffsets } from "./offsets";

export const WHITE_W = 85;
export const WHITE_H = 186;
const STEP = 26;

const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

export type PianoKeyData = { midi: number; type: "white"; x: number; y: number };
export const pianoLayout: PianoKeyData[] = [];

let whiteX = 0;
const FIRST = 0;
const LAST = 69;

for (let m = FIRST; m <= LAST; m++) {
  if (!isBlackKey(m)) {
    const { x: dx, y: dy } = keyOffsets[m] ?? { x: 0, y: 0 };
    pianoLayout.push({
      midi: m,
      type: "white",
      x: whiteX + dx,
      y: dy,
    });
    whiteX += STEP;
  }
}

export const PIANO_WIDTH = whiteX + WHITE_W;
export const PIANO_HEIGHT = WHITE_H;
