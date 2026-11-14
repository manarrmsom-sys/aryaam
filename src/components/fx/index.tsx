/* Motion building blocks in the spirit of React Bits: split text, tilt card, click sparks, aurora, count-up, scroll reveal. */
import * as React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { cn, reducedMotion } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ---------- SplitText: words rise in one after another (Arabic stays joined: we split on words, never letters) ---------- */
export function SplitText({ text, className, delay = 0, as: Tag = 'h1' }: { text: string; className?: string; delay?: number; as?: 'h1' | 'h2' | 'p' }) {
  const ref = React.useRef<HTMLElement>(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.from(ref.current!.querySelectorAll('[data-w]'), { yPercent: 110, opacity: 0, rotate: 4, duration: .9, ease: 'power4.out', stagger: .12, delay });
  }, { scope: ref });
  return (
    <Tag ref={ref as React.Ref<never>} className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[.35em] -mb-[.35em] pt-[.3em] -mt-[.3em] align-bottom">
          <span data-w className="inline-block will-change-transform">{w}{i < text.split(' ').length - 1 ? ' ' : ''}</span>
        </span>
      ))}
    </Tag>
  );
}

/* ---------- TiltCard: a card that leans toward the pointer with a moving sheen ---------- */
export function TiltCard({ className, children, max = 9, ...p }: React.HTMLAttributes<HTMLDivElement> & { max?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || e.pointerType === 'touch' || reducedMotion()) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    gsap.to(el, { rotateY: (x - .5) * max * 2, rotateX: (.5 - y) * max * 2, duration: .35, ease: 'power2.out', transformPerspective: 900 });
    el.style.setProperty('--sx', `${x * 100}%`); el.style.setProperty('--sy', `${y * 100}%`);
  };
  const leave = () => { if (ref.current) gsap.to(ref.current, { rotateX: 0, rotateY: 0, duration: .6, ease: 'elastic.out(1,.6)' }); };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={cn('relative [transform-style:preserve-3d] will-change-transform', className)} {...p}>
      {children}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 [div:hover>&]:opacity-100" style={{ background: 'radial-gradient(420px circle at var(--sx,50%) var(--sy,50%), rgb(255 255 255 / .55), transparent 45%)' }} />
    </div>
  );
}

/* ---------- ClickSpark: little golden sparks wherever the child taps ---------- */
export function ClickSpark() {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const cv = ref.current!; const x = cv.getContext('2d')!;
    if (reducedMotion()) return;
    let sparks: { x: number; y: number; a: number; t: number; c: string }[] = [], raf = 0;
    const COL = ['#F59E0B', '#F43F5E', '#10B981', '#1E3A8A'];
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; x.setTransform(d, 0, 0, d, 0, 0); };
    const frame = (now: number) => {
      x.clearRect(0, 0, innerWidth, innerHeight);
      sparks = sparks.filter(s => now - s.t < 420);
      for (const s of sparks) {
        const k = (now - s.t) / 420, e = 1 - (1 - k) ** 3, d = 12 + e * 26, len = 9 * (1 - e);
        x.strokeStyle = s.c; x.lineWidth = 3; x.lineCap = 'round'; x.globalAlpha = 1 - k;
        x.beginPath(); x.moveTo(s.x + Math.cos(s.a) * d, s.y + Math.sin(s.a) * d); x.lineTo(s.x + Math.cos(s.a) * (d + len), s.y + Math.sin(s.a) * (d + len)); x.stroke();
      }
      x.globalAlpha = 1;
      raf = sparks.length ? requestAnimationFrame(frame) : 0;
    };
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest?.('canvas[data-game],canvas[data-trace]')) return;
      const now = performance.now(), c = COL[(Math.random() * COL.length) | 0];
      for (let i = 0; i < 8; i++) sparks.push({ x: e.clientX, y: e.clientY, a: (i / 8) * Math.PI * 2, t: now, c });
      if (!raf) raf = requestAnimationFrame(frame);
    };
    size(); addEventListener('resize', size); addEventListener('pointerdown', down);
    return () => { removeEventListener('resize', size); removeEventListener('pointerdown', down); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[95] size-full" />;
}

/* ---------- Aurora: slow, soft colour fields behind a screen ---------- */
export function Aurora({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.utils.toArray<HTMLElement>('[data-blob]', ref.current).forEach((b, i) => {
      gsap.to(b, { x: i % 2 ? 80 : -70, y: i % 2 ? -50 : 60, scale: 1.15, duration: 9 + i * 2.5, ease: 'sine.inOut', repeat: -1, yoyo: true });
    });
  }, { scope: ref });
  return (
    <div ref={ref} aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div data-blob className="absolute -top-32 -right-24 size-[520px] rounded-full bg-gold/25 blur-[90px]" />
      <div data-blob className="absolute top-1/3 -left-40 size-[560px] rounded-full bg-royal/15 blur-[100px]" />
      <div data-blob className="absolute -bottom-40 right-1/4 size-[480px] rounded-full bg-emerald/18 blur-[90px]" />
      <div data-blob className="absolute top-10 left-1/3 size-[300px] rounded-full bg-coral/12 blur-[80px]" />
      <div className="absolute inset-0 paper-grain" />
    </div>
  );
}

/* ---------- CountUp ---------- */
export function CountUp({ to, format = String, className, duration = 1.1 }: { to: number; format?: (n: number) => string; className?: string; duration?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const o = { v: 0 };
    if (reducedMotion()) { ref.current!.textContent = format(to); return; }
    gsap.to(o, { v: to, duration, ease: 'power2.out', onUpdate: () => { if (ref.current) ref.current.textContent = format(Math.round(o.v)); } });
  }, { dependencies: [to] });
  return <span ref={ref} className={className}>{format(0)}</span>;
}

/* ---------- Reveal: children with [data-reveal] drift up as they scroll into view ---------- */
export function useReveal(deps: unknown[] = []) {
  const ref = React.useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    const items = gsap.utils.toArray<HTMLElement>('[data-reveal]', ref.current);
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: 28 });
    ScrollTrigger.batch(items, { start: 'top 94%', once: true, onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .07, overwrite: true }) });
    ScrollTrigger.refresh();
  }, { scope: ref, dependencies: deps, revertOnUpdate: true });
  return ref;
}

/* ---------- Screen: every screen fades and lifts in ---------- */
export function Screen({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useGSAP(() => { if (!reducedMotion()) gsap.from(ref.current, { opacity: 0, y: 18, duration: .5, ease: 'power3.out', clearProps: 'all' }); });
  return <div ref={ref} className={className}>{children}</div>;
}
