"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useResizeDetector } from "react-resize-detector";
import { type Data } from "plotly.js";
import FullScreenView from "@/components/ui/FullScreenView";

// Plotly.js는 클라이언트 측에서만 렌더링되어야 하므로, Next.js의 dynamic import를 사용합니다.
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function FunctionsPage() {
  // 현재 보여줄 그래프의 인덱스를 관리하는 상태 (1~7)
  const [index, setIndex] = useState(1);
  const [a, setA] = useState(1);
  // react-resize-detector 훅을 사용하여 그래프를 그릴 div의 너비와 높이를 동적으로 감지합니다.
  const { width, height, ref } = useResizeDetector();

  // --- 데이터 생성 로직 ---
  // useMemo를 사용하여 복잡한 계산이 많은 그래프 데이터를 캐싱하고, 불필요한 리렌더링을 방지합니다.

  // ---- 1, 5, 6, 7번 그래프에서 공통적으로 사용될 k 값 배열 ----
  const kVals = useMemo(() => Array.from({ length: 2500 }, (_, i) => i + 1), []);

  // ---- 1번 그래프: 선분 패턴 하트 ----
  const aVals = kVals.map(
    (k) =>
      (-3 / 2) * Math.pow(Math.sin((2 * Math.PI * k) / 2500), 3) +
      (3 / 10) * Math.pow(Math.sin((2 * Math.PI * k) / 2500), 7)
  );
  const bVals = kVals.map(
    (k) =>
      Math.sin((2 * Math.PI * k) / 1875 + Math.PI / 6) +
      0.25 * Math.pow(Math.sin((2 * Math.PI * k) / 1875 + Math.PI / 6), 3)
  );
  const cVals = kVals.map((k) => 2 / 15 - (1 / 8) * Math.cos((Math.PI * k) / 625));
  const l1 = kVals.map((k, i) => {
    const theta = (68 * Math.PI * k) / 2500;
    return { re: aVals[i] + cVals[i] * Math.cos(theta), im: bVals[i] + cVals[i] * Math.sin(theta) };
  });
  const l2 = kVals.map((k, i) => {
    const theta = (68 * Math.PI * k) / 2500;
    return { re: aVals[i] - cVals[i] * Math.cos(theta), im: bVals[i] - cVals[i] * Math.sin(theta) };
  });
  const lineSegments1: Data[] = [];
  for (let i = 0; i < kVals.length - 1; i++) {
    lineSegments1.push({
      x: [l1[i].re, l1[i + 1].re], y: [l1[i].im, l1[i + 1].im],
      mode: "lines", type: "scatter", line: { color: "rgba(0,0,0,0.5)", width: 0.3 }, showlegend: false,
    });
    lineSegments1.push({
      x: [l2[i].re, l2[i + 1].re], y: [l2[i].im, l2[i + 1].im],
      mode: "lines", type: "scatter", line: { color: "rgba(0,0,0,0.5)", width: 0.3 }, showlegend: false,
    });
    lineSegments1.push({
      x: [l1[i].re, l2[i].re], y: [l1[i].im, l2[i].im],
      mode: "lines", type: "scatter", line: { color: "rgba(0,0,0,0.5)", width: 1 }, showlegend: false,
    });
  }

  // ---- 2번 그래프: f(x) 함수 ----
  const xVals = useMemo(
    () => Array.from({ length: 200 }, (_, i) => -Math.sqrt(Math.PI) + (2 * Math.sqrt(Math.PI) * i) / 200),
    []
  );
  const fVals = xVals.map((x) => {
    const part1 = Math.pow(Math.abs(x), 2 / 3);
    const part2 = Math.sqrt(Math.max(0, Math.PI - x * x));
    return part1 + part2 * Math.sin(a * Math.PI * x);
  });

  // ---- 3번 그래프: 3D 표면 z(x, y) ----
  const xRange = Array.from({ length: 50 }, (_, i) => -1 + (2 * i) / 49);
  const yRange = Array.from({ length: 60 }, (_, j) => -1 + (2.5 * j) / 59);
  const zGrid: (number | null)[][] = yRange.map((y) =>
    xRange.map((x) => {
      const inside = 1 - x * x - Math.pow(y - Math.abs(x), 2);
      if (inside < 0) return null;
      return 5 - Math.sqrt(inside) * Math.cos(30 * inside);
    })
  );

  // ---- 4번 그래프: 3D 파라메트릭 표면 ----
  const uRange = Array.from({ length: 50 }, (_, i) => (2 * Math.PI * i) / 49);
  const vRange = Array.from({ length: 50 }, (_, j) => (Math.PI * j) / 49);
  const surfX: number[][] = vRange.map((v) =>
    uRange.map((u) => Math.sin(v) * (15 * Math.sin(u) - 4 * Math.sin(3 * u)))
  );
  const surfY: number[][] = vRange.map((v) => uRange.map(() => 8 * Math.cos(v)));
  const surfZ: number[][] = vRange.map((v) =>
    uRange.map((u) => Math.sin(v) * (15 * Math.cos(u) - 6 * Math.cos(2 * u) - 2 * Math.cos(3 * u)))
  );

  // ---- 5번 그래프: 파라메트릭 하트 곡선 ----
  const tVals = Array.from({ length: 2000 }, (_, i) => (Math.PI * i) / 1999);
  const xHeart = tVals.map(
    (t) =>
      (4 / 9) * Math.sin(2 * t) +
      (1 / 3) * Math.pow(Math.sin(t), 8) * Math.cos(3 * t) +
      (1 / 8) * Math.sin(2 * t) * Math.pow(Math.cos(247 * t), 4)
  );
  const yHeart = tVals.map(
    (t) =>
      Math.sin(t) +
      (1 / 3) * Math.pow(Math.sin(t), 8) * Math.sin(3 * t) +
      (1 / 8) * Math.sin(2 * t) * Math.pow(Math.sin(247 * t), 4)
  );
  const heartColors = tVals.map((t) => `hsl(${(t / Math.PI) * 360}, 70%, 55%)`);

  // ---- 6번 그래프: 601개의 선분으로 그린 하트 ----
  const nLines = 601;
  const iVals = Array.from({ length: nLines }, (_, i) => i + 1);
  const xStart = iVals.map((i) => Math.sin((10 * Math.PI * (i + 699)) / 2000));
  const yStart = iVals.map((i) => Math.cos((8 * Math.PI * (i + 699)) / 2000));
  const xEnd = iVals.map((i) => Math.sin((12 * Math.PI * (i + 699)) / 2000));
  const yEnd = iVals.map((i) => Math.cos((10 * Math.PI * (i + 699)) / 2000));
  const lineSegments: Data[] = iVals.map((_, idx) => ({
    x: [xStart[idx], xEnd[idx]], y: [yStart[idx], yEnd[idx]],
    mode: "lines", type: "scatter", line: { color: `#000000`, width: 0.3 }, showlegend: false,
  }));

  // ---- 7번 그래프: 2000개의 선분 패턴 ----
  const pattern7: Data[] = Array.from({ length: 2000 }, (_, i) => {
    const idx = i + 1;
    const x1 = Math.sin((10 * Math.PI * idx) / 2000);
    const y1 = 0.5 * Math.cos((2 * Math.PI * idx) / 2000);
    const x2 = 0.5 * Math.sin((2 * Math.PI * idx) / 2000);
    const y2 = Math.cos((10 * Math.PI * idx) / 2000);
    return {
      x: [x1, x2], y: [y1, y2], mode: "lines", type: "scatter",
      line: { color: `hsl(${(idx / 2000) * 360}, 0%, 20%)`, width: 0.4 }, showlegend: false,
    };
  });

  // 각 인덱스에 해당하는 그래프 데이터와 제목을 객체로 묶어 관리합니다.
  const plots: Record<string, { data: Data[]; title: string }> = {
    "1": { data: lineSegments1, title: "1. Line Segment Pattern" },
    "2": { data: [{ x: xVals, y: fVals, type: "scatter", mode: "lines", line: { color: 'red' } }], title: `2. f(x), Parametric Line Heart Pattern` },
    "3": { data: [{ x: xRange, y: yRange, z: zGrid, type: "surface", colorscale: [[0, '#444444'], [1, '#C35858']] }], title: "3. Abstract 3D Surface" },
    "4": { data: [{ x: surfX, y: surfY, z: surfZ, type: "surface", colorscale: [[0, 'pink'], [1, 'red']] }], title: "4. 3D Surface z(x, y)" },
    "5": { data: [{ x: xHeart, y: yHeart, mode: "lines", line: { color: 'red', width: 1 } }], title: "5. 3D Parametric Surface (u, v)" },
    "6": { data: lineSegments, title: "6. Heart Shape from 601 Line Segments" },
    "7": { data: pattern7, title: "7. 2000 Line Segments Pattern" },
  };

  // 현재 index 상태에 맞는 그래프 데이터를 선택합니다.
  const selectedPlot = plots[index.toString()];

  // 이전/다음 버튼 클릭 시 인덱스를 순환시키는 핸들러 함수입니다.
  const handlePrev = () => setIndex((prev) => (prev === 1 ? 7 : prev - 1));
  const handleNext = () => setIndex((prev) => (prev === 7 ? 1 : prev + 1));

  return (
    // [수정 1] 모바일에서는 헤더가 없으므로 전체 높이를 사용하고(h-dvh), md 이상에서만 헤더 높이를 제외
    <div className="relative w-full h-dvh md:h-[calc(100dvh-96px)]">
      <FullScreenView
        title="Th!s !s for u"
        subtitle="함수로 하트 그리기"
        goBack={true}
        onPrev={handlePrev}
        onNext={handleNext}
        backgroundUrl="/images/this-is-for-u_background.jpg"
      >

    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/95 to-black"></div>

        {/* 흰색 배경을 가진 그래프 컨테이너 */}
    <div
       className="relative z-20 mt-16 md:mt-20 w-[90vw] max-w-[1501px] h-[75vh] md:h-[65vh] max-h-[700px]
               bg-white flex flex-col items-center justify-center"
      >
          <div ref={ref} className="w-full flex-grow min-h-0">
            {width && height && (
              <Plot
                data={selectedPlot.data}
                layout={{
                  width: width,
                  height: height,
                  title: {
                    text: selectedPlot.title,
                    font: { size: 18, color: "black" },
                    x: 0.5, xanchor: "center", yanchor: "top"
                  },
                  // [수정 1] 제목이 그래프와 겹치지 않도록 상단 여백을 40에서 80으로 늘립니다.
                  margin: index === 2 ? { t: 100, l: 40, r: 20, b: 40 } : { t: 80, l: 40, r: 20, b: 40 },
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  xaxis: { title: { text: "X", font: { family: "Pretendard, sans-serif" } } },
                  yaxis: { 
                    title: { text: "Y", font: { family: "Pretendard, sans-serif" } },
                      scaleanchor: "x",
                      scaleratio: 1,
                  },
                }}
                config={{ responsive: true }}
                style={{ width: '100%' }}
              />
            )}
          </div>

          {/* 슬라이더 영역 */}
          {index === 2 && (
            <div className="w-[80%] max-w-xl mt-4 flex-shrink-0">
              <input
                type="range" min="-10" max="10" step="0.1" value={a}
                onChange={(e) => setA(parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
              <p className="text-black text-center mt-2">a = {a.toFixed(2)}</p>
            </div>
          )}
        </div>
      </FullScreenView>
    </div>
  );
}