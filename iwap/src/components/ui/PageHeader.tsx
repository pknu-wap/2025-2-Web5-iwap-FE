// /components/ui/PageHeader.tsx
import CloseButton from './CloseButton';

/** PageHeader 컴포넌트가 받는 프로퍼티(props) 타입을 정의함. */
type PageHeaderProps = {
  /** 헤더의 메인 제목 */
  title: string;
  /** 헤더의 부제 */
  subtitle: string;
  /** 닫기 버튼 클릭 시 실행될 커스텀 콜백 함수. */
  onClose?: () => void;
  /** 닫기 버튼이 브라우저의 '뒤로 가기' 기능으로 동작해야 하는지 여부. */
  goBack?: boolean;
  /**
   * 헤더 컴포넌트의 패딩을 커스터마이징하기 위한 Tailwind CSS 클래스 문자열.
   * 이 prop을 통해 다양한 레이아웃에 유연하게 대응할 수 있음.
   */
  padding?: string;
};

/**
 * 페이지 상단에 제목, 부제, 그리고 선택적으로 닫기 버튼을 표시하는 공통 헤더 컴포넌트.
 * 절대 위치(absolute)를 사용하여 페이지 콘텐츠 위에 오버레이 형태로 표시됨.
 * @param {PageHeaderProps} props - 컴포넌트의 프로퍼티
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  onClose, 
  goBack, 
  // padding prop이 외부에서 주입되지 않은 경우, 기본 패딩 값을 사용함.
  padding = 'py-15 px-5 sm:px-10 lg:px-70' 
}: PageHeaderProps) {
  return (
    // 최상위 <header> 요소. 외부에서 주입된 padding 클래스를 동적으로 적용.
    <header className={`absolute top-0 left-0 z-20 w-full flex justify-between items-end text-white ${padding}`}>
      
      {/* 제목과 부제를 묶는 영역 */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-x-3">
        <h1 className="text-5xl font-bold">
          {title}
        </h1>
        <p className="mt-1 sm:mt-0 text-sm font-light">
          {subtitle}
        </p>
      </div>

      {/* 
        goBack 또는 onClose prop 중 하나라도 true 값을 가지면 CloseButton 컴포넌트를 렌더링.
        단축 평가(short-circuit evaluation)를 이용한 조건부 렌더링.
      */}
      {(goBack || onClose) && (
        <div className="flex-shrink-0 pb-0">
          <CloseButton onClick={onClose} goBack={goBack} />
        </div>
      )}
    </header>
  );
}