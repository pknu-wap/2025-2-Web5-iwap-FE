export const WHITE_W = 85;
export const WHITE_H = 186;
export const BLACK_W = 35;
export const BLACK_H = 87;

const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

// 옥타브 내 검은건반 중심 위치 (현재 사용 안 함)
const BLACK_X_IN_OCTAVE: Record<number, number> = {
  1: WHITE_W - BLACK_W / 2,       // C#
  3: WHITE_W * 2 - BLACK_W / 2,   // D#
  6: WHITE_W * 4 - BLACK_W / 2,   // F#
  8: WHITE_W * 5 - BLACK_W / 2,   // G#
  10: WHITE_W * 6 - BLACK_W / 2,  // A#
};

export type PianoKeyData = { midi: number; type: "white" | "black"; x: number; y: number };
export const pianoLayout: PianoKeyData[] = [];

let whiteX = 0;
const FIRST = 21; // A0
const LAST = 108; // C8

// === 흰건반만 렌더링 ===
for (let m = FIRST; m <= LAST; m++) {
  if (!isBlackKey(m)) {
    pianoLayout.push({
      midi: m,
      type: "white",
      x: whiteX,
      y: 0,
    });
    whiteX += 26; // 붙여서 배치
  }
}

// // === 검은건반 (현재 비활성화) ===
// for (let m = FIRST; m <= LAST; m++) {
//   if (isBlackKey(m)) {
//     const n = m % 12;
//     const oct = Math.floor((m - FIRST) / 12);
//     const whitesPerOct = 7;
//     const octaveWhiteStartX = oct * whitesPerOct * (WHITE_W - 0.5);
//     const xBaseAtC = octaveWhiteStartX + WHITE_W * 2;
//     const off = BLACK_X_IN_OCTAVE[n];
//     if (off !== undefined)
//       pianoLayout.push({ midi: m, type: "black", x: xBaseAtC + off, y: 0 });
//   }
// }

const lastWhite = pianoLayout
  .filter(k => k.type === "white")
  .sort((a, b) => a.x - b.x)
  .at(-1);

export const PIANO_WIDTH = lastWhite ? lastWhite.x + WHITE_W : 2600;
export const PIANO_HEIGHT = WHITE_H;
