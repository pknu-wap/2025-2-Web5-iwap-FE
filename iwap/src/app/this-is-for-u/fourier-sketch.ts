// src/app/this-is-for-u/fourier-sketch.ts

import type p5 from "p5";

/**
 * This-is-for-u 페이지에서 오른쪽 Fourier 데모 박스에 붙는 p5 스케치 초기화 함수
 * page.tsx에서 import { initFourierSketch } from "./fourier-sketch"; 로 사용합니다.
 */
export function initFourierSketch(container: HTMLElement): () => void {
  let instance: p5 | null = null;

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

      let drawing: p5.Vector[] = [];
      let path: p5.Vector[] = [];
      let fourier: FourierTerm[] = [];
      let time = 0;
      let state: "idle" | "drawing" | "fourier" = "idle";

      const MAX_TERMS =3000;

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

        p.background(0);
        p.stroke(255);
        p.noFill();
      };

      p.windowResized = () => {
        const rect = container.getBoundingClientRect();
        const w = rect.width || 480;
        const h = rect.height || 480;
        const size = Math.min(w, h);
        p.resizeCanvas(size, size);
        p.background(0);
        drawing = [];
        path = [];
        fourier = [];
        state = "idle";
        time = 0;
      };

      p.mousePressed = () => {
        // container 바깥 클릭은 무시
        if (!isMouseInsideCanvas(p)) return;

        drawing = [];
        path = [];
        fourier = [];
        time = 0;
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
          state = "idle";
          drawing = [];
          return;
        }

        // DFT 계산
        fourier = dft(drawing);
        time = 0;
        path = [];
        state = "fourier";
      };

      p.draw = () => {
        p.background(0);

        p.translate(p.width / 2, p.height / 2);

        if (state === "drawing") {
          // 사용자가 그리고 있는 궤적 보이기
          p.noFill();
          p.stroke(200);
          p.beginShape();
          for (const v of drawing) {
            p.vertex(v.x, v.y);
          }
          p.endShape();
          return;
        }

        if (state === "fourier" && fourier.length > 0) {
          let x = 0;
          let y = 0;

          // epicycles 그리기
          for (let i = 0; i < Math.min(MAX_TERMS, fourier.length); i += 1) {
            const term = fourier[i];
            const prevX = x;
            const prevY = y;

            const angle = term.freq * time + term.phase;
            x += term.amp * Math.cos(angle);
            y += term.amp * Math.sin(angle);

            // 원
            p.stroke(80, 160, 255, 120);
            p.noFill();
            p.ellipse(prevX, prevY, term.amp * 2);

            // 선분
            p.stroke(255);
            p.line(prevX, prevY, x, y);
          }

          // 현재 끝점(펜 위치)
          path.unshift(p.createVector(x, y));

          // 궤적 라인
          p.noFill();
          p.stroke(255, 180, 220);
          p.beginShape();
          for (const v of path) {
            p.vertex(v.x, v.y);
          }
          p.endShape();

          const N = fourier.length;
          const dt = (2 * Math.PI) / N;
          time += dt;

          // 한 바퀴 돌면 다시 반복
          if (time > 2 * Math.PI) {
            time = 0;
            path = [];
          }
        } else if (state === "idle") {
          // 안내 텍스트
          p.noStroke();
          p.fill(200);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(14);
          p.text(
            "드로잉 영역 안에서\n마우스를 누른 채로 선을 그려보세요.",
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

  // cleanup 함수: page.tsx의 useEffect에서 반환값으로 사용
  return () => {
    if (instance) {
      instance.remove();
      instance = null;
    }
    // 혹시 남은 DOM 정리
    container.innerHTML = "";
  };
}