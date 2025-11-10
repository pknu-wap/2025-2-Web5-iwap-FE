"use client";

import React from "react";
import { CardSlider } from "@/components/slides/CardSlider";
import { motion } from "framer-motion";
import { Sparkles, Stars, Code2, Palette, Music2, Boxes, Rocket, ExternalLink, Github, Mail } from "lucide-react";

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
        <ExternalLink className="h-4 w-4 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
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
    <div className="min-h-screen w-full text-white bg-[radial-gradient(1200px_circle_at_10%_-10%,#6d28d9_0%,transparent_40%),radial-gradient(800px_circle_at_90%_-20%,#0ea5e9_0%,transparent_35%),linear-gradient(180deg,#0b0f1a_0%,#090b12_100%)]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur">
        {/* <Section className="flex h-14 items-center justify-between">
          <a href="#home" className="font-semibold tracking-tight">
            <span className="relative">
              <span className="relative z-10">IWAP</span>
              <span className="absolute inset-x-0 -bottom-1 h-2 rounded-full bg-violet-500/30 blur" />
            </span>
          </a>
          <nav className="hidden gap-6 md:flex">
            <NavLink href="#about">소개</NavLink>
            <NavLink href="#projects">프로젝트</NavLink>
            <NavLink href="#features">특징</NavLink>
            <NavLink href="#contact">문의</NavLink>
          </nav>
          <a href="https://github.com/pknu-wap/2025-2-Web5-iwap-FE" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 transition-colors">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </Section> */}
      </header>

      {/* <Section id="home" className="pt-14 pb-12 md:pt-24 md:pb-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center">
          <Pill>
            <Stars className="h-3.5 w-3.5" /> Interactive Web & Art Playground
          </Pill>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight">
            인터랙션으로 즐기고 <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-sky-400 to-fuchsia-300">배우고 만든다</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
            IWAP는 Pukyong WAP의 인터랙티브 웹 아트 실험 공간입니다. 음악, 그래픽, 상호작용을 결합해 배우고 만들어요.
          </p>
        </motion.div>

        <div className="mt-10 select-none overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-[marquee_30s_linear_infinite] whitespace-nowrap text-white/60 text-sm">
            <span className="mx-6 inline-flex items-center gap-2"><Palette className="h-4 w-4"/>Canvas 드로잉</span>
            <span className="mx-6 inline-flex items-center gap-2"><Music2 className="h-4 w-4"/>Tone.js · MIDI</span>
            <span className="mx-6 inline-flex items-center gap-2"><Boxes className="h-4 w-4"/>3D 이미지</span>
            <span className="mx-6 inline-flex items-center gap-2"><Code2 className="h-4 w-4"/>Next.js · TS</span>
            <span className="mx-6 inline-flex items-center gap-2"><Rocket className="h-4 w-4"/>Framer Motion</span>
            <span className="mx-6 inline-flex items-center gap-2"><Sparkles className="h-4 w-4"/>학습·실험·배포</span>
          </div>
        </div>
      </Section> */}

      <div className="mt-40">
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

      {/* <Section id="projects" className="py-12 md:py-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">프로젝트</h2>
          <a href="https://github.com/pknu-wap" className="text-sm text-white/80 hover:text-white">모두 보기</a>
        </div>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <ProjectCard title="This is for u" desc="메시지를 담은 드로잉과 공유" href="/this-is-for-u" tags={["Canvas", "Download", "Mail"]} />
          <ProjectCard title="Piano Orchestra" desc="제스처 + MIDI 기반 연주" href="/piano" tags={["Tone.js", "MIDI", "Gesture"]} />
          <ProjectCard title="3D Image Ring" desc="입체적 갤러리 탐색" href="/slides" tags={["FramerMotion", "3D", "UX"]} />
        </motion.div>
      </Section> */}

      <Section id="features" className="py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">특징</h2>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature icon={Code2} title="모듈형 구조" desc="기능 분리와 재사용성을 고려한 설계" />
          <Feature icon={Music2} title="풍부한 사운드" desc="Velocity·Sustain 등 MIDI 요소 반영" />
          <Feature icon={Palette} title="감정 표현" desc="브러시·팔레트·지우개 인터랙션 제공" />
        </motion.div>
      </Section>

      <footer className="border-t border-white/10 py-8">
        <Section className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/60 text-sm">
          <p>© {new Date().getFullYear()} IWAP. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/pknu-wap/2025-2-Web5-iwap-FE" className="inline-flex items-center gap-2 hover:text-white"><Github className="h-4 w-4"/> GitHub</a>
          </div>
        </Section>
      </footer>

      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

