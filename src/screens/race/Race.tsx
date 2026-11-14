import * as React from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronLeft, ChevronRight, Clock, Gem, Maximize, Minus, Music, Pause, Play, Plus, RotateCcw, Volume2 } from 'lucide-react';
import { MuteButton, Star, toast } from '@/components/common';
import { CountUp } from '@/components/fx';
import { Button } from '@/components/ui/button';
import { Segmented, Switch } from '@/components/ui/primitives';
import { COLORS, SPEEDS, VOICES, byId } from '@/data/content';
import { getGame } from '@/engine/RaceGame';
import { arNum, cn, fmtTime, reducedMotion } from '@/lib/utils';
import { leaveRace } from '@/store/nav';
import { useRace } from '@/store/race';
import { useSettings } from '@/store/settings';

function toggleFS() {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const fail = () => toast('ملء الشاشة غير متاح هنا. يمكن فتح الصفحة في نافذة مستقلّة.');
  try {
    if (document.fullscreenElement || doc.webkitFullscreenElement) (document.exitFullscreen || doc.webkitExitFullscreen)?.call(document);
    else { const rq = el.requestFullscreen || el.webkitRequestFullscreen; if (!rq) return fail(); const p = rq.call(el); p?.catch?.(fail); }
  } catch { fail(); }
}

const Chip = ({ className, children, title }: { className?: string; children: React.ReactNode; title?: string }) => (
  <div title={title} className={cn('glass tnum flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[clamp(15px,2vw,20px)] font-extrabold text-royal-deep shadow-soft sm:h-12', className)}>{children}</div>
);
const RoundBtn = ({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className={cn('press glass grid size-11 place-items-center rounded-full text-royal [--ledge:rgb(31_42_68/.18)] sm:size-12', className)} {...p} />
);

export function Race() {
  const r = useRace(), s = useSettings(), game = getGame();
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.key === 'f' || e.key === 'F') && (e.target as HTMLElement)?.tagName !== 'INPUT') toggleFS(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  if (!game) return null;
  const live = r.state === 'playing' || r.state === 'countdown' || r.state === 'paused';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none [&_button]:pointer-events-auto">
      {/* top bar */}
      <div className="absolute inset-x-2.5 top-2.5 flex flex-wrap items-center gap-2">
        <Chip className="max-w-[36vw]"><span className="size-4 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_2px_var(--color-royal-deep)]" style={{ background: byId(COLORS, s.color).hex }} /><b className="truncate">{s.name || 'نجم السباق'}</b></Chip>
        <Chip title="النقاط"><Star on className="size-5" /><b>{arNum(r.score)}</b></Chip>
        <Chip title="الجواهر"><Gem size={19} className="text-sky-500" /><b>{arNum(r.gems)}</b></Chip>
        <Chip title="الوقت" className="max-sm:hidden"><Clock size={18} /><b>{fmtTime(r.sec)}</b></Chip>
        <Chip><small className="text-[.7em] font-bold text-ink-soft max-sm:hidden">السؤال</small><b>{arNum(r.qi)} / {arNum(r.total)}</b></Chip>
        <span className="flex-1" />
        <MuteButton className="glass size-11 border-0 sm:size-12" />
        <RoundBtn aria-label="ملء الشاشة" onClick={toggleFS}><Maximize size={20} /></RoundBtn>
        <RoundBtn aria-label="إيقاف مؤقت" onClick={() => game.pause()}><Pause size={20} className="fill-current" /></RoundBtn>
      </div>
      {/* progress line */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-white/30"><div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${r.total ? ((r.qi - 1) / r.total) * 100 : 0}%` }} /></div>

      {/* the target */}
      <button type="button" aria-label="إعادة النطق" onClick={() => game.repeatTarget()}
        className={cn('absolute left-1/2 top-[clamp(112px,16vh,128px)] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-[28px] border-4 border-gold bg-white px-5 pb-2 pt-1.5 shadow-[0_6px_0_rgb(180_83_9/.55),0_20px_40px_-12px_rgb(31_42_68/.35)] transition-all duration-200 sm:top-[clamp(72px,10vh,100px)]', r.target.off && 'pointer-events-none! scale-90 opacity-0')}>
        <span className="text-[clamp(13px,1.6vw,16px)] font-bold text-ink-soft">المطلوب</span>
        {r.target.emoji && <span className="text-[clamp(30px,5vw,52px)] leading-[1.3]">{r.target.emoji}</span>}
        {!r.target.hideText && <span className={cn('min-w-[1.2em] text-center text-[clamp(34px,6vw,60px)] font-extrabold leading-[1.6] text-royal-deep', r.target.en ? 'en' : 'harakat')} dir={r.target.en ? 'ltr' : 'rtl'}>{r.target.text}</span>}
        <span className="grid size-[clamp(36px,4.5vw,48px)] shrink-0 place-items-center rounded-full bg-royal text-white"><Volume2 size={22} /></span>
      </button>

      {/* lane arrows + speed */}
      {live && <>
        <button type="button" aria-label="إلى اليسار" onClick={() => game.setLane(game.lane - 1)} className="press glass absolute bottom-[clamp(80px,12vh,96px)] left-3.5 grid size-[clamp(64px,10vw,100px)] place-items-center rounded-full text-royal [--ledge:rgb(31_42_68/.2)] active:bg-gold!"><ChevronLeft className="size-1/2" strokeWidth={3.5} /></button>
        <button type="button" aria-label="إلى اليمين" onClick={() => game.setLane(game.lane + 1)} className="press glass absolute bottom-[clamp(80px,12vh,96px)] right-3.5 grid size-[clamp(64px,10vw,100px)] place-items-center rounded-full text-royal [--ledge:rgb(31_42_68/.2)] active:bg-gold!"><ChevronRight className="size-1/2" strokeWidth={3.5} /></button>
        <div className="glass absolute bottom-[clamp(14px,3vh,30px)] left-1/2 flex -translate-x-1/2 items-center gap-2.5 rounded-full p-1.5 shadow-soft">
          <button type="button" aria-label="أبطأ" onClick={() => game.nudgeSpeed(-1)} className="press grid size-[clamp(42px,5vw,54px)] place-items-center rounded-full bg-gold text-royal-deep [--ledge:#B45309]"><Minus strokeWidth={4} /></button>
          <div className="flex min-w-[78px] flex-col items-center gap-1">
            <b className="text-[clamp(15px,1.8vw,18px)] font-extrabold leading-tight text-royal-deep">{SPEEDS[r.speedLv].t}</b>
            <span className="flex gap-1" dir="ltr">{SPEEDS.map((_, i) => <i key={i} className={cn('size-2.5 rounded-full bg-sand transition-colors', i <= r.speedLv && 'bg-gold')} />)}</span>
          </div>
          <button type="button" aria-label="أسرع" onClick={() => game.nudgeSpeed(1)} className="press grid size-[clamp(42px,5vw,54px)] place-items-center rounded-full bg-gold text-royal-deep [--ledge:#B45309]"><Plus strokeWidth={4} /></button>
        </div>
      </>}

      {r.count && <Count key={r.count} text={r.count} />}
      {r.state === 'paused' && <PauseOverlay />}
      {r.state === 'ended' && r.result && <EndOverlay />}
    </div>
  );
}

function Count({ text }: { text: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useGSAP(() => { if (!reducedMotion()) gsap.fromTo(ref.current, { scale: 2, opacity: 0 }, { scale: 1, opacity: 1, duration: .45, ease: 'back.out(2)' }); });
  return <div className="absolute inset-0 grid place-items-center"><div ref={ref} className="font-display text-[clamp(110px,26vw,250px)] font-black text-white [text-shadow:0_8px_0_var(--color-royal),0_14px_40px_rgb(23_37_84/.5)]">{text}</div></div>;
}

function Overlay({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.from(ref.current, { opacity: 0, duration: .25 });
    gsap.from(ref.current!.firstElementChild, { y: 40, scale: .92, opacity: 0, duration: .5, ease: 'back.out(1.6)' });
  });
  return (
    <div ref={ref} className="pointer-events-auto absolute inset-0 grid place-items-center overflow-y-auto bg-royal-deep/55 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="flex w-[min(560px,100%)] flex-col gap-4 rounded-[32px] bg-white p-5 text-center shadow-lift sm:p-8">{children}</div>
    </div>
  );
}

function PauseOverlay() {
  const r = useRace(), s = useSettings(), game = getGame()!;
  return (
    <Overlay>
      <h2 className="text-[clamp(28px,5vw,40px)] font-black text-royal-deep">استراحة قصيرة</h2>
      <Button variant="emerald" size="lg" onClick={() => game.resume()}><Play className="size-6 fill-current -scale-x-100" /> متابعة السباق</Button>
      <div className="text-start"><h3 className="mb-1.5 text-[15px] font-bold text-ink-soft">السرعة</h3><Segmented value={r.speedLv} onChange={v => game.setSpeed(v)} options={SPEEDS.map((x, i) => ({ v: i, t: x.t }))} /></div>
      <div className="text-start"><h3 className="mb-1.5 text-[15px] font-bold text-ink-soft">صوت المعلّم</h3><Segmented value={s.voice} onChange={v => s.set({ voice: v })} options={VOICES.map(v => ({ v: v.id, t: v.t }))} /></div>
      <label className="flex items-center justify-between rounded-2xl bg-cream px-4 py-2.5 text-start"><span className="flex items-center gap-2 font-bold"><Music size={19} /> الموسيقى</span><Switch checked={s.music} onCheckedChange={v => s.set({ music: v })} /></label>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button variant="ghost" onClick={() => s.set({ muted: !s.muted })}>{s.muted ? 'تشغيل الصوت' : 'كتم الصوت'}</Button>
        <Button variant="ghost" onClick={() => game.rerun()}><RotateCcw size={18} /> من البداية</Button>
        <Button variant="ghost" onClick={leaveRace}>{r.jr ? 'الخريطة' : 'الإعدادات'}</Button>
      </div>
    </Overlay>
  );
}

function EndOverlay() {
  const res = useRace(x => x.result)!, game = getGame()!;
  const stars = React.useRef<HTMLDivElement>(null);
  useGSAP(() => { if (!reducedMotion()) gsap.from(stars.current!.children, { scale: 0, rotate: -120, duration: .7, ease: 'back.out(2.2)', stagger: .18, delay: .3 }); });
  return (
    <Overlay>
      <h2 className="text-[clamp(28px,5vw,42px)] font-black text-royal-deep">{res.title}</h2>
      <div ref={stars} className="flex justify-center gap-2" dir="ltr">{[1, 2, 3].map(i => <Star key={i} on={i <= res.stars} className="size-[clamp(52px,11vw,76px)] drop-shadow-md" />)}</div>
      <div className="tnum grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="نقطة"><CountUp to={res.score} format={n => arNum(n)} /></Stat>
        <Stat label="جوهرة"><CountUp to={res.gems} format={n => arNum(n)} /></Stat>
        <Stat label="إجابة صحيحة">{arNum(res.right)} / {arNum(res.total)}</Stat>
        <Stat label="الوقت">{fmtTime(res.time)}</Stat>
      </div>
      {res.missed.length > 0 && (
        <div className="rounded-2xl bg-gold-soft px-4 py-2.5 text-start text-base leading-loose text-gold-deep">
          للمراجعة مرّة أخرى: {res.missed.map(m => <b key={m} className={cn('mx-1.5 inline-block text-2xl font-extrabold text-royal-deep', res.en && 'en')}>{m}</b>)}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button variant="emerald" size="lg" onClick={() => game.rerun()}><RotateCcw size={22} /> سباق جديد</Button>
        <Button variant="ghost" size="lg" onClick={leaveRace}>{res.journey ? 'الخريطة' : 'الإعدادات'}</Button>
      </div>
    </Overlay>
  );
}
const Stat = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-2xl bg-cream px-1 py-2.5"><b className="block text-[clamp(20px,4vw,28px)] font-extrabold text-royal-deep">{children}</b><span className="text-sm text-ink-soft">{label}</span></div>
);
