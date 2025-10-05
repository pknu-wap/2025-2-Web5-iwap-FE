declare module "react-plotly.js" {
  import * as React from "react";
  import { Config, Data, Frame, Layout } from "plotly.js";

  export interface PlotParams {
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    frames?: Partial<Frame>[];
    revision?: number;
    style?: React.CSSProperties;
    className?: string;
    onClick?: (event: Readonly<Plotly.PlotMouseEvent>) => void;
    onHover?: (event: Readonly<Plotly.PlotHoverEvent>) => void;
    onUnhover?: (event: Readonly<Plotly.PlotMouseEvent>) => void;
    onSelected?: (event: Readonly<Plotly.PlotSelectionEvent>) => void;
    onInitialized?: (figure: Readonly<PlotParams>, graphDiv: HTMLDivElement) => void;
    onUpdate?: (figure: Readonly<PlotParams>, graphDiv: HTMLDivElement) => void;
    useResizeHandler?: boolean;
    divId?: string;
  }

  const Plot: React.FC<PlotParams>;
  export default Plot;
}