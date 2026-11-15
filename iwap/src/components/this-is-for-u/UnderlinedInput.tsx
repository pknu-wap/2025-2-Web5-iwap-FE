import type { InputHTMLAttributes } from "react";

type UnderlinedInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  /** 입력창 크기/여백 등 개별 클래스 */
  inputClassName?: string;
  /** 밑줄 너비/위치 클래스 */
  underlineClassName: string;
  wrapperClassName?: string;
};

/** 투명 배경 + 흰 밑줄 입력창 (To / From / 이메일) */
export function UnderlinedInput({
  inputClassName = "",
  underlineClassName,
  wrapperClassName = "",
  autoComplete = "off",
  ...inputProps
}: UnderlinedInputProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...inputProps}
        autoComplete={autoComplete}
        className={`px-3 md:text-[16px] text-[14px] font-normal text-white/70 bg-transparent outline-none border-0 placeholder:text-white/70 ${inputClassName}`}
      />
      <div className={`absolute left-0 bg-white h-[1px] ${underlineClassName}`} />
    </div>
  );
}
