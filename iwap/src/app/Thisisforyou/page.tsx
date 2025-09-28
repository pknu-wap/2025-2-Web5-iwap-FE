"use client";

import { useState, useMemo } from "react";
import Plot from "react-plotly.js";

export default function FunctionsPage() {
  const [a, setA] = useState(1);

  // k 범위
  const kVals = useMemo(() => Array.from({ length: 2500 }, (_, i) => i + 1), []);

  // a(k), b(k), c(k), d(k)
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

  // l1, l2 (복소수 좌표)
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

  // l3 = |l1-l2| / 2
  const l3 = l1.map((p1, i) => {
    const p2 = l2[i];
    return (
      0.5 *
      Math.sqrt(Math.pow(p1.re - p2.re, 2) + Math.pow(p1.im - p2.im, 2))
    );
  });

  // l4 = ellipse 중심 + 반지름 근사 (marker size로 표현)
  const l4x = l1.map((p) => p.re);
  const l4y = l1.map((p) => p.im);
  const l4size = l3.map((r, i) => (dVals[i] !== 0 ? (r / dVals[i]) * 40 : 0));

  // 2번 함수
  const xVals = useMemo(
    () =>
      Array.from({ length: 200 }, (_, i) => -Math.sqrt(Math.PI) + (2 * Math.sqrt(Math.PI) * i) / 200),
    []
  );
  const fVals = xVals.map((x) => {
    const part1 = Math.pow(Math.abs(x), 2 / 3);
    const part2 = Math.sqrt(Math.max(0, Math.PI - x * x));
    return part1 + part2 * Math.sin(a * Math.PI * x);
  });

  // 3번 함수 surface
  const xRange = Array.from({ length: 50 }, (_, i) => -1 + (2 * i) / 49);
  const yRange = Array.from({ length: 60 }, (_, j) => -1 + (2.5 * j) / 59);
  const zGrid: number[][] = yRange.map((y) =>
    xRange.map((x) => {
      const inside = 1 - x * x - Math.pow(y - Math.abs(x), 2);
      if (inside < 0) return NaN;
      return 5 - Math.sqrt(inside) * Math.cos(30 * inside);
    })
  );

  return (
    <div className="p-6 flex flex-col gap-12">
      {/* 1번 */}
      <h2 className="text-xl font-bold">1. l4 = Seqüència(El·lipse(...))</h2>
      <Plot
        data={[
          {
            x: l4x,
            y: l4y,
            mode: "markers",
            type: "scatter",
            marker: { size: l4size, color: "blue", opacity: 0.5 },
            name: "l4 ellipses (approx)",
          },
        ]}
        layout={{
          width: 700,
          height: 700,
          title: "l4 ellipses (approx centers + radius)",
          xaxis: { title: "Re" },
          yaxis: { title: "Im" },
        }}
      />

      {/* 2번 */}
      <h2 className="text-xl font-bold">
        2. f(x) = x^(2/3) + sqrt(pi - x²)·sin(a·πx)
      </h2>
      <input
        type="range"
        min="-10"
        max="10"
        step="0.1"
        value={a}
        onChange={(e) => setA(parseFloat(e.target.value))}
        className="w-full"
      />
      <p>a = {a.toFixed(2)}</p>
      <Plot
        data={[{ x: xVals, y: fVals, type: "scatter", mode: "lines", name: "f(x)" }]}
        layout={{ width: 700, height: 700, title: "f(x)" }}
      />

      {/* 3번 */}
      <h2 className="text-xl font-bold">3. z(x,y)</h2>
      <Plot
        data={[
          {
            x: xRange,
            y: yRange,
            z: zGrid,
            type: "surface",
            colorscale: "Viridis",
          },
        ]}
        layout={{
          width: 700,
          height: 700,
          title: "3D Surface z(x,y)",
          scene: { zaxis: { range: [1, 6] } },
        }}
      />
    </div>
  );
}
