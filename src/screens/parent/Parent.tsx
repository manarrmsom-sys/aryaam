import * as React from 'react';
import { BarChart3, Delete, Mic, Music, Play, RefreshCw, Search, Settings2, ShieldCheck, Square, Trash2, Upload, UserPlus, Users, Volume2 } from 'lucide-react';
import { Stars, TopBar, toast, useJourney, useSpeech } from '@/components/common';
import { Aurora, CountUp, Screen, useReveal } from '@/components/fx';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardTitle, Progress, Segmented, Slider, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { CLIP_GROUPS, COLORS, DIFFS, LANGS, SPEEDS, VOICES, audioList, byId, packOf, type ClipDef, type ClipGroup, type Lang, type VoiceId } from '@/data/content';
import { audio } from '@/engine/audio/AudioEngine';
import { Speech } from '@/engine/audio/Speech';
import { clipStore, formatOf } from '@/engine/audio/clipStore';
import { GAPS, J, type LetterRec } from '@/engine/journey';
import { arNum, cn, pick, today } from '@/lib/utils';
import { go } from '@/store/nav';
import { useSettings } from '@/store/settings';

/* ================= The grown-ups gate ================= */
let unlocked = false;
function Gate({ onPass }: { onPass: () => void }) {
  const [q] = React.useState(() => { const a = pick([6, 7, 8, 9]), b = pick([6, 7, 8, 9]); return { a, b }; });
  const [val, setVal] = React.useState(''), [bad, setBad] = React.useState(false);
  const press = (d: string) => {
    const v = (val + d).slice(0, 2); setVal(v); setBad(false);
    if (v.length === 2) { if (+v === q.a * q.b) { unlocked = true; audio.sfx.ok(); onPass(); } else { setBad(true); audio.sfx.soft(); setTimeout(() => setVal(''), 500); } }
  };
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { const d = '٠١٢٣٤٥٦٧٨٩'.indexOf(e.key); if (/^\d$/.test(e.key)) press(e.key); else if (d >= 0) press(String(d)); else if (e.key === 'Backspace') setVal(v => v.slice(0, -1)); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-[32px] border border-sand/70 bg-white p-7 text-center shadow-lift">
      <span className="grid size-16 place-items-center rounded-3xl bg-royal text-gold"><ShieldCheck size={32} /></span>
      <h2 className="text-2xl font-black text-royal-deep">هذه الصفحة للكبار</h2>
      <p className="text-ink-soft">للدخول نكتب ناتج الضرب:</p>
      <div className="tnum font-display text-4xl font-black text-royal-deep" dir="ltr">{arNum(q.a)} × {arNum(q.b)} = <span className={cn('inline-block min-w-[2ch] rounded-xl border-b-4 border-gold px-1', bad && 'border-coral text-coral')}>{val ? arNum(val) : '؟'}</span></div>
      <div className="grid grid-cols-3 gap-2.5" dir="ltr">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <Button key={d} variant="ghost" className="size-16 text-2xl" onClick={() => press(d)}>{arNum(d)}</Button>)}
        <span />
        <Button variant="ghost" className="size-16 text-2xl" onClick={() => press('0')}>{arNum(0)}</Button>
        <Button variant="ghost" className="size-16" aria-label="مسح" onClick={() => setVal(v => v.slice(0, -1))}><Delete size={22} /></Button>
      </div>
    </div>
  );
}

export function Parent() {
  const [ok, setOk] = React.useState(unlocked);
  return (
    <Screen className="relative min-h-dvh">
      <Aurora className="fixed" />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-12 pt-5 sm:px-6">
        <TopBar title="لوحة الوالدين والمعلّمين" sub="التقدّم، الأصوات، الإعدادات، وملفات الأطفال." onBack={() => go('landing')} backLabel="الصفحة الأولى" />
        {!ok ? <div className="pt-6"><Gate onPass={() => setOk(true)} /></div> : (
          <Tabs defaultValue="progress">
            <TabsList>
              <TabsTrigger value="progress"><BarChart3 size={18} /> التقدّم</TabsTrigger>
              <TabsTrigger value="audio"><Volume2 size={18} /> الأصوات</TabsTrigger>
              <TabsTrigger value="settings"><Settings2 size={18} /> الإعدادات</TabsTrigger>
              <TabsTrigger value="kids"><Users size={18} /> الأطفال</TabsTrigger>
            </TabsList>
            <TabsContent value="progress"><ProgressTab /></TabsContent>
            <TabsContent value="audio"><AudioTab /></TabsContent>
            <TabsContent value="settings"><SettingsTab /></TabsContent>
            <TabsContent value="kids"><KidsTab /></TabsContent>
          </Tabs>
        )}
      </div>
    </Screen>
  );
}

/* ================= Progress ================= */
const LEVELS = ['جديد', 'بداية', 'يتقدّم', 'جيّد', 'متمكّن', 'متقن'];
function dueText(r: LetterRec) { const d = r.due - today(); return d <= 0 ? 'اليوم' : d === 1 ? 'غدًا' : `بعد ${arNum(d)} أيام`; }

function ProgressTab() {
  const Jn = useJourney(), s = useSettings();
  const [who, setWho] = React.useState(s.name), [lang, setLang] = React.useState<Lang>(s.lang);
  const names = Array.from(new Set([...s.profiles.map(p => p.name), ...(s.name ? [s.name] : [])]));
  const Ls = packOf(lang).letters, prof = Jn.profOf(who, lang), recs = Ls.map((_, i) => prof?.L[i]);
  const learned = recs.filter(r => r && r.stars > 0).length, t = today();
  const dueIdx = recs.map((r, i) => (r && r.stars > 0 && r.due <= t ? i : -1)).filter(i => i >= 0);
  const tries = recs.reduce((a, r) => a + (r?.tries || 0), 0), right = recs.reduce((a, r) => a + (r?.ok || 0), 0);
  const weak = recs.map((r, i) => ({ r, i })).filter(x => x.r && (x.r.tries || 0) >= 3 && (x.r.ok || 0) / (x.r.tries || 1) < .7).sort((a, b) => (a.r!.ok! / a.r!.tries!) - (b.r!.ok! / b.r!.tries!));
  const ref = useReveal([who, lang]);
  const en = lang === 'en';
  return (
    <div ref={ref} className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="font-bold text-ink-soft">الطفل:</span>
        {names.length ? names.map(n => (
          <button key={n} type="button" aria-pressed={n === who} onClick={() => setWho(n)} className="rounded-full border-2 border-sand bg-white px-4 py-1 font-bold aria-pressed:border-royal aria-pressed:bg-royal-soft">{n}</button>
        )) : <Badge tone="neutral">لاعب بلا اسم</Badge>}
        <span className="flex-1" />
        <Segmented className="w-56" value={lang} onChange={setLang} options={[{ v: 'ar' as Lang, t: 'العربية' }, { v: 'en' as Lang, t: 'الإنجليزية' }]} />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: 'حروف أتقنها', v: learned, sub: `من ${arNum(Ls.length)}`, tone: 'text-emerald-deep' },
          { l: 'تحتاج مراجعة اليوم', v: dueIdx.length, sub: 'حسب جدول التكرار المتباعد', tone: 'text-coral-deep' },
          { l: 'محاولات في السباق', v: tries, sub: `${arNum(right)} صحيحة`, tone: 'text-royal' },
          { l: 'نسبة الصواب', v: tries ? Math.round((right / tries) * 100) : 0, sub: tries ? 'في رحلة الحروف' : 'لا توجد محاولات بعد', tone: 'text-gold-deep', pct: true },
        ].map(c => (
          <Card key={c.l} data-reveal className="p-4 sm:p-5">
            <div className="text-[15px] font-bold text-ink-soft">{c.l}</div>
            <div className={cn('tnum font-display text-4xl font-black', c.tone)}><CountUp to={c.v} format={n => arNum(n) + (c.pct ? '٪' : '')} /></div>
            <div className="text-sm text-ink-soft">{c.sub}</div>
          </Card>
        ))}
      </div>

      {(dueIdx.length > 0 || weak.length > 0) && (
        <Card data-reveal className="flex flex-col gap-3">
          <CardTitle>حروف تحتاج عناية</CardTitle>
          {dueIdx.length > 0 && <div className="flex flex-wrap items-center gap-2"><Badge tone="coral">حان وقت مراجعتها</Badge>{dueIdx.map(i => <b key={i} className={cn('grid size-11 place-items-center rounded-2xl bg-coral-soft text-2xl font-extrabold text-coral-deep', en && 'en text-lg')}>{Ls[i].ch}</b>)}</div>}
          {weak.length > 0 && <div className="flex flex-wrap items-center gap-2"><Badge tone="gold">أخطاء متكرّرة</Badge>{weak.map(({ i }) => <b key={i} className={cn('grid size-11 place-items-center rounded-2xl bg-gold-soft text-2xl font-extrabold text-gold-deep', en && 'en text-lg')}>{Ls[i].ch}</b>)}</div>}
        </Card>
      )}

      <Card data-reveal className="overflow-hidden p-0 sm:p-0">
        <div className="flex items-center justify-between px-5 pt-5"><CardTitle>تفصيل كل حرف</CardTitle><span className="text-sm text-ink-soft">فواصل المراجعة: {GAPS.slice(1).map(g => arNum(g)).join('، ')} يومًا</span></div>
        <div className="overflow-x-auto">
          <table className="tnum mt-3 w-full min-w-[640px] text-start text-[15px]">
            <thead><tr className="bg-cream text-ink-soft">{['الحرف', 'النجوم', 'مستوى الإتقان', 'المحاولات', 'الصواب', 'الكتابة', 'المراجعة القادمة'].map(h => <th key={h} className="px-4 py-2.5 text-start font-bold">{h}</th>)}</tr></thead>
            <tbody>
              {Ls.map((L, i) => {
                const r = recs[i], tr = r?.tries || 0, acc = tr ? Math.round(((r?.ok || 0) / tr) * 100) : null, isDue = !!r && r.stars > 0 && r.due <= t;
                return (
                  <tr key={L.k} className={cn('border-t border-sand/60', !r && 'text-ink-soft/60')}>
                    <td className="px-4 py-2"><b className={cn('text-2xl font-extrabold text-royal-deep', en && 'en text-xl', !r && 'opacity-40')}>{L.ch}</b></td>
                    <td className="px-4 py-2"><Stars n={r?.stars || 0} size="size-4" /></td>
                    <td className="px-4 py-2"><div className="flex items-center gap-2"><Progress className="w-24" value={((r?.box || 0) / 5) * 100} tone={(r?.box || 0) >= 4 ? 'bg-emerald' : (r?.box || 0) >= 2 ? 'bg-gold' : 'bg-coral'} /><span className="text-sm">{r ? LEVELS[r.box] : '—'}</span></div></td>
                    <td className="px-4 py-2">{tr ? arNum(tr) : '—'}</td>
                    <td className="px-4 py-2">{acc == null ? '—' : <span className={acc >= 80 ? 'text-emerald-deep' : acc >= 60 ? 'text-gold-deep' : 'text-coral-deep'}>{arNum(acc)}٪</span>}</td>
                    <td className="px-4 py-2">{r?.traced ? arNum(r.traced) + ' مرّة' : '—'}</td>
                    <td className="px-4 py-2">{r && r.stars > 0 ? <Badge tone={isDue ? 'coral' : 'neutral'}>{dueText(r)}</Badge> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ================= Audio studio ================= */
const ALL_CLIPS = audioList();

function AudioTab() {
  const speech = useSpeech();
  const [voice, setVoice] = React.useState<VoiceId>(useSettings.getState().voice);
  const [group, setGroup] = React.useState<ClipGroup>('ar-letter'), [query, setQuery] = React.useState('');
  const [server, setServer] = React.useState(false), [provider, setProvider] = React.useState('edge');
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => { void clipStore.keys().then(bump); return clipStore.subscribe(bump); }, []);
  React.useEffect(() => { fetch('/api/audio/status').then(r => (r.ok ? r.json() : null)).then(j => setServer(!!j?.ok)).catch(() => setServer(false)); }, []);
  const list = ALL_CLIPS.filter(c => (query ? c.text.includes(query) || c.clip.includes(query) || c.kind.includes(query) : c.group === group));
  const total = ALL_CLIPS.length, have = ALL_CLIPS.filter(c => speech.hasFile(voice, c.clip)).length, custom = ALL_CLIPS.filter(c => clipStore.has(voice + '/' + c.clip)).length;
  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>استوديو الأصوات</CardTitle>
          <Badge tone="emerald">{arNum(have)} / {arNum(total)} ملفًّا مولَّدًا</Badge>
          {custom > 0 && <Badge tone="gold">{arNum(custom)} تسجيلًا خاصًّا</Badge>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {VOICES.map(v => (
            <button key={v.id} type="button" aria-pressed={voice === v.id} onClick={() => setVoice(v.id)} className="flex items-center gap-2.5 rounded-2xl border-2 border-sand bg-cream p-2.5 text-start aria-pressed:border-gold aria-pressed:bg-gold-soft max-sm:flex-col max-sm:text-center">
              <span className="grid size-10 shrink-0 place-items-center rounded-full font-display text-lg font-black text-white" style={{ background: v.bg }}>{v.av}</span>
              <b className="text-[15px] leading-tight">{v.t}</b>
            </button>
          ))}
        </div>
        <p className="text-[15px] text-ink-soft">
          نستمع لأي ملف، نسجّل بصوت الأم أو المعلّمة مباشرةً، أو نرفع ملفًّا جاهزًا؛ والتسجيل الخاص يُستعمل في اللعبة فورًا لهذه الشخصية ويُحفظ على هذا الجهاز.
          {server ? ' إعادة التوليد تكتب الملف في public/audio مباشرةً.' : ' إعادة التوليد تعمل عند تشغيل المشروع بأمر npm run dev، أو من الطرفية: npm run audio.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-48 flex-1"><Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن حرف أو كلمة أو اسم ملف" className="h-11 w-full rounded-full border-2 border-sand bg-cream pe-4 ps-10 font-bold focus:border-royal focus:outline-none" /></label>
          {server && <label className="flex items-center gap-2 text-[15px] font-bold text-ink-soft">محرّك التوليد
            <select value={provider} onChange={e => setProvider(e.target.value)} className="h-11 rounded-full border-2 border-sand bg-cream px-3 font-bold text-ink"><option value="edge">Edge (مجاني)</option><option value="openai">OpenAI</option><option value="elevenlabs">ElevenLabs</option></select></label>}
        </div>
        {!query && <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {CLIP_GROUPS.map(g => <button key={g.id} type="button" aria-pressed={g.id === group} onClick={() => setGroup(g.id)} className="whitespace-nowrap rounded-full bg-cream-2 px-4 py-2 text-[15px] font-bold text-ink-soft aria-pressed:bg-royal aria-pressed:text-white">{g.t} <span className="tnum opacity-70">{arNum(ALL_CLIPS.filter(c => c.group === g.id).length)}</span></button>)}
        </div>}
      </Card>
      <div className="grid gap-2.5 md:grid-cols-2">
        {list.slice(0, 180).map(c => <ClipRow key={voice + c.clip} c={c} voice={voice} server={server} provider={provider} />)}
        {!list.length && <p className="p-6 text-center text-ink-soft md:col-span-2">لا توجد نتائج.</p>}
      </div>
    </div>
  );
}

function ClipRow({ c, voice, server, provider }: { c: ClipDef; voice: VoiceId; server: boolean; provider: string }) {
  const speech = useSpeech();
  const key = voice + '/' + c.clip, isCustom = clipStore.has(key), has = speech.hasFile(voice, c.clip);
  const [busy, setBusy] = React.useState<'' | 'gen' | 'rec' | 'play'>('');
  const rec = React.useRef<{ mr: MediaRecorder; stream: MediaStream; timer: number } | null>(null), file = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => () => { rec.current?.stream.getTracks().forEach(t => t.stop()); clearTimeout(rec.current?.timer); }, []);

  const play = async () => { audio.ac(); setBusy('play'); const ok = await Speech.preview(voice, c.clip); setBusy(''); if (!ok) toast('لا يوجد تسجيل لهذه الشخصية بعد.'); };
  const regen = async () => {
    setBusy('gen');
    try {
      const r = await fetch('/api/audio/regenerate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voice, clip: c.clip, provider }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || String(r.status));
      Speech.bump(voice, c.clip); toast('أُعيد توليد الملف.'); if (!isCustom) void Speech.preview(voice, c.clip);
    } catch (e) { toast('تعذّر التوليد: ' + String((e as Error).message).slice(0, 90)); }
    setBusy('');
  };
  const stop = () => { const r = rec.current; if (r && r.mr.state !== 'inactive') r.mr.stop(); };
  const record = async () => {
    if (busy === 'rec') return stop();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return toast('التسجيل غير مدعوم في هذا المتصفّح. يمكن رفع ملف صوتي بدلًا منه.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      Speech.stop(); const mr = new MediaRecorder(stream), chunks: Blob[] = [];
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); clearTimeout(rec.current?.timer); rec.current = null; setBusy('');
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        if (blob.size < 800) return toast('التسجيل قصير جدًّا. نجرّب مرّة أخرى.');
        await clipStore.put(key, blob); toast('حُفظ التسجيل، وسيُستعمل في اللعبة من الآن.'); void Speech.preview(voice, c.clip);
      };
      rec.current = { mr, stream, timer: window.setTimeout(stop, 8000) }; mr.start(); setBusy('rec'); audio.sfx.tick();
    } catch { toast('لم نحصل على إذن الميكروفون.'); }
  };
  const upload = async (f?: File) => {
    if (!f) return;
    if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|wav|ogg|webm)$/i.test(f.name)) return toast('الملف ليس ملفًّا صوتيًّا.');
    if (f.size > 3e6) return toast('الملف أكبر من ٣ ميغابايت.');
    await clipStore.put(key, f.type ? f : new Blob([f], { type: 'audio/' + formatOf(f.name) })); toast('رُفع الملف، وسيُستعمل في اللعبة من الآن.'); void Speech.preview(voice, c.clip);
  };
  const Icon = ({ label, onClick, children, tone, disabled }: { label: string; onClick: () => void; children: React.ReactNode; tone?: string; disabled?: boolean }) => (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cn('grid size-10 shrink-0 place-items-center rounded-full bg-cream text-royal transition-colors hover:bg-royal-soft disabled:opacity-40', tone)}>{children}</button>
  );
  return (
    <div className="flex items-center gap-2 rounded-3xl border border-sand/70 bg-white p-2.5 shadow-soft">
      <div className={cn('grid h-14 min-w-14 max-w-32 shrink-0 place-items-center rounded-2xl bg-royal-soft px-2 text-center text-xl font-extrabold leading-tight text-royal-deep', c.lang === 'en' ? 'en' : 'harakat', c.text.length > 8 && 'text-sm')}>{c.text}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold">{c.kind}</div>
        <div className="flex flex-wrap items-center gap-1.5"><code className="truncate text-xs text-ink-soft" dir="ltr">{c.clip}.mp3</code>
          {isCustom ? <Badge tone="gold" className="px-2 text-xs">تسجيل خاص</Badge> : has ? <Badge tone="emerald" className="px-2 text-xs">مولَّد</Badge> : <Badge tone="coral" className="px-2 text-xs">غير موجود</Badge>}</div>
      </div>
      <Icon label="استماع" onClick={play} disabled={busy === 'rec' || busy === 'gen'}><Play size={17} className={cn('fill-current -scale-x-100', busy === 'play' && 'animate-pulse')} /></Icon>
      <Icon label={busy === 'rec' ? 'إيقاف التسجيل' : 'تسجيل بصوتي'} onClick={record} disabled={busy === 'gen'} tone={busy === 'rec' ? 'bg-coral! text-white! animate-pulse' : ''}>{busy === 'rec' ? <Square size={15} className="fill-current" /> : <Mic size={17} />}</Icon>
      <Icon label="رفع ملف صوتي" onClick={() => file.current?.click()} disabled={!!busy}><Upload size={17} /></Icon>
      {server && <Icon label="إعادة التوليد" onClick={regen} disabled={!!busy}><RefreshCw size={17} className={busy === 'gen' ? 'animate-spin' : ''} /></Icon>}
      {isCustom && <Icon label="حذف التسجيل الخاص" onClick={() => { void clipStore.del(key); toast('حُذف التسجيل الخاص وعاد الصوت الأصلي.'); }} tone="text-coral!"><Trash2 size={17} /></Icon>}
      <input ref={file} type="file" accept="audio/*" hidden onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

/* ================= Settings ================= */
function Row({ title, sub, children }: { title: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-sand/60 py-4 first:border-0 first:pt-0 last:pb-0"><div className="min-w-48 flex-1"><div className="font-display text-lg font-bold text-royal-deep">{title}</div>{sub && <div className="text-[15px] text-ink-soft">{sub}</div>}</div>{children}</div>;
}
function SettingsTab() {
  const s = useSettings();
  return (
    <Card>
      <Row title="سرعة اللعبة الافتراضية" sub="تلقائي: تتبع المستوى المختار (سهل: بطيء، متوسّط: عادي، صعب: سريع). رحلة الحروف تبدأ دائمًا بطيئة.">
        <Segmented className="w-full sm:w-[440px]" value={s.defaultSpeed} onChange={v => s.set({ defaultSpeed: v })} options={[{ v: -1, t: 'تلقائي' }, ...SPEEDS.map((x, i) => ({ v: i, t: x.t }))]} />
      </Row>
      <Row title="المستوى الافتراضي"><Segmented className="w-full sm:w-72" value={s.diff} onChange={v => s.set({ diff: v })} options={DIFFS.map(d => ({ v: d.id, t: d.t }))} /></Row>
      <Row title="لغة الحروف"><Segmented className="w-full sm:w-72" value={s.lang} onChange={v => s.set({ lang: v })} options={LANGS.map(l => ({ v: l.id, t: l.id === 'ar' ? 'العربية' : 'الإنجليزية' }))} /></Row>
      <Row title={<span className="flex items-center gap-2"><Music size={19} /> الموسيقى الهادئة</span>} sub="لحن خفيف في الخلفية يخفت تلقائيًّا عندما يتكلّم المعلّم.">
        <Switch checked={s.music} onCheckedChange={v => { audio.ac(); s.set({ music: v }); }} />
      </Row>
      <Row title="مستوى الموسيقى">
        <div className="flex w-full items-center gap-3 sm:w-72"><Slider value={[Math.round(s.musicVol * 100)]} min={0} max={100} step={5} disabled={!s.music} onValueChange={([v]) => { audio.ac(); s.set({ musicVol: v / 100 }); }} /><span className="tnum w-12 text-sm font-bold text-ink-soft">{arNum(Math.round(s.musicVol * 100))}٪</span></div>
      </Row>
      <Row title="كتم كل الأصوات" sub="يوقف صوت المعلّم والمؤثّرات والموسيقى."><Switch checked={s.muted} onCheckedChange={v => { if (v) Speech.stop(); s.set({ muted: v }); }} /></Row>
      <Row title="صوت المعلّم الافتراضي"><Segmented className="w-full sm:w-[440px]" value={s.voice} onChange={v => s.set({ voice: v })} options={VOICES.map(v => ({ v: v.id, t: v.t }))} /></Row>
    </Card>
  );
}

/* ================= Children ================= */
function KidsTab() {
  const s = useSettings(), Jn = useJourney();
  const [name, setName] = React.useState(''), [color, setColor] = React.useState('blue'), [confirm, setConfirm] = React.useState<{ name: string; act: 'del' | 'reset' } | null>(null);
  const add = () => {
    const n = name.trim().slice(0, 16); if (!n) return;
    if (s.profiles.some(p => p.name === n)) return toast('يوجد طفل بهذا الاسم.');
    s.set({ profiles: [...s.profiles, { name: n, color, voice: s.voice }] }); setName(''); toast('أُضيف ' + n + '.');
  };
  const learnedOf = (n: string, l: Lang) => Object.values(Jn.profOf(n, l)?.L || {}).filter(r => r.stars > 0).length;
  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-3">
        <CardTitle>إضافة طفل</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} maxLength={16} placeholder="اسم الطفل" className="h-12 min-w-44 flex-1 rounded-2xl border-2 border-sand bg-cream px-4 text-lg font-bold focus:border-royal focus:outline-none" />
          <div className="flex gap-2" role="radiogroup" aria-label="لون السيارة">{COLORS.map(c => <button key={c.id} type="button" role="radio" aria-checked={color === c.id} aria-label={c.t} onClick={() => setColor(c.id)} className="size-9 rounded-full border-[3px] border-white shadow-[0_0_0_2px_var(--color-sand)] aria-checked:shadow-[0_0_0_3px_var(--color-royal)]" style={{ background: c.hex }} />)}</div>
          <Button onClick={add} disabled={!name.trim()}><UserPlus size={19} /> إضافة</Button>
        </div>
      </Card>
      {!s.profiles.length && <p className="p-4 text-center text-ink-soft">لا توجد ملفات بعد. يُنشأ الملف تلقائيًّا عند كتابة اسم السائق وبدء اللعب.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {s.profiles.map(p => {
          const active = p.name === s.name, ar = learnedOf(p.name, 'ar'), en = learnedOf(p.name, 'en');
          return (
            <Card key={p.name} className={cn('flex flex-col gap-3', active && 'border-2 border-royal')}>
              <div className="flex items-center gap-3">
                <span className="grid size-14 place-items-center rounded-full border-4 border-white font-display text-2xl font-black text-white shadow-soft" style={{ background: byId(COLORS, p.color).hex }}>{p.name[0]}</span>
                <div className="min-w-0 flex-1"><div className="truncate font-display text-xl font-extrabold text-royal-deep">{p.name}</div><div className="text-sm text-ink-soft">{byId(VOICES, p.voice).t}</div></div>
                {active ? <Badge tone="emerald">يلعب الآن</Badge> : <Button size="sm" variant="soft" onClick={() => s.selectProfile(p.name)}>اختيار</Button>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="mb-1 flex justify-between font-bold"><span>العربية</span><span className="tnum">{arNum(ar)} / ٢٨</span></div><Progress value={(ar / 28) * 100} /></div>
                <div><div className="mb-1 flex justify-between font-bold"><span>الإنجليزية</span><span className="tnum">{arNum(en)} / ٢٦</span></div><Progress value={(en / 26) * 100} tone="bg-royal" /></div>
              </div>
              {confirm?.name === p.name ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-coral-soft p-3 text-[15px] font-bold text-coral-deep">
                  <span className="flex-1">{confirm.act === 'del' ? 'نحذف الملف وكل تقدّمه؟ لا يمكن التراجع.' : 'نمسح تقدّم الرحلة لهذا الطفل؟ لا يمكن التراجع.'}</span>
                  <Button size="sm" variant="coral" onClick={() => { J.resetProfile(p.name); if (confirm.act === 'del') s.removeProfile(p.name); setConfirm(null); toast(confirm.act === 'del' ? 'حُذف الملف.' : 'مُسح التقدّم.'); }}>نعم</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>إلغاء</Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirm({ name: p.name, act: 'reset' })}><RefreshCw size={16} /> مسح التقدّم</Button>
                  <Button size="sm" variant="ghost" className="text-coral-deep" onClick={() => setConfirm({ name: p.name, act: 'del' })}><Trash2 size={16} /> حذف الملف</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
