"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CloseButtonProps = {
  /** 버튼 클릭 시 실행할 커스텀 함수. (예: 모달 닫기) */
  onClick?: () => void;
  /** true일 경우, '/slides' 페이지로 이동. onClick이 우선됨. */
  goBack?: boolean;
  /** 다크 모드 또는 어두운 배경 여부 (true면 흰색 아이콘 사용) */
  darkBackground?: boolean;
};

/**
 * 닫기 기능을 수행하는 재사용 가능한 버튼 컴포넌트.
 * onClick prop이나 '/slides' 페이지로 이동하는 기능을 선택적으로 수행함.
 */
export default function CloseButton({
  onClick,
  goBack = false,
  darkBackground = true, // 기본값: 어두운 배경(즉, 흰색 아이콘)
}: CloseButtonProps) {
  const router = useRouter();
  const [iconSrc, setIconSrc] = useState("/icons/close.svg");

  useEffect(() => {
    // 배경이 밝으면 검정색 아이콘으로 전환
    setIconSrc(darkBackground ? "/icons/close.svg" : "/icons/close_black.svg");
  }, [darkBackground]);

  const handleClick = () => {
    // 1. onClick 함수가 있으면 최우선으로 실행.
    if (onClick) {
      onClick();
    // 2. onClick이 없고 goBack이 true이면, '/slides' 페이지로 이동.
    } else if (goBack) {
      router.push('/Landing');
    }
  };

  return (
    <button onClick={handleClick} className="p-2" aria-label="Close">
      <Image src={iconSrc} alt="close" width={24} height={24} />
    </button>
  );
}
