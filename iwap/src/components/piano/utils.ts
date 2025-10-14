export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const freqToMidi = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
export const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
export const isBlack = (n: number) => [1, 3, 6, 8, 10].includes(n % 12);
