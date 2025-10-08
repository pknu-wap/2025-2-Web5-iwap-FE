"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useResizeDetector } from "react-resize-detector";
import { type Data, type Layout } from "plotly.js";
import FullScreenView from "@/components/ui/FullScreenView";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function FunctionsPage() {
  const [index, setIndex] = useState(1);
  const [a, setA] = useState(1);
  const { width, height, ref } = useResizeDetector();
  const [debouncedSize, setDebouncedSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handler = setTimeout(() => {
      if (width && height) {
        setDebouncedSize({ width, height });
      }
    }, 150);
    return () => clearTimeout(handler);
  }, [width, height]);

  const kVals = useMemo(() => Array.from({ length: 2500 }, (_, i) => i + 1), []);

// [수정] 1번 그래프: 선의 두께에 따라 trace를 2개로 분리하여 촘촘함 복원
const singleTrace1 = useMemo((): Data[] => {
  const aVals = kVals.map((k) => (-3 / 2) * Math.pow(Math.sin((2 * Math.PI * k) / 2500), 3) + (3 / 10) * Math.pow(Math.sin((2 * Math.PI * k) / 2500), 7));
  const bVals = kVals.map((k) => Math.sin((2 * Math.PI * k) / 1875 + Math.PI / 6) + 0.25 * Math.pow(Math.sin((2 * Math.PI * k) / 1875 + Math.PI / 6), 3));
  const cVals = kVals.map((k) => 2 / 15 - (1 / 8) * Math.cos((Math.PI * k) / 625));
  
  const l1 = kVals.map((k, i) => {
    const theta = (68 * Math.PI * k) / 2500;
    return { re: aVals[i] + cVals[i] * Math.cos(theta), im: bVals[i] + cVals[i] * Math.sin(theta) };
  });
  const l2 = kVals.map((k, i) => {
    const theta = (68 * Math.PI * k) / 2500;
    return { re: aVals[i] - cVals[i] * Math.cos(theta), im: bVals[i] - cVals[i] * Math.sin(theta) };
  });

  // 가는 선과 굵은 선의 좌표를 분리해서 저장
  const thinLinesX: (number | null)[] = [];
  const thinLinesY: (number | null)[] = [];
  const thickLinesX: (number | null)[] = [];
  const thickLinesY: (number | null)[] = [];

  for (let i = 0; i < kVals.length - 1; i++) {
    // 가는 선 (l1, l2 경로)
    thinLinesX.push(l1[i].re, l1[i + 1].re, null);
    thinLinesY.push(l1[i].im, l1[i + 1].im, null);
    thinLinesX.push(l2[i].re, l2[i + 1].re, null);
    thinLinesY.push(l2[i].im, l2[i + 1].im, null);
    
    // 굵은 선 (l1과 l2를 잇는 선)
    thickLinesX.push(l1[i].re, l2[i].re, null);
    thickLinesY.push(l1[i].im, l2[i].im, null);
  }

  // 2개의 trace 객체를 배열로 반환
  return [
    { // 가는 선 trace
      x: thinLinesX,
      y: thinLinesY,
      mode: "lines",
      type: "scatter",
      line: { color: "rgba(0,0,0,0.5)", width: 0.3 },
      showlegend: false,
      hoverinfo: 'none'
    },
    { // 굵은 선 trace
      x: thickLinesX,
      y: thickLinesY,
      mode: "lines",
      type: "scatter",
      line: { color: "rgba(0,0,0,0.5)", width: 1 },
      showlegend: false,
      hoverinfo: 'none'
    }
  ];
}, [kVals]);
  
  const xVals = useMemo(() => Array.from({ length: 200 }, (_, i) => -Math.sqrt(Math.PI) + (2 * Math.sqrt(Math.PI) * i) / 200), []);
  const fVals = xVals.map((x) => Math.pow(Math.abs(x), 2 / 3) + Math.sqrt(Math.max(0, Math.PI - x * x)) * Math.sin(a * Math.PI * x));
  
  const xRange = useMemo(() => Array.from({ length: 50 }, (_, i) => -1 + (2 * i) / 49), []);
  const yRange = useMemo(() => Array.from({ length: 60 }, (_, j) => -1 + (2.5 * j) / 59), []);
  const zGrid: (number | null)[][] = useMemo(() => yRange.map((y) => xRange.map((x) => {
    const inside = 1 - x * x - Math.pow(y - Math.abs(x), 2);
    return inside < 0 ? null : 5 - Math.sqrt(inside) * Math.cos(30 * inside);
  })), [xRange, yRange]);

  const uRange = useMemo(() => Array.from({ length: 50 }, (_, i) => (2 * Math.PI * i) / 49), []);
  const vRange = useMemo(() => Array.from({ length: 50 }, (_, j) => (Math.PI * j) / 49), []);
  const surfX: number[][] = useMemo(() => vRange.map((v) => uRange.map((u) => Math.sin(v) * (15 * Math.sin(u) - 4 * Math.sin(3 * u)))), [uRange, vRange]);
  const surfY: number[][] = useMemo(() => vRange.map((v) => uRange.map(() => 8 * Math.cos(v))), [uRange, vRange]);
  const surfZ: number[][] = useMemo(() => vRange.map((v) => uRange.map((u) => Math.sin(v) * (15 * Math.cos(u) - 6 * Math.cos(2 * u) - 2 * Math.cos(3 * u)))), [uRange, vRange]);

  const tVals = useMemo(() => Array.from({ length: 2000 }, (_, i) => (Math.PI * i) / 1999), []);
  const xHeart = useMemo(() => tVals.map((t) => (4 / 9) * Math.sin(2 * t) + (1 / 3) * Math.pow(Math.sin(t), 8) * Math.cos(3 * t) + (1 / 8) * Math.sin(2 * t) * Math.pow(Math.cos(247 * t), 4)), [tVals]);
  const yHeart = useMemo(() => tVals.map((t) => Math.sin(t) + (1 / 3) * Math.pow(Math.sin(t), 8) * Math.sin(3 * t) + (1 / 8) * Math.sin(2 * t) * Math.pow(Math.sin(247 * t), 4)), [tVals]);

  const singleTrace6 = useMemo((): Data[] => {
    const nLines = 601;
    const iVals = Array.from({ length: nLines }, (_, i) => i + 1);
    const xStart = iVals.map((i) => Math.sin((10 * Math.PI * (i + 699)) / 2000));
    const yStart = iVals.map((i) => Math.cos((8 * Math.PI * (i + 699)) / 2000));
    const xEnd = iVals.map((i) => Math.sin((12 * Math.PI * (i + 699)) / 2000));
    const yEnd = iVals.map((i) => Math.cos((10 * Math.PI * (i + 699)) / 2000));
    const xCoords = iVals.flatMap((_, idx) => [xStart[idx], xEnd[idx], null]);
    const yCoords = iVals.flatMap((_, idx) => [yStart[idx], yEnd[idx], null]);
    return [{
      x: xCoords, y: yCoords, mode: "lines", type: "scatter",
      line: { color: '#000000', width: 0.3 },
      showlegend: false, hoverinfo: 'none',
    }];
  }, []);

  const singleTrace7 = useMemo((): Data[] => {
    const xCoords: (number | null)[] = [];
    const yCoords: (number | null)[] = [];
    for (let i = 0; i < 2000; i++) {
        const idx = i + 1;
        xCoords.push(Math.sin((10 * Math.PI * idx) / 2000), 0.5 * Math.sin((2 * Math.PI * idx) / 2000), null);
        yCoords.push(0.5 * Math.cos((2 * Math.PI * idx) / 2000), Math.cos((10 * Math.PI * idx) / 2000), null);
    }
    return [{
        x: xCoords, y: yCoords, mode: "lines", type: "scatter",
        line: { color: 'rgba(50, 50, 50, 0.7)', width: 0.4 },
        showlegend: false, hoverinfo: 'none',
    }];
  }, []);

  // [타입 수정] 'plots'의 타입 정의를 원래대로 'Data[]'로 복구
  const plots: Record<string, { data: Data[]; title: string }> = {
    "1": { data: singleTrace1, title: "1. Line Segment Pattern" },
    "2": { data: [{ x: xVals, y: fVals, type: "scatter", mode: "lines", line: { color: 'red' } }], title: `2. f(x), a=${a.toFixed(2)}` },
    "3": { data: [{ x: xRange, y: yRange, z: zGrid, type: "surface", colorscale: [[0, '#444444'], [1, '#C35858']] }], title: "3. Abstract 3D Surface" },
    "4": { data: [{ x: surfX, y: surfY, z: surfZ, type: "surface", colorscale: [[0, 'pink'], [1, 'red']] }], title: "4. 3D Parametric Surface (u, v)" },
    "5": { data: [{ x: xHeart, y: yHeart, mode: "lines", line: { color: 'red', width: 1 }, type: 'scatter' }], title: "5. Parametric Heart Curve" },
    "6": { data: singleTrace6, title: "6. Heart Shape from 601 Line Segments" },
    "7": { data: singleTrace7, title: "7. 2000 Line Segments Pattern" },
  };

  const selectedPlot = plots[index.toString()];

  const handlePrev = () => setIndex((prev) => (prev === 1 ? 7 : prev - 1));
  const handleNext = () => setIndex((prev) => (prev === 7 ? 1 : prev + 1));

  const plotLayout = useMemo<Partial<Layout>>(() => ({
    width: debouncedSize.width,
    height: debouncedSize.height,
    // [타입 수정 확인] title은 반드시 text 속성을 가진 객체여야 함
    title: { text: selectedPlot.title, font: { size: 18, color: "black" }, x: 0.5, xanchor: "center", yanchor: "top" },
    margin: index === 2 ? { t: 100, l: 40, r: 20, b: 40 } : { t: 80, l: 40, r: 20, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    xaxis: { title: { text: "X", font: { family: "Pretendard, sans-serif" } } },
    yaxis: { title: { text: "Y", font: { family: "Pretendard, sans-serif" } }, scaleanchor: "x", scaleratio: 1 },
    scene: {
        xaxis: { title: {text: "X"} },
        yaxis: { title: {text: "Y"} },
        zaxis: { title: {text: "Z"} },
    },
  }), [debouncedSize.width, debouncedSize.height, selectedPlot.title, index]);

  return (
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
        <div className="relative z-20 mt-16 md:mt-20 w-[90vw] max-w-[1501px] h-[75vh] md:h-[65vh] max-h-[700px] bg-white flex flex-col items-center justify-center">
          <div ref={ref} className="w-full flex-grow min-h-0">
            {debouncedSize.width > 0 && debouncedSize.height > 0 && (
              <Plot
                data={selectedPlot.data}
                layout={plotLayout}
                config={{ responsive: true }}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
          {index === 2 && (
            <div className="w-[80%] max-w-xl my-4 flex-shrink-0">
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