declare module "react-plotly.js" {
  import * as React from "react";
  import { Layout, Config, Data } from "plotly.js";

  export interface PlotParams {
    data: Data[];
    layout?: any;
    config?: Partial<Config>;
    frames?: any;
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
