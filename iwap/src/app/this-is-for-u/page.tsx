"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useResizeDetector } from "react-resize-detector";
import { useSearchParams } from "next/navigation";
import FullScreenView from "@/components/ui/FullScreenView";

type ActionStatus =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

const HEART_COLOR_STOPS = [
  ["#fb6f92", 0],
  ["#ff8ba7", 0.5],
  ["#ffb3c6", 1],
] as const;

const BACKGROUND_GRADIENT = [
  "rgba(16, 8, 24, 0.9)",
  "rgba(45, 13, 47, 0.95)",
  "rgba(94, 24, 68, 1)",
];

export default function FunctionsPage() {
  const searchParams = useSearchParams();
  const initialRecipient = useMemo(
    () => searchParams.get("name") ?? "",
    [searchParams]
  );
  const initialMessage = useMemo(
    () => searchParams.get("message") ?? "",
    [searchParams]
  );

  const [recipient, setRecipient] = useState(initialRecipient);
  const [customMessage, setCustomMessage] = useState(initialMessage);
  const [actionStatus, setActionStatus] = useState<ActionStatus>(null);
  const { width, height, ref } = useResizeDetector();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setRecipient(initialRecipient);
  }, [initialRecipient]);

  useEffect(() => {
    setCustomMessage(initialMessage);
  }, [initialMessage]);

  const displayName = recipient.trim() || "you";
  const finalMessage =
    customMessage.trim() || `This heart is generated for ${displayName}.`;

  const fileSafeName = useMemo(
    () => displayName.replace(/[^\w-]+/g, "-").toLowerCase(),
    [displayName]
  );

  const drawHeart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (typeof context.resetTransform === "function") {
      context.resetTransform();
    } else {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
    context.scale(dpr, dpr);

    context.clearRect(0, 0, width, height);

    const backgroundGradient = context.createLinearGradient(
      0,
      0,
      0,
      height
    );
    BACKGROUND_GRADIENT.forEach((color, index) => {
      backgroundGradient.addColorStop(
        index / (BACKGROUND_GRADIENT.length - 1),
        color
      );
    });
    context.fillStyle = backgroundGradient;
    context.fillRect(0, 0, width, height);

    context.save();
    const scale = Math.min(width, height) / 32;
    context.translate(width / 2, height * 0.42);

    context.beginPath();
    const steps = 720;
    for (let i = 0; i <= steps; i++) {
      const t = (Math.PI * 2 * i) / steps;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y =
        -(
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)
        );
      const px = x * scale;
      const py = y * scale;
      if (i === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    }

    const heartGradient = context.createLinearGradient(
      -16 * scale,
      -18 * scale,
      16 * scale,
      18 * scale
    );
    HEART_COLOR_STOPS.forEach(([color, stop]) => {
      heartGradient.addColorStop(stop, color);
    });
    context.fillStyle = heartGradient;
    context.fill();

    context.lineWidth = Math.max(2, scale * 0.8);
    context.strokeStyle = "rgba(255, 255, 255, 0.65)";
    context.stroke();

    context.globalCompositeOperation = "lighter";
    const glowGradient = context.createRadialGradient(
      -6 * scale,
      -6 * scale,
      scale,
      0,
      0,
      24 * scale
    );
    glowGradient.addColorStop(0, "rgba(255,255,255,0.7)");
    glowGradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = glowGradient;
    context.fill();
    context.globalCompositeOperation = "source-over";
    context.restore();

    const drawWrappedText = (
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number,
      font: string
    ) => {
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }

      lines.forEach((line, idx) => {
        ctx.fillText(line, x, y + idx * lineHeight);
      });
    };

    context.fillStyle = "rgba(255,255,255,0.92)";
    drawWrappedText(
      context,
      `for ${displayName}`,
      width / 2,
      height * 0.72,
      width * 0.6,
      Math.max(28, width / 24),
      `600 ${Math.max(28, width / 18)}px "Pretendard", "Inter", sans-serif`
    );

    context.fillStyle = "rgba(245,238,250,0.9)";
    drawWrappedText(
      context,
      finalMessage,
      width / 2,
      height * 0.82,
      width * 0.7,
      Math.max(22, width / 26),
      `400 ${Math.max(18, width / 28)}px "Pretendard", "Inter", sans-serif`
    );
  }, [width, height, displayName, finalMessage]);

  useEffect(() => {
    drawHeart();
  }, [drawHeart]);

  useEffect(() => {
    if (!actionStatus) {
      return;
    }
    const id = window.setTimeout(() => setActionStatus(null), 2500);
    return () => window.clearTimeout(id);
  }, [actionStatus]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `heart-for-${fileSafeName || "you"}.png`;
    link.click();
    setActionStatus({
      type: "success",
      message: "PNG 이미지로 저장했어요.",
    });
  }, [fileSafeName]);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("name", recipient.trim());
    if (customMessage.trim()) {
      shareUrl.searchParams.set("message", customMessage.trim());
    } else {
      shareUrl.searchParams.delete("message");
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Th!s !s for u",
          text: finalMessage,
          url: shareUrl.toString(),
        });
        setActionStatus({
          type: "success",
          message: "공유 창을 열었어요!",
        });
        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl.toString());
        setActionStatus({
          type: "success",
          message: "공유 링크를 클립보드에 복사했어요.",
        });
        return;
      }

      setActionStatus({
        type: "error",
        message: "이 브라우저에서는 공유가 제한돼요. 다른 브라우저를 사용해 주세요.",
      });
    } catch (error) {
      setActionStatus({
        type: "error",
        message: "공유에 실패했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  }, [recipient, customMessage, finalMessage]);

  return (
    <div className="relative h-dvh w-full overflow-hidden md:h-[calc(100dvh-60px)]">
      <FullScreenView
        title="Th!s !s for u"
        subtitle="감정으로 이어지는 맞춤형 하트 생성기"
        goBack
        backgroundUrl="/images/this-is-for-u_background.jpg"
        titleClassName="md:translate-y-0 md:translate-x-0 translate-x-[10px] translate-y-[60px] font-semibold"
        subtitleClassName="md:translate-y-0 md:translate-x-0 translate-x-[12px] translate-y-[60px] font-light"
        closeButtonClassName="md:translate-y-0 translate-y-[60px]"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/90" />
        <div className="relative z-20 mx-auto flex w-[90vw] max-w-5xl flex-col items-center gap-8 py-10 md:py-14">
          <div
            ref={ref}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-[32px] border border-white/10 shadow-[0_60px_160px_rgba(251,111,146,0.45)] backdrop-blur-md"
          >
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              aria-label={`Personalised heart for ${displayName}`}
            />
            <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/20" />
          </div>

          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/85 p-6 shadow-xl backdrop-blur">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="recipient"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500"
                >
                  To
                </label>
                <input
                  id="recipient"
                  type="text"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="누구에게 보내고 싶나요?"
                  className="rounded-xl border border-rose-200 bg-white/80 px-4 py-3 text-base text-rose-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                />
                <p className="text-xs text-rose-400">
                  이름이나 닉네임을 입력하면 메시지가 맞춤형으로 바뀝니다.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="message"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  rows={3}
                  value={customMessage}
                  onChange={(event) => setCustomMessage(event.target.value)}
                  placeholder="감정을 담은 메시지를 적어보세요."
                  className="resize-none rounded-xl border border-rose-200 bg-white/80 px-4 py-3 text-base text-rose-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                />
                <p className="text-xs text-rose-400">
                  비워두면 "This heart is generated for {displayName}."로 표시돼요.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center rounded-xl bg-rose-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-2 focus:ring-offset-rose-100"
              >
                Download Heart
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center rounded-xl border border-rose-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-rose-500 transition hover:border-rose-500 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-2 focus:ring-offset-rose-100"
              >
                Share Link
              </button>
            </div>

            {actionStatus ? (
              <p
                className={`mt-4 text-sm ${
                  actionStatus.type === "success"
                    ? "text-rose-500"
                    : "text-rose-600"
                }`}
              >
                {actionStatus.message}
              </p>
            ) : (
              <p className="mt-4 text-sm text-rose-400">
                하트를 저장하거나 공유해서 감정을 전해주세요.
              </p>
            )}
          </div>
        </div>
      </FullScreenView>
    </div>
  );
}
