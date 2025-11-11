"use client";

import React from "react";
import { CardSlider } from "@/components/slides/CardSlider";
import { motion } from "framer-motion";
import SideImageSection from "@/components/sections/SideImageSection";


const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

const Section = ({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`w-full max-w-7xl mx-auto px-6 md:px-8 ${className}`}>{children}</section>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">{children}</span>
);

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-sm text-white/80 hover:text-white transition-colors">{children}</a>
);

const Feature = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <motion.div variants={item} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
    <div className="flex items-center gap-3">
      <div className="rounded-xl border border-white/10 bg-white/10 p-2">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
    <p className="mt-3 text-sm text-white/80 leading-relaxed">{desc}</p>
  </motion.div>
);

const ProjectCard = ({ title, desc, href, tags }: { title: string; desc: string; href: string; tags: string[] }) => (
  <motion.a variants={item} href={href} className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>

      </div>
      <p className="mt-2 text-sm text-white/80 leading-relaxed">{desc}</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((t) => (
        <span key={t} className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">{t}</span>
      ))}
    </div>
  </motion.a>
);

export default function IwapLanding() {
  return (
    <div className="min-h-screen w-full bg-white text-black">

      <div className="mt-20">
        <CardSlider
          showHeader={false}
          images={[
            { src: "/images/home/slides/slide1.jpg", link: "/inside", text: "!nside", description: "인공지능이 숫자를 인식하는 과정" },
            { src: "/images/home/slides/slide2.jpg", link: "/this-is-for-u", text: "Th!s !s for u", description: "함수로 하트 그리기" },
            { src: "/images/home/slides/slide3.jpg", link: "/piano", text: "P!ano", description: "음성을 피아노로 변환" },
            { src: "/images/home/slides/slide5.jpg", link: "/ascii", text: "ASCi!", description: "이미지를 텍스트로 표현" },
            { src: "/images/home/slides/slide4.jpg", link: "/string", text: "Str!ng", description: "선들로 이미지를 표현" },
            { src: "/images/home/slides/slide6.jpg", link: "/instrument", text: "!nstrument", description: "손동작으로 음악을 연주하는 오케스트라." },
          ]}
        />
      </div>

      <Section id="about" className="py-16 scroll-mt-24 text-center">
        <span className="font-Light text-[36px]">Explore the Senses</span>      
      </Section>

      <Section id="about" className="py-16 scroll-mt-24">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.2 }}>
          <div className="relative">
            <motion.p variants={item} className="text-center text-[#6670BD] text-[30px]">
              <br />
              <span className="font-semibold text-[42px]">!WAP</span>
          <span> 은</span>
          <span className="font-semibold"> 시각, 청각, 촉각</span>
          <span>의 세 감각을</span><br />
          <span>웹이라는 매체 안에서 새롭게 해석하는</span>
          <span className="font-semibold"> 인터랙티브 프로젝트</span>
          <span> 입니다.</span>
            </motion.p>
          </div>
          </motion.div>        
      </Section>

      <SideImageSection
        id="subproject"
        imageSrc="/images/inside_background.jpg"
        imageAlt="!nside background" 
        side="left"
        {...{ imageOverlay: "시작하기" }}
        imageOverlayLeft={"!nside"}
        overlayLeftClassName = "-translate-x-14 -translate-y-25"
        imageOverlayRight={"01"}
        badgeText="Vision"
        textAlign="left"
        badgeAlign="left"
        heading="01 !nside">

        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
        인공지능의 ‘시각’을 인간의 감각 언어로 번역하는 실험.</span>
        <br /><br />
        <span>AI가 숫자(0-9)를 인식하는 과정을 시각화하여,</span><br />
        <span>기계가 세상을 ‘본다’는 것이 무엇인지 탐구합니다.</span><br />
        <br />
        <span>사용자는 화면 위에서 숫자를 그리면, 인공지능의 내부 feature</span><br />
        <span> map이 실시간으로 나타나며</span><br />
        <span>기계의 시각적 사고 과정을 체험할 수 있습니다.</span>
      </SideImageSection>

      <SideImageSection
        id="subproject"
        imageSrc="/images/This-is-for-u_background.jpg"
        imageAlt="This-is-for-u background"
        {...{ imageOverlay: "시작하기" }}
        imageOverlayLeft={"Th!s !s for u"}
        overlayLeftClassName = "-translate-y-7 -translate-x-37"
        imageOverlayRight={"02"}
        side="right"
        badgeText="Vision"
        textAlign="right"
        badgeAlign="right"
        heading="02  Th!s !s for u">

        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
        감정을 색과 형태로 번역하는 ‘디지털 엽서’.</span>
        <br /><br />
        <span>인간의 마음이 색채 반응으로 드러나는 시각적으로 체험합니다.</span><br /><br />
        <span>사용자가 손으로 하트를 그리고, 글로 메시지를 남길 수 있습니다.</span><br />
        <span>그림의 색, 곡선의 흐름에 따라 감정이 시각적으로 표현되며,</span><br />
        <span>완성된 엽서는 이미지로 저장되거나 이메일로 전송됩니다.</span>
      </SideImageSection>

      <SideImageSection
        id="subproject"
        imageSrc="/images/Piano_Landing.png"
        imageAlt="Piano background"
        {...{ imageOverlay: "시작하기" }}
        imageOverlayLeft={"P!ano"}
        overlayLeftClassName = "-translate-x-14 -translate-y-25"
        imageOverlayRight={"03"}
        side="right"
        badgeText="Hearing"
        textAlign="left"
        badgeAlign="right"
        heading="03  P!ano">

        <span>사용자의 음성이나 주변 소리를 피아노 음으로 변환하는</span>
        <br />
        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
        사운드–비주얼 인터랙션 실험.</span><br /><br />
        <span>음성 입력을 Tone.js 기반의 피아노 사운드로 변환하고,</span><br />
        <span>각 음정과 강도를 시각적으로 스펙트럼화하여 보여줍니다.</span><br />
        <br />
        <span>시청각이 결합된 몰입형 음악 인터페이스로,</span><br />
        <span>“보이는 소리”라는 개념을 체험할 수 있습니다.</span><br />
      </SideImageSection>

      <SideImageSection
        id="subproject"
        imageSrc="/images/ascii_background.jpg"
        imageAlt="ascii background"
        {...{ imageOverlay: "시작하기" }}
        imageOverlayLeft={"Asci!"}
        overlayLeftClassName = "-translate-x-10 -translate-y-30"
        imageOverlayRight={"04"}
        side="left"
        badgeText="Vision"
        textAlign="left"
        badgeAlign="left"
        heading="04  Asci!">

        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
        이미지를 텍스트로 변환해 ‘보이는 언어’를 만드는 실험.</span>
        <br /><br />
        <span>이미지를 픽셀 단위로 분석해, 밝기 값을 문자(ASCII 코드)로 대체합니다.</span><br />
        <span>그 결과 생성된 텍스트 이미지는 언어와 시각 사이의 경계를 흐리며,</span><br />
        <span>“텍스트도 시각적 예술이 될 수 있는가?”를 탐구합니다.</span>
      </SideImageSection>

      <SideImageSection
        id="subproject"
        imageSrc="/images/string_background.jpg"
        imageAlt="string background"
        {...{ imageOverlay: "시작하기" }}
        imageOverlayLeft={"Str!ng"}
        overlayLeftClassName = "-translate-x-14 -translate-y-25"
        imageOverlayRight={"05"}
        side="left"
        badgeText="Vision"
        textAlign="left"
        badgeAlign="left"
        heading="05  Str!ng">

        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
        선과 연결로 이미지를 재구성하는 알고리즘 아트.</span>
        <br /><br />
        <span>수많은 실선을 일정한 규칙으로 배치해</span><br />
        <span>하나의 이미지를 만들어내는 시각적 알고리즘 실험입니다.</span><br />
        <span>‘선’이라는 최소 단위를 통해 시각 인식의 구조와</span><br />
        <span>데이터 기반 미학을 탐구합니다.</span>
      </SideImageSection>

      <SideImageSection
        id="subproject"
        imageSrc="/images/instrument_background.jpg"
        imageAlt="instrument background"
        {...{ imageOverlay: "시작하기" }}
        imageOverlayLeft={"!nstrument"}
        overlayLeftClassName = "-translate-y-7 -translate-x-30"
        imageOverlayRight={"06"}
        side="left"
        badgeText="Touch"
        textAlign="left"
        badgeAlign="left"
        heading="06  !nstrument">

        <span className="relative inline-block after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[22px] after:bg-[rgba(157,157,197,0.39)] after:-z-10 relative z-10">
        손동작으로 오케스트라를 지휘하는 인터랙티브 사운드 퍼포먼스.</span>
        <br /><br />
        <span>카메라로 인식한 제스처(손바닥, 손가락, 움직임)를</span><br />
        <span>MIDI 신호로 변환하여 여러 악기의 연주를 제어합니다.</span><br />
        <span>사용자의 동작이 음악의 속도, 볼륨, 악기를 실시간으로 바꾸며,</span><br />
        <span>가장 촉각적인 ‘손의 인터페이스’를 통해 청각적 몰입을 만듭니다.</span>
      </SideImageSection>
   

      <footer className="border-t border-gray-200 py-8 bg-white">
        <Section className="flex flex-col md:flex-row items-center justify-between gap-4 text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} IWAP. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/pknu-wap/2025-2-Web5-iwap-FE" className="inline-flex items-center gap-2 hover:text-gray-900">GitHub</a>
          </div>
        </Section>
      </footer>

      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
