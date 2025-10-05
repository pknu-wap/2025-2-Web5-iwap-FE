// /components/ui/CloseButton.tsx
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

type CloseButtonProps = {
  /** 버튼 클릭 시 실행할 커스텀 함수. (예: 모달 닫기) */
  onClick?: () => void;
  /** true일 경우, 브라우저의 '뒤로 가기' 기능을 실행. onClick이 우선됨. */
  goBack?: boolean;
};

/**
 * 닫기 기능을 수행하는 재사용 가능한 버튼 컴포넌트.
 * onClick prop이나 브라우저의 뒤로가기 기능을 선택적으로 수행함.
 */
export default function CloseButton({ onClick, goBack = false }: CloseButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // 1. onClick 함수가 있으면 최우선으로 실행.
    if (onClick) {
      onClick();
    // 2. onClick이 없고 goBack이 true이면, 뒤로 가기 기능을 실행.
    } else if (goBack) {
      router.back();
    }
  };

  return (
    <button onClick={handleClick} className="p-2" aria-label="Close">
      <Image src="/icons/close.svg" alt="close" width={24} height={24} />
    </button>
  );
}