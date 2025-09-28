"use client";

// 흰 건반 컴포넌트
const WhiteKey = () => (
  <li className="white h-[16em] w-[4em] z-10 border-l border-b border-[#bbb] rounded-b-[5px] shadow-[-1px_0_0_rgba(255,255,255,0.8)_inset,0_0_5px_#ccc_inset,0_0_3px_rgba(0,0,0,0.2)] bg-gradient-to-b from-[#eee] to-white active:border-t-[#777] active:border-l-[#999] active:border-b-[#999] active:shadow-[2px_0_3px_rgba(0,0,0,0.1)_inset,-5px_5px_20px_rgba(0,0,0,0.2)_inset,0_0_3px_rgba(0,0,0,0.2)] active:bg-gradient-to-b active:from-white active:to-[#e9e9e9]"></li>
);

// 검은 건반 컴포넌트
const BlackKey = () => (
  <li className="black h-[8em] w-[2em] ml-[-1em] mr-[-1em] z-20 border border-black rounded-b-[3px] shadow-[-1px_-1px_2px_rgba(255,255,255,0.2)_inset,0_-5px_2px_3px_rgba(0,0,0,0.6)_inset,0_2px_4px_rgba(0,0,0,0.5)] bg-gradient-to-tr from-[#222] to-[#555] active:shadow-[-1px_-1px_2px_rgba(255,255,255,0.2)_inset,0_-2px_2px_3px_rgba(0,0,0,0.6)_inset,0_1px_2px_rgba(0,0,0,0.5)] active:bg-gradient-to-r active:from-[#444] active:to-[#222]"></li>
);

// 1 옥타브 컴포넌트 (흰 건반 7개 + 검은 건반 5개)
const Octave = () => {
  return (
    <>
      <WhiteKey />
      <BlackKey />
      <WhiteKey />
      <BlackKey />
      <WhiteKey />
      <WhiteKey />
      <BlackKey />
      <WhiteKey />
      <BlackKey />
      <WhiteKey />
      <BlackKey />
      <WhiteKey />
    </>
  );
};

export default function PianoPage() {
  const numberOfOctaves = 4;

  return (
    <div className="bg-[#222] flex items-center justify-center min-h-screen p-4 overflow-x-auto">
      {/* 반응형 스케일을 위한 div */}
      <div className="scale-[0.5] sm:scale-[0.6] md:scale-[0.8] lg:scale-100 origin-center">
        <div className="piano-body relative h-[18.875em] w-fit my-[5em] mx-auto pt-[3em] pl-[3em] border border-[#160801] rounded-[1em] shadow-[0_0_50px_rgba(0,0,0,0.5)_inset,0_1px_rgba(212,152,125,0.2)_inset,0_5px_15px_rgba(0,0,0,0.5)] bg-gradient-to-br from-[rgba(0,0,0,0.3)] to-[rgba(0,0,0,0)]">
          <ul className="flex flex-row">
            {/* 설정된 수만큼 옥타브를 반복 렌더링 */}
            {Array.from({ length: numberOfOctaves }).map((_, i) => (
              <Octave key={i} />
            ))}
            {/* 마지막 건반 추가 */}
            <WhiteKey />
          </ul>
        </div>
      </div>
    </div>
  );
}