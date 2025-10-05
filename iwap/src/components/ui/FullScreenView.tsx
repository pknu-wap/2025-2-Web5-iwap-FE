// components/ui/FullScreenView.tsx
import type { ReactNode, CSSProperties } from 'react';
import PageHeader from './PageHeader';
import SideNavButton from './SideNavButton';

type FullScreenViewProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  onClose?: () => void;
  goBack?: boolean;
  padding?: string;
  onPrev?: () => void;
  onNext?: () => void;
  backgroundUrl?: string; // 배경 이미지 URL을 받을 prop 추가
  backgroundStyle?: CSSProperties;
  className?: string;
};

export default function FullScreenView({
  children,
  title,
  subtitle,
  onClose,
  goBack,
  padding,
  onPrev,
  onNext,
  backgroundUrl, // props에서 backgroundUrl 받기
  backgroundStyle,
  className = '',
}: FullScreenViewProps) {
  // backgroundUrl이 있으면 그라데이션과 함께 스타일 객체를 생성
  const dynamicBackgroundStyle: CSSProperties = backgroundUrl
    ? {
        backgroundImage: `
          linear-gradient(to bottom, rgba(13, 17, 19, 0), #0d1113),
          url('${backgroundUrl}')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {};

  // 생성된 스타일과 외부에서 받은 backgroundStyle prop을 병합
  // (backgroundStyle에 동일한 속성이 있으면 덮어쓰므로 커스텀 가능)
  const finalStyle = { ...dynamicBackgroundStyle, ...backgroundStyle };

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={finalStyle} // 최종 스타일 적용
    >
      <PageHeader
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        goBack={goBack}
        padding={padding}
      />
      <div className="relative w-full h-full z-10 flex items-center justify-center">
        {children}
      </div>
      {onPrev && <SideNavButton direction="left" onClick={onPrev} />}
      {onNext && <SideNavButton direction="right" onClick={onNext} />}
    </div>
  );
}