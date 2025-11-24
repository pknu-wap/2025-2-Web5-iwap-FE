"use client";

import type { ReactNode } from "react";
import SideImageSection from "./SideImageSection";

export type ProjectKey = "inside" | "this-is-for-u" | "piano" | "ascii" | "string" | "graffiti" | "facial";

const SECTION_DATA: Record<
  ProjectKey,
  {
    imageSrc: string;
    imageAlt: string;
    imageOverlayLeft: string;
    overlayLeftClassName: string;
  imageOverlayRight: string;
  side: "left" | "right";
  badgeText: string;
  textAlign: "left" | "right";
  badgeAlign: "left" | "right";
  heading: string;
  body: ReactNode;
  imageClassName?: string;
  imageWrapperClassName?: string;
  mobileBody?: ReactNode;
  }
> = {
  inside: {
    imageSrc: "/images/inside_background.jpg",
    imageAlt: "!nside background",
    imageOverlayLeft: "!nside",
    overlayLeftClassName: "-translate-x-[35px] -translate-y-[35px] md:!-translate-x-[62px] md:-translate-y-[95px]",
    imageOverlayRight: "01",
    side: "left",
    badgeText: "Vision",
    textAlign: "left",
    badgeAlign: "left",
    heading: "01 !nside",
    body: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          인공지능의 ‘시각’을 인간의 감각 언어로 번역하는 실험.
        </span>
        <br />
        <br />
        <span>AI가 숫자(0-9)를 인식하는 과정을 시각화하여,</span>
        <br />
        <span>기계가 세상을 ‘본다’는 것이 무엇인지 탐구합니다.</span>
        <br />
        <br />
        <span>사용자는 화면 위에서 숫자를 그리면, 인공지능의 내부 feature</span>
        <br />
        <span> map이 실시간으로 나타나며</span>
        <br />
        <span>기계의 시각적 사고 과정을 체험할 수 있습니다.</span>
      </>
    ),
    mobileBody: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          인공지능의 ‘시각’을 인간의 감각 언어로 번역하는 실험.
        </span>
        <br />
        <br />
        <span>AI가 숫자(0-9)를 인식하는 과정을 시각화하여,</span>
        <br />
        <span>기계가 세상을 ‘본다’는 것이 무엇인지 탐구합니다.</span>
        <br />
        <br />
        <span>사용자는 화면 위에서 숫자를 그리면,</span>
        <br />
        <span> 인공지능의 내부 featuremap이 실시간으로 나타나며</span>
        <br />
        <span>기계의 시각적 사고 과정을 체험할 수 있습니다.</span>
      </>
    ),
  },
  "this-is-for-u": {
    imageSrc: "/images/this-is-for-u_background.jpg",
    imageAlt: "This-is-for-u background",
    imageOverlayLeft: "Th!s !s for u",
    overlayLeftClassName: "md:-translate-y-[28px] md:-translate-x-[147px] -translate-y-[6px] -translate-x-[82px]",
    imageOverlayRight: "02",
    side: "right",
    badgeText: "Vision",
    textAlign: "right",
    badgeAlign: "right",
    heading: "02  Th!s !s for u",
    body: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          감정을 색과 형태로 번역하는 ‘디지털 엽서’.
        </span>
        <br />
        <br />
        <span>색과 형태로 감정을 번역해 ‘보이는 감정’을 경험합니다.</span>
        <br />
        <br />
        <span>사용자가 손으로 하트를 그리고 메시지를 남기면,</span>
        <br />
        <span>곡선과 색의 흐름이 감정의 결을 따라 변형됩니다.</span>
        <br />
        <span>완성된 엽서는 이미지로 저장하거나 이메일로 보낼 수 있습니다.</span>
      </>
    ),
    mobileBody: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          감정을 색과 형태로 번역하는 ‘디지털 엽서’.
        </span>
        <br />
        <br />
        <span>색과 형태로 감정을 번역해 ‘보이는 감정’을 경험합니다.</span>
        <br />
        <br />
        <span>사용자가 손으로 하트를 그리고 메시지를 남기면,</span>
        <br />
        <span>글로 메시지를 남길 수 있습니다.</span>
        <br /><br />
        <span>곡선과 색의 흐름이 감정의 결을 따라 변형됩니다.</span>
        <br />
        <span>완성된 엽서는 이미지로 저장되거나 이메일로 전송됩니다.</span>
      </>
    ),
  },
  piano: {
    imageSrc: "/images/Piano_Landing.png",
    imageAlt: "Piano background",
    imageOverlayLeft: "P!ano",
    overlayLeftClassName: "md:-translate-x-14 md:-translate-y-[95px] -translate-x-[30px] -translate-y-[35px]",
    imageOverlayRight: "03",
    side: "right",
    badgeText: "Hearing",
    textAlign: "left",
    badgeAlign: "right",
    heading: "03  P!ano",
    body: (
      <>
        <span>사용자의 음성이나 주변 소리를 피아노 음으로 변환하는</span>
        <br />
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          사운드–비주얼 인터랙션 실험.
        </span>
        <br />
        <br />
        <span>음성 입력을 Tone.js 기반의 피아노 사운드로 변환하고,</span>
        <br />
        <span>각 음정과 강도를 시각적으로 스펙트럼화하여 보여줍니다.</span>
        <br />
        <br />
        <span>시청각이 결합된 몰입형 음악 인터페이스로,</span>
        <br />
        <span>“보이는 소리”라는 개념을 체험할 수 있습니다.</span>
        <br />
      </>
    ),
    mobileBody: (
      <>
        <span>사용자의 음성이나 주변 소리를 피아노 음으로 변환하는</span>
        <br />
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          사운드–비주얼 인터랙션 실험.
        </span>
        <br />
        <br />
        <span>음성 입력을 Tone.js 기반의 피아노 사운드로 변환하고,</span>
        <br />
        <span>각 음정과 강도를 시각적으로 스펙트럼화하여 보여줍니다.</span>
        <br />
        <br />
        <span>시청각이 결합된 몰입형 음악 인터페이스로,</span>
        <br />
        <span>“보이는 소리”라는 개념을 체험할 수 있습니다.</span>
        <br />
      </>
    ),
  },
  ascii: {
    imageSrc: "/images/ascii_background.jpg",
    imageAlt: "ascii background",
    imageOverlayLeft: "Asci!",
    overlayLeftClassName: "md:-translate-x-[46px] md:-translate-y-[80px] -translate-x-[26px] -translate-y-[40px]",
    imageOverlayRight: "04",
    side: "left",
    badgeText: "Vision",
    textAlign: "left",
    badgeAlign: "left",
    heading: "04  Asci!",
    body: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          이미지를 텍스트로 변환해 ‘보이는 언어’를 만드는 실험.
        </span>
        <br />
        <br />
        <span>이미지를 픽셀 단위로 분석해, 밝기 값을 문자(ASCII 코드)로 대체합니다.</span>
        <br />
        <span>그 결과 생성된 텍스트 이미지는 언어와 시각 사이의 경계를 흐리며,</span>
        <br />
        <span>“텍스트도 시각적 예술이 될 수 있는가?”를 탐구합니다.</span>
      </>
    ),
    mobileBody: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          이미지를 텍스트로 변환해 ‘보이는 언어’를 만드는 실험.
        </span>
        <br />
        <br />
        <span>이미지를 픽셀 단위로 분석해,</span>
        <br />
        <span>밝기 값을 문자(ASCII 코드)로 대체합니다.</span>
        <br /><br />
        <span>그 결과 생성된 텍스트 이미지는</span>
        <br />
        <span>언어와 시각 사이의 경계를 흐리며,</span>
        <br /><br />
        <span>“텍스트도 시각적 예술이 될 수 있는가?”를 탐구합니다.</span>
      </>
    ),
  },
  string: {
    imageSrc: "/images/string_background.jpg",
    imageAlt: "string background",
    imageOverlayLeft: "Str!ng",
    overlayLeftClassName: "md:-translate-x-14 md:-translate-y-[75px] -translate-x-[32px] -translate-y-[35px]",
    imageOverlayRight: "05",
    side: "left",
    badgeText: "Vision",
    textAlign: "left",
    badgeAlign: "left",
    heading: "05  Str!ng",
    imageClassName: "object-cover scale-[1.1]",
    body: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          선과 연결로 이미지를 재구성하는 알고리즘 아트.
        </span>
        <br />
        <br />
        <span>수많은 실선을 일정한 규칙으로 배치해</span>
        <br />
        <span>하나의 이미지를 만들어내는 시각적 알고리즘 실험입니다.</span>
        <br />
        <span>‘선’이라는 최소 단위를 통해 시각 인식의 구조와</span>
        <br />
        <span>데이터 기반 미학을 탐구합니다.</span>
      </>
    ),
    mobileBody: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          선과 연결로 이미지를 재구성하는 알고리즘 아트.
        </span>
        <br />
        <br />
        <span>수많은 실선을 일정한 규칙으로 배치해</span>
        <br />
        <span>하나의 이미지를 만들어내는 시각적 알고리즘 실험입니다.</span>
        <br />
        <span>‘선’이라는 최소 단위를 통해 시각 인식의 구조와</span>
        <br />
        <span>데이터 기반 미학을 탐구합니다.</span>
      </>
    ),
  },
  graffiti: {
    imageSrc: "/images/instrument_background.jpg",
    imageAlt: "graffiti background",
    imageOverlayLeft: "Graff!ti",
    overlayLeftClassName: "-translate-y-[40px] -translate-x-[40px] md:-translate-y-[100px] md:-translate-x-[75px]",
    imageOverlayRight: "06",
    side: "left",
    badgeText: "Touch",
    textAlign: "left",
    badgeAlign: "left",
    heading: "06  Graff!ti",
    body: (
      <>
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          카메라로 손동작을 추적해
        </span><br />
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          공중에 그림을 남기는 제스처 드로잉 퍼포먼스.
        </span>
        <br />
        <br />
        <span>검지 제스처로 자유롭게 선을 그리고, 이펙트를 활성화해</span>
        <br />
        <span>엄지척이나 하트 모양으로 움직임에 맞춘</span>
        <br />
        <span>그래피티를 완성합니다.</span>
        <br />
        <br />
        <span>실시간 필터와 붓 굵기·컬러 선택으로 ‘공기 중 캔버스’에서</span>
        <br />
        <span>움직임으로만 그림을 그리는 촉각적 경험을 제공합니다.</span>
      </>
    ),
  },
  facial: {
    imageSrc: "/images/string_background.jpg",
    imageAlt: "facial background",
    imageOverlayLeft: "Fac!al",
    overlayLeftClassName: "md:-translate-x-[46px] md:-translate-y-[80px] -translate-x-[26px] -translate-y-[40px]",
    imageOverlayRight: "07",
    side: "right",
    badgeText: "Vision",
    textAlign: "right",
    badgeAlign: "right",
    heading: "07 Fac!al",
    body: (
      <>
        <span className="inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          얼굴의 특징을 실시간으로 감지하고 변형하는 실험.
        </span>
        <br />
        <br />
        <span>MediaPipe Face Mesh를 활용하여 얼굴의 랜드마크를 인식하고,</span>
        <br />
        <span>눈, 코, 입 등 주요 부위의 크기와 위치를 조절합니다.</span>
        <br />
        <br />
        <span>나만의 독특한 얼굴을 만들어보며</span>
        <br />
        <span>디지털 페르소나의 가능성을 탐구합니다.</span>
      </>
    ),
    mobileBody: (
      <>
        <span className="inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
          얼굴의 특징을 실시간으로 감지하고 변형하는 실험.
        </span>
        <br />
        <br />
        <span>MediaPipe Face Mesh를 활용하여</span>
        <br />
        <span>얼굴의 랜드마크를 인식하고,</span>
        <br />
        <span>눈, 코, 입 등 주요 부위의 크기와 위치를 조절합니다.</span>
        <br />
        <br />
        <span>나만의 독특한 얼굴을 만들어보며</span>
        <br />
        <span>디지털 페르소나의 가능성을 탐구합니다.</span>
      </>
    ),
  },
};

interface ProjectIntroSectionsProps {
  projects: ProjectKey[];
  className?: string;
}

export default function ProjectIntroSections({ projects, className = "" }: ProjectIntroSectionsProps) {
  return (
    <div className={className}>
      {projects.map((key) => {
        const section = SECTION_DATA[key];
        return (
          <SideImageSection
            key={key}
            id={key}
            imageSrc={section.imageSrc}
            imageAlt={section.imageAlt}
            imageOverlay="시작하기"
            imageOverlayLeft={section.imageOverlayLeft}
            overlayLeftClassName={section.overlayLeftClassName}
            imageOverlayRight={section.imageOverlayRight}
            side={section.side}
            badgeText={section.badgeText}
            textAlign={section.textAlign}
            badgeAlign={section.badgeAlign}
            imageClassName={section.imageClassName}
            imageWrapperClassName={section.imageWrapperClassName}
            heading={section.heading}
            mobileBody={section.mobileBody}
          >
            {section.body}
          </SideImageSection>
      );
      })}
    </div>
  );
}

export function ProjectIntroModal({
  projects,
  open,
  onClose,
}: {
  projects: ProjectKey[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 text-white"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <ProjectIntroSections
          projects={projects}
          className="overflow-visible bg-transparent [&_*]:text-white [&_*]:drop-shadow [&_img]:opacity-70 -translate-x-[30px]"
        />
      </div>
    </div>
  );
}
