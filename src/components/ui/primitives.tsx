/* shadcn-style primitives on Radix, themed for this app. */
import * as React from 'react';
import { Dialog as D, Slider as Sl, Switch as Sw, Tabs as T } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- Card ---------- */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...p }, ref) => (
  <div ref={ref} className={cn('rounded-[28px] bg-white border border-sand/70 shadow-soft p-5 sm:p-6', className)} {...p} />
));
Card.displayName = 'Card';
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className={cn('text-xl font-extrabold text-royal-deep', className)} {...p} />;

/* ---------- Badge ---------- */
export const Badge = ({ className, tone = 'royal', ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'royal' | 'gold' | 'emerald' | 'coral' | 'neutral' }) => (
  <span
    className={cn('inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-bold whitespace-nowrap', {
      royal: 'bg-royal-soft text-royal', gold: 'bg-gold-soft text-gold-deep', emerald: 'bg-emerald-soft text-emerald-deep', coral: 'bg-coral-soft text-coral-deep', neutral: 'bg-cream-2 text-ink-soft',
    }[tone], className)}
    {...p}
  />
);

/* ---------- Progress ---------- */
export const Progress = ({ value, className, tone = 'bg-emerald' }: { value: number; className?: string; tone?: string }) => (
  <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-cream-2', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
    <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

/* ---------- Dialog ---------- */
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export function DialogContent({ className, children, title, hideClose, ...p }: React.ComponentProps<typeof D.Content> & { title: string; hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-[80] bg-royal-deep/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
      <D.Content
        className={cn('fixed left-1/2 top-1/2 z-[81] w-[min(560px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] bg-white p-6 sm:p-8 shadow-lift', className)}
        {...p}
      >
        <D.Title className="font-display text-2xl sm:text-3xl font-black text-royal-deep text-center">{title}</D.Title>
        <D.Description className="sr-only">{title}</D.Description>
        {children}
        {!hideClose && (
          <D.Close className="absolute top-4 left-4 grid size-10 place-items-center rounded-full bg-cream text-ink-soft hover:bg-cream-2" aria-label="إغلاق">
            <X size={20} />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

/* ---------- Switch ---------- */
export const Switch = ({ className, ...p }: React.ComponentProps<typeof Sw.Root>) => (
  <Sw.Root dir="ltr" className={cn('relative h-8 w-14 shrink-0 rounded-full bg-sand transition-colors data-[state=checked]:bg-emerald', className)} {...p}>
    <Sw.Thumb className="block size-6 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-7" />
  </Sw.Root>
);

/* ---------- Slider ---------- */
export const Slider = ({ className, ...p }: React.ComponentProps<typeof Sl.Root>) => (
  <Sl.Root dir="rtl" className={cn('relative flex h-8 w-full touch-none items-center', className)} {...p}>
    <Sl.Track className="relative h-2.5 grow rounded-full bg-cream-2">
      <Sl.Range className="absolute h-full rounded-full bg-gold" />
    </Sl.Track>
    <Sl.Thumb className="block size-7 rounded-full border-4 border-gold bg-white shadow-soft" aria-label="المستوى" />
  </Sl.Root>
);

/* ---------- Tabs ---------- */
export const Tabs = ({ className, ...p }: React.ComponentProps<typeof T.Root>) => <T.Root dir="rtl" className={cn('flex flex-col gap-5', className)} {...p} />;
export const TabsList = ({ className, ...p }: React.ComponentProps<typeof T.List>) => (
  <T.List className={cn('flex gap-1 overflow-x-auto rounded-full bg-cream-2 p-1.5 [scrollbar-width:none]', className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }: React.ComponentProps<typeof T.Trigger>) => (
  <T.Trigger
    className={cn('flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 font-display text-[15px] font-bold text-ink-soft transition-colors data-[state=active]:bg-white data-[state=active]:text-royal data-[state=active]:shadow-soft', className)}
    {...p}
  />
);
export const TabsContent = T.Content;

/* ---------- Segmented choice ---------- */
export function Segmented<V extends string | number>({ value, onChange, options, className }: { value: V; onChange: (v: V) => void; options: { v: V; t: string }[]; className?: string }) {
  return (
    <div className={cn('grid auto-cols-fr grid-flow-col gap-1.5 rounded-2xl bg-cream-2 p-1.5', className)} role="radiogroup">
      {options.map(o => (
        <button
          key={String(o.v)} type="button" role="radio" aria-checked={o.v === value} onClick={() => onChange(o.v)}
          className={cn('rounded-xl px-1 py-2 text-[15px] font-bold text-ink-soft transition-colors', o.v === value && 'bg-white text-royal shadow-soft')}
        >{o.t}</button>
      ))}
    </div>
  );
}
