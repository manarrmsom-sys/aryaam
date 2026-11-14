import * as React from 'react';
import { Check, Play, Volume2 } from 'lucide-react';
import { CarPreview } from '@/components/CarPreview';
import { Credit, MuteButton, ParentButton, TopBar, greet, useSpeech } from '@/components/common';
import { Aurora, Screen, TiltCard, useReveal } from '@/components/fx';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/primitives';
import { COLORS, DIFFS, LANGS, MODES_BY, VOICES, byId } from '@/data/content';
import { audio } from '@/engine/audio/AudioEngine';
import { arNum, cn } from '@/lib/utils';
import { go, startRace } from '@/store/nav';
import { useSettings } from '@/store/settings';

/** A big selectable tile. */
function Choice({ on, onPick, className, children }: { on: boolean; onPick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => { audio.sfx.tap(); onPick(); }}
      className={cn('press relative flex min-w-0 flex-col items-center gap-1 rounded-3xl border-2 border-sand bg-cream px-3 py-4 text-center [--ledge:#E8E1D5] aria-pressed:border-gold aria-pressed:bg-gold-soft aria-pressed:[--ledge:#F59E0B]', className)}>
      {on && <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-gold text-white"><Check size={15} strokeWidth={3.5} /></span>}
      {children}
    </button>
  );
}

const MODE_TONE: Record<string, string> = { letters: 'bg-royal text-white', vowels: 'bg-coral text-white', words: 'bg-emerald text-white', journey: 'bg-gold text-royal-deep' };

export function Setup() {
  const s = useSettings(), speech = useSpeech(), en = s.lang === 'en';
  const ref = useReveal();
  const modes = MODES_BY[s.lang] || MODES_BY.ar;
  const need = en ? (['ar', 'en'] as const) : (['ar'] as const), miss = need.filter(l => speech.missing(l)).map(l => (l === 'ar' ? 'عربي' : 'إنجليزي'));
  const mode = modes.find(m => m.id === s.mode) || modes[0];

  return (
    <Screen className="relative min-h-dvh">
      <Aurora className="fixed" />
      <div ref={ref} className="relative mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-36 pt-5 sm:px-6">
        <TopBar title="نجهّز السباق" sub="نختار الحروف والسائق والسيارة، ثم ننطلق." onBack={() => go('landing')} backLabel="الصفحة الأولى">
          <MuteButton /><ParentButton />
        </TopBar>

        <Card data-reveal>
          <CardTitle className="mb-3">أيّ حروف نتعلّم؟</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            {LANGS.map(l => (
              <Choice key={l.id} on={s.lang === l.id} onPick={() => s.set({ lang: l.id })}>
                <span className={cn('text-[clamp(26px,5vw,40px)] font-extrabold leading-[1.6] text-royal', l.id === 'en' && 'en')}>{l.ex}</span>
                <b className="font-display text-lg">{l.t}</b>
                <span className="text-sm text-ink-soft">{l.d}</span>
              </Choice>
            ))}
          </div>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card data-reveal className="flex flex-col gap-4">
            <div>
              <CardTitle className="mb-2">اسم السائق</CardTitle>
              <input value={s.name} onChange={e => s.set({ name: e.target.value.slice(0, 16).trimStart() })} maxLength={16} placeholder="اكتب الاسم هنا" autoComplete="off" aria-label="اسم السائق"
                className="h-14 w-full rounded-2xl border-2 border-sand bg-cream px-4 text-xl font-bold text-ink placeholder:text-ink-soft/60 focus:border-royal focus:outline-none" />
              {s.profiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.profiles.map(p => (
                    <button key={p.name} type="button" aria-pressed={p.name === s.name} onClick={() => s.selectProfile(p.name)}
                      className="flex items-center gap-2 rounded-full border-2 border-sand bg-white py-1 pe-3 ps-1 text-[15px] font-bold aria-pressed:border-royal aria-pressed:bg-royal-soft">
                      <span className="size-6 rounded-full" style={{ background: byId(COLORS, p.color).hex }} />{p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <CardTitle className="mb-2">لون السيارة</CardTitle>
              <TiltCard max={5} className="overflow-hidden rounded-3xl bg-gradient-to-b from-royal-soft to-cream">
                <CarPreview color={byId(COLORS, s.color).hex} className="h-44 w-full" />
              </TiltCard>
              <div className="mt-3 flex flex-wrap justify-center gap-3" role="radiogroup" aria-label="لون السيارة">
                {COLORS.map(c => (
                  <button key={c.id} type="button" role="radio" aria-checked={s.color === c.id} aria-label={c.t} onClick={() => { audio.sfx.tap(); s.set({ color: c.id }); }}
                    className="size-12 rounded-full border-4 border-white shadow-[0_0_0_2px_var(--color-sand),0_4px_0_rgb(31_42_68/.16)] transition-transform aria-checked:scale-110 aria-checked:shadow-[0_0_0_3px_var(--color-royal),0_4px_0_rgb(31_42_68/.16)]"
                    style={{ background: c.hex }} />
                ))}
              </div>
            </div>
          </Card>

          <Card data-reveal className="flex flex-col gap-4">
            <div>
              <CardTitle className="mb-2">المستوى</CardTitle>
              <div className="grid grid-cols-3 gap-2">
                {DIFFS.map(d => (
                  <Choice key={d.id} on={s.diff === d.id} onPick={() => s.set({ diff: d.id })} className="px-1.5 py-3">
                    <b className="font-display text-lg">{d.t}</b>
                    <span className="text-[13px] leading-snug text-ink-soft">{d.d}</span>
                  </Choice>
                ))}
              </div>
            </div>
            <div>
              <CardTitle className="mb-2">صوت المعلّم</CardTitle>
              <div className="grid grid-cols-3 gap-2">
                {VOICES.map(v => (
                  <Choice key={v.id} on={s.voice === v.id} onPick={() => { s.set({ voice: v.id }); setTimeout(greet, 0); }} className="px-1.5 py-3">
                    <span className="grid size-12 place-items-center rounded-full font-display text-xl font-black text-white" style={{ background: v.bg }}>{v.av}</span>
                    <b className="text-[15px] leading-tight">{v.t}</b>
                    <span className="text-[13px] leading-snug text-ink-soft">{v.d}</span>
                  </Choice>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="soft" size="sm" onClick={greet} silent><Volume2 size={18} /> جرّب الصوت</Button>
                {speech.clipsOn && <span className="text-sm font-bold text-emerald-deep">تسجيلات بصوت طبيعي مفعّلة</span>}
              </div>
              {!speech.clipsOn && (
                <p className="mt-3 rounded-2xl bg-gold-soft px-4 py-2 text-sm text-gold-deep">
                  {!speech.ok ? 'هذا المتصفّح لا يدعم النطق الآلي؛ سيظهر المطلوب مكتوبًا على الشاشة دائمًا.'
                    : miss.length ? `لا يوجد صوت ${miss.join(' ولا ')} مثبَّت على هذا الجهاز، وقد لا يكون النطق دقيقًا. سيبقى المطلوب مكتوبًا على الشاشة.`
                    : `لم نجد التسجيلات في مجلّد audio، فالنطق الآن بصوت الجهاز (${arNum(speech.lists.ar.length)} صوت عربي). لتوليدها: npm run audio`}
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card data-reveal>
          <CardTitle className="mb-3">ماذا نتعلّم؟</CardTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {modes.map(m => (
              <Choice key={m.id} on={mode.id === m.id} onPick={() => s.set({ mode: m.id })} className="items-stretch gap-2 p-3 text-start">
                <span className={cn('harakat grid h-20 place-items-center rounded-2xl text-[clamp(18px,3.4vw,26px)] font-extrabold', MODE_TONE[m.id], en && 'en')}>{m.ex}</span>
                <b className="font-display text-lg leading-tight">{m.t}</b>
                <span className="text-sm leading-snug text-ink-soft">{m.d}</span>
              </Choice>
            ))}
          </div>
        </Card>

        <Card data-reveal>
          <CardTitle className="mb-2">طريقة اللعب</CardTitle>
          <p className="text-base text-ink-soft">
            نلمس البوّابة أو المسار مباشرةً، أو نسحب يمينًا ويسارًا، أو نضغط زرَّي الأسهم على الشاشة. على لوحة المفاتيح: {['→', '←'].map(k => <Kbd key={k}>{k}</Kbd>)} للتنقّل،
            {' '}{['١', '٢', '٣'].map(k => <Kbd key={k}>{k}</Kbd>)} لاختيار المسار من اليمين، {['+', '−'].map(k => <Kbd key={k}>{k}</Kbd>)} للسرعة، ومفتاح المسافة للاستراحة.
          </p>
        </Card>
        <Credit />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-cream via-cream/90 to-transparent px-4 pb-5 pt-10">
        <Button variant="emerald" size="xl" className="pointer-events-auto shadow-lift" onClick={() => startRace()}>
          <Play className="size-7 fill-current -scale-x-100" /> {mode.id === 'journey' ? 'إلى رحلة الحروف' : 'هيّا نلعب!'}
        </Button>
      </div>
    </Screen>
  );
}
const Kbd = ({ children }: { children: React.ReactNode }) => <kbd className="mx-0.5 rounded-lg border-2 border-sand bg-cream px-2 py-0.5 font-body text-sm font-bold text-ink">{children}</kbd>;
