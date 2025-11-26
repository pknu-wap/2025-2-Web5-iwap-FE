"use client"; // --- (1/4) 추가: 훅을 사용하기 위해 클라이언트 컴포넌트로 선언

import Image from "next/image";
// --- (2/4) 추가: useState와 useEffect를 import
import type { CSSProperties, MouseEvent } from "react";
import { useState, useEffect } from "react";

type SideNavButtonProps = {
  direction: "left" | "right";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 화면 좌/우에 위치하여 이전/다음 컨텐츠로 이동하는 아이콘 버튼.
 */
export default function SideNavButton({ direction, onClick }: SideNavButtonProps) {
  // --- (3/4) 추가: 모바일 여부를 저장할 state 생성
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 768px (Tailwind 'md')을 모바일/데스크톱 기준으로 삼습니다.
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 컴포넌트 마운트 시 한 번 실행
    checkIsMobile();

    // 창 크기 변경 시 이벤트 리스너 실행
    window.addEventListener("resize", checkIsMobile);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거 (메모리 누수 방지)
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []); // 빈 의존성 배열: 마운트/언마운트 시에만 한 번 실행

  // --- (4/4) 수정: isMobile 상태에 따라 스타일을 조건부로 적용
  const buttonStyle: CSSProperties = {
    position: "absolute",
    top: isMobile ? "50%" : "55%", // 모바일일 때 50%, 데스크톱일 때 55%
    transform: "translateY(-50%)",
    zIndex: 20,
    cursor: "pointer",
    background: "transparent", // 배경 투명
    border: "none", // 테두리 없음
  };
  
  const horizontalSpacing = isMobile ? "1%" : "2%";

  // 방향과 간격(horizontalSpacing)에 따라 위치를 지정합니다.
  const positionStyle: CSSProperties =
    direction === "left" ? { left: horizontalSpacing } : { right: horizontalSpacing };

  const iconSrc =
    direction === "left" ? "/icons/left_white.svg" : "/icons/right_white.svg";

  // isMobile 상태에 따라 아이콘 크기를 변수로 지정
  const iconSize = isMobile ? 30 : 45;

  return (
    <button
      style={{ ...buttonStyle, ...positionStyle }}
      onClick={onClick}
      title={direction === "left" ? "이전" : "다음"}
    >
      <Image
        src={iconSrc}
        alt={direction === "left" ? "Previous" : "Next"}
        width={iconSize} // 모바일일 때 30, 데스크톱일 때 45
        height={iconSize} // 모바일일 때 30, 데스크톱일 때 45
      />
    </button>
  );
}