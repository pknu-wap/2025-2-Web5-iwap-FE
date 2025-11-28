/* eslint-disable @next/next/no-img-element */
import React, { forwardRef } from "react";

export const BackPreview = forwardRef(
  (
    {
      backPreviewPng,
      messageText, // 본문
      recipientName,
      backgroundColor,
      textAlign,
      textColor,
      textAlpha,
      senderName, // Add senderName to props
    }: {
      backPreviewPng: string | null;
      messageText?: string; // 본문
      recipientName?: string;
      backgroundColor?: string;
      textAlign: "left" | "center" | "right";
      textColor: string;
      textAlpha: number;
      senderName?: string; // Add senderName to props type
    },
    ref: React.Ref<HTMLDivElement>
  ) => {
    const cardBackground = backgroundColor ?? "#000000";
    const useWhite = cardBackground === "#0F172A" || cardBackground === "#000000";

    return (
      <div
        ref={ref}
        className="w-full h-full relative flex flex-col gap-2 p-6"
        style={{ backgroundColor: cardBackground }}
      >
      <img
        src={useWhite ? "/icons/Postcard_white.svg" : "/icons/Postcard_black.svg"}
        alt="Postcard Background"
        className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 w-[80px]"
      />

<div className="flex items-start gap-2">
  <img
    src={useWhite ? "/icons/To_white.svg" : "/icons/To_black.svg"}
    alt="To"
    className="md:w-6 w-4 md:translate-y-2 translate-y-3 md:translate-x-0 -translate-x-2"
  />
  <div className={`${useWhite ? "text-white" : "text-black"} flex-1 text-left md:text-[15px] text-[13px] whitespace-pre-wrap md:translate-y-2.5 translate-y-2.5 md:translate-x-0 -translate-x-2`}>
    {recipientName || "받는 사람"}
  </div>
</div>

<div className="flex-1">
  {messageText ? (
    <p
  className="text-[12px] md:text-[16px] translate-y-1 md:translate-y-2 md:translate-x-8 translate-x-4"
  style={{
    color: textColor,
    opacity: textAlpha / 255,
    textAlign,
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
    wordBreak: "break-word",
  }}
>
  {messageText}
</p>
  ) : (
    <span className="text-white/70 md:text-sm text-[3px]">No back preview</span>
  )}
</div>


      <div className="absolute bottom-4 right-4 flex items-end justify-end gap-2 w-full max-w-[200px]">
        {/* <span className="text-white text-xs mr-auto">{new Date().toLocaleDateString()}</span> */}
        <img src="/icons/PostcardStamp.svg" alt="Stamp" className="md:w-10 w-7 md:translate-x-[80px] md:-translate-y-[170px] translate-x-[70px] -translate-y-[100px]" />
        <div className="flex items-center">
          <img
            src={useWhite ? "/icons/From_white.svg" : "/icons/From_black.svg"}
            alt="From"
            className="md:w-[50px] w-[40px] -translate-x-[40px]"
          />
          <span className={`${useWhite ? "text-white" : "text-black"} text-[13px] md:text-[15px] -translate-x-[20px]`}>{senderName || "보내는 사람"}</span>
        </div>
      </div>
    </div>
  );
});
