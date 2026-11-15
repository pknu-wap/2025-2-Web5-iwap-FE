import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ERASER_TOKEN } from "@/components/graffiti/GraffitiToolbar";
import { DEFAULT_STYLES } from "./constants";
import type { SketchStyles } from "./types";

const isSameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * 툴바의 브러시 색/굵기/커스텀 색상 상태를 관리하고 스케치 styles에 반영한다.
 * 반환값은 GraffitiToolbar props 이름과 맞춰져 있어 그대로 펼쳐 넘길 수 있다.
 */
export function usePostcardBrush(
  setStyles: Dispatch<SetStateAction<SketchStyles>>,
  backgroundColor: string,
) {
  const [brushColor, setBrushColor] = useState(DEFAULT_STYLES.pathColor);
  const [brushSize, setBrushSize] = useState(DEFAULT_STYLES.pathWidth);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [pendingCustomColor, setPendingCustomColor] = useState<string | null>(null);

  const onBrushColorChange = useCallback(
    (color: string) => {
      const isEraser = color === ERASER_TOKEN;
      setBrushColor(color);
      setStyles((prev) => {
        const paintColor = isEraser ? prev.backgroundColor : color;
        return { ...prev, pathColor: paintColor, epicycleColor: paintColor };
      });
    },
    [setStyles],
  );

  const onSizeChange = useCallback(
    (size: number) => {
      setBrushSize(size);
      setStyles((prev) => ({ ...prev, pathWidth: size }));
    },
    [setStyles],
  );

  const onConfirmCustomColor = useCallback(() => {
    if (!pendingCustomColor) return;
    setCustomColors((prev) =>
      prev.some((c) => isSameColor(c, pendingCustomColor)) ? prev : [...prev, pendingCustomColor],
    );
    setBrushColor(pendingCustomColor);
    setStyles((prev) => ({ ...prev, pathColor: pendingCustomColor }));
    setPendingCustomColor(null);
  }, [pendingCustomColor, setStyles]);

  const onRemoveCustomColor = useCallback(
    (color: string) => {
      setCustomColors((prev) => prev.filter((c) => !isSameColor(c, color)));
      if (isSameColor(brushColor, color)) {
        onBrushColorChange(DEFAULT_STYLES.pathColor);
      }
    },
    [brushColor, onBrushColorChange],
  );

  // 지우개 사용 중 배경색이 바뀌면 지우개 색도 새 배경색을 따라간다
  useEffect(() => {
    if (brushColor !== ERASER_TOKEN) return;
    setStyles((prev) => {
      if (prev.pathColor === prev.backgroundColor && prev.epicycleColor === prev.backgroundColor) {
        return prev;
      }
      return { ...prev, pathColor: prev.backgroundColor, epicycleColor: prev.backgroundColor };
    });
  }, [brushColor, backgroundColor, setStyles]);

  return useMemo(
    () => ({
      brushColor,
      brushSize,
      customPatterns: customColors,
      pendingCustomColor,
      onBrushColorChange,
      onSizeChange,
      onCustomColorPick: setPendingCustomColor,
      onConfirmCustomColor,
      onRemoveCustomColor,
    }),
    [
      brushColor,
      brushSize,
      customColors,
      pendingCustomColor,
      onBrushColorChange,
      onSizeChange,
      onConfirmCustomColor,
      onRemoveCustomColor,
    ],
  );
}
