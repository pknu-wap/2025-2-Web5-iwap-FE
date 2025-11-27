// src/app/this-is-for-u/textToContours.ts
import opentype from "opentype.js";

export type TextContour = { x: number; y: number }[];

const FONT_URL = "/fonts/static/Pretendard-Regular.otf";
let cachedFont: Promise<opentype.Font> | null = null;

const loadFont = () => {
  if (!cachedFont) {
    cachedFont = new Promise((resolve, reject) => {
      opentype.load(FONT_URL, (err, font) => {
        if (err || !font) reject(err || new Error("Font load failed"));
        else resolve(font);
      });
    });
  }
  return cachedFont;
};

/**
 * 한 글자를 path → contour 배열로 변환
 */
export async function charToContours(
  ch: string,
  fontSize = 120
): Promise<TextContour[]> {
  const font = await loadFont();
  const path = font.getPath(ch, 0, fontSize, fontSize);

  const contours: TextContour[] = [];
  let current: TextContour = [];

  path.commands.forEach((cmd) => {
    if (cmd.type === "M") {
      if (current.length) contours.push(current);
      current = [{ x: cmd.x, y: cmd.y }];
    } else if (cmd.type === "L") {
      current.push({ x: cmd.x, y: cmd.y });
    } else if (cmd.type === "Q" || cmd.type === "C") {
      const pts: { x: number; y: number }[] = [];
      if (cmd.type === "Q") {
        pts.push({ x: cmd.x1, y: cmd.y1 });
      } else {
        pts.push({ x: cmd.x1, y: cmd.y1 });
        pts.push({ x: cmd.x2, y: cmd.y2 });
      }
      pts.push({ x: cmd.x, y: cmd.y });
      current.push(...pts);
    } else if (cmd.type === "Z") {
      if (current.length) contours.push(current);
      current = [];
    }
  });

  if (current.length) contours.push(current);
  return contours;
}

/* ------------------------------------------------------------
   전체 문자열을 2줄 자동 레이아웃으로 분리
   ------------------------------------------------------------ */

export async function textToTwoLineContours(
  text: string,
  maxWidth: number,
  fontSize = 120,
  spacing = 32
): Promise<TextContour[]> {
  const raw = text.trim();
  if (!raw) return [];

  const tokens = raw.split("");
  const charContours: TextContour[][] = [];
  const charWidths: number[] = [];

  for (const ch of tokens) {
    const cs = await charToContours(ch, fontSize);
    charContours.push(cs);

    let minX = Infinity;
    let maxX = -Infinity;
    cs.forEach((poly) =>
      poly.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      })
    );
    const width = maxX - minX;
    charWidths.push(width);
  }

  type LineInfo = {
    contours: TextContour[][];
    totalWidth: number;
    indices: number[];
  };

  const lines: LineInfo[] = [];
  let curLine: TextContour[][] = [];
  let curIndices: number[] = [];
  let curWidth = 0;

  tokens.forEach((_, i) => {
    const w = charWidths[i] + spacing;
    if (curWidth + w > maxWidth && curLine.length > 0) {
      lines.push({ contours: curLine, totalWidth: curWidth, indices: curIndices });
      curLine = [];
      curIndices = [];
      curWidth = 0;
    }
    curLine.push(charContours[i]);
    curIndices.push(i);
    curWidth += w;
  });

  if (curLine.length) {
    lines.push({ contours: curLine, totalWidth: curWidth, indices: curIndices });
  }

  if (lines.length > 2) {
    const first = lines[0];
    const rest = lines.slice(1);
    const flattenedContours = rest.flatMap((line) => line.contours);
    const flattenedIndices = rest.flatMap((line) => line.indices);
    const totalRestWidth = flattenedIndices.reduce(
      (acc, idx) => acc + (charWidths[idx] ?? 0) + spacing,
      0
    );

    lines.length = 0;
    lines.push(first);
    lines.push({
      contours: flattenedContours,
      totalWidth: totalRestWidth,
      indices: flattenedIndices,
    });
  }

  const output: TextContour[] = [];
  const lineHeight = fontSize * 1.1;
  const startY = -(lines.length - 1) * (lineHeight / 2);

  lines.forEach((line, i) => {
    let cursorX = -line.totalWidth / 2;

    line.contours.forEach((contours, idx) => {
      const charIndex = line.indices[idx];
      const charWidth = charWidths[charIndex] ?? 0;

      let minX = Infinity;
      let minY = Infinity;
      contours.forEach((poly) =>
        poly.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
        })
      );

      const placed = contours.map((poly) =>
        poly.map((p) => ({
          x: p.x - minX + cursorX,
          y: p.y - minY + (startY + i * lineHeight),
        }))
      );

      output.push(...placed);

      cursorX += charWidth + spacing;
    });
  });

  return output;
}

