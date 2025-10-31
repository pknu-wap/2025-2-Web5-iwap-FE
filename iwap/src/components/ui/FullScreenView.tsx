// /components/ui/FullScreenView.tsx
import type { ReactNode, CSSProperties } from 'react';
import PageHeader from './PageHeader';
import SideNavButton from './SideNavButton';

type FullScreenViewProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  /** 닫기 버튼 클릭 시 실행될 함수. */
  onClose?: () => void;
  /** 닫기 버튼이 뒤로가기 기능으로 동작할지 여부. */
  goBack?: boolean;
  /** 헤더 컴포넌트에 전달할 Tailwind 패딩 클래스. */
  padding?: string;
  /** 이전 버튼 클릭 시 실행될 함수. 있으면 버튼이 표시됨. */
  onPrev?: () => void;
  /** 다음 버튼 클릭 시 실행될 함수. 있으면 버튼이 표시됨. */
  onNext?: () => void;
  /** 배경 이미지 URL. 그라데이션과 함께 적용됨. */
  backgroundUrl?: string; 
  /** 추가적인 커스텀 배경 스타일. backgroundUrl 스타일을 덮어쓸 수 있음. */
  backgroundStyle?: CSSProperties;
  /** 최상위 div에 적용할 추가적인 Tailwind 클래스. */
  className?: string;
};

/**
 * 페이지 헤더, 중앙 컨텐츠, 좌우 네비게이션을 포함하는 전체 화면 레이아웃 컴포넌트.
 * 배경 이미지 및 스타일을 동적으로 설정할 수 있음.
 */
export default function FullScreenView({
  children, title, subtitle, onClose, goBack, padding,
  onPrev, onNext, backgroundUrl, backgroundStyle, className = '',
}: FullScreenViewProps) {
  
  // backgroundUrl prop이 있으면 그라데이션과 이미지 배경 스타일을 동적으로 생성.
  const dynamicBackgroundStyle: CSSProperties = backgroundUrl
    ? {
        backgroundImage: `
          url('${backgroundUrl}')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {};

  // 동적으로 생성된 스타일과 외부에서 주입된 커스텀 스타일을 병합.
  const finalStyle = { ...dynamicBackgroundStyle, ...backgroundStyle };

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={finalStyle}
    >
      <PageHeader
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        goBack={goBack}
        padding={padding}
      />
      
      {/* 컨텐츠 영역 */}
      <div className="relative w-full h-full z-10 flex items-center justify-center">
        {children}
      </div>

      {/* onPrev/onNext prop이 있을 때만 좌/우 네비게이션 버튼을 렌더링. */}
      {onPrev && <SideNavButton direction="left" onClick={onPrev} />}
      {onNext && <SideNavButton direction="right" onClick={onNext} />}
    </div>
  );
}