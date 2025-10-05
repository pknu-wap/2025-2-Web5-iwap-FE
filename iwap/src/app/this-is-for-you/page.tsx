"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useResizeDetector } from "react-resize-detector";
import { type Data } from "plotly.js";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function FunctionsPage() {
  const [index, setIndex] = useState(1);
  const [a, setA] = useState(1);

  const { width, height, ref } = useResizeDetector();

  // ---- 공통 데이터 ----
  const kVals = useMemo(() => Array.from({ length: 2500 }, (_, i) => i + 1), []);
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

  // ---- 1번 ----
  const l1 = kVals.map((k, i) => {
    const theta = (68 * Math.PI * k) / 2500;
    return { re: aVals[i] + cVals[i] * Math.cos(theta), im: bVals[i] + cVals[i] * Math.sin(theta) };
  });
  const l2 = kVals.map((k, i) => {
    const theta = (68 * Math.PI * k) / 2500;
    return { re: aVals[i] - cVals[i] * Math.cos(theta), im: bVals[i] - cVals[i] * Math.sin(theta) };
  });
  const n = kVals.length;
  const lineSegments1: Data[] = [];
  for (let i = 0; i < n - 1; i++) {
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

  // ---- 2번 ----
  const xVals = useMemo(
    () => Array.from({ length: 200 }, (_, i) => -Math.sqrt(Math.PI) + (2 * Math.sqrt(Math.PI) * i) / 200),
    []
  );
  const fVals = xVals.map((x) => {
    const part1 = Math.pow(Math.abs(x), 2 / 3);
    const part2 = Math.sqrt(Math.max(0, Math.PI - x * x));
    return part1 + part2 * Math.sin(a * Math.PI * x);
  });

  // ---- 3번 ----
  const xRange = Array.from({ length: 50 }, (_, i) => -1 + (2 * i) / 49);
  const yRange = Array.from({ length: 60 }, (_, j) => -1 + (2.5 * j) / 59);
  const zGrid: (number | null)[][] = yRange.map((y) =>
    xRange.map((x) => {
      const inside = 1 - x * x - Math.pow(y - Math.abs(x), 2);
      if (inside < 0) return null;
      return 5 - Math.sqrt(inside) * Math.cos(30 * inside);
    })
  );

  // ---- 4번 ----
  const uRange = Array.from({ length: 50 }, (_, i) => (2 * Math.PI * i) / 49);
  const vRange = Array.from({ length: 50 }, (_, j) => (Math.PI * j) / 49);
  const surfX: number[][] = vRange.map((v) =>
    uRange.map((u) => Math.sin(v) * (15 * Math.sin(u) - 4 * Math.sin(3 * u)))
  );
  const surfY: number[][] = vRange.map((v) => uRange.map(() => 8 * Math.cos(v)));
  const surfZ: number[][] = vRange.map((v) =>
    uRange.map((u) => Math.sin(v) * (15 * Math.cos(u) - 6 * Math.cos(2 * u) - 2 * Math.cos(3 * u)))
  );

  // ---- 5번 ----
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

  // ---- 6번 ----
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

  // ---- 7번 ----
  const pattern7: Data[] = Array.from({ length: 2000 }, (_, i) => {
    const idx = i + 1;
    const x1 = Math.sin((10 * Math.PI * idx) / 2000);
    const y1 = 0.5 * Math.cos((2 * Math.PI * idx) / 2000);
    const x2 = 0.5 * Math.sin((2 * Math.PI * idx) / 2000);
    const y2 = Math.cos((10 * Math.PI * idx) / 2000);
    return {
      x: [x1, x2],
      y: [y1, y2],
      mode: "lines",
      type: "scatter",
      line: { color: `hsl(${(idx / 2000) * 360}, 0%, 20%)`, width: 0.4 },
      showlegend: false,
    };
  });

  // ---- plots ----
  const plots: Record<string, { data: Data[]; title: string }> = {
    "1": { data: lineSegments1, title: "1. Line Segment Pattern" },
    "2": {
      data: [{ x: xVals, y: fVals, type: "scatter", mode: "lines", line: { color: 'red' } }],
      title: `2. f(x), a=${a.toFixed(2)}`
    },
    "3": {
      data: [{
        x: xRange,
        y: yRange,
        z: zGrid,
        type: "surface",
        colorscale: [[0, '#444444'], [1, '#C35858']]
      }],
      title: "3. z(x, y)"
    },
    "4": {
      data: [{
        x: surfX,
        y: surfY,
        z: surfZ,
        type: "surface",
        colorscale: [[0, 'pink'], [1, 'red']]
      }],
      title: "4. 3D Surface"
    },
    "5": {
      data: [{
        x: xHeart,
        y: yHeart,
        mode: "lines+markers",
        marker: { color: heartColors, size: 3 },
        line: { color: 'red', width: 1 }
      }],
      title: "5. Parametric Heart Curve"
    },
    "6": { data: lineSegments, title: "6. Line Segment Heart (601 segments)" },
    "7": { data: pattern7, title: "7. 2000 Line Segments Pattern" },
  };

  const selectedPlot = plots[index.toString()];
  const handlePrev = () => setIndex((prev) => (prev === 1 ? 7 : prev - 1));
  const handleNext = () => setIndex((prev) => (prev === 7 ? 1 : prev + 1));

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen"
      style={{
        backgroundImage: "url('/TIFY_black.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/95 to-black"></div>

      <header className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-full px-4 text-center text-white">
        <div className="flex items-center justify-center gap-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            Th!s !s for u
          </h1>
          <Link href="/Slides" className="flex-shrink-0">
            <button className="p-2">
              <Image src="/X.svg" alt="close" width={24} height={24} />
            </button>
          </Link>
        </div>
        <p className="mt-2 text-lg sm:text-xl">
          함수로 하트 그리기
        </p>
      </header>

      <div
        ref={ref}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                 w-[90vw] max-w-[1501px] h-[65vh] max-h-[700px] bg-white
                 flex flex-col items-center justify-center z-10"
      >
        {width && height && (
          <Plot
            data={selectedPlot.data}
            layout={{
              width: width,
              height: index === 2 ? height - 80 : height,
              title: {
                text: selectedPlot.title,
                font: { size: 18, color: "black" },
                x: 0.5,
                xanchor: "center",
                yanchor: "top"
              },
              margin: { t: 40, l: 40, r: 20, b: 40 },
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(0,0,0,0)",
              xaxis: {
                title: {
                  text: "X",
                  font: { family: "Pretendard, sans-serif" },
                },
              },
              yaxis: {
                title: {
                  text: "Y",
                  font: { family: "Pretendard, sans-serif" },
                },
                scaleanchor: "x",
                scaleratio: 1,
              },
            }}
            config={{ responsive: true }}
            style={{ width: '100%' }}
          />
        )}

        {index === 2 && (
          <div className="w-[80%] max-w-xl mt-4">
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={a}
              onChange={(e) => setA(parseFloat(e.target.value))}
              className="w-full accent-red-500"
            />
            <p className="text-black text-center mt-2">a = {a.toFixed(2)}</p>
          </div>
        )}
      </div>

      <button onClick={handlePrev} className="absolute left-0 inset-y-0 flex items-center z-30 p-4 rotate-180">
        <Image src="/right.svg" alt="prev" width={50} height={50} />
      </button>
      <button onClick={handleNext} className="absolute right-0 inset-y-0 flex items-center z-30 p-4">
        <Image src="/right.svg" alt="next" width={50} height={50} />
      </button>
    </div>
  );
}