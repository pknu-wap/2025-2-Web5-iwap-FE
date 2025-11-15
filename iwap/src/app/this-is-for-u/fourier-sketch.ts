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

export type FourierSketchInput = {
  points: { x: number; y: number }[];
  width: number;
  height: number;
};

export type FourierSketchController = {
  updateStyles: (styles: FourierSketchStyles) => void;
  confirmSketches: () => void;
  clearSketches: () => void;
  loadPendingSketches: (paths: FourierSketchInput[]) => void;
  getFourierCoefficients: () => FourierCoefficient[][];
  cleanup: () => void;
};

/**
 * This-is-for-u 페이지에서 오른쪽 Fourier 데모 박스에 붙는 p5 스케치 초기화 함수
 * page.tsx에서 import { initFourierSketch } from "./fourier-sketch"; 로 사용합니다.
 */
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
  let loadPendingSketchesFn: (paths: FourierSketchInput[]) => void = () => {};
  let getFourierCoefficientsFn: () => FourierCoefficient[][] = () => [];
  const controller: FourierSketchController = {
    updateStyles,
    confirmSketches: () => {
      confirmSketchesFn();
    },
    clearSketches: () => {
      clearSketchesFn();
    },
    loadPendingSketches: (paths) => {
      loadPendingSketchesFn(paths);
    },
    getFourierCoefficients: () => {
      return getFourierCoefficientsFn();
    },
    cleanup() {
      if (instance) {
        instance.remove();
        instance = null;
      }
      container.innerHTML = "";
    },
  };

  // p5는 window를 쓰기 때문에, Next 환경에서 안전하게 쓰려고 동적 import 사용
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
        time: number;
        path: p5.Vector[];
        preview: p5.Vector[];
      };

      let drawing: p5.Vector[] = [];
      const pendingSketches: FourierSketch[] = [];
      const activeSketches: FourierSketch[] = [];
      let state: "idle" | "drawing" | "pending" | "fourier" = "idle";

      const MAX_TERMS = 3000;

      const clearSketches = () => {
        drawing = [];
        pendingSketches.length = 0;
        activeSketches.length = 0;
        state = "idle";
      };

      const confirmSketches = () => {
        if (!pendingSketches.length) return;

        drawing = [];
        activeSketches.length = 0;
        activeSketches.push(...pendingSketches);
        pendingSketches.length = 0;
        state = activeSketches.length > 0 ? "fourier" : "idle";
      };

      const getFourierCoefficients = (): FourierCoefficient[][] => (
        activeSketches.map((sketch) =>
          sketch.fourier.map((term) => ({
            amp: term.amp,
            freq: term.freq,
            phase: term.phase,
          })),
        )
      );

      const loadPendingSketches = (paths: FourierSketchInput[]) => {
        drawing = [];
        pendingSketches.length = 0;
        activeSketches.length = 0;
        state = "idle";

        if (!paths.length) return;

        const rect = container.getBoundingClientRect();
        const baseWidth = rect.width || 480;
        const baseHeight = rect.height || 480;
        const size = Math.min(baseWidth, baseHeight);

        for (const payload of paths) {
          if (payload.points.length < 4) continue;

          const width = payload.width || baseWidth;
          const height = payload.height || baseHeight;
          const scaleX = size / width;
          const scaleY = size / height;

          const vectors = payload.points.map((point) => {
            const x = (point.x - 0.5) * width;
            const y = (point.y - 0.5) * height;
            return p.createVector(x * scaleX, y * scaleY);
          });

          pendingSketches.push({
            fourier: dft(vectors),
            time: 0,
            path: [],
            preview: vectors,
          });
        }

        state = pendingSketches.length > 0 ? "pending" : "idle";
      };

      clearSketchesFn = clearSketches;
      confirmSketchesFn = confirmSketches;
      loadPendingSketchesFn = loadPendingSketches;
      getFourierCoefficientsFn = getFourierCoefficients;

      // DFT 구현 (Daniel Shiffman 스타일)
      const dft = (points: p5.Vector[]): FourierTerm[] => {
        const N = points.length;
        const result: FourierTerm[] = [];

        for (let k = 0; k < N; k += 1) {
          let re = 0;
          let im = 0;

          for (let n = 0; n < N; n += 1) {
            const phi = (2 * Math.PI * k * n) / N;
            const { x, y } = points[n];

            // (x, y)를 복소수로 보고 DFT (아래는 실수/허수 쪼개 쓴 버전)
            re += x * Math.cos(phi) + y * Math.sin(phi);
            im += -x * Math.sin(phi) + y * Math.cos(phi);
          }

          re /= N;
          im /= N;

          const amp = Math.hypot(re, im);
          const phase = Math.atan2(im, re);

          const freq = (k > N / 2) ? k - N : k;

          result.push({
            re,
            im,
            freq: k,
            amp,
            phase,
          });
        }

        // 큰 진폭 순으로 정렬 (중요한 성분부터 그리기)
        result.sort((a, b) => b.amp - a.amp);
        return result;
      };

      p.setup = () => {
        const rect = container.getBoundingClientRect();
        const w = rect.width || 480;
        const h = rect.height || 480;
        const size = Math.min(w, h);
        p.frameRate(20);

        const cnv = p.createCanvas(size, size);
        // 캔버스를 container 안에 붙이기
        cnv.parent(container);

        p.background(styles.backgroundColor ?? "#000000");
        p.stroke(255);
        p.noFill();
      };

      p.windowResized = () => {
        const rect = container.getBoundingClientRect();
        const w = rect.width || 480;
        const h = rect.height || 480;
        const size = Math.min(w, h);
        p.resizeCanvas(size, size);
        p.background(styles.backgroundColor ?? "#000000");
        clearSketchesFn();
      };

      p.mousePressed = () => {
        // Ignore clicks outside the canvas
        if (!isMouseInsideCanvas(p)) return;

        drawing = [];
        activeSketches.length = 0;
        state = "drawing";
      };

      p.mouseDragged = () => {
        if (state !== "drawing") return;
        if (!isMouseInsideCanvas(p)) return;

        // 캔버스 중심(0,0)을 기준으로 좌표 저장
        const x = p.mouseX - p.width / 2;
        const y = p.mouseY - p.height / 2;
        drawing.push(p.createVector(x, y));
      };

      p.mouseReleased = () => {
        if (state !== "drawing") return;
        if (drawing.length < 4) {
          drawing = [];
          state = pendingSketches.length > 0
            ? "pending"
            : activeSketches.length > 0
              ? "fourier"
              : "idle";
          return;
        }

        const nextFourier = dft(drawing);
        if (nextFourier.length) {
          const preview = drawing.map((v) => v.copy());
          pendingSketches.push({
            fourier: nextFourier,
            time: 0,
            path: [],
            preview,
          });
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
          for (const item of list) {
            if (!item.preview.length) continue;
            p.beginShape();
            for (const v of item.preview) {
              p.vertex(v.x, v.y);
            }
            p.endShape();
          }
        };

        if (state === "drawing") {
          // Show the stroke as you draw it
          p.noFill();
          p.stroke(200);
          p.beginShape();
          for (const v of drawing) {
            p.vertex(v.x, v.y);
          }
          p.endShape();
          renderPreviews(pendingSketches);
          return;
        }

        if (activeSketches.length > 0 && state === "fourier") {
          const circleColor = p.color(styles.epicycleColor ?? "#50a0ff");
          circleColor.setAlpha(
            Math.max(0, Math.min(255, styles.epicycleAlpha ?? 120)),
          );

          const pathColor = p.color(styles.pathColor ?? "#ffb6dc");
          pathColor.setAlpha(
            Math.max(0, Math.min(255, styles.pathAlpha ?? 255)),
          );

          for (const sketch of activeSketches) {
            if (!sketch.fourier.length) continue;
            let x = 0;
            let y = 0;

            for (let i = 0; i < Math.min(MAX_TERMS, sketch.fourier.length); i += 1) {
              const term = sketch.fourier[i];
              const prevX = x;
              const prevY = y;

              const angle = term.freq * sketch.time + term.phase;
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
            for (const v of sketch.path) {
              p.vertex(v.x, v.y);
            }
            p.endShape();

            const N = sketch.fourier.length;
            const dt = (2 * Math.PI) / N;
            sketch.time += dt;

            if (sketch.time > 2 * Math.PI) {
              sketch.time = 0;
              sketch.path = [];
            }
          }
        } else if (state === "pending") {
          p.noStroke();
          p.fill(220);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(13);
          renderPreviews(pendingSketches);
          p.text(
            "그린 선이 준비되었습니다.\n확인을 눌러 Fourier Epicycle을 한꺼번에 재생하세요.",
            0,
            0,
          );
        } else if (state === "idle") {
          p.noStroke();
          p.fill(200);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(14);
          p.text(
            "여러 선을 그려보세요\n각각이 Fourier Epicycle로 다시 그려질 거예요.",
            0,
            0,
          );
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
