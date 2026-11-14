/**
 * Journey: ordered letters with mastery + spaced review.
 * Leitner-style boxes: a correct answer in a race moves the letter one box up (once per race),
 * any miss sends it back to daily review. Gaps between reviews: 0, 1, 2, 4, 7, 14 days.
 */
import { clipOf, packOf, type Lang, type Question } from '@/data/content';
import { clamp, pick, shuffle, today } from '@/lib/utils';
import { S } from '@/store/settings';

export const GAPS = [0, 1, 2, 4, 7, 14];
/** stars/box/due are the original schedule; tries/ok/traced/last feed the parent dashboard. */
export interface LetterRec { stars: number; box: number; due: number; tries?: number; ok?: number; traced?: number; last?: number }
export interface ProfileRec { L: Record<number, LetterRec>; day: number; n: number }
export type JourneyRun = { type: 'lesson'; idx: number } | { type: 'review' };

const KEY = 'sibaq-journey';
type Listener = () => void;

class Journey {
  data: Record<string, ProfileRec> = {};
  private listeners = new Set<Listener>();
  constructor() { this.load(); }
  load() { try { this.data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { this.data = {}; } }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage unavailable */ } this.listeners.forEach(f => f()); }
  subscribe(f: Listener) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }

  private lang(): Lang { return S().lang; }
  private letters() { return packOf(this.lang()).letters; }
  keyFor(name: string, lang: Lang) { return (lang === 'en' ? 'en:' : '') + (name || '_'); }
  profOf(name: string, lang: Lang): ProfileRec | undefined { return this.data[this.keyFor(name, lang)]; }
  prof(): ProfileRec { const k = this.keyFor(S().name, this.lang()); return this.data[k] || (this.data[k] = { L: {}, day: 0, n: 0 }); }
  rec(i: number): LetterRec | undefined { return this.prof().L[i]; }
  stars(i: number) { const r = this.rec(i); return r ? r.stars : 0; }
  unlocked(i: number) { return i === 0 || this.stars(i - 1) > 0; }
  learned() { return this.letters().map((_, i) => i).filter(i => this.stars(i) > 0); }
  due() { const t = today(); return this.learned().filter(i => this.rec(i)!.due <= t); }
  weight(i: number) { const r = this.rec(i); return r ? (r.due <= today() ? 0 : 10) + r.box + Math.random() * .5 : Math.random(); }

  /** One step up per race at most; any miss sends the letter back to daily review. `up` is the per-race guard. */
  answer(i: number, ok: boolean, up: Record<number, 1>) {
    const p = this.prof(), r = p.L[i] || (p.L[i] = { stars: 0, box: 0, due: today() });
    r.tries = (r.tries || 0) + 1; if (ok) r.ok = (r.ok || 0) + 1; r.last = today();
    if (!ok) { r.box = 0; r.due = today(); up[i] = 1; }
    else if (!up[i]) { up[i] = 1; r.box = Math.min(5, r.box + 1); r.due = today() + GAPS[r.box]; }
    this.save();
  }
  pass(i: number, stars: number) {
    const p = this.prof(), r = p.L[i] || (p.L[i] = { stars: 0, box: 1, due: today() + 1 }), first = !r.stars;
    r.stars = Math.max(r.stars, stars);
    if (first) { if (p.day !== today()) { p.day = today(); p.n = 0; } p.n++; }
    this.save();
  }
  traced(i: number) {
    const p = this.prof(), r = p.L[i] || (p.L[i] = { stars: 0, box: 0, due: today() });
    r.traced = (r.traced || 0) + 1; this.save();
  }
  newToday() { const p = this.prof(); return p.day === today() ? p.n : 0; }
  resetProfile(name: string) { delete this.data[this.keyFor(name, 'ar')]; delete this.data[this.keyFor(name, 'en')]; this.save(); }
  renameProfile(from: string, to: string) {
    (['ar', 'en'] as Lang[]).forEach(l => { const a = this.keyFor(from, l), b = this.keyFor(to, l); if (this.data[a] && !this.data[b]) { this.data[b] = this.data[a]; delete this.data[a]; } });
    this.save();
  }
}
export const J = new Journey();

type JQ = Question & { key: number };
const jOpt = (i: number, low?: boolean) => {
  const lang = S().lang, Ls = packOf(lang).letters;
  return { show: low && lang === 'en' ? Ls[i].low! : Ls[i].ch, say: Ls[i].name, clip: clipOf(lang, 'letter', i), key: i };
};
function jQuestion(k: number, pool: number[], low?: boolean): JQ {
  const P = packOf(S().lang), Ls = P.letters;
  const c = pool.filter(i => i !== k); let n = Math.max(k, ...pool) + 1;
  while (c.length < 2) { const x = n % Ls.length; if (x !== k && !c.includes(x)) c.push(x); n++; }
  const simSet = P.similar.find(g => g.includes(Ls[k].k)) || [], sim = shuffle(c.filter(i => simSet.includes(Ls[i].k))), d: number[] = [];
  if (sim.length) d.push(sim[0]);
  shuffle(c).forEach(i => { if (d.length < 2 && !d.includes(i)) d.push(i); });
  return Object.assign(jOpt(k, low), { opts: d.map(i => jOpt(i, low)) });
}
export function journeyQueue(jr: JourneyRun): JQ[] {
  if (jr.type === 'lesson') {
    const i = jr.idx, prev = Array.from({ length: i }, (_, k) => k), pool = prev.concat(i);
    const rev = prev.slice().sort((a, b) => J.weight(a) - J.weight(b)).slice(0, Math.min(3, i));
    const rest = shuffle(i === 0 ? [0, 0, 0] : [i, i].concat(rev));
    return [i].concat(rest).map(k => jQuestion(k, pool));
  }
  const learned = J.learned(), ks = learned.slice().sort((a, b) => J.weight(a) - J.weight(b)).slice(0, clamp(J.due().length, 6, 10));
  while (ks.length < 6) ks.push(pick(learned));
  return shuffle(ks).map(k => jQuestion(k, learned, true)); // English review uses small letters: b d p q
}
