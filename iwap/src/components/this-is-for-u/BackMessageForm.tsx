/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { GLASS_PANEL_STYLE, MESSAGE_MAX_LENGTH } from "./constants";
import type { TextAlign } from "./types";
import { UnderlinedInput } from "./UnderlinedInput";

const ALIGN_OPTIONS: { value: TextAlign; icon: string; label: string }[] = [
  { value: "left", icon: "/icons/Align_left.svg", label: "왼쪽 정렬" },
  { value: "center", icon: "/icons/Align_center.svg", label: "가운데 정렬" },
  { value: "right", icon: "/icons/Align_right.svg", label: "오른쪽 정렬" },
];

type BackMessageFormProps = {
  recipientName: string;
  onRecipientNameChange: (value: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  senderName: string;
  onSenderNameChange: (value: string) => void;
  textAlign: TextAlign;
  onTextAlignChange: (align: TextAlign) => void;
  /** 카드 하단 액션 버튼 */
  children?: ReactNode;
};

/** 엽서 뒷면: 받는 사람 / 메시지 / 보내는 사람 작성 카드 */
export function BackMessageForm({
  recipientName,
  onRecipientNameChange,
  message,
  onMessageChange,
  senderName,
  onSenderNameChange,
  textAlign,
  onTextAlignChange,
  children,
}: BackMessageFormProps) {
  return (
    <div className="absolute top-0 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 -translate-y-[300px] md:w-[400px] md:h-[750px] w-[80vw] flex justify-center z-40">
      <div
        className="text-slate-50 w-[420px] h-[450px] md:w-[400px] md:h-auto md:px-4 py-6 translate-y-[130px] flex flex-col items-center"
        style={GLASS_PANEL_STYLE}
      >
        <p className="w-[270px] md:w-[330px] text-left text-[18px] md:text-[20px] text-white font-normal mb-2">
          메세지를 작성하세요
        </p>

        {/* To */}
        <div className="flex items-center gap-2 text-sm text-white/70 mb-2 md:mb-5 md:translate-x-[-11px] px-4">
          <img src="/icons/To_white.svg" alt="To" className="w-[20px] h-[21px] md:w-[30px] md:h-[28px]" />
          <UnderlinedInput
            value={recipientName}
            onChange={(e) => onRecipientNameChange(e.target.value)}
            placeholder="받는 사람 이름"
            inputClassName="py-2 w-[260px]"
            underlineClassName="w-[220px] md:w-[290px] md:top-[34px] top-[33px]"
          />
        </div>

        {/* 정렬 버튼 + 본문 */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 bg-[#CECECE] px-2 h-[30px] w-[270px] md:w-[330px]">
            {ALIGN_OPTIONS.map(({ value, icon, label }) => (
              <button key={value} type="button" onClick={() => onTextAlignChange(value)} aria-label={label}>
                <img src={icon} alt="" className="w-[20px] h-[20px]" />
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              maxLength={MESSAGE_MAX_LENGTH}
              className="w-[270px] h-[200px] md:w-[330px] md:h-[240px] bg-white resize-none outline-none text-[18px] leading-tight text-black placeholder:text-slate-500 px-2 py-2"
              style={{ textAlign }}
            />
            <div className="absolute bottom-2 right-2 text-xs text-slate-400">
              {message.length}/{MESSAGE_MAX_LENGTH}
            </div>
          </div>
        </div>

        {/* From */}
        <div className="flex items-center gap-2 text-sm text-white/70 px-4 mt-4">
          <img src="/icons/From_white.svg" alt="From" className="md:w-[68px] md:h-[28px] w-[43px] h-[17px]" />
          <UnderlinedInput
            value={senderName}
            onChange={(e) => onSenderNameChange(e.target.value)}
            placeholder="보내는 사람 이름"
            inputClassName="w-[250px]"
            underlineClassName="w-[180px] md:w-[250px] md:top-[27px] top-[25px]"
          />
        </div>

        {children}
      </div>
    </div>
  );
}
