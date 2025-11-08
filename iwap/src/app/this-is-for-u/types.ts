export type Tool = "brush" | "eraser" | "stroke-eraser";

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
