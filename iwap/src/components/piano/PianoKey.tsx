import { WHITE_W, WHITE_H, BLACK_W, BLACK_H } from "./PianoLayout";
import { shadowOffsets } from "./Shadowoffsets";

export default function PianoKey({
  midi,
  active,
  type,
}: {
  midi: number;
  active: boolean;
  type: "white" | "black";
}) {
  const isWhite = type === "white";
  const keyWidth = isWhite ? WHITE_W : BLACK_W;
  const keyHeight = isWhite ? WHITE_H : BLACK_H;

  const rippleCenter = {
    x: keyWidth / 2,
    y: keyHeight / 2,
  };

  const wrapStyle = {
    width: `${keyWidth}px`,
    height: `${keyHeight}px`,
    overflow: "visible",
  };

  return (
    <div
      aria-label={`m${midi}`}
      className={`relative group overflow-visible ${type === "black" ? "z-[30]" : "z-[10]"}`}
      style={wrapStyle}
    >
      {type === "white" ? (
        <>
          {/* 흰건반 */}
          <svg
            width={WHITE_W}
            height={WHITE_H}
            viewBox="0 0 85 186"
            fill="none"
            className="absolute bottom-0 left-0"
          >
            <g opacity="0.6" filter="url(#filter0_f_1207_690)">
              <circle
                cx="12.5"
                cy="12.5"
                r="12.5"
                transform="matrix(-1 0 0 1 55 61)"
                fill="url(#paint0_radial_1207_690)"
              />
            </g>
            <g filter="url(#filter1_dd_1207_690)">
              <rect
                x="30"
                y="11"
                width="25"
                height="125"
                fill={active ? "#B6C9E2" : "#FFFFFF"}
                style={{ transition: "fill 0.06s ease-out" }}
              />
            </g>
            <defs>
              <filter id="filter0_f_1207_690" x="22" y="53" width="41" height="41" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <feGaussianBlur stdDeviation="4" result="effect1_foregroundBlur_1207_690" />
              </filter>
              <filter id="filter1_dd_1207_690" x="0" y="0" width="85" height="186" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1207_690" />
                <feOffset />
                <feGaussianBlur stdDeviation="5" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1207_690" />
                <feOffset dy="20" />
                <feGaussianBlur stdDeviation="15" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
                <feBlend mode="normal" in2="effect1_dropShadow_1207_690" result="effect2_dropShadow_1207_690" />
                <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_1207_690" result="shape" />
              </filter>
              <radialGradient id="paint0_radial_1207_690" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12.5 12.5) rotate(90) scale(12.5)">
                <stop offset="0.65" stopColor="#B0CCF4" stopOpacity="0" />
                <stop offset="0.9" stopColor="#9D9DC5" />
                <stop offset="1" stopColor="#A46A91" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>

          {/* 좌우 가장자리 글로우 */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 top-0 h-full w-[6px]"
              style={{
                opacity: 1.0,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.20) 30%, #FFF 50%, rgba(255,255,255,0.20) 70%, rgba(255,255,255,0.00) 100%)",
                filter: "blur(20px)",
              }}
            />
            <div
              className="absolute right-0 top-0 h-full w-[6px]"
              style={{
                opacity: 1.0,
                background:
                  "linear-gradient(270deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.20) 30%, #FFF 50%, rgba(255,255,255,0.20) 70%, rgba(255,255,255,0.00) 100%)",
                filter: "blur(20px)",
              }}
            />
          </div>

          {/* 특정 건반 전용 세로 그라디언트 그림자 */}
          {shadowOffsets[midi] && (
            <div
              className="absolute pointer-events-none z-[20]"
              style={{
                left: `calc(50% + ${shadowOffsets[midi].x}px)`,
                bottom: 0,
                transform: `translate(-50%, ${shadowOffsets[midi].y}px)`,
                width: "25px",
                height: "284px",
                opacity: 0.2,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.00) 0%, #FFF 50.96%, rgba(255,255,255,0.00) 100%)",
              }}
            />
          )}

          {/* 활성화 방사형 파장 */}
          <div className="absolute inset-0 pointer-events-none overflow-visible z-[60]">
            <div
              className={`piano-key-ripple${active ? " is-active" : ""}`}
              style={{ left: rippleCenter.x, top: rippleCenter.y }}
            />
          </div>
        </>
      ) : (
        <>
          {/* 검은건반 */}
          <svg
            width={BLACK_W}
            height={BLACK_H}
            viewBox="0 0 35 87"
            fill="none"
            className={`absolute left-0 transition-transform duration-75 ease-out ${active ? "translate-y-[1px]" : ""}`}
          >
            <g filter="url(#filter0_d_1273_506)">
              <rect
                x="11"
                y="11"
                width="13"
                height="65"
                fill={active ? "#97AED9" : "#000000"}
                style={{ transition: "fill 0.06s ease-out" }}
              />
            </g>
            <defs>
              <filter id="filter0_d_1273_506" x="0" y="0" width="35" height="87" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1273_506" />
                <feOffset />
                <feGaussianBlur stdDeviation="5" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" />
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1273_506" />
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1273_506" result="shape" />
              </filter>
            </defs>
          </svg>

          {/* 검은건반 좌우 글로우 */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{
                opacity: 1.0,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.25) 30%, #FFF 50%, rgba(255,255,255,0.25) 70%, rgba(255,255,255,0.00) 100%)",
                filter: "blur(15px)",
              }}
            />
            <div
              className="absolute right-0 top-0 h-full w-[3px]"
              style={{
                opacity: 1.0,
                background:
                  "linear-gradient(270deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.25) 30%, #FFF 50%, rgba(255,255,255,0.25) 70%, rgba(255,255,255,0.00) 100%)",
                filter: "blur(15px)",
              }}
            />
          </div>

          {/* 활성화 방사형 파장 */}
          <div className="absolute inset-0 pointer-events-none overflow-visible z-[60]">
            <div
              className={`piano-key-ripple${active ? " is-active" : ""}`}
              style={{ left: rippleCenter.x, top: rippleCenter.y }}
            />
          </div>
        </>
      )}
    </div>
  );
}
