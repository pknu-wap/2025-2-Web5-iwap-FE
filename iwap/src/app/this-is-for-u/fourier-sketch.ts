// src/app/this-is-for-u/fourier-sketch.ts

import type p5 from "p5";
import type { FourierCoefficient } from "./types";

type FourierSketchStyles = {
  backgroundColor?: string;
  epicycleColor?: string;
  epicycleAlpha?: number;
  pathColor?: string;
  pathAlpha?: number;
  pathWidth?: number;
};

export type FourierSketchController = {
  updateStyles: (styles: FourierSketchStyles) => void;
  confirmSketches: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  clearSketches: () => void;
  addCustomSketch: (
    points: { x: number; y: number }[],
    options?: { pathColor?: string; pathAlpha?: number; pathWidth?: number; startDelay?: number },
  ) => void;
  getFourierCoefficients: () => FourierCoefficient[][];
  cleanup: () => void;
};

export function initFourierSketch(container: HTMLElement): FourierSketchController {
  let instance: p5 | null = null;
  let styles: FourierSketchStyles = {
    backgroundColor: "#000000",
    epicycleColor: "#50a0ff",
    epicycleAlpha: 120,
    pathColor: "#ffb6dc",
    pathAlpha: 255,
    pathWidth: 4,
  };
  let isRunning = false;

  const updateStyles = (nextStyles: FourierSketchStyles) => {
    styles = { ...styles, ...nextStyles };
  };

  let clearSketchesFn: () => void = () => {};
  let confirmSketchesFn: () => void = () => {};
  let startPlaybackFn: () => void = () => {};
  let stopPlaybackFn: () => void = () => {};
  let addCustomSketchFn: (
    points: { x: number; y: number }[],
    options?: { pathColor?: string; pathAlpha?: number; pathWidth?: number },
  ) => void = () => {};
  let getFourierCoefficientsFn: () => FourierCoefficient[][] = () => [];

  const controller: FourierSketchController = {
    updateStyles,
    confirmSketches: () => {
      confirmSketchesFn();
    },
    startPlayback: () => {
      startPlaybackFn();
    },
    stopPlayback: () => {
      stopPlaybackFn();
    },
    clearSketches: () => {
      clearSketchesFn();
      isRunning = false;
    },
    addCustomSketch: (points, options) => {
      addCustomSketchFn(points, options);
    },
    getFourierCoefficients: () => getFourierCoefficientsFn(),
    cleanup() {
      if (instance) {
        instance.remove();
        instance = null;
      }
      container.innerHTML = "";
    },
  };

  (async () => {
    const p5Module = await import("p5");
    const P5 = (p5Module.default ?? p5Module) as typeof p5;

    const sketch = (p: p5) => {
      type FourierTerm = {
        re: number;
        im: number;
        freq: number;
        amp: number;
        phase: number;
      };

      type FourierSketch = {
        fourier: FourierTerm[];
        path: p5.Vector[];
        preview: p5.Vector[];
        pathColor: string;
        pathAlpha: number;
        pathWidth: number;
        startDelay: number;
      };

      let drawing: p5.Vector[] = [];
      const pendingSketches: FourierSketch[] = [];
      const activeSketches: FourierSketch[] = [];
      let state: "idle" | "drawing" | "pending" | "fourier" = "idle";
      const SHARED_DT = 0.02;
      let sharedTime = 0;
      let fastForwardTime = 0;
      let maxStartDelay = 0;

      const MAX_TERMS = 2000;
      const RESAMPLE_TARGET = 360;
      const CLOSE_STEPS = 16;
      const CLOSE_THRESHOLD = 0.5; // almost closed if under this
      const FAST_FORWARD_MULT = 4;

      const ensureClosedPath = (points: p5.Vector[], steps = CLOSE_STEPS): p5.Vector[] => {
        if (points.length <= 1) return points.map((v) => v.copy());
        const first = points[0];
        const last = points[points.length - 1];
        const gap = p.dist(first.x, first.y, last.x, last.y);

        if (gap <= CLOSE_THRESHOLD) {
          // Already closed enough
          return points.map((v) => v.copy());
        }

        // Linearly interpolate from end back to start to avoid hard jump
        const closed: p5.Vector[] = points.map((v) => v.copy());
        for (let i = 1; i <= steps; i += 1) {
          const t = i / steps;
          const x = p.lerp(last.x, first.x, t);
          const y = p.lerp(last.y, first.y, t);
          closed.push(p.createVector(x, y));
        }
        return closed;
      };

      /* -------------------- 길이 기준 리샘플링 -------------------- */
      const resamplePath = (points: p5.Vector[], targetCount = RESAMPLE_TARGET): p5.Vector[] => {
        if (points.length === 0) return [];
        if (points.length === 1) {
          return Array.from({ length: targetCount }, () => points[0].copy());
        }

        // 전체 길이 계산
        let totalLength = 0;
        for (let i = 1; i < points.length; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          totalLength += Math.hypot(dx, dy);
        }
        if (totalLength === 0) {
          return Array.from({ length: targetCount }, () => points[0].copy());
        }

        const step = totalLength / (targetCount - 1); // 시작/끝 포함
        const resampled: p5.Vector[] = [];
        resampled.push(points[0].copy());

        let accumulatedSinceLastSample = 0;
        let prev = points[0].copy();

        for (let i = 1; i < points.length && resampled.length < targetCount; i++) {
          const curr = points[i];
          let segDx = curr.x - prev.x;
          let segDy = curr.y - prev.y;
          let segLen = Math.hypot(segDx, segDy);

          // 같은 위치가 연속으로 찍힌 경우
          if (segLen === 0) {
            prev = curr;
            continue;
          }

          while (segLen + accumulatedSinceLastSample >= step && resampled.length < targetCount) {
            const t = (step - accumulatedSinceLastSample) / segLen;
            const nx = prev.x + segDx * t;
            const ny = prev.y + segDy * t;
            const newPt = p.createVector(nx, ny);
            resampled.push(newPt);

            // 새 샘플 지점부터 남은 부분 다시 계산
            prev = newPt;
            segDx = curr.x - prev.x;
            segDy = curr.y - prev.y;
            segLen = Math.hypot(segDx, segDy);
            accumulatedSinceLastSample = 0;
          }

          accumulatedSinceLastSample += segLen;
          prev = curr;
        }

        // 혹시 모자라면 마지막 점으로 채우기
        while (resampled.length < targetCount) {
          resampled.push(points[points.length - 1].copy());
        }

        return resampled;
      };

      /* -------------------- 간단 이동평균 스무딩 -------------------- */
      const smoothPath = (points: p5.Vector[], iterations = 2): p5.Vector[] => {
        if (points.length <= 2) return points.map((v) => v.copy());

        let current = points.map((v) => v.copy());

        for (let iter = 0; iter < iterations; iter++) {
          const next: p5.Vector[] = [];
          for (let i = 0; i < current.length; i++) {
            const prev = current[Math.max(0, i - 1)];
            const curr = current[i];
            const nextP = current[Math.min(current.length - 1, i + 1)];

            const nx = (prev.x + 2 * curr.x + nextP.x) / 4;
            const ny = (prev.y + 2 * curr.y + nextP.y) / 4;
            next.push(p.createVector(nx, ny));
          }
          current = next;
        }

        return current;
      };

      const clearSketches = () => {
        drawing = [];
        pendingSketches.length = 0;
        activeSketches.length = 0;
        sharedTime = 0;
        maxStartDelay = 0;
        state = "idle";
      };

      const confirmSketches = () => {
        if (!pendingSketches.length) return;

        drawing = [];
        activeSketches.length = 0;
        activeSketches.push(...pendingSketches);
        pendingSketches.length = 0;
        sharedTime = 0;
        maxStartDelay = activeSketches.reduce(
          (acc, item) => Math.max(acc, item.startDelay ?? 0),
          0,
        );
        isRunning = false;
        state = activeSketches.length > 0 ? "fourier" : "idle";
      };

      const getFourierCoefficients = (): FourierCoefficient[][] =>
        activeSketches.map((sketch) =>
          sketch.fourier.map((term) => ({
            amp: term.amp,
            freq: term.freq,
            phase: term.phase,
          })),
        );

      clearSketchesFn = clearSketches;
      confirmSketchesFn = confirmSketches;
      startPlaybackFn = () => {
        if (pendingSketches.length) {
          confirmSketches();
        }
        if (activeSketches.length) {
          const closeRatio = CLOSE_STEPS / (RESAMPLE_TARGET + CLOSE_STEPS);
          fastForwardTime = Math.min(2 * Math.PI, 2 * Math.PI * closeRatio * 1.5);
          state = "fourier";
          isRunning = true;
        }
      };
      stopPlaybackFn = () => {
        isRunning = false;
      };
      addCustomSketchFn = (points, options) => {
        if (!points.length) return;
        const vecs = points.map(({ x, y }) => p.createVector(x, y));
        const nextFourier = dft(vecs);
        if (!nextFourier.length) return;
        const preview = vecs.map((v) => v.copy());
        pendingSketches.push({
          fourier: nextFourier,
          path: [],
          preview,
          pathColor: options?.pathColor ?? styles.pathColor ?? "#ffb6dc",
          pathAlpha: Math.max(0, Math.min(255, options?.pathAlpha ?? styles.pathAlpha ?? 255)),
          pathWidth: Math.max(1, options?.pathWidth ?? styles.pathWidth ?? 2),
          startDelay: Math.max(0, options?.startDelay ?? 0),
        });
        maxStartDelay = Math.max(maxStartDelay, Math.max(0, options?.startDelay ?? 0));
        state = "pending";
      };
      getFourierCoefficientsFn = getFourierCoefficients;

      /* -------------------- DFT (리샘플 + 스무딩 포함) -------------------- */
      const dft = (rawPoints: p5.Vector[]): FourierTerm[] => {
        const closed = ensureClosedPath(rawPoints);

        // 1) 길이 기준 일정 간격으로 리샘플
        const resampled = resamplePath(closed, RESAMPLE_TARGET);

        // 2) 노이즈 줄이기 위해 스무딩 (딱 2회로 제한해 떨림 완화)
        const points = smoothPath(resampled, 2);

        const N = points.length;
        const result: FourierTerm[] = [];

        for (let k = 0; k < N; k += 1) {
          let re = 0;
          let im = 0;

          for (let n = 0; n < N; n += 1) {
            const phi = (2 * Math.PI * k * n) / N;
            const { x, y } = points[n];

            re += x * Math.cos(phi) + y * Math.sin(phi);
            im += -x * Math.sin(phi) + y * Math.cos(phi);
          }

          re /= N;
          im /= N;

          const amp = Math.hypot(re, im);
          const phase = Math.atan2(im, re);

          const freq = k > N / 2 ? k - N : k;

          result.push({ re, im, freq, amp, phase });
        }

        result.sort((a, b) => b.amp - a.amp);
        return result;
      };

      const getCanvasSize = () => {
        const rect = container.getBoundingClientRect();
        return {
          width: rect.width || 800,
          height: rect.height || 500,
        };
      };

      p.setup = () => {
        const { width: w, height: h } = getCanvasSize();
        p.frameRate(20);
        const cnv = p.createCanvas(w, h);
        cnv.parent(container);
        cnv.style("opacity", "1");
        const ctx = p.drawingContext as CanvasRenderingContext2D | null;
        if (ctx) {
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
        p.background(styles.backgroundColor ?? "#000000");
        p.stroke(255);
        p.noFill();
      };

      p.windowResized = () => {
        const { width: w, height: h } = getCanvasSize();
        p.resizeCanvas(w, h);
        p.background(styles.backgroundColor ?? "#000000");
        clearSketchesFn();
      };

      p.mousePressed = () => {
        if (!isMouseInsideCanvas(p)) return;
        drawing = [];
        activeSketches.length = 0;
        state = "drawing";
      };

      p.mouseDragged = () => {
        if (state !== "drawing") return;
        if (!isMouseInsideCanvas(p)) return;
        const x = p.mouseX - p.width / 2;
        const y = p.mouseY - p.height / 2;
        drawing.push(p.createVector(x, y));
      };

      p.mouseReleased = () => {
        if (state !== "drawing") return;
        if (drawing.length < 4) {
          drawing = [];
          state = pendingSketches.length > 0 ? "pending" : "idle";
          return;
        }

        const nextFourier = dft(drawing);
        if (nextFourier.length) {
          // 미리보기는 원본 드로잉 그대로 사용 (원하면 resamplePath(drawing)로 바꿔도 됨)
          const preview = drawing.map((v) => v.copy());
          pendingSketches.push({
            fourier: nextFourier,
            path: [],
            preview,
            pathColor: styles.pathColor ?? "#ffb6dc",
            pathAlpha: Math.max(0, Math.min(255, styles.pathAlpha ?? 255)),
            pathWidth: Math.max(1, styles.pathWidth ?? 2),
          });
        }

        drawing = [];
        state = pendingSketches.length > 0 ? "pending" : "idle";
      };

      const computePosition = (sketch: FourierSketch, time: number) => {
        let x = 0;
        let y = 0;
        for (let i = 0; i < Math.min(MAX_TERMS, sketch.fourier.length); i += 1) {
          const term = sketch.fourier[i];
          const angle = term.freq * time + term.phase;
          x += term.amp * Math.cos(angle);
          y += term.amp * Math.sin(angle);
        }
        return { x, y };
      };

      p.draw = () => {
        // Ensure the canvas uses fully opaque painting each frame.
        const ctx = p.drawingContext as CanvasRenderingContext2D | null;
        if (ctx) {
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
        p.background(styles.backgroundColor ?? "#000000");
        p.translate(p.width / 2, p.height / 2);

        const renderPreviews = (list: FourierSketch[]) => {
          if (!list.length) return;
          p.noFill();
          list.forEach((item) => {
            const previewColor = p.color(item.pathColor ?? styles.pathColor ?? "#ffb6dc");
            previewColor.setAlpha(
              Math.max(0, Math.min(255, item.pathAlpha ?? styles.pathAlpha ?? 255)),
            );
            p.stroke(previewColor);
            p.strokeWeight(item.pathWidth ?? styles.pathWidth ?? 2);
            if (!item.preview.length) return;
            p.beginShape();
            item.preview.forEach((v) => p.vertex(v.x, v.y));
            p.endShape();
          });
        };

        if (state === "drawing") {
          const drawColor = p.color(styles.pathColor ?? "#ffb6dc");
          drawColor.setAlpha(Math.max(0, Math.min(255, styles.pathAlpha ?? 255)));
          p.noFill();
          p.stroke(drawColor);
          p.strokeWeight(styles.pathWidth ?? 2);
          p.beginShape();
          drawing.forEach((v) => p.vertex(v.x, v.y));
          p.endShape();
          renderPreviews(pendingSketches);
          return;
        }

        if (activeSketches.length && state === "fourier") {
          const circleColor = p.color(styles.epicycleColor ?? "#50a0ff");
          circleColor.setAlpha(Math.max(0, Math.min(255, styles.epicycleAlpha ?? 120)));
          const pathStroke = Math.max(1, Math.min(styles.pathWidth ?? 2, 60));
          const shouldFastForward = isRunning && fastForwardTime > 0;
          const iterations = shouldFastForward ? FAST_FORWARD_MULT : 1;

          if (isRunning) {
            for (let step = 0; step < iterations; step += 1) {
              activeSketches.forEach((sketch) => {
                if (!sketch.fourier.length) return;
                const effectiveTime = sharedTime - (sketch.startDelay ?? 0);
                if (effectiveTime < 0) return;
                const { x, y } = computePosition(sketch, effectiveTime);
                sketch.path.unshift(p.createVector(x, y));
              });

              sharedTime += SHARED_DT;
              if (sharedTime > 2 * Math.PI + maxStartDelay) {
                sharedTime = 0;
                activeSketches.forEach((sketch) => {
                  sketch.path = [];
                });
              }

              if (fastForwardTime > 0) {
                fastForwardTime = Math.max(0, fastForwardTime - SHARED_DT);
              }
            }
          }

          activeSketches.forEach((sketch) => {
            if (!sketch.fourier.length) return;
            const sketchColor = p.color(sketch.pathColor ?? "#ffb6dc");
            sketchColor.setAlpha(Math.max(0, Math.min(255, sketch.pathAlpha ?? styles.pathAlpha ?? 255)));
            const strokeWidth = Math.max(1, Math.min(sketch.pathWidth ?? styles.pathWidth ?? 2, 60));
            const effectiveTime = sharedTime - (sketch.startDelay ?? 0);
            if (effectiveTime < 0) {
              return;
            }
            let x = 0;
            let y = 0;
            for (let i = 0; i < Math.min(MAX_TERMS, sketch.fourier.length); i += 1) {
              const term = sketch.fourier[i];
              const prevX = x;
              const prevY = y;
              const angle = term.freq * effectiveTime + term.phase;
              x += term.amp * Math.cos(angle);
              y += term.amp * Math.sin(angle);
              p.stroke(circleColor);
              p.noFill();
              p.strokeWeight(1);
              p.ellipse(prevX, prevY, term.amp * 2);
              p.stroke(255);
              p.strokeWeight(1);
              p.line(prevX, prevY, x, y);
            }
            p.noFill();
            p.stroke(sketchColor);
            p.strokeWeight(strokeWidth);
            p.beginShape();
            sketch.path.forEach((v) => p.vertex(v.x, v.y));
            p.endShape();
          });
        } else if (state === "pending") {
          p.noStroke();
          p.fill(220);
          renderPreviews(pendingSketches);
        }
      };

      function isMouseInsideCanvas(pInst: p5) {
        return (
          pInst.mouseX >= 0 &&
          pInst.mouseX <= pInst.width &&
          pInst.mouseY >= 0 &&
          pInst.mouseY <= pInst.height
        );
      }
    };

    instance = new P5(sketch as any, container);
  })();

  return controller;
}
