import { useEffect, useState, type RefObject } from "react";
import { initFourierSketch, type FourierSketchController } from "./fourier-sketch";
import type { SketchStyles } from "./types";

/** 컨테이너에 p5 Fourier 스케치를 마운트하고, styles 변경을 컨트롤러에 동기화한다. */
export function useFourierSketch(
  containerRef: RefObject<HTMLDivElement | null>,
  styles: SketchStyles,
) {
  const [controller, setController] = useState<FourierSketchController | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sketch = initFourierSketch(container);
    setController(sketch);
    return () => {
      sketch.cleanup();
      setController(null);
    };
  }, [containerRef]);

  useEffect(() => {
    controller?.updateStyles(styles);
  }, [controller, styles]);

  return controller;
}
