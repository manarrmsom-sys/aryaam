import * as React from 'react';
import { ReactLenis, type LenisRef } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'lenis/dist/lenis.css';
import { reducedMotion } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps the app in Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger and Lenis stay in step.
 * `locked` freezes scrolling (used while the race is on screen).
 */
export function SmoothScroll({ children, locked, resetKey }: { children: React.ReactNode; locked?: boolean; resetKey?: string }) {
  const ref = React.useRef<LenisRef>(null);
  React.useEffect(() => {
    const update = (time: number) => ref.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update); gsap.ticker.lagSmoothing(0);
    const off = ref.current?.lenis?.on('scroll', ScrollTrigger.update);
    return () => { gsap.ticker.remove(update); off?.(); };
  }, []);
  React.useEffect(() => {
    const l = ref.current?.lenis; if (!l) return;
    if (locked) l.stop(); else l.start();
    document.documentElement.classList.toggle('racing', !!locked);
  }, [locked]);
  // every new screen starts at the top
  React.useEffect(() => { ref.current?.lenis?.scrollTo(0, { immediate: true, force: true }); window.scrollTo(0, 0); ScrollTrigger.refresh(); }, [resetKey]);
  return (
    <ReactLenis root ref={ref} options={{ autoRaf: false, lerp: reducedMotion() ? 1 : .11, smoothWheel: !reducedMotion(), syncTouch: false }}>
      {children}
    </ReactLenis>
  );
}
