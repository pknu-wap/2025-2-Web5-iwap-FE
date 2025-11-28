/* eslint-disable @next/next/no-img-element */
import React from "react";

export function BackPreview({
  backPreviewPng,
  messageText,      // 본문
  recipientName,
  backgroundColor,
  textAlign,
  textColor,
  textAlpha,
}: {
  backPreviewPng: string | null;
  messageText?: string,      // 본문
  recipientName?: string,
  backgroundColor?: string;
textAlign: "left" | "center" | "right";
textColor: string;
textAlpha: number;
}) {
  const cardBackground = backgroundColor ?? "#000000";
  const useWhite = cardBackground === "#0F172A" || cardBackground === "#000000";

  return (
    <div
      className="w-full h-full relative flex flex-col gap-2 p-6"
      style={{ backgroundColor: cardBackground }}
    >
      <img
        src={useWhite ? "/icons/Postcard_white.svg" : "/icons/Postcard_black.svg"}
        alt="Postcard Background"
        className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 w-[100px]"
      />

<div className="flex items-start gap-2">
  <img
    src={useWhite ? "/icons/To_white.svg" : "/icons/To_black.svg"}
    alt="To"
    className="w-7"
  />
  <div className="text-white flex-1 text-left text-sm whitespace-pre-wrap">
    {recipientName || "받는 사람"}
  </div>
</div>

<div className="flex-1 ">
  {messageText ? (
    <p
      style={{
        color: textColor,
        opacity: textAlpha / 255,
        textAlign: textAlign,
        whiteSpace: "pre-wrap",
        lineHeight: "1.6",
        wordBreak: "break-word",
      }}
    >
      {messageText}
    </p>
  ) : (
    <span className="text-white/70 text-sm">No back preview</span>
  )}
</div>


      <div className="absolute bottom-4 right-4 flex items-end justify-end gap-2 w-full max-w-[200px]">
        <span className="text-white text-xs mr-auto">{new Date().toLocaleDateString()}</span>
        <img src="/icons/PostcardStamp.svg" alt="Stamp" className="w-10" />
        <img
          src={useWhite ? "/icons/From_white.svg" : "/icons/From_black.svg"}
          alt="From"
          className="w-[69px]"
        />
      </div>
    </div>
  );
}
