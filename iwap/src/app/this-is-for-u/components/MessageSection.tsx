"use client";

import { type ChangeEvent } from "react";

type MessageSectionProps = {
  message: string;
  messageLimit: number;
  onMessageChange: (value: string) => void;
  recipient: string;
  recipientLimit: number;
  onRecipientChange: (value: string) => void;
  signature: string;
  signatureLimit: number;
  onSignatureChange: (value: string) => void;
  backAlignment: "left" | "center" | "right";
  onBackAlignmentChange: (value: "left" | "center" | "right") => void;
  onDownloadBack: () => void;
  onDownloadPdf: () => void;
};

export function MessageSection({
  message,
  messageLimit,
  onMessageChange,
  recipient,
  recipientLimit,
  onRecipientChange,
  signature,
  signatureLimit,
  onSignatureChange,
  backAlignment,
  onBackAlignmentChange,
  onDownloadBack,
  onDownloadPdf,
}: MessageSectionProps) {
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">뒷면 메시지</h3>
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => onBackAlignmentChange("left")}
            className={`rounded-full px-3 py-1.5 transition ${
              backAlignment === "left"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500"
            }`}
          >
            왼쪽
          </button>
          <button
            type="button"
            onClick={() => onBackAlignmentChange("center")}
            className={`rounded-full px-3 py-1.5 transition ${
              backAlignment === "center"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500"
            }`}
          >
            가운데
          </button>
          <button
            type="button"
            onClick={() => onBackAlignmentChange("right")}
            className={`rounded-full px-3 py-1.5 transition ${
              backAlignment === "right"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500"
            }`}
          >
            오른쪽
          </button>
        </div>
      </header>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="space-y-2">
          <label
            htmlFor="message"
            className="flex items-center justify-between text-xs font-medium text-slate-500"
          >
            <span>메시지 작성</span>
            <span>
              {message.length}/{messageLimit}
            </span>
          </label>
          <textarea
            id="message"
            maxLength={messageLimit}
            value={message}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onMessageChange(event.target.value)
            }
            placeholder="사랑하는 누군가에게 전하고 싶은 말을 적어보세요."
            className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-inner outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="recipient"
            className="flex items-center justify-between text-xs font-medium text-slate-500"
          >
            <span>받는 사람</span>
            <span>
              {recipient.length}/{recipientLimit}
            </span>
          </label>
          <input
            id="recipient"
            maxLength={recipientLimit}
            value={recipient}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onRecipientChange(event.target.value)
            }
            placeholder="To. 소중한 사람"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="signature"
            className="flex items-center justify-between text-xs font-medium text-slate-500"
          >
            <span>서명 / 닉네임</span>
            <span>
              {signature.length}/{signatureLimit}
            </span>
          </label>
          <input
            id="signature"
            maxLength={signatureLimit}
            value={signature}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onSignatureChange(event.target.value)
            }
            placeholder="from. 당신의 이름"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownloadBack}
            className="rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-rose-500/90"
          >
            뒷면 PNG 저장
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            className="rounded-full border border-rose-200 px-4 py-2 text-xs font-medium text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
          >
            앞 · 뒷면 PDF 병합 다운로드
          </button>
        </div>
      </div>
    </section>
  );
}
