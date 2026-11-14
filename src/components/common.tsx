import * as React from 'react';
import { ArrowRight, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { VOICES, byId, clipOf, packOf } from '@/data/content';
import { audio } from '@/engine/audio/AudioEngine';
import { Speech } from '@/engine/audio/Speech';
import { J } from '@/engine/journey';
import { cn } from '@/lib/utils';
import { S, useSettings } from '@/store/settings';
import { go } from '@/store/nav';

export const Star = ({ on, className }: { on: boolean; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path fill={on ? '#F59E0B' : '#EDE7DC'} stroke={on ? '#B45309' : '#D9D0C0'} strokeWidth="1.2" strokeLinejoin="round" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
  </svg>
);
export const Stars = ({ n, className, size = 'size-5' }: { n: number; className?: string; size?: string }) => (
  <span className={cn('flex gap-0.5', className)} dir="ltr" aria-label={`${n} من 3 نجوم`}>{[1, 2, 3].map(k => <Star key={k} on={k <= n} className={size} />)}</span>
);

export function Credit() {
  const en = useSettings(s => s.lang === 'en');
  const a = (t: string) => <a href="https://wa.me/96898520105" target="_blank" rel="noopener" className="font-extrabold text-royal underline underline-offset-4 whitespace-nowrap">{t}</a>;
  return (
    <footer dir={en ? 'ltr' : 'rtl'} className={cn('py-6 text-center text-[15px] font-bold text-ink-soft', en && 'font-en')}>
      {en ? <>Designed &amp; developed by {a('Eng. Abdulaziz Ahmed')}</> : <>تصميم وتطوير {a('م. عبدالعزيز أحمد')}</>}
    </footer>
  );
}

export function MuteButton({ className }: { className?: string }) {
  const muted = useSettings(s => s.muted), set = useSettings(s => s.set);
  return (
    <button type="button" aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'} aria-pressed={muted}
      onClick={() => { if (!muted) Speech.stop(); set({ muted: !muted }); audio.ac(); }}
      className={cn('press grid size-12 place-items-center rounded-full bg-white text-royal border border-sand [--ledge:#E8E1D5]', className)}>
      {muted ? <VolumeX size={22} className="text-coral" /> : <Volume2 size={22} />}
    </button>
  );
}

/** Top bar shared by the scrolling screens. */
export function TopBar({ title, sub, onBack, backLabel = 'رجوع', children }: { title: React.ReactNode; sub?: React.ReactNode; onBack?: () => void; backLabel?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      {onBack && (
        <button type="button" onClick={onBack} aria-label={backLabel} className="press grid size-12 shrink-0 place-items-center rounded-full bg-white text-royal border border-sand [--ledge:#E8E1D5]">
          <ArrowRight size={22} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-[clamp(26px,5vw,40px)] font-black text-royal-deep">{title}</h1>
        {sub && <p className="text-base font-bold text-ink-soft">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

export const ParentButton = ({ className }: { className?: string }) => (
  <button type="button" onClick={() => go('parent')} className={cn('press inline-flex h-12 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-bold text-royal border border-sand [--ledge:#E8E1D5]', className)}>
    <ShieldCheck size={20} /> <span>للوالدين</span>
  </button>
);

/** "Try the voice": with recordings available it plays real clips; the device voice is only the last resort. */
export function greet() {
  audio.ac(); const s = S(), v = byId(VOICES, s.voice), P = packOf(s.lang);
  if (Speech.clipsOn) {
    Speech.say('هَيَّا بِنَا', true, 'ar', 'ar/say-go');
    Speech.say(P.letters[0].name, false, s.lang, clipOf(s.lang, 'letter', 0));
    Speech.say(P.words[0].say, false, s.lang, clipOf(s.lang, 'word', 0));
    Speech.say('أَحْسَنْت', false, 'ar', 'ar/praise-3');
    return;
  }
  Speech.say((s.name ? 'مَرْحَبًا يَا ' + s.name + '! ' : 'مَرْحَبًا! ') + v.hi + '. هَيَّا نَتَعَلَّمُ الْحُرُوف.', true);
  if (s.lang === 'en') Speech.say('Hello! A, B, C. Apple, ball, cat.', false, 'en');
}

/** Re-render when the journey data changes. */
export function useJourney() {
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => J.subscribe(bump), []);
  return J;
}
/** Re-render when the narrator's state (manifest, device voices) changes. */
export function useSpeech() {
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => Speech.subscribe(bump), []);
  return Speech;
}

let toastSet: ((m: string) => void) | null = null;
export const toast = (m: string) => toastSet?.(m);
export function Toaster() {
  const [msg, setMsg] = React.useState(''); const [on, setOn] = React.useState(false); const t = React.useRef(0);
  React.useEffect(() => { toastSet = m => { setMsg(m); setOn(true); clearTimeout(t.current); t.current = window.setTimeout(() => setOn(false), 2800); }; return () => { toastSet = null; }; }, []);
  return <div role="status" className={cn('pointer-events-none fixed bottom-8 left-1/2 z-[99] max-w-[90vw] -translate-x-1/2 rounded-full bg-royal-deep px-5 py-2.5 text-center text-base font-bold text-white shadow-lift transition-all duration-300', on ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3')}>{msg}</div>;
}
