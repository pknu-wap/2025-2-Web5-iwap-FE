"use client";

import type { FourierCoefficient, Stroke, StrokePoint } from "./types";

type ComplexPoint = { re: number; im: number };

const DEFAULT_SAMPLE_COUNT = 256;
const DEFAULT_MAX_HARMONICS = 32;
const GRID_NEIGHBORS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function collectDrawablePoints(strokes: Stroke[]): StrokePoint[] {
  return strokes
    .filter((stroke) => stroke.mode === "draw")
    .flatMap((stroke) => stroke.points);
}

function resamplePoints(points: StrokePoint[], targetCount: number): StrokePoint[] {
  if (points.length === 0 || targetCount <= 0) return [];
  if (points.length === 1 || targetCount === 1) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  const distances = new Array(points.length).fill(0);
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    const dist = Math.hypot(current.x - prev.x, current.y - prev.y);
    total += dist || 1e-5;
    distances[index] = total;
  }

  if (total === 0) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  const sampled: StrokePoint[] = [];
  const denom = Math.max(targetCount - 1, 1);

  for (let sampleIndex = 0; sampleIndex < targetCount; sampleIndex += 1) {
    const target = (total * sampleIndex) / denom;
    let offset = distances.findIndex((value) => value >= target);
    if (offset === -1) offset = distances.length - 1;

    if (offset === 0) {
      sampled.push({ ...points[0] });
      continue;
    }

    const previousIndex = offset - 1;
    const segmentLength = distances[offset] - distances[previousIndex];
    const ratio =
      segmentLength === 0
        ? 0
        : (target - distances[previousIndex]) / segmentLength;

    sampled.push({
      x:
        points[previousIndex].x +
        (points[offset].x - points[previousIndex].x) * ratio,
      y:
        points[previousIndex].y +
        (points[offset].y - points[previousIndex].y) * ratio,
    });
  }

  return sampled;
}

function normalizePoints(points: StrokePoint[]): ComplexPoint[] {
  return points.map((point) => ({
    re: point.x - 0.5,
    // invert Y so that positive values face up on canvas
    im: 0.5 - point.y,
  }));
}

function discreteFourier(
  points: ComplexPoint[],
  harmonicLimit: number,
): FourierCoefficient[] {
  const total = points.length;
  if (total === 0) return [];

  const maxFreq = Math.min(harmonicLimit, Math.floor(total / 2));
  const coefficients: FourierCoefficient[] = [];

  for (let freq = -maxFreq; freq <= maxFreq; freq += 1) {
    let sumRe = 0;
    let sumIm = 0;

    for (let index = 0; index < total; index += 1) {
      const point = points[index];
      const angle = (-2 * Math.PI * freq * index) / total;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      sumRe += point.re * cos - point.im * sin;
      sumIm += point.re * sin + point.im * cos;
    }

    sumRe /= total;
    sumIm /= total;
    const amplitude = Math.hypot(sumRe, sumIm);

    if (amplitude < 0.00001) {
      if (freq === 0) continue;
      continue;
    }

    coefficients.push({
      amp: Number(amplitude.toFixed(6)),
      freq,
      phase: Number(Math.atan2(sumIm, sumRe).toFixed(6)),
    });
  }

  return coefficients.sort((a, b) => Math.abs(a.freq) - Math.abs(b.freq));
}

export function computeDrawingFourier(
  strokes: Stroke[],
  sampleCount = DEFAULT_SAMPLE_COUNT,
  maxHarmonics = DEFAULT_MAX_HARMONICS,
): FourierCoefficient[] {
  const points = collectDrawablePoints(strokes);
  if (!points.length) return [];
  const resampled = resamplePoints(points, sampleCount);
  return discreteFourier(normalizePoints(resampled), maxHarmonics);
}

function sampleTextOutlineSegments(text: string, fontCss: string): StrokePoint[][] {
  if (typeof document === "undefined") return [];

  const content = text.trim();
  if (!content) return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const maxWidth = 1200;
  const baseFontSize = 96;
  const dynamicSize = Math.max(
    56,
    Math.min(baseFontSize, (maxWidth / Math.max(content.length, 6)) * 3.6),
  );
  const padding = dynamicSize * 0.6;

  ctx.font = `${dynamicSize}px ${fontCss}`;
  const metrics = ctx.measureText(content);
  const width = Math.max(1, Math.ceil(Math.min(metrics.width + padding * 2, 2048)));
  const height = Math.max(1, Math.ceil(dynamicSize * 1.6 + padding * 2));

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return [];

  context.clearRect(0, 0, width, height);
  context.strokeStyle = "#000000";
  context.lineWidth = Math.max(2, dynamicSize * 0.05);
  context.lineJoin = "round";
  context.lineCap = "round";
  context.font = `${dynamicSize}px ${fontCss}`;
  context.textBaseline = "middle";
  context.textAlign = "left";
  context.strokeText(content, padding, height / 2);

  const imageData = context.getImageData(0, 0, width, height).data;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 220));
  const segmentsMap = new Map<string, StrokePoint[]>();

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const alpha = imageData[(y * width + x) * 4 + 3];
      if (alpha <= 64) continue;

      const normPoint: StrokePoint = {
        x: x / width,
        y: y / height,
      };

      const cellX = Math.floor(x / step);
      const cellY = Math.floor(y / step);
      const key = `${cellX},${cellY}`;
      if (!segmentsMap.has(key)) {
        segmentsMap.set(key, []);
      }
      segmentsMap.get(key)!.push(normPoint);
    }
  }

  const visited = new Set<string>();
  const segments: StrokePoint[][] = [];

  for (const key of segmentsMap.keys()) {
    if (visited.has(key)) continue;
    const queue: string[] = [key];
    visited.add(key);
    const cluster: StrokePoint[] = [];

    while (queue.length) {
      const current = queue.shift();
      if (!current) break;
      const points = segmentsMap.get(current);
      if (points) {
        cluster.push(...points);
      }

      const [cx, cy] = current.split(",").map((value) => Number.parseInt(value, 10));
      GRID_NEIGHBORS.forEach(([dx, dy]) => {
        const nx = cx + dx;
        const ny = cy + dy;
        const neighborKey = `${nx},${ny}`;
        if (!visited.has(neighborKey) && segmentsMap.has(neighborKey)) {
          visited.add(neighborKey);
          queue.push(neighborKey);
        }
      });
    }

    if (cluster.length) {
      segments.push(cluster);
    }
  }

  segments.sort((a, b) => b.length - a.length);
  return segments.slice(0, 6);
}

export function computeTextFourier(
  text: string,
  fontCss: string,
  sampleCount = 220,
  maxHarmonics = 40,
): FourierCoefficient[][] {
  const segments = sampleTextOutlineSegments(text, fontCss);
  if (!segments.length) return [];

  const totalPoints = segments.reduce((sum, seg) => sum + seg.length, 0) || 1;

  return segments
    .map((segment) => {
      const ratio = segment.length / totalPoints;
      const targetSamples = Math.max(18, Math.floor(sampleCount * ratio));
      const resampled = resamplePoints(segment, targetSamples);
      return discreteFourier(normalizePoints(resampled), maxHarmonics);
    })
    .filter((coeffs) => coeffs.length > 0);
}

