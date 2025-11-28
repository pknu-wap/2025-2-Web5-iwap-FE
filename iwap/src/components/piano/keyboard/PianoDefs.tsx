"use client";

import { memo } from "react";

function PianoDefs() {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
      <defs>
        {/* --- 흰 건반용 필터 & 그라디언트 --- */}
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

        {/* --- 검은 건반용 필터 --- */}
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
  );
}

export default memo(PianoDefs);