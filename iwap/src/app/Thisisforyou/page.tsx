"use client";

import { useState, useMemo } from "react";
import Plot from "react-plotly.js";

export default function FunctionsPage() {
  const [a, setA] = useState(1);
  const [randomIndex, setRandomIndex] = useState(
    Math.floor(Math.random() * 7) + 1
  );

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
  const cVals = kVals.map(
    (k) => 2 / 15 - (1 / 8) * Math.cos((Math.PI * k) / 625)
  );
  const dVals = kVals.map(
    (k) => 49 / 50 - (1 / 7) * Math.pow(Math.sin((4 * Math.PI * k) / 2500), 4)
  );

  // ---- 1번 ----
const l1 = kVals.map((k, i) => {
  const theta = (68 * Math.PI * k) / 2500;
  return {
    re: aVals[i] + cVals[i] * Math.cos(theta),
    im: bVals[i] + cVals[i] * Math.sin(theta),
  };
});
const l2 = kVals.map((k, i) => {
  const theta = (68 * Math.PI * k) / 2500;
  return {
    re: aVals[i] - cVals[i] * Math.cos(theta),
    im: bVals[i] - cVals[i] * Math.sin(theta),
  };
});


const n = kVals.length;
const lineSegments1 = [];
for (let i = 0; i < n - 1; i++) {
  // 1) l1[i] → l1[i+1]
  lineSegments1.push({
    x: [l1[i].re, l1[i + 1].re],
    y: [l1[i].im, l1[i + 1].im],
    mode: "lines",
    type: "scatter",
    line: {
      color: "rgba(0, 0, 0, 0.5)",
      width: 1,
    },
    showlegend: false,
  });
  // 2) l2[i] → l2[i+1]
  lineSegments1.push({
    x: [l2[i].re, l2[i + 1].re],
    y: [l2[i].im, l2[i + 1].im],
    mode: "lines",
    type: "scatter",
    line: {
      color: "rgba(0, 0, 0, 0.5)",
      width: 1,
    },
    showlegend: false,
  });
  // 3) cross 연결: l1[i] → l2[i]
  lineSegments1.push({
    x: [l1[i].re, l2[i].re],
    y: [l1[i].im, l2[i].im],
    mode: "lines",
    type: "scatter",
    line: {
      color: "rgba(0, 0, 0, 0.5)",
      width: 1,
    },
    showlegend: false,
  });
}



  // ---- 2번 ----
  const xVals = useMemo(
    () =>
      Array.from(
        { length: 200 },
        (_, i) => -Math.sqrt(Math.PI) + (2 * Math.sqrt(Math.PI) * i) / 200
      ),
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
  const zGrid: number[][] = yRange.map((y) =>
    xRange.map((x) => {
      const inside = 1 - x * x - Math.pow(y - Math.abs(x), 2);
      if (inside < 0) return NaN;
      return 5 - Math.sqrt(inside) * Math.cos(30 * inside);
    })
  );

  // ---- 4번 ----
  const uRange = Array.from({ length: 50 }, (_, i) => (2 * Math.PI * i) / 49);
  const vRange = Array.from({ length: 50 }, (_, j) => (Math.PI * j) / 49);
  const surfX: number[][] = vRange.map((v) =>
    uRange.map(
      (u) => Math.sin(v) * (15 * Math.sin(u) - 4 * Math.sin(3 * u))
    )
  );
  const surfY: number[][] = vRange.map((v) =>
    uRange.map(() => 8 * Math.cos(v))
  );
  const surfZ: number[][] = vRange.map((v) =>
    uRange.map(
      (u) =>
        Math.sin(v) *
        (15 * Math.cos(u) - 6 * Math.cos(2 * u) - 2 * Math.cos(3 * u))
    )
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
  const heartColors = tVals.map(
    (t) => `hsl(${(t / Math.PI) * 360}, 70%, 55%)`
  );

  // ---- 6번 ----
const nLines = 601;
const iVals = Array.from({ length: nLines }, (_, i) => i + 1);

const xStart = iVals.map((i) =>
  Math.sin((10 * Math.PI * (i + 699)) / 2000)
);
const yStart = iVals.map((i) =>
  Math.cos((8 * Math.PI * (i + 699)) / 2000)
);

const xEnd = iVals.map((i) =>
  Math.sin((12 * Math.PI * (i + 699)) / 2000)
);
const yEnd = iVals.map((i) =>
  Math.cos((10 * Math.PI * (i + 699)) / 2000)
);

const lineSegments = iVals.map((_, idx) => ({
  x: [xStart[idx], xEnd[idx]],
  y: [yStart[idx], yEnd[idx]],
  mode: "lines",
  type: "scatter",
  line: {
    color: `#000000`,
    width: 0.3,
  },
  showlegend: false,
}));

  // ---- 랜덤 선택 함수 ----
const plots: Record<
  string,
  { data: any[]; title: string }
> = {
  "1": {
    data: lineSegments1,
    title: "1. Line Segment Pattern",
  },
  "2": {
    data: [{ x: xVals, y: fVals, type: "scatter", mode: "lines" }],
    title: `2. f(x), a=${a.toFixed(2)}`,
  },
  "3": {
    data: [{ x: xRange, y: yRange, z: zGrid, type: "surface" }],
    title: "3. z(x, y)",
  },
  "4": {
    data: [
      {
        x: surfX,
        y: surfY,
        z: surfZ,
        type: "surface",
        colorscale: "Viridis",
      },
    ],
    title: "4. 3D Surface",
  },
  "5": {
    data: [
      {
        x: xHeart,
        y: yHeart,
        mode: "lines+markers",
        marker: { color: heartColors, size: 3 },
        line: { width: 1 },
      },
    ],
    title: "5. Parametric Heart Curve",
  },
"6": {
  data: lineSegments,
  title: "6. Line Segment Heart (601 segments)",
},

"7": {
  data: Array.from({ length: 2000 }, (_, i) => {
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
      line: {
        color: `hsl(${(idx / 2000) * 360}, 0%, 20%)`, // 진한 회색 톤
        width: 0.4,
      },
      showlegend: false,
    };
  }),
  title: "7. 2000 Line Segments Pattern",
},


};

// 접근 시 문자열 변환
const selectedPlot = plots[randomIndex.toString()];

  return (
    <div className="flex flex-col items-center p-6 gap-8">
      <h2 className="text-2xl font-bold mb-4">
         {randomIndex}번
      </h2>
      <Plot
        data={selectedPlot.data}
        layout={{
          width: 700,
          height: 700,
          title: selectedPlot.title,
          xaxis: { title: "X" },
          yaxis: { title: "Y" },
        }}
      />
      {randomIndex === 2 && (
        <div className="w-full mt-4">
          <input
            type="range"
            min="-10"
            max="10"
            step="0.1"
            value={a}
            onChange={(e) => setA(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      )}
      <button
        onClick={() => setRandomIndex(Math.floor(Math.random() * 7) + 1)}
        className="mt-6 px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        새로고침
      </button>
    </div>
  );
}
