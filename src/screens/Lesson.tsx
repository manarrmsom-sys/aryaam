import * as React from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Check, Ear, Eraser, Flag, Mic, PenLine, Volume2 } from 'lucide-react';
import { MuteButton, Stars, TopBar } from '@/components/common';
import { Aurora, Screen } from '@/components/fx';
import { Button } from '@/components/ui/button';
import { clipOf, packOf } from '@/data/content';
import { audio } from '@/engine/audio/AudioEngine';
import { Speech } from '@/engine/audio/Speech';
import { J } from '@/engine/journey';
import { TraceEngine } from '@/engine/tracing';
import { arNum, cn, reducedMotion } from '@/lib/utils';
import { go, openLesson, startRace, useNav } from '@/store/nav';
import { useSettings } from '@/store/settings';

const STEPS = [{ t: 'أسمع وأرى', icon: Ear }, { t: 'أنطق', icon: Mic }, { t: 'أكتب', icon: PenLine }, { t: 'أسابق', icon: Flag }];

function StepBar({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="خطوات الدرس">
      {STEPS.map((s, i) => (
        <li key={s.t} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-extrabold transition-colors sm:text-[15px]',
          i < step ? 'bg-emerald text-white' : i === step ? 'bg-gold text-royal-deep shadow-soft' : 'bg-white/80 text-ink-soft')}>
          {i < step ? <Check size={16} strokeWidth={3.5} /> : <s.icon size={16} />}<span className="whitespace-nowrap">{s.t}</span>
        </li>
      ))}
    </ol>
  );
}
const Dots = ({ n }: { n: number }) => <div className="flex gap-2.5" dir="ltr" aria-label={`${n} من 3`}>{[0, 1, 2].map(i => <i key={i} className={cn('size-6 rounded-full bg-sand transition-all duration-300', i < n && 'scale-110 bg-emerald')} />)}</div>;

export function Lesson() {
  const idx = useNav(n => n.lessonIdx), result = useNav(n => n.lessonResult);
  const lang = useSettings(s => s.lang), name = useSettings(s => s.name), en = lang === 'en';
  const P = packOf(lang), L = P.letters[idx], W = P.words[idx], lc = clipOf(lang, 'letter', idx);
  const [step, setStep] = React.useState(0);
  const card = React.useRef<HTMLDivElement>(null);
  useGSAP(() => { if (!reducedMotion()) gsap.from(card.current, { opacity: 0, y: 24, scale: .97, duration: .45, ease: 'power3.out', clearProps: 'all' }); }, { dependencies: [step, !!result] });

  const hear = React.useCallback(() => { audio.ac(); Speech.say(en ? L.name : 'حَرْفُ ' + L.name, true, lang, lc); }, [L, lang, lc, en]);
  const Big = <div className={cn('text-[clamp(110px,30vw,180px)] font-extrabold leading-[1.35] text-royal-deep', en ? 'en tracking-wider' : 'pb-4')}>{L.ch}</div>;

  return (
    <Screen className="relative min-h-dvh">
      <Aurora className="fixed" />
      <div className="relative mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-10 pt-5 sm:px-6">
        <TopBar title={<span>حرف <span className={en ? 'en' : ''}>{en ? L.base : L.name}</span></span>} onBack={() => go('journey')} backLabel="الخريطة"><MuteButton /></TopBar>
        <StepBar step={result ? (result.total - result.right <= 1 ? 4 : 3) : step} />
        <div ref={card} className="mx-auto flex w-full flex-col items-center gap-4 rounded-[32px] border border-sand/70 bg-white p-5 text-center shadow-lift sm:p-7">
          {result ? <Result idx={idx} right={result.right} total={result.total} big={Big} />
            : step === 0 ? <Listen big={Big} sub={P.sub(L)} word={W} en={en} hear={() => { hear(); Speech.say(W.say, false, lang, clipOf(lang, 'word', idx)); }} next={() => setStep(1)} />
            : step === 1 ? <Repeat big={Big} hear={hear} next={() => setStep(2)} />
            : step === 2 ? <TracePad idx={idx} letterName={L.name} lc={lc} next={() => setStep(3)} />
            : (
              <>
                {Big}
                <p className="text-lg font-bold text-ink">نلتقط حرف {L.name} بين الحروف. خطأ واحد مسموح.</p>
                <Button variant="emerald" size="lg" onClick={() => startRace({ type: 'lesson', idx })}><Flag size={22} /> هيّا إلى السباق</Button>
              </>
            )}
        </div>
        {name && <p className="text-center text-sm font-bold text-ink-soft">السائق: {name}</p>}
      </div>
    </Screen>
  );
}

function Listen({ big, sub, word, en, hear, next }: { big: React.ReactNode; sub: string; word: { show: string; emoji: string }; en: boolean; hear: () => void; next: () => void }) {
  React.useEffect(() => { hear(); /* speak once on entry */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {big}
      <div className="harakat text-3xl font-extrabold text-royal">{sub}</div>
      <div className="flex items-center gap-3 rounded-2xl bg-cream px-5 py-2 text-3xl font-extrabold"><span>{word.emoji}</span><span className={en ? 'en' : 'harakat'}>{word.show}</span></div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="soft" size="lg" onClick={hear} silent><Volume2 size={22} /> أسمع</Button>
        <Button variant="emerald" size="lg" onClick={next}>التالي</Button>
      </div>
    </>
  );
}

function Repeat({ big, hear, next }: { big: React.ReactNode; hear: () => void; next: () => void }) {
  const [reps, setReps] = React.useState(0);
  React.useEffect(() => { hear(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => { if (reps >= 3) { const t = setTimeout(next, 600); return () => clearTimeout(t); } }, [reps, next]);
  const rep = () => { if (reps >= 3) return; const n = reps + 1; setReps(n); if (n < 3) { audio.sfx.tick(); hear(); } else audio.sfx.ok(); };
  return (
    <>
      <p className="text-lg font-bold text-ink">نسمع الحرف ثم نردّده ثلاث مرات</p>
      {big}
      <Dots n={reps} />
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="soft" size="lg" onClick={hear} silent><Volume2 size={22} /> أسمع</Button>
        <Button variant="emerald" size="lg" onClick={rep} silent><Mic size={22} /> ردّدتُه</Button>
      </div>
    </>
  );
}

function TracePad({ idx, letterName, lc, next }: { idx: number; letterName: string; lc: string; next: () => void }) {
  const cv = React.useRef<HTMLCanvasElement>(null), eng = React.useRef<TraceEngine | null>(null);
  const [hint, setHint] = React.useState(''), [stage, setStage] = React.useState(0), [skip, setSkip] = React.useState(false);
  const lang = useSettings(s => s.lang);
  React.useEffect(() => {
    Speech.say('نَكْتُبُ الْحَرْف', true, 'ar', 'ar/say-write'); Speech.say(letterName, false, lang, lc);
    const e = (eng.current = new TraceEngine(cv.current!, idx, { onHint: setHint, onStage: setStage, onSkipOffer: () => setSkip(true), onDone: next }));
    return () => e.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);
  return (
    <>
      <Dots n={stage} />
      <p className="min-h-[1.8em] text-lg font-bold text-ink" aria-live="polite">{hint}</p>
      <div className="relative w-[min(380px,100%)] rounded-[30px] bg-gradient-to-b from-gold-soft to-cream p-2.5 shadow-[inset_0_2px_6px_rgb(31_42_68/.08)]">
        <canvas ref={cv} data-trace width={360} height={360} aria-label="مساحة الكتابة" className="aspect-square w-full touch-none rounded-[22px] border-2 border-dashed border-gold/50 bg-white" />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="ghost" size="lg" onClick={() => eng.current?.clear()}><Eraser size={20} /> مسح</Button>
        <Button variant="emerald" size="lg" onClick={() => eng.current?.check(true)} silent><Check size={22} strokeWidth={3} /> تمّ</Button>
        {skip && <Button variant="ghost" size="lg" onClick={next}>نتجاوز الكتابة</Button>}
      </div>
    </>
  );
}

function Result({ idx, right, total, big }: { idx: number; right: number; total: number; big: React.ReactNode }) {
  const lang = useSettings(s => s.lang), name = useSettings(s => s.name);
  const Ls = packOf(lang).letters, L = Ls[idx], last = Ls.length - 1, wrong = total - right, ok = wrong <= 1, stars = wrong === 0 ? 3 : 2;
  const [rest, setRest] = React.useState(false);
  React.useEffect(() => {
    if (ok) {
      J.pass(idx, stars); audio.sfx.win(); setRest(J.newToday() >= 3);
      Speech.say('أَتْقَنَّا الْحَرْف' + (name ? ' يَا ' + name : '') + '!', true, 'ar', 'ar/say-mastered'); Speech.say(L.name, false, lang, clipOf(lang, 'letter', idx));
    } else Speech.say('اِقْتَرَبْنَا! نُعِيدُ السِّبَاق.', true, 'ar', 'ar/say-retry');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sref = React.useRef<HTMLDivElement>(null);
  useGSAP(() => { if (ok && sref.current && !reducedMotion()) gsap.from(sref.current.querySelectorAll('svg'), { scale: 0, rotate: -120, duration: .7, ease: 'back.out(2.2)', stagger: .18, delay: .2 }); });
  if (!ok) return (
    <>
      {big}
      <div className="text-3xl font-extrabold text-royal">اقتربنا!</div>
      <p className="text-lg font-bold text-ink">{arNum(right)} من {arNum(total)} صحيحة. نعيد السباق مرّة أخرى.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="emerald" size="lg" onClick={() => startRace({ type: 'lesson', idx })}>نعيد السباق</Button>
        <Button variant="ghost" size="lg" onClick={() => go('journey')}>الخريطة</Button>
      </div>
    </>
  );
  return (
    <>
      {big}
      <div ref={sref}><Stars n={stars} size="size-[clamp(48px,10vw,68px)]" className="justify-center gap-2" /></div>
      <div className="text-3xl font-extrabold text-royal">أتقنّا حرف {L.name}!</div>
      {rest && <p className="rounded-2xl bg-gold-soft px-4 py-2 text-[15px] font-bold text-gold-deep">تعلّمنا اليوم {arNum(J.newToday())} حروف جديدة. استراحة الآن، ونكمل غدًا ليثبت الحفظ.</p>}
      <div className="flex flex-wrap justify-center gap-3">
        {idx < last && <Button variant={rest ? 'ghost' : 'emerald'} size="lg" onClick={() => openLesson(idx + 1)}>الحرف التالي</Button>}
        <Button variant={rest || idx === last ? 'emerald' : 'ghost'} size="lg" onClick={() => go('journey')}>الخريطة</Button>
      </div>
    </>
  );
}
