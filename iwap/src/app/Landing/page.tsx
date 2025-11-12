"use client";

import React from "react";
import { CardSlider } from "@/components/slides/CardSlider";
import { motion, AnimatePresence } from "framer-motion";
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

const sideSectionThumbs = [
  { src: "/images/inside_background.jpg", alt: "!nside thumbnail" },
  { src: "/images/This-is-for-u_background.jpg", alt: "Th!s !s for u thumbnail" },
  { src: "/images/Piano_Landing.png", alt: "P!ano thumbnail" },
  { src: "/images/ascii_background.jpg", alt: "Asci! thumbnail" },
  { src: "/images/string_background.jpg", alt: "Str!ng thumbnail" },
  { src: "/images/instrument_background.jpg", alt: "!nstrument thumbnail" },
];

export default function IwapLanding() {
  const [heroHovered, setHeroHovered] = React.useState(false);
  const [heroDismissed, setHeroDismissed] = React.useState(false);
  const scrollToAbout = React.useCallback(() => {
    const aboutSection = document.getElementById("about-details");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);
  const handleHeroDismiss = React.useCallback(() => {
    setHeroDismissed(true);
    scrollToAbout();
  }, [scrollToAbout]);

  return (
    <div className="min-h-screen w-full bg-white text-black">

      <section className="min-h-screen flex flex-col justify-between">
        <div className="mt-20 flex-1">
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

        <AnimatePresence>
          {!heroDismissed && (
            <motion.div
              key="hero-cta"
              className="pt-10"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
            >
              <motion.div
                className="relative w-full h-[450px] flex items-end justify-center overflow-hidden"
                onHoverStart={() => setHeroHovered(true)}
                onHoverEnd={() => setHeroHovered(false)}
              >
                <motion.div
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-white/60 to-[#9D9DC5]/60"
                  initial={{ height: 350 }}
                  animate={{ height: heroHovered ? 450 : 350 }}
                  transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                  style={{ maxHeight: "100%" }}
                />

                <motion.div
                  className="relative z-10 flex flex-col items-center justify-center text-center text-white -translate-y-20"
                  initial={false}
                  animate={{ y: heroHovered ? -50 : 0 }}
                  transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                >
                  <h2 className="text-[36px] font-light">Explore the Senses</h2>

                  <button
                    type="button"
                    onClick={handleHeroDismiss}
                    aria-label="Scroll to about section"
                    className="mt-6 inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9D9DC5]"
                  >
                    <img
                      src="/icons/Chevrons_down.svg"
                      alt="down"
                      className="w-[159px] h-auto opacity-90"
                    />
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>


      <Section id="about-details" className="space-y-8">
        <motion.div
          className="flex flex-wrap items-center justify-center gap-10 px-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.2 }}
        >
          {sideSectionThumbs.map(({ src, alt }) => (
            <motion.div key={src} variants={item} className="w-[100px] h-[150px] overflow-hidden">
              <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </motion.div>

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
