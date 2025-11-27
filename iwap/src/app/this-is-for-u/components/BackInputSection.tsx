import React from "react";

type Props = {
  recipientName: string;
  senderName: string;
  textCanvasMessage: string;
  pendingCustomColor: string | null;
  textAlign: "left" | "center" | "right";
  isTextProcessing: boolean;
  setRecipientName: (v: string) => void;
  setSenderName: (v: string) => void;
  setTextCanvasMessage: (v: string) => void;
  setTextAlign: (v: "left" | "center" | "right") => void;
  handleEpicycleColorChange: (c: string) => void;
  handleTextToFourier: () => void;
  handleTextPlay: () => void;
  handleTextStop: () => void;
  COLOR_PALETTE: string[];
  onBackToFront?: () => void;
  onPreview?: () => void;
};

export function BackInputSection({
  recipientName,
  senderName,
  textCanvasMessage,
  textAlign,
  isTextProcessing,
  setRecipientName,
  setSenderName,
  setTextCanvasMessage,
  setTextAlign,
  handleEpicycleColorChange,
  handleTextToFourier,
  handleTextPlay,
  handleTextStop,
  COLOR_PALETTE,
  onBackToFront,
  onPreview,
}: Props) {
  return (
    <div
      className="absolute top-0 left-1/2 -translate-x-1/2 w-full flex justify-center z-40"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="text-slate-50 gap-3 pointer-events-auto"
        style={{
          width: "500px",
          height: "852px",
          background: "rgba(255, 255, 255, 0.40)",
          border: "1px solid #FFF",
          padding: "16px",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-white">
          <button
            type="button"
            onClick={handleTextPlay}
            className="rounded-full bg-rose-500 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:bg-rose-500/80"
          >
            변환 시작
          </button>
          <button
            type="button"
            onClick={handleTextStop}
            className="rounded-full border border-white/40 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:border-white/70"
          >
            변환 정지
          </button>
          <button
            type="button"
            onClick={onBackToFront}
            className="rounded-full border border-white/40 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:border-white/70"
          >
            앞면 전환
          </button>
          <button
            type="button"
            onClick={onPreview}
            className="rounded-full border border-white/40 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:border-white/70"
          >
            엽서 미리보기
          </button>
        </div>
        <p className="text-[20px] text-white font-normal mb-2">Write your message</p>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <img src="/icons/To_white.svg" alt="To" className="w-[38px] h-[34px]" />
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Recipient name"
            className="flex-1 px-3 py-2 text-[16px] font-normal outline-none bg-transparent border-0 text-white/70 placeholder:text-white/70"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="w-[400px] translate-x-[30px] translate-y-[50px]">
            <div className="flex items-center gap-2 mb-2 text-xs text-black">
              <span className="font-semibold">Fourier color</span>
              <div className="flex items-center gap-1">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={`epi-${color}`}
                    type="button"
                    onClick={() => handleEpicycleColorChange(color)}
                    className="h-6 w-6 rounded-full border border-black/20"
                    style={{ backgroundColor: color }}
                    aria-label={`Set Fourier ring color ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 h-[30px] bg-[#CECECE] px-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTextAlign("left")}
                  className="h-8 w-8 flex items-center justify-center bg-transparent border-0 p-0"
                >
                  <img src="/icons/Align_left.svg" alt="Align left" className="w-[20px] h-[20px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign("center")}
                  className="h-8 w-8 flex items-center justify-center bg-transparent border-0 p-0"
                >
                  <img src="/icons/Align_center.svg" alt="Align center" className="w-[20px] h-[20px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign("right")}
                  className="h-8 w-8 flex items-center justify-center bg-transparent border-0 p-0"
                >
                  <img src="/icons/Align_right.svg" alt="Align right" className="w/[20px] h/[20px]" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleTextToFourier}
                disabled={!textCanvasMessage.trim() || isTextProcessing}
                className="h-8 w-8 ml-auto flex items-center justify-center text-black transition hover:border-white disabled:opacity-40"
              >
                <img src="/icons/Check.svg" alt="Convert to Fourier" className="w-[20px] h-[20px]" />
              </button>
              {/* <button
                type="button"
                onClick={handleTextPlay}
                className="h-8 px-2 text-xs font-semibold bg-white/80 text-black rounded"
              >
                Start
              </button>
              <button
                type="button"
                onClick={handleTextStop}
                className="h-8 px-2 text-xs font-semibold bg-white/60 text-black rounded"
              >
                Stop
              </button> */}
            </div>
            <textarea
              value={textCanvasMessage}
              onChange={(e) => setTextCanvasMessage(e.target.value)}
              maxLength={10}
              className="w-[400px] h-[450px] bg-white resize-none outline-none text-[32px] leading-tight text-black placeholder:text-slate-500 p-3"
              style={{ textAlign }}
              placeholder="Write your message"
            />
          </div>
          <div className="flex items-center gap-2 text-sm mt-2 text-white/70 translate-y-[50px]">
            <img src="/icons/From_white.svg" alt="From" className="w-[72px] h/[30px]" />
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Sender name"
              autoComplete="off"
              className="flex-1 px-3 py-2 text-[16px] font-normal text-white/70 outline-none bg-transparent border-0 placeholder:text-white/70 focus:outline-none focus:ring-0 focus:bg-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
