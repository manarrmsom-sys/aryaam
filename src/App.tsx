import * as React from 'react';
import { ClickSpark } from '@/components/fx';
import { SmoothScroll } from '@/components/SmoothScroll';
import { Toaster } from '@/components/common';
import { audio } from '@/engine/audio/AudioEngine';
import { cn } from '@/lib/utils';
import { JourneyMap } from '@/screens/Journey';
import { Landing } from '@/screens/Landing';
import { Lesson } from '@/screens/Lesson';
import { Parent } from '@/screens/parent/Parent';
import { Race } from '@/screens/race/Race';
import { Setup } from '@/screens/Setup';
import { setGameCanvas, useNav } from '@/store/nav';
import { useRace } from '@/store/race';

/** The praise / correction pill. Lives at the top level because both the race and the tracing pad use it. */
function FlashPill() {
  const f = useRace(s => s.flash);
  if (!f) return null;
  return (
    <div key={f.id} role="status" className={cn('harakat pointer-events-none fixed left-1/2 top-[38%] z-[90] animate-pop whitespace-nowrap rounded-full px-9 py-2 font-display text-[clamp(32px,7vw,72px)] font-black text-white shadow-lift', f.ok ? 'bg-emerald' : 'bg-coral')}>
      {f.text}
    </div>
  );
}

export default function App() {
  const screen = useNav(n => n.screen), lessonKey = useNav(n => n.lessonKey);
  const racing = screen === 'race';
  // music may only start after the first touch; keep it in step with the settings from then on
  React.useEffect(() => {
    const first = () => { audio.ac(); audio.syncMusic(); };
    window.addEventListener('pointerdown', first, { once: true });
    const vis = () => audio.suspend(document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('pointerdown', first); document.removeEventListener('visibilitychange', vis); };
  }, []);
  React.useEffect(() => { if (!racing) audio.setMood('calm'); }, [racing]);

  return (
    <SmoothScroll locked={racing} resetKey={screen + lessonKey}>
      {/* the 3D stage stays mounted so the WebGL context is created once */}
      <canvas ref={setGameCanvas} data-game aria-label="طريق السباق" className={cn('fixed inset-0 size-full touch-none', racing ? 'block' : 'hidden')} />
      {screen === 'landing' && <Landing />}
      {screen === 'setup' && <Setup />}
      {screen === 'journey' && <JourneyMap />}
      {screen === 'lesson' && <Lesson key={lessonKey} />}
      {screen === 'parent' && <Parent />}
      {racing && <Race />}
      <FlashPill />
      <ClickSpark />
      <Toaster />
    </SmoothScroll>
  );
}
