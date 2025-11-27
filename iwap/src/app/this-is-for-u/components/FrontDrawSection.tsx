import React from "react";

type Props = {
  isBackside: boolean;
  isPreview: boolean;
  styles: {
    backgroundColor: string;
  };
  frontContainerRef: React.RefObject<HTMLDivElement | null>;
  backContainerRef: React.RefObject<HTMLDivElement | null>;
  recipientName: string;
  senderName: string;
  postcardDate: string;
  isDarkBg: boolean;
};

export function FrontDrawSection({
  isBackside,
  isPreview,
  styles,
  frontContainerRef,
  backContainerRef,
  recipientName,
  senderName,
  postcardDate,
  isDarkBg,
}: Props) {
  return (
<div className={isBackside ? "hidden" : "relative w-[130px] h-[300px] md:w-[600px] md:h-[375px]"}>
      <div
        ref={frontContainerRef}
        className={isPreview || isBackside ? "hidden" : "absolute inset-0"}
        style={{ backgroundColor: styles.backgroundColor }}
      />
      <div
        ref={backContainerRef}
        className={isPreview ? "absolute inset-0" : "hidden"}
        style={{ backgroundColor: styles.backgroundColor }}
      />
      {isPreview && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-2 left-2 right-2 flex justify-center">
            <img
              src={
                styles.backgroundColor === "#0F172A" || styles.backgroundColor === "#000000"
                  ? "/icons/Postcard_white.svg"
                  : "/icons/Postcard_black.svg"
              }
              alt="Postcard"
              className="w-[129px] h-[28px] "
            />
          </div>
          <div
            className={`absolute top-4 left-4 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] ${
              isDarkBg ? "text-white/90" : "text-slate-900"
            }`}
          >
            <img
              src={
                styles.backgroundColor === "#0F172A" || styles.backgroundColor === "#000000"
                  ? "/icons/To_white.svg"
                  : "/icons/To_black.svg"
              }
              alt="To"
              className="w-[38px] h-[34px]"
            />
            <span>{recipientName ? `${recipientName}` : "______"}</span>
          </div>
          <div
            className={`absolute bottom-4 right-4 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-right ${
              isDarkBg ? "text-white/90" : "text-slate-900"
            }`}
          >
            <img
              src={
                styles.backgroundColor === "#0F172A" || styles.backgroundColor === "#000000"
                  ? "/icons/From_white.svg"
                  : "/icons/From_black.svg"
              }
              alt="From"
              className="w-[72px] h-[30px]"
            />
            <span>{senderName ? `${senderName}` : "______"}</span>
          </div>
          <div className="absolute top-4 right-4 text-[11px] uppercase tracking-[0.12em] text-white/80">
            {postcardDate}
          </div>
        </div>
      )}
    </div>
  );
}

