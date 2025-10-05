// components/ui/SideNavButton.tsx
import type { CSSProperties } from 'react';

type SideNavButtonProps = {
  direction: 'left' | 'right';
  onClick: () => void;
};

export default function SideNavButton({ direction, onClick }: SideNavButtonProps) {
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
    backdropFilter: 'blur(5px)',
    zIndex: 10,
    fontSize: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };

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