// components/ui/LoadingIndicator.jsx
'use client';

/** 간단한 SVG 스피너 아이콘 */
const SpinnerIcon = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

/**
 * 로딩 중임을 나타내는 인디케이터 컴포넌트
 * @param {{ text: string, className?: string, textClassName?: string }} props - 표시할 텍스트 및 추가 클래스
 */
export default function LoadingIndicator({ text, className = "text-white", textClassName = "text-lg" }) {
  return (
    <div className={`flex flex-col items-center justify-center w-full h-full ${className}`}>
      <div className="flex items-center">
        <SpinnerIcon />
        <span className={textClassName}>{text}</span>
      </div>
    </div>
  );
}