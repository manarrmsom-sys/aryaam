import * as React from 'react';
import { Lock, RefreshCw, Sparkles } from 'lucide-react';
import { Credit, MuteButton, ParentButton, Stars, TopBar, useJourney } from '@/components/common';
import { Aurora, Screen, useReveal } from '@/components/fx';
import { Button } from '@/components/ui/button';
import { Card, Progress } from '@/components/ui/primitives';
import { packOf } from '@/data/content';
import { getGame } from '@/engine/RaceGame';
import { arNum, cn } from '@/lib/utils';
import { go, openLesson, startRace } from '@/store/nav';
import { useSettings } from '@/store/settings';

const STEP = 124, AMP = 30; // px between stations, sideways swing in % of the track width
const TONES = ['bg-royal text-white [--ledge:#172554]', 'bg-emerald text-white [--ledge:#047857]', 'bg-gold text-royal-deep [--ledge:#B45309]', 'bg-coral text-white [--ledge:#BE123C]'];

export function JourneyMap() {
  const J = useJourney(), lang = useSettings(s => s.lang), name = useSettings(s => s.name), en = lang === 'en';
  const Ls = packOf(lang).letters;
  React.useEffect(() => { getGame()?.stop(); }, []);
  const ref = useReveal([lang, name]);
  const cur = Ls.findIndex((_, i) => J.unlocked(i) && !J.stars(i)), due = J.due(), learned = J.learned(), newToday = J.newToday();
  const xOf = (i: number) => 50 + Math.sin(i * .8) * AMP * (en ? -1 : 1);
  const H = Ls.length * STEP;
  const path = Ls.map((_, i) => `${i ? 'L' : 'M'}${xOf(i)} ${i * STEP + 52}`).join(' ');
  const curRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { const t = setTimeout(() => { if (cur > 2) curRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 500); return () => clearTimeout(t); }, [cur]);

  return (
    <Screen className="relative min-h-dvh">
      <Aurora className="fixed" />
      <div ref={ref} className="relative mx-auto flex max-w-3xl flex-col gap-5 px-4 pb-10 pt-5 sm:px-6">
        <TopBar title="رحلة الحروف" sub={(en ? 'الحروف الإنجليزية' : 'الحروف العربية') + (name ? ' · ' + name : '')} onBack={() => go('setup')} backLabel="الإعدادات">
          <MuteButton /><ParentButton />
        </TopBar>

        <Card data-reveal className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="tnum"><b className="font-display text-3xl font-black text-royal-deep">{arNum(learned.length)}</b><span className="text-ink-soft"> / {arNum(Ls.length)} حرفًا أتقنّاه</span></div>
            <span className="flex-1" />
            {learned.length >= 3 && (
              <Button variant={due.length ? 'gold' : 'soft'} onClick={() => startRace({ type: 'review' })}>
                <RefreshCw size={19} /> سباق المراجعة{due.length ? ` (${arNum(due.length)})` : ''}
              </Button>
            )}
          </div>
          <Progress value={(learned.length / Ls.length) * 100} />
          {(newToday >= 3 || due.length >= 3) && (
            <p className="flex items-start gap-2 rounded-2xl bg-gold-soft px-4 py-2.5 text-[15px] font-bold text-gold-deep">
              <Sparkles size={18} className="mt-1 shrink-0" />
              {newToday >= 3 ? `تعلّمنا اليوم ${arNum(newToday)} حروف جديدة. الأفضل للحفظ أن نراجعها الآن ونكمل الحروف الجديدة غدًا.`
                : `حان وقت مراجعة ${arNum(due.length)} حروف. نبدأ بسباق المراجعة، ثم نتعلّم حرفًا جديدًا.`}
            </p>
          )}
        </Card>

        {/* the winding road of stations */}
        <div className="relative mx-auto w-full max-w-[420px]" style={{ height: H }} dir="ltr">
          <svg className="absolute inset-0 size-full" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden>
            <path d={path} fill="none" stroke="#fff" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={path} fill="none" stroke="#E8E1D5" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {Ls.map((L, i) => {
            const un = J.unlocked(i), st = J.stars(i), isCur = i === cur, isDue = due.includes(i);
            return (
              <div key={L.k} className="absolute -translate-x-1/2" style={{ left: `${xOf(i)}%`, top: i * STEP }} data-reveal>
                <button ref={isCur ? curRef : undefined} type="button" disabled={!un} onClick={() => openLesson(i)} aria-label={`حرف ${L.name}${un ? '' : ' (مقفل)'}`}
                  className={cn('press relative grid size-[104px] place-items-center rounded-[34px] border-4 border-white',
                    un ? (st ? TONES[i % TONES.length] : 'bg-white text-royal [--ledge:#E8E1D5]') : 'bg-cream-2 text-ink-soft/50 [--ledge:#E8E1D5] disabled:opacity-100',
                    isCur && 'animate-bob ring-4 ring-gold ring-offset-2 ring-offset-cream')}>
                  <b className={cn('text-[42px] font-extrabold leading-[1.5]', en ? 'en text-[36px]' : 'pb-2')}>{L.ch}</b>
                  {!un && <span className="absolute -bottom-2 grid size-8 place-items-center rounded-full bg-white text-ink-soft shadow-soft"><Lock size={15} /></span>}
                  {un && st > 0 && <span className="absolute -bottom-3 rounded-full bg-white px-1.5 py-0.5 shadow-soft"><Stars n={st} size="size-4" /></span>}
                  {isDue && <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full border-[3px] border-white bg-coral" title="حان وقت المراجعة" />}
                  {isCur && <span className="absolute -top-9 whitespace-nowrap rounded-full bg-gold px-3 py-0.5 font-display text-sm font-extrabold text-royal-deep shadow-soft" dir="rtl">نبدأ هنا</span>}
                </button>
              </div>
            );
          })}
        </div>

        <Card data-reveal><p className="text-base text-ink-soft">كل محطة حرف: نسمعه، ننطقه، نكتبه ثلاث مرات، ثم نلتقطه في سباق قصير. المحطة التالية تُفتح بعد إتقان الحرف. النقطة الحمراء تعني أن الحرف حان وقت مراجعته.</p></Card>
        <Credit />
      </div>
    </Screen>
  );
}
