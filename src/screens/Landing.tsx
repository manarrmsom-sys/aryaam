import * as React from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Flag, Map, PenLine, Play, Repeat2 } from 'lucide-react';
import { Aurora, SplitText, TiltCard, useReveal } from '@/components/fx';
import { Credit, MuteButton, ParentButton } from '@/components/common';
import { Button } from '@/components/ui/button';
import { COLORS, byId } from '@/data/content';
import { audio } from '@/engine/audio/AudioEngine';
import { reducedMotion } from '@/lib/utils';
import { go, startRace } from '@/store/nav';
import { useSettings } from '@/store/settings';

const TILES = [
  { ch: 'أ', c: 'bg-royal text-white', pos: 'top-[8%] right-[6%]', r: -8 },
  { ch: 'ب', c: 'bg-gold text-royal-deep', pos: 'top-[30%] right-[26%]', r: 6 },
  { ch: 'ت', c: 'bg-emerald text-white', pos: 'top-[4%] right-[44%]', r: 10 },
  { ch: 'Aa', c: 'bg-coral text-white', pos: 'top-[46%] right-[2%]', r: 5, en: true },
  { ch: 'ث', c: 'bg-white text-royal', pos: 'top-[60%] right-[34%]', r: -6 },
  { ch: 'Bb', c: 'bg-royal-soft text-royal', pos: 'top-[24%] right-[62%]', r: -10, en: true },
  { ch: 'ج', c: 'bg-gold-soft text-gold-deep', pos: 'top-[58%] right-[64%]', r: 8 },
];

const FEATURES = [
  { icon: Flag, tone: 'bg-royal text-white', t: 'سباق ثلاثي الأبعاد', d: 'نسمع الحرف ونقود السيارة إلى البوّابة الصحيحة ونجمع الجواهر في الطريق.' },
  { icon: Map, tone: 'bg-emerald text-white', t: 'رحلة الحروف', d: 'محطة لكل حرف بالترتيب: أسمع، أنطق، أكتب، ثم أسابق. والمحطة التالية تُفتح بعد الإتقان.' },
  { icon: PenLine, tone: 'bg-gold text-royal-deep', t: 'الكتابة بالإصبع', d: 'نتتبّع الحرف من النقطة الخضراء ثلاث مرات حتى نكتبه وحدنا.' },
  { icon: Repeat2, tone: 'bg-coral text-white', t: 'مراجعة في وقتها', d: 'الحرف الذي نخطئ فيه يعود قريبًا، والذي أتقنّاه يعود بعد أيام ليثبت في الذاكرة.' },
];

export function Landing() {
  const profiles = useSettings(s => s.profiles), name = useSettings(s => s.name), selectProfile = useSettings(s => s.selectProfile);
  const hero = React.useRef<HTMLDivElement>(null);
  const reveal = useReveal();
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.from('[data-tile]', { scale: 0, opacity: 0, rotate: -30, duration: .9, ease: 'back.out(1.8)', stagger: .08, delay: .25 });
    gsap.utils.toArray<HTMLElement>('[data-tile]').forEach((t, i) => gsap.to(t, { y: i % 2 ? -16 : 14, rotate: `+=${i % 2 ? 5 : -5}`, duration: 3 + i * .4, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 1 + i * .1 }));
    gsap.from('[data-hero-fade]', { opacity: 0, y: 22, duration: .8, ease: 'power3.out', stagger: .12, delay: .55 });
  }, { scope: hero });

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Aurora />
      <div className="relative mx-auto flex max-w-6xl flex-col px-5 sm:px-8">
        <nav className="flex items-center gap-3 py-5">
          <span className="grid size-12 place-items-center rounded-2xl bg-royal font-display text-2xl font-black text-gold shadow-soft">ح</span>
          <span className="font-display text-xl font-black text-royal-deep">سباق الحروف</span>
          <span className="flex-1" />
          <MuteButton />
          <ParentButton />
        </nav>

        <section ref={hero} className="grid items-center gap-8 pb-10 pt-4 md:grid-cols-[1.05fr_.95fr] md:pt-12">
          <div className="flex flex-col items-start gap-6">
            <span data-hero-fade className="rounded-full bg-gold-soft px-4 py-1.5 text-[15px] font-bold text-gold-deep">تعلّم الحروف العربية والإنجليزية باللعب</span>
            <SplitText text="سِبَاقُ الْحُرُوف" className="harakat font-display text-[clamp(52px,10.5vw,112px)] font-black leading-[1.5] text-royal-deep" />
            <p data-hero-fade className="max-w-xl text-[clamp(18px,2.4vw,23px)] font-medium text-ink-soft">نقود السيارة، نسمع الحرف، ونعبر من البوّابة الصحيحة. ثم نكتب الحرف بإصبعنا حتى نتقنه.</p>
            <div data-hero-fade className="flex flex-wrap items-center gap-4">
              <Button variant="emerald" size="xl" onClick={() => { audio.ac(); audio.syncMusic(); go('setup'); }}><Play className="size-7 fill-current -scale-x-100" /> هيّا نلعب!</Button>
              <Button variant="ghost" size="lg" onClick={() => { audio.ac(); audio.syncMusic(); useSettings.getState().set({ mode: 'journey' }); startRace(); }}><Map className="size-5" /> رحلة الحروف</Button>
            </div>
            {profiles.length > 0 && (
              <div data-hero-fade className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold text-ink-soft">من يلعب اليوم؟</span>
                {profiles.map(p => (
                  <button key={p.name} type="button" aria-pressed={p.name === name} onClick={() => { selectProfile(p.name); audio.sfx.tap(); }}
                    className="flex items-center gap-2 rounded-full border-2 border-sand bg-white py-1.5 pe-4 ps-1.5 text-base font-bold transition-colors aria-pressed:border-royal aria-pressed:bg-royal-soft">
                    <span className="size-8 rounded-full border-2 border-white shadow" style={{ background: byId(COLORS, p.color).hex }} />{p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
            <div className="absolute inset-[9%] rounded-[44%] bg-white/70 shadow-lift" />
            <div className="absolute inset-[9%] rounded-[44%] border-2 border-dashed border-royal/15" />
            {TILES.map(t => (
              <div key={t.ch} data-tile style={{ rotate: `${t.r}deg` }}
                className={`absolute ${t.pos} grid size-[22%] place-items-center rounded-[26%] ${t.c} ${t.en ? 'font-letter text-[clamp(22px,4.6vw,44px)]' : 'font-body text-[clamp(34px,7vw,68px)] pb-[4%]'} font-extrabold shadow-[0_8px_0_rgb(31_42_68/.14),0_24px_40px_-12px_rgb(31_42_68/.3)]`}>
                {t.ch}
              </div>
            ))}
          </div>
        </section>

        <section ref={reveal} className="grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(f => (
            <TiltCard key={f.t} data-reveal className="rounded-[28px] border border-sand/70 bg-white p-6 shadow-soft">
              <span className={`mb-4 grid size-14 place-items-center rounded-2xl ${f.tone}`}><f.icon size={26} /></span>
              <h3 className="mb-1 text-xl font-extrabold text-royal-deep">{f.t}</h3>
              <p className="text-base text-ink-soft">{f.d}</p>
            </TiltCard>
          ))}
        </section>
        <Credit />
      </div>
    </div>
  );
}
