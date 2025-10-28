// components/slides/Card.tsx
import Image from "next/image";

type CardProps = {
  item: {
    src: string;
    text: string;
    description: string;
  };
  style: React.CSSProperties;
  onClick: () => void;
  onMouseDown: () => void;
  isActive: boolean;
};

export const Card = ({ item, style, onClick, onMouseDown, isActive }: CardProps) => {
  return (
    <div
      className="relative group flex-shrink-0 cursor-pointer"
      style={style}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg pointer-events-none">
        <Image
          src={item.src}
          alt={item.text}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          draggable="false"
        />
        <div
          className={`
            absolute inset-0 bg-black/40 flex flex-col items-center justify-center
            text-center p-4 transition-opacity duration-300
            ${isActive ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100
          `}
        >
          <h3 className="text-white text-3xl md:text-5xl font-bold font-Pretendard">{item.text}</h3>
          <p className="text-white text-sm md:text-base font-Pretendard mt-2">{item.description}</p>
        </div>
      </div>
    </div>
  );
};