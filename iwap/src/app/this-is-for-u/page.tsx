"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initFourierSketch, type FourierSketchController } from "./fourier-sketch";

type SketchStyles = {
  backgroundColor: string;
  epicycleColor: string;
  epicycleAlpha: number;
  pathColor: string;
  pathAlpha: number;
};

const DEFAULT_STYLES: SketchStyles = {
  backgroundColor: "#050712",
  epicycleColor: "#58a0ff",
  epicycleAlpha: 160,
  pathColor: "#ffc7f3",
  pathAlpha: 230,
};

export default function ThisIsForUPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [controller, setController] = useState<FourierSketchController | null>(null);
  const [styles, setStyles] = useState<SketchStyles>(DEFAULT_STYLES);
  const [activeSketchCount, setActiveSketchCount] = useState(0);
  const [isSketchReady, setIsSketchReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    setIsSketchReady(false);
    const sketchController = initFourierSketch(containerRef.current);
    setController(sketchController);
    setIsSketchReady(true);
    return () => {
      sketchController.cleanup();
      setController(null);
      setIsSketchReady(false);
      setActiveSketchCount(0);
    };
  }, []);

  useEffect(() => {
    if (!controller) return;
    controller.updateStyles(styles);
  }, [controller, styles]);

  const refreshActiveCount = useCallback(() => {
    if (!controller) {
      setActiveSketchCount(0);
      return;
    }
    setActiveSketchCount(controller.getFourierCoefficients().length);
  }, [controller]);

  const handleConfirmSketches = () => {
    controller?.confirmSketches();
    refreshActiveCount();
  };

  const handleClearSketches = () => {
    controller?.clearSketches();
    setActiveSketchCount(0);
  };

  const handleDownloadJson = () => {
    if (!controller) return;
    const data = controller.getFourierCoefficients();
    if (!data.length) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      sketches: data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fourier-sketches.json";
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  const styleActions = useMemo(
    () => [
      {
        label: "배경",
        form: (
          <input
            type="color"
            value={styles.backgroundColor}
            onChange={(event) =>
              setStyles((prev) => ({ ...prev, backgroundColor: event.target.value }))
            }
            className="h-10 w-10 rounded-xl border border-white/10 p-0"
            aria-label="배경색"
          />
        ),
      },
      {
        label: "에피사이클",
        form: (
          <div className="space-y-2">
            <input
              type="color"
              value={styles.epicycleColor}
              onChange={(event) =>
                setStyles((prev) => ({ ...prev, epicycleColor: event.target.value }))
              }
              className="h-10 w-10 rounded-xl border border-white/10 p-0"
              aria-label="에피사이클 색"
            />
            <input
              type="range"
              min={20}
              max={255}
              value={styles.epicycleAlpha}
              onChange={(event) =>
                setStyles((prev) => ({
                  ...prev,
                  epicycleAlpha: Number(event.target.value),
                }))
              }
              className="h-1 w-full accent-rose-400"
            />
          </div>
        ),
      },
      {
        label: "진행 경로",
        form: (
          <div className="space-y-2">
            <input
              type="color"
              value={styles.pathColor}
              onChange={(event) =>
                setStyles((prev) => ({ ...prev, pathColor: event.target.value }))
              }
              className="h-10 w-10 rounded-xl border border-white/10 p-0"
              aria-label="경로 색"
            />
            <input
              type="range"
              min={20}
              max={255}
              value={styles.pathAlpha}
              onChange={(event) =>
                setStyles((prev) => ({
                  ...prev,
                  pathAlpha: Number(event.target.value),
                }))
              }
              className="h-1 w-full accent-rose-400"
            />
          </div>
        ),
      },
    ],
    [styles],
  );

  const readyAction = Boolean(controller && isSketchReady);

  return (
    <main className="relative w-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 lg:flex-row lg:gap-8">
        <div className="flex-1 space-y-8">

          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.8)] backdrop-blur">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
              <div ref={containerRef} className="absolute inset-0" />
              {!readyAction && (
                <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.4em] text-slate-400">
                  초기화 중...
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400">
                활성 Fourier 스케치: {activeSketchCount}
              </span>
              <button
                type="button"
                onClick={handleConfirmSketches}
                disabled={!readyAction}
                className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-rose-500/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Fourier 연산 적용
              </button>
              <button
                type="button"
                onClick={handleClearSketches}
                disabled={!readyAction}
                className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                클리어
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={!readyAction || activeSketchCount === 0}
                className="rounded-full border border-rose-400/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                JSON 다운로드
              </button>
            </div>
            <p className="text-xs text-slate-400">
              * 드로잉을 마치고 마우스 버튼을 놓으면 선이 처리됩니다. 여러 스케치를 동시에
              만들 수도 있어요.
            </p>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.65)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-300">
                스타일
              </h2>
              <button
                type="button"
                onClick={() => setStyles({ ...DEFAULT_STYLES })}
                className="text-xs text-slate-400 transition hover:text-white"
              >
                기본으로
              </button>
            </div>
            <div className="space-y-5">
              {styleActions.map((item) => (
                <div key={item.label} className="space-y-2 rounded-2xl border border-white/10 bg-white/10 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {item.label}
                  </p>
                  {item.form}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
