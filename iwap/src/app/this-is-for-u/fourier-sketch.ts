// src/app/this-is-for-u/fourier-sketch.ts

import type p5 from "p5";
import type { FourierCoefficient } from "./types";

type FourierSketchStyles = {
  backgroundColor?: string;
  epicycleColor?: string;
  epicycleAlpha?: number;
  pathColor?: string;
  pathAlpha?: number;
};

export type FourierSketchController = {
  updateStyles: (styles: FourierSketchStyles) => void;
  confirmSketches: () => void;
  clearSketches: () => void;
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
  };

  const updateStyles = (nextStyles: FourierSketchStyles) => {
    styles = { ...styles, ...nextStyles };
  };

  let clearSketchesFn: () => void = () => {};
  let confirmSketchesFn: () => void = () => {};
  let getFourierCoefficientsFn: () => FourierCoefficient[][] = () => [];

  const controller: FourierSketchController = {
    updateStyles,
    confirmSketches: () => {
      confirmSketchesFn();
    },
    clearSketches: () => {
      clearSketchesFn();
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
      };

      let drawing: p5.Vector[] = [];
      const pendingSketches: FourierSketch[] = [];
      const activeSketches: FourierSketch[] = [];
      let state: "idle" | "drawing" | "pending" | "fourier" = "idle";
      const SHARED_DT = 0.04;
      let sharedTime = 0;

      const MAX_TERMS = 2000;
      const RESAMPLE_TARGET = 512;

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
      const smoothPath = (points: p5.Vector[], iterations = 1): p5.Vector[] => {
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
        state = "idle";
      };

      const confirmSketches = () => {
        if (!pendingSketches.length) return;

        drawing = [];
        activeSketches.length = 0;
        activeSketches.push(...pendingSketches);
        pendingSketches.length = 0;
        sharedTime = 0;
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
      getFourierCoefficientsFn = getFourierCoefficients;

      /* -------------------- DFT (리샘플 + 스무딩 포함) -------------------- */
      const dft = (rawPoints: p5.Vector[]): FourierTerm[] => {
        // 1) 길이 기준 일정 간격으로 리샘플
        const resampled = resamplePath(rawPoints, RESAMPLE_TARGET);

        // 2) 노이즈 줄이기 위해 스무딩
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

      p.setup = () => {
        const rect = container.getBoundingClientRect();
        const size = Math.min(rect.width || 480, rect.height || 480);
        p.frameRate(20);
        const cnv = p.createCanvas(size, size);
        cnv.parent(container);
        p.background(styles.backgroundColor ?? "#000000");
        p.stroke(255);
        p.noFill();
      };

      p.windowResized = () => {
        const rect = container.getBoundingClientRect();
        const size = Math.min(rect.width || 480, rect.height || 480);
        p.resizeCanvas(size, size);
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
          pendingSketches.push({ fourier: nextFourier, path: [], preview });
        }

        drawing = [];
        state = pendingSketches.length > 0 ? "pending" : "idle";
      };

      p.draw = () => {
        p.background(styles.backgroundColor ?? "#000000");
        p.translate(p.width / 2, p.height / 2);

        const renderPreviews = (list: FourierSketch[]) => {
          if (!list.length) return;
          p.noFill();
          const previewColor = p.color(255, 255, 255, 80);
          p.stroke(previewColor);
          p.strokeWeight(1);
          list.forEach((item) => {
            if (!item.preview.length) return;
            p.beginShape();
            item.preview.forEach((v) => p.vertex(v.x, v.y));
            p.endShape();
          });
        };

        if (state === "drawing") {
          p.noFill();
          p.stroke(200);
          p.beginShape();
          drawing.forEach((v) => p.vertex(v.x, v.y));
          p.endShape();
          renderPreviews(pendingSketches);
          return;
        }

        if (activeSketches.length && state === "fourier") {
          const circleColor = p.color(styles.epicycleColor ?? "#50a0ff");
          circleColor.setAlpha(Math.max(0, Math.min(255, styles.epicycleAlpha ?? 120)));
          const pathColor = p.color(styles.pathColor ?? "#ffb6dc");
          pathColor.setAlpha(Math.max(0, Math.min(255, styles.pathAlpha ?? 255)));

          activeSketches.forEach((sketch) => {
            if (!sketch.fourier.length) return;
            let x = 0;
            let y = 0;
            for (let i = 0; i < Math.min(MAX_TERMS, sketch.fourier.length); i += 1) {
              const term = sketch.fourier[i];
              const prevX = x;
              const prevY = y;
              const angle = term.freq * sharedTime + term.phase;
              x += term.amp * Math.cos(angle);
              y += term.amp * Math.sin(angle);
              p.stroke(circleColor);
              p.noFill();
              p.ellipse(prevX, prevY, term.amp * 2);
              p.stroke(255);
              p.line(prevX, prevY, x, y);
            }
            sketch.path.unshift(p.createVector(x, y));
            p.noFill();
            p.stroke(pathColor);
            p.beginShape();
            sketch.path.forEach((v) => p.vertex(v.x, v.y));
            p.endShape();
          });
          sharedTime += SHARED_DT;
          if (sharedTime > 2 * Math.PI) {
            sharedTime = 0;
            activeSketches.forEach((sketch) => {
              sketch.path = [];
            });
          }
        } else if (state === "pending") {
          p.noStroke();
          p.fill(220);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(13);
          renderPreviews(pendingSketches);
          p.text("그린 선이 준비되었습니다. 확인을 눌러 Fourier Epicycle을 실행하세요.", 0, 0);
        } else {
          p.noStroke();
          p.fill(200);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(14);
          p.text("여러 선을 그려보세요. Fourier epicycle로 재생됩니다.", 0, 0);
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
