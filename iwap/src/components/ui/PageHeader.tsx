import CloseButton from './CloseButton';

type PageHeaderProps = {
  title: string;
  subtitle: string;
  onClose?: () => void;
  goBack?: boolean;
  // [추가] 외부에서 Tailwind CSS 패딩 클래스를 주입받기 위한 prop
  padding?: string;
};

export default function PageHeader({ 
  title, 
  subtitle, 
  onClose, 
  goBack, 
  // [수정] padding prop을 추가하고, 기본값을 설정합니다.
  padding='py-15 px-5 sm:px-10 lg:px-70' 
}: PageHeaderProps) {
  return (
    // [수정] 하드코딩된 패딩 값 대신 padding prop을 사용합니다.
    <header className={`absolute top-0 left-0 z-20 w-full flex justify-between items-end text-white ${padding}`}>
      
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