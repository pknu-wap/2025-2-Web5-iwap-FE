"use client";
import { useRef, useEffect } from "react";

export default function WavingAnimation() {
  const width = 180;
  const height = 180;
  const colors = ["#E3E7FF", "#EFC8FF", "#FFAAE7", "#97E9FF"];
  const refs = Array.from({ length: 8 }, () => useRef<SVGPathElement>(null));
  const tRef = useRef(0);

  const baseWave = (offsetX: number, offsetY: number, t: number) => {
    const points = 100;
    let d = `M-1 ${height + 1}`;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const y =
        height / 2 +
        Math.sin((x / width) * 6 + t + offsetX) * 7 +
        Math.cos((x / width) * 2 + t * 0.8 + offsetX) * 7 +
        offsetY;
      d += ` L${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ` L${width + 1}, ${height + 1} Z`;
    return d;
  };

  useEffect(() => {
    let frame: number;
    const animate = () => {
      tRef.current += 0.03;
      const t = tRef.current;
      const shifts = [
        { x: 0.0, y: -5 },
        { x: 3.6, y: 10},
        { x: 8.7, y: 20 },
        { x: 11.5, y: 30},
      ];
      refs.forEach((r, i) => {
        if (r.current)
          r.current.setAttribute("d", baseWave(shifts[i].x, shifts[i].y, t));
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden"
      style={{
        fill: "var(--bg, linear-gradient(0deg, #B2B2B2 10.31%, #FFF 95%))",
        strokeWidth: "3px",
      }}
    >
      {/* 파도 애니메이션 */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute top-0 left-0 mix-blend-multiply"
      >
        {colors.map((c, i) => (
          <path key={i} ref={refs[i]} fill={c} opacity="0.4" />
        ))}
      </svg>

      {/* 중앙 마이크 아이콘 */}
      <div className="absolute flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="111"
          height="111"
          viewBox="0 0 111 111"
          fill="none"
        >
          <path
            d="M50.2002 88.1279L49.9922 88.0928C42.2902 86.7909 35.2975 82.8032 30.2559 76.8369C25.2143 70.8706 22.449 63.3111 22.4502 55.5C22.4502 54.0944 23.009 52.7468 24.0029 51.7529C24.9968 50.759 26.3444 50.2002 27.75 50.2002C29.1556 50.2002 30.5041 50.759 31.498 51.7529C32.4918 52.7468 33.0498 54.0946 33.0498 55.5C33.0498 61.4541 35.4158 67.1648 39.626 71.375C43.8361 75.585 49.5461 77.9501 55.5 77.9502C61.4541 77.9502 67.1648 75.5852 71.375 71.375C75.5852 67.1648 77.9502 61.4541 77.9502 55.5C77.9502 54.0944 78.509 52.7468 79.5029 51.7529C80.4968 50.759 81.8444 50.2002 83.25 50.2002C84.6556 50.2002 86.0041 50.759 86.998 51.7529C87.9918 52.7468 88.5498 54.0946 88.5498 55.5C88.551 63.3112 85.7858 70.8706 80.7441 76.8369C75.7025 82.8032 68.7107 86.7908 61.0088 88.0928L60.7998 88.1279V97.125C60.7998 98.5306 60.242 99.8791 59.248 100.873C58.2541 101.867 56.9056 102.425 55.5 102.425C54.0946 102.425 52.7468 101.867 51.7529 100.873C50.759 99.8791 50.2002 98.5306 50.2002 97.125V88.1279Z"
            fill="url(#paint0_linear_939_390)"
            fillOpacity="0.5"
            stroke="white"
            strokeWidth="0.5"
          />
          <path
            d="M55.501 11.3501C59.8503 11.3502 64.0212 13.0784 67.0967 16.1538C70.1723 19.2294 71.9004 23.4009 71.9004 27.7505V55.5005C71.9003 59.8499 70.1722 64.0207 67.0967 67.0962C64.0212 70.1717 59.8504 71.8998 55.501 71.8999C51.1514 71.8999 46.9799 70.1718 43.9043 67.0962C40.8289 64.0207 39.1007 59.8499 39.1006 55.5005V27.7505C39.1006 23.4009 40.8287 19.2294 43.9043 16.1538C46.9799 13.0782 51.1514 11.3501 55.501 11.3501Z"
            fill="url(#paint1_linear_939_390)"
            fillOpacity="0.5"
            stroke="white"
            strokeWidth="0.5"
          />
          <defs>
            <linearGradient
              id="paint0_linear_939_390"
              x1="55.5002"
              y1="49.9502"
              x2="55.5002"
              y2="102.675"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" stopOpacity="0.7" />
              <stop offset="1" stopColor="white" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_939_390"
              x1="55.5006"
              y1="11.1001"
              x2="55.5006"
              y2="72.1501"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
