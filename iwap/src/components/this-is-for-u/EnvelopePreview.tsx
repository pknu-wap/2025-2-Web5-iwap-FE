/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { GLASS_PANEL_STYLE } from "./constants";
import { isValidEmail } from "./postcardUtils";
import type { SendAnimStage } from "./types";
import { UnderlinedInput } from "./UnderlinedInput";

const ENVELOPE_OPEN = "/images/This-is-for-u/open.svg";
const ENVELOPE_CLOSED = "/images/This-is-for-u/close.svg";
const ENVELOPE_FLAP = "/images/This-is-for-u/open2.svg";

const CARD_FRAME =
  "border border-white/30 md:w-[400px] md:h-[250px] w-[270px] h-[168px] -translate-y-[175px] overflow-hidden bg-white transition-transform duration-[900ms] ease-out";

type EnvelopePreviewProps = {
  sendAnimStage: SendAnimStage;
  isMailSending: boolean;
  isSent: boolean;
  recipientEmail: string;
  onRecipientEmailChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  onGoToOtherProjects: () => void;
  /** 앞면 카드 (없으면 렌더링하지 않음) */
  frontCard: ReactNode;
  backCard: ReactNode;
  /** 뒷면 PNG 캡처가 끝나기 전에는 뒷면 카드를 숨긴다 */
  isBackCardReady: boolean;
};

/** 미리보기 단계: 메일 주소 입력 + 엽서가 봉투에 들어가는 전송 애니메이션 */
export function EnvelopePreview({
  sendAnimStage,
  isMailSending,
  isSent,
  recipientEmail,
  onRecipientEmailChange,
  onSend,
  onClose,
  onGoToOtherProjects,
  frontCard,
  backCard,
  isBackCardReady,
}: EnvelopePreviewProps) {
  const isIdle = sendAnimStage === "idle";
  const isInserting = sendAnimStage === "insert";
  const isClosed = sendAnimStage === "closed";
  const sendDisabled = isMailSending || !isValidEmail(recipientEmail);

  return (
    <div className="relative w-full md:scale-90 scale-80">
      {/* 봉투 몸통 (open → close) */}
      <img
        src={isClosed ? ENVELOPE_CLOSED : ENVELOPE_OPEN}
        alt="envelope-base"
        className={`absolute left-1/2 -translate-x-1/2 z-10 md:w-[600px] w-[360px] h-auto max-w-[600px] transition-all duration-700 ${
          isClosed ? "translate-y-[230px]" : "translate-y-[15px]"
        }`}
      />

      {/* 메일 주소 입력 패널 (전송 시작 시 fade-out) */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 md:-translate-y-[360px] -translate-y-[300px] w-[80vw] md:w-[500px] md:h-[820px] w-[320px] h-[600px] z-20 flex flex-col items-start gap-6 p-6 transition-all duration-[600ms] ease-out ${
          isIdle ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={GLASS_PANEL_STYLE}
      >
        <p className="text-white text-[18px] md:text-[20px] font-normal ml-2">메일 주소를 작성하세요</p>

        {/* 패널이 엽서 위를 덮고 있어 입력/버튼만 클릭을 받는다 */}
        <div className="flex items-center gap-2 text-sm text-white/70 ml-2 mt-[-10px] pointer-events-none">
          <img
            src="/icons/To_white.svg"
            alt="To"
            className="w-[20px] h-[21px] md:w-[30px] md:h-[28px] pointer-events-none"
          />
          <UnderlinedInput
            id="recipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(e) => onRecipientEmailChange(e.target.value)}
            placeholder="받는 사람 메일"
            wrapperClassName="pointer-events-auto"
            inputClassName="w-[220px] md:w-[290px]"
            underlineClassName="w-[230px] md:w-[380px] md:top-[34px] top-[22px]"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sendDisabled}
            aria-label="엽서 보내기"
            className="pointer-events-auto flex items-center justify-center w-[40px] h-[40px] md:w-[48px] md:h-[48px] bg-white/10 hover:bg-white/20 rounded-full transition md:translate-x-[40px] -translate-x-[0px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/icons/Send.svg" alt="" className="w-[30px] h-[30px] md:translate-x-0 -translate-x-[20px]" />
          </button>
        </div>
      </div>

      {/* 엽서 앞/뒷면 (봉투 안으로 들어가는 애니메이션) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 md:-translate-y-[40px] -translate-y-[20px] flex flex-col gap-6 items-center w-full transition-all duration-[900ms] ease-out z-30 ${
          isInserting ? "translate-y-[250px]" : ""
        } ${isClosed ? "translate-y-[300px]" : ""}`}
      >
        {frontCard && (
          <div
            className={`${CARD_FRAME} ${isInserting ? "md:translate-y-[260px] translate-y-[5px]" : ""} ${
              isClosed ? "md:translate-y-[220px] opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            {frontCard}
          </div>
        )}

        <div
          className={`${CARD_FRAME} ${isInserting ? "md:translate-y-[20px]" : ""} ${
            isClosed ? "md:translate-y-[80px] translate-y-[80px]" : ""
          } ${isClosed || !isBackCardReady ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          {backCard}
        </div>
      </div>

      {/* 봉투 덮개 + 상태 오버레이 */}
      <div className="relative w-full h-full">
        <img
          src={ENVELOPE_FLAP}
          alt="open2"
          className={`absolute translate-y-1/2 left-1/2 -translate-x-1/2 z-[90] h-auto md:w-[640px] w-[380px] max-w-[640px] transition-transform duration-[700ms] ease-in-out origin-top ${
            isClosed ? "opacity-0 pointer-events-none" : ""
          }`}
        />

        {isMailSending && isClosed && (
          <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur-sm">
            <p className="text-white text-[30px] font-light -translate-y-[30px]">메일 전송중...</p>
          </div>
        )}

        {isSent && isClosed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] bg-black/50 backdrop-blur-sm -translate-y-[30px]">
            <p className="text-white text-[30px] font-light mb-8">엽서 전송 완료!</p>
            <button
              type="button"
              onClick={onGoToOtherProjects}
              className="px-6 py-3 rounded-full border-white border-[1px] text-white text-lg font-light transition-colors"
            >
              다른 프로젝트로 이동하기
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className={`absolute z-[100] left-1/2 -translate-x-1/2 bottom-10 px-5 py-2 rounded-full bg-white/10 border border-black/90 text-black/90 text-sm hover:bg-white/20 transition translate-y-[400px] ${
            isIdle ? "" : "opacity-0 pointer-events-none"
          }`}
        >
          수정하러 가기
        </button>
      </div>
    </div>
  );
}
