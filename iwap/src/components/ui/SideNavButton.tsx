// /components/ui/SideNavButton.tsx
import type { CSSProperties, MouseEvent } from 'react';

type SideNavButtonProps = {
  direction: 'left' | 'right';
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 화면 좌/우에 위치하여 이전/다음 컨텐츠로 이동하는 반투명 원형 버튼.
 */
export default function SideNavButton({ direction, onClick }: SideNavButtonProps) {
  // 공통 버튼 스타일 정의
  const buttonStyle: CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(5px)', // 뒷배경 블러 효과
    zIndex: 20, // PageHeader보다 위에 위치하도록 z-index 조정
    fontSize: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };

  // direction prop에 따라 left 또는 right 위치를 결정.
  const positionStyle: CSSProperties =
    direction === 'left' ? { left: '5%' } : { right: '5%' };

  return (
    <button
      style={{ ...buttonStyle, ...positionStyle }}
      onClick={onClick}
      title={direction === 'left' ? '이전' : '다음'}
    >
      {direction === 'left' ? '«' : '»'}
    </button>
  );
}