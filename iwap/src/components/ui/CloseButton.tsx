// components/ui/CloseButton.tsx
'use client'; // useRouter는 클라이언트 컴포넌트에서만 사용 가능합니다.

import Image from 'next/image';
import { useRouter } from 'next/navigation';

type CloseButtonProps = {
  /** 페이지 내부의 컴포넌트 닫기 등 특정 함수를 실행할 때 사용 */
  onClick?: () => void;
  /** true일 경우, 브라우저의 '뒤로 가기' 기능을 실행 */
  goBack?: boolean;
};

export default function CloseButton({ onClick, goBack = false }: CloseButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    // 1. onClick 함수가 있으면 최우선으로 실행합니다.
    if (onClick) {
      onClick();
    // 2. onClick이 없고 goBack이 true이면, 뒤로 가기 기능을 실행합니다.
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