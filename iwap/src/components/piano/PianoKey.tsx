import { WHITE_W, WHITE_H } from "./PianoLayout";

export default function PianoKey({
  midi,
  active,
  type,
}: {
  midi: number;
  active: boolean;
  type: "white" | "black";
}) {
  // 래퍼: 모든 키 높이를 WHITE_H로 통일해 바닥선 정렬
  const wrapStyle =
    type === "white"
      ? { width: `${WHITE_W}px`, height: `${WHITE_H}px` }
      : { width: `${BLACK_W}px`, height: `${WHITE_H}px` };

  return (
    <div
      aria-label={`m${midi}`}
      className={`${type === "black" ? "relative pointer-events-none" : "relative"} group`}
      style={wrapStyle}
    >
      {type === "white" ? (
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
            <rect x="30" y="11" width="25" height="125" className={
                active
                  ? "fill-[#f2f2f2]" // active 상태 색상
                  : "fill-white group-hover:fill-[#B6C9E2]" // 기본: white, 호버: #B6C9E2
              } />
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
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha2" />
              <feOffset dy="20" />
              <feGaussianBlur stdDeviation="15" />
              <feComposite in2="hardAlpha2" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
              <feBlend mode="normal" in2="effect1_dropShadow_1207_690" result="effect2_dropShadow_1207_690" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_1207_690" result="shape" />
            </filter>
            <radialGradient id="paint0_radial_1207_690" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12.5 12.5) rotate(90) scale(12.5)">
              <stop offset="0.653846" stopColor="#B0CCF4" stopOpacity="0" />
              <stop offset="0.903846" stopColor="#9D9DC5" />
              <stop offset="1" stopColor="#A46A91" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      ) : (
        <svg
          width={BLACK_W}
          height={BLACK_H}
          viewBox="0 0 35 87"
          fill="none"
          className={`absolute bottom-0 left-0 ${active ? "translate-y-[1px]" : ""}`}
        >
          <g filter="url(#filter0_d_1273_506)">
            <rect x="11" y="11" width="13" height="65" className={
                active
                  ? "fill-black" // active 상태 색상
                  : "fill-white group-hover:fill-[#97AED9]" // 기본: white, 호버: #B6C9E2
              } />
          </g>
          <defs>
            <filter id="filter0_d_1273_506" x="0" y="0" width="35" height="87" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_1273_506" />
              <feOffset />
              <feGaussianBlur stdDeviation="5" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1273_506" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1273_506" result="shape" />
            </filter>
          </defs>
        </svg>
      )}
    </div>
  );
}
