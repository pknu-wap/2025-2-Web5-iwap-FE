import opentype from "opentype.js";

export type TextContour = { x: number; y: number }[];

const FONT_URL = "/fonts/static/Pretendard-Regular.otf";

// 캐싱된 폰트 로딩
let cachedFontPromise: Promise<opentype.Font> | null = null;
export const loadFont = () => {
  if (!cachedFontPromise) {
    cachedFontPromise = new Promise((resolve, reject) => {
      opentype.load(FONT_URL, (err, font) => {
        if (err || !font) {
          reject(err || new Error("Font load failed"));
        } else {
          resolve(font);
        }
      });
    });
  }
  return cachedFontPromise;
};

// 텍스트를 간단한 다각형 컨투어 목록으로 변환
export async function textToContours(
  text: string,
  opts: { boxWidth: number; boxHeight: number; fontSize?: number } = { boxWidth: 400, boxHeight: 450 },
): Promise<TextContour[]> {
  const font = await loadFont();
  const fontSize = opts.fontSize ?? 120;
  const path = font.getPath(text, 0, fontSize, fontSize);

  const contours: TextContour[] = [];
  let current: TextContour = [];
  const cursorX = 0;
  const cursorY = 0;

  path.commands.forEach((cmd) => {
    switch (cmd.type) {
      case "M":
        if (current.length) contours.push(current);
        current = [{ x: cmd.x + cursorX, y: cmd.y + cursorY }];
        break;
      case "L":
        current.push({ x: cmd.x + cursorX, y: cmd.y + cursorY });
        break;
      case "Q": {
  const steps = 25; // 곡선 세밀함, 높일수록 부드러움
  const prev = current[current.length - 1]; // 이전 점
  for (let t = 0; t <= 1; t += 1 / steps) {
    const x =
      (1 - t) * (1 - t) * prev.x +
      2 * (1 - t) * t * (cmd.x1 + cursorX) +
      t * t * (cmd.x + cursorX);

    const y =
      (1 - t) * (1 - t) * prev.y +
      2 * (1 - t) * t * (cmd.y1 + cursorY) +
      t * t * (cmd.y + cursorY);

    current.push({ x, y });
  }
  break;
}
case "C": {
  const steps = 25;
  const prev = current[current.length - 1]; // 이전 점
  for (let t = 0; t <= 1; t += 1 / steps) {
    const x =
      (1 - t) * (1 - t) * (1 - t) * prev.x +
      3 * (1 - t) * (1 - t) * t * (cmd.x1 + cursorX) +
      3 * (1 - t) * t * t * (cmd.x2 + cursorX) +
      t * t * t * (cmd.x + cursorX);

    const y =
      (1 - t) * (1 - t) * (1 - t) * prev.y +
      3 * (1 - t) * (1 - t) * t * (cmd.y1 + cursorY) +
      3 * (1 - t) * t * t * (cmd.y2 + cursorY) +
      t * t * t * (cmd.y + cursorY);

    current.push({ x, y });
  }
  break;
}
      case "Z":
        if (current.length) {
          contours.push(current);
          current = [];
        }
        break;
      default:
        break;
    }
  });
  if (current.length) contours.push(current);
  return contours;
}
