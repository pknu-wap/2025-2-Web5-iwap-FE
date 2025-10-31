// /components/ui/PageHeader.tsx
import CloseButton from './CloseButton';

/** PageHeader 컴포넌트가 받는 프로퍼티(props) 타입을 정의함. */
type PageHeaderProps = {
  title: string;
  subtitle: string;
  onClose?: () => void;
  goBack?: boolean;
  padding?: string;
  /** [수정] 헤더의 position을 absolute로 할지 여부를 결정합니다. 기본값은 true입니다. */
  isAbsolute?: boolean;
};

/**
 * 페이지 상단에 제목, 부제, 그리고 선택적으로 닫기 버튼을 표시하는 공통 헤더 컴포넌트.
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  onClose, 
  goBack, 
  padding = 'py-5 px-5 sm:px-5 sm:py-5 md:py-15 lg:px-70',
  isAbsolute = true, // [수정] 기본값을 true로 설정하여 기존 페이지에 영향을 주지 않습니다.
}: PageHeaderProps) {
  
  // [수정] isAbsolute 값에 따라 동적으로 포지셔닝 클래스를 결정합니다.
  const positionClasses = isAbsolute 
    ? 'absolute top-0 left-0 z-20' 
    : 'relative flex-shrink-0';

  return (
    <header className={`${positionClasses} w-full flex justify-between items-end text-white ${padding}`}>
      
      {/* 제목과 부제를 묶는 영역 */}
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-x-3">
          {title && (
            <h1 className="text-5xl font-bold">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-1 sm:mt-0 text-sm font-light">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-x-3">
        <h1 className="text-5xl font-bold">
          {title}
        </h1>
        <p className="mt-1 sm:mt-0 text-sm font-light">
          {subtitle}
        </p>
      </div>

      {(goBack || onClose) && (
        <div className="flex-shrink-0 pb-0">
          <CloseButton onClick={onClose} goBack={goBack} />
        </div>
      )}
    </header>
  );
}
