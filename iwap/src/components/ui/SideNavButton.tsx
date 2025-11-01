import Image from "next/image";
import type { CSSProperties, MouseEvent } from "react";

type SideNavButtonProps = {
  direction: "left" | "right";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 화면 좌/우에 위치하여 이전/다음 컨텐츠로 이동하는 반투명 원형 버튼.
 */
export default function SideNavButton({ direction, onClick }: SideNavButtonProps) {
  const buttonStyle: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0, 0, 0, 0.3)",
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(5px)",
    zIndex: 20,
    border: "1px solid rgba(255, 255, 255, 0.2)",
  };

  const positionStyle: CSSProperties =
    direction === "left" ? { left: "5%" } : { right: "5%" };

  const iconSrc =
    direction === "left" ? "/icons/left.svg" : "/icons/right.svg";

  return (
    <button
      style={{ ...buttonStyle, ...positionStyle }}
      onClick={onClick}
      title={direction === "left" ? "이전" : "다음"}
    >
      <Image
        src={iconSrc}
        alt={direction === "left" ? "Previous" : "Next"}
        width={20}
        height={20}
      />
    </button>
  );
}
