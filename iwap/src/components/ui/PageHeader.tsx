// /components/ui/PageHeader.tsx
import CloseButton from "./CloseButton";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  onClose?: () => void;
  goBack?: boolean;
  padding?: string;
  /** position absolute 여부 (기본 true) */
  isAbsolute?: boolean;
  titleClassName?: string;
  subtitleClassName?: string;
  closeButtonClassName?: string;
  /** close 버튼을 텍스트 옆에 인라인으로 둘지 여부 */
  inlineClose?: boolean;
  className?: string;
  /** 다크 모드 또는 어두운 배경 여부 (true면 흰색 아이콘 사용) */
  darkBackground?: boolean;
};

export default function PageHeader({
  title,
  subtitle,
  onClose,
  goBack,
  padding = "py-5 px-5 sm:px-5 sm:py-5 md:py-15 lg:px-70",
  isAbsolute = true,
  titleClassName = "",
  subtitleClassName = "",
  closeButtonClassName = "",
  inlineClose = false,
  className = "",
  darkBackground = true,
}: PageHeaderProps) {
  const positionClasses = isAbsolute
    ? "absolute top-0 left-0 z-20"
    : "relative flex-shrink-0";

  return (
    <header
      className={`${positionClasses} w-full flex pointer-events-none ${
        inlineClose ? "flex-col items-start gap-1" : "justify-between items-end"
      } ${padding} ${className}`}
    >
      {(title || subtitle) && (
        <div
          className={
            inlineClose
              ? "pointer-events-auto flex flex-col items-start gap-1"
              : "pointer-events-auto flex flex-col sm:flex-row sm:items-baseline sm:gap-x-3"
          }
        >
          {title && (
            <div className="flex items-center gap-[50px]">
              <h1 className={`text-[30px] md:text-[42px] !font-semibold ${titleClassName}`}>
                {title}
              </h1>
              {inlineClose && (goBack || onClose) && (
                <div className={`pointer-events-auto flex-shrink-0 pb-0 ${closeButtonClassName}`}>
                  <CloseButton onClick={onClose} goBack={goBack} darkBackground={darkBackground} />
                </div>
              )}
            </div>
          )}
          {subtitle && (
            <p className={`sm:mt-0 text-[12px] md:text-[14px] !font-light ${subtitleClassName}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {!inlineClose && (goBack || onClose) && (
        <div className={`pointer-events-auto flex-shrink-0 pb-0 ${closeButtonClassName}`}>
          <CloseButton onClick={onClose} goBack={goBack} darkBackground={darkBackground} />
        </div>
      )}
    </header>
  );
}
