export type Tool = "brush" | "eraser" | "stroke-eraser";

export type StrokeMode = "draw" | "erase";

export type PostcardTemplate = {
  id: string;
  name: string;
  description: string;
  frontColor: string;
  backColor: string;
  textColor: string;
  lineColor: string;
  accentColor: string;
  stampColor: string;
};

export type FontOption = {
  id: string;
  label: string;
  css: string;
};

export type StrokePoint = {
  x: number;
  y: number;
};

export type Stroke = {
  id: number;
  mode: StrokeMode;
  color: string;
  sizeRatio: number;
  points: StrokePoint[];
};

export type FourierCoefficient = {
  amp: number;
  freq: number;
  phase: number;
};

export type FourierMetadata = {
  version: number;
  templateId: string;
  templateName: string;
  background: string;
  drawingFourier: FourierCoefficient[];
  textFourier: FourierCoefficient[][];
  createdAt: string;
  recipient?: string;
  signature?: string;
  messagePreview?: string;
};
