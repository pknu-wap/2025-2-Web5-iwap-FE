// src/app/this-is-for-u/fourier-sketch.ts

import type p5 from "p5";

type FourierSketchStyles = {
  backgroundColor?: string;
  epicycleColor?: string;
  epicycleAlpha?: number;
  pathColor?: string;
  pathAlpha?: number;
};

export type FourierSketchController = {
  updateStyles: (styles: FourierSketchStyles) => void;
  clearSketches: () => void;
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

  const controller: FourierSketchController = {
    updateStyles,
    clearSketches: () => {
      clearSketchesFn();
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
      };

      let drawing: p5.Vector[] = [];
      const sketches: FourierSketch[] = [];
      let state: "idle" | "drawing" | "fourier" = "idle";

      clearSketchesFn = () => {
        drawing = [];
        sketches.length = 0;
        state = "idle";
      };

      const MAX_TERMS = 3000;

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
          state = sketches.length > 0 ? "fourier" : "idle";
          return;
        }

        const nextFourier = dft(drawing);
        if (nextFourier.length) {
          sketches.push({
            fourier: nextFourier,
            time: 0,
            path: [],
          });
        }

        drawing = [];
        state = "fourier";
      };

      p.draw = () => {
        p.background(styles.backgroundColor ?? "#000000");

        p.translate(p.width / 2, p.height / 2);

        if (state === "drawing") {
          // Show the stroke as you draw it
          p.noFill();
          p.stroke(200);
          p.beginShape();
          for (const v of drawing) {
            p.vertex(v.x, v.y);
          }
          p.endShape();
          return;
        }

        if (sketches.length > 0) {
          const circleColor = p.color(styles.epicycleColor ?? "#50a0ff");
          circleColor.setAlpha(
            Math.max(0, Math.min(255, styles.epicycleAlpha ?? 120)),
          );

          const pathColor = p.color(styles.pathColor ?? "#ffb6dc");
          pathColor.setAlpha(
            Math.max(0, Math.min(255, styles.pathAlpha ?? 255)),
          );

          for (const sketch of sketches) {
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

            const dt = (2 * Math.PI) / sketch.fourier.length;
            sketch.time += dt;

            if (sketch.time > 2 * Math.PI) {
              sketch.time = 0;
              sketch.path = [];
            }
          }
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
