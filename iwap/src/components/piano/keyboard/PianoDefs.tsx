"use client";

import { memo } from "react";

function PianoDefs() {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
      <defs>
        {/* --- 그라디언트 (유지) --- */}
        <radialGradient id="paint0_radial_1207_690" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12.5 12.5) rotate(90) scale(12.5)">
          <stop offset="0.65" stopColor="#B0CCF4" stopOpacity="0" />
          <stop offset="0.9" stopColor="#9D9DC5" />
          <stop offset="1" stopColor="#A46A91" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export default memo(PianoDefs);