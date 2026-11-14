/**
 * Finger tracing. The letter is drawn faintly; the child's strokes are scored against it:
 *   cov — how much of the letter's ink is covered by the strokes (needs 80%, 66% after two misses)
 *   off — how much of the stroke lies outside a fattened copy of the letter (at most 30%)
 * Three rounds: with a start dot + arrow, with the dot, then on a nearly invisible letter.
 */
import { PRAISE, packOf } from '@/data/content';
import { clamp, pick } from '@/lib/utils';
import { S } from '@/store/settings';
import { flash } from '@/store/race';
import { audio } from './audio/AudioEngine';
import { J } from './journey';

export interface TraceCallbacks { onHint: (t: string) => void; onStage: (stage: number) => void; onSkipOffer: () => void; onDone: () => void }
const N = 360;
const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c.getContext('2d', { willReadFrequently: true })!; };

export class TraceEngine {
  stage = 0; fails = 0; busy = false;
  private x: CanvasRenderingContext2D;
  private ink = mk();
  private strokes: number[][] = [];
  private down = false; private dead = false;
  private font = ''; private ch = ''; private tx = 0; private ty = 0;
  private dil: Uint8ClampedArray = new Uint8ClampedArray(0);
  private pts: number[] = [];
  private start = { x: 0, y: 0, dx: 0, dy: 1 };
  private off: (() => void)[] = [];

  constructor(private cv: HTMLCanvasElement, private idx: number, private cb: TraceCallbacks) {
    cv.width = cv.height = N;
    this.x = cv.getContext('2d')!;
    const pos = (e: PointerEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * N, (e.clientY - r.top) / r.height * N]; };
    const dn = (e: PointerEvent) => { if (this.busy) return; e.preventDefault(); this.down = true; try { cv.setPointerCapture(e.pointerId); } catch { /* not capturable */ } this.strokes.push(pos(e)); this.draw(); };
    const mv = (e: PointerEvent) => { if (!this.down) return; const p = pos(e), st = this.strokes[this.strokes.length - 1]; st.push(p[0], p[1]); this.draw(); };
    const up = () => { if (!this.down) return; this.down = false; this.check(false); };
    cv.addEventListener('pointerdown', dn); cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    this.off.push(() => { cv.removeEventListener('pointerdown', dn); cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); });
    // the letter must be measured with the real web font, not the fallback
    const P = packOf(S().lang);
    (document.fonts ? document.fonts.load(P.font(100), P.trace(idx, 0).ch).catch(() => {}) : Promise.resolve()).then(() => { if (!this.dead) this.init(); });
    this.init();
  }
  destroy() { this.dead = true; this.off.forEach(f => f()); }
  clear() { this.strokes = []; this.draw(); }

  private init() {
    const P = packOf(S().lang), tr = P.trace(this.idx, this.stage), ch = tr.ch;
    this.strokes = [];
    const a = mk(), d = mk(); let fs = 250, g = { l: 0, as: 0, w: 1, h: 1 };
    const measure = () => { a.font = P.font(fs); const m = a.measureText(ch), l = m.actualBoundingBoxLeft || 0, as = m.actualBoundingBoxAscent || fs * .7; g = { l, as, w: l + (m.actualBoundingBoxRight || m.width), h: as + (m.actualBoundingBoxDescent || fs * .2) }; };
    measure(); fs *= clamp(250 / Math.max(g.w, g.h), .6, 1.6); measure();
    this.font = a.font; this.ch = ch; this.tx = (N - g.w) / 2 + g.l; this.ty = (N - g.h) / 2 + g.as;
    [a, d].forEach(c => { c.font = this.font; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = c.strokeStyle = '#000'; });
    a.fillText(ch, this.tx, this.ty);
    d.lineWidth = 46; d.lineJoin = 'round'; d.fillText(ch, this.tx, this.ty); d.strokeText(ch, this.tx, this.ty);
    this.dil = d.getImageData(0, 0, N, N).data;
    const A = a.getImageData(0, 0, N, N).data, pts: number[] = (this.pts = []);
    for (let y = 2; y < N; y += 4) for (let x = 2; x < N; x += 4) if (A[(y * N + x) * 4 + 3] > 128) pts.push(x, y);
    // snap the start point onto the ink, then pull it to the middle of the stroke
    const s = tr.s, px = (N - g.w) / 2 + s[0] * g.w, py = (N - g.h) / 2 + s[1] * g.h; let best = 1e9, bx = px, by = py;
    for (let k = 0; k < pts.length; k += 2) { const dd = (pts[k] - px) ** 2 + (pts[k + 1] - py) ** 2; if (dd < best) { best = dd; bx = pts[k]; by = pts[k + 1]; } }
    let sx = 0, sy = 0, sn = 0;
    for (let k = 0; k < pts.length; k += 2) if ((pts[k] - bx) ** 2 + (pts[k + 1] - by) ** 2 < 18 * 18) { sx += pts[k]; sy += pts[k + 1]; sn++; }
    const dl = Math.hypot(s[2], s[3]) || 1;
    this.start = { x: sn ? sx / sn : bx, y: sn ? sy / sn : by, dx: s[2] / dl, dy: s[3] / dl };
    this.cb.onHint(P.hints[this.stage]); this.cb.onStage(this.stage);
    this.draw();
  }
  private strokePath(x: CanvasRenderingContext2D, w: number, color: string) {
    x.strokeStyle = x.fillStyle = color; x.lineWidth = w; x.lineCap = x.lineJoin = 'round';
    for (const st of this.strokes) {
      if (st.length <= 2) { x.beginPath(); x.arc(st[0], st[1], w / 2, 0, 7); x.fill(); continue; }
      x.beginPath(); x.moveTo(st[0], st[1]); for (let k = 2; k < st.length; k += 2) x.lineTo(st[k], st[k + 1]); x.stroke();
    }
  }
  private draw() {
    const x = this.x, st = this.stage, P = packOf(S().lang); x.clearRect(0, 0, N, N);
    // ruled guide lines, like a handwriting notebook
    x.strokeStyle = '#EFE9DF'; x.lineWidth = 2; x.setLineDash([8, 8]);
    [N * .25, N * .5, N * .75].forEach(y => { x.beginPath(); x.moveTo(16, y); x.lineTo(N - 16, y); x.stroke(); });
    x.setLineDash([]);
    x.font = this.font; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = st < 2 ? '#D9DDEA' : '#F0EEEA'; x.fillText(this.ch, this.tx, this.ty);
    if (st < 2 && !this.strokes.length) {
      const p = this.start;
      if (st < P.arrows) {
        const ex = p.x + p.dx * 54, ey = p.y + p.dy * 54, a = Math.atan2(p.dy, p.dx);
        x.strokeStyle = x.fillStyle = '#059669'; x.lineWidth = 6; x.lineCap = 'round';
        x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(ex, ey); x.stroke();
        x.beginPath(); x.moveTo(ex + Math.cos(a) * 12, ey + Math.sin(a) * 12); x.lineTo(ex + Math.cos(a + 2.4) * 13, ey + Math.sin(a + 2.4) * 13); x.lineTo(ex + Math.cos(a - 2.4) * 13, ey + Math.sin(a - 2.4) * 13); x.closePath(); x.fill();
      }
      x.beginPath(); x.arc(p.x, p.y, 12, 0, 7); x.fillStyle = '#10B981'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke();
    }
    this.strokePath(x, 16, '#1E3A8A');
  }
  private score() {
    const ink = this.ink, pts = this.pts; let n = 0, off = 0, cov = 0;
    ink.clearRect(0, 0, N, N); this.strokePath(ink, 42, '#000');
    const I = ink.getImageData(0, 0, N, N).data;
    for (let k = 0; k < pts.length; k += 2) if (I[(pts[k + 1] * N + pts[k]) * 4 + 3] > 0) cov++;
    for (const st of this.strokes) for (let k = 0; k < st.length; k += 2) { n++; const X = clamp(Math.round(st[k]), 0, N - 1), Y = clamp(Math.round(st[k + 1]), 0, N - 1); if (!this.dil[(Y * N + X) * 4 + 3]) off++; }
    return { n, cov: pts.length ? cov / (pts.length / 2) : 0, off: n ? off / n : 0 };
  }
  /** `asked` is true when the child pressed "done"; lifting the finger only checks silently. */
  check(asked: boolean) {
    if (this.busy || this.dead) return;
    const r = this.score(), need = this.fails >= 2 ? .66 : .8;
    if (r.n > 0 && r.cov >= need && r.off <= .3) {
      this.busy = true; this.stage++; this.fails = 0; audio.sfx.ok(); flash(pick(PRAISE) + '!', true); J.traced(this.idx);
      this.cb.onStage(this.stage);
      setTimeout(() => { this.busy = false; if (this.dead) return; if (this.stage >= 3) this.cb.onDone(); else this.init(); }, 950);
    } else if (asked) {
      this.fails++; audio.sfx.soft();
      const far = r.off > .3 || !r.n;
      this.cb.onHint(!r.n ? 'نكتب الحرف بالإصبع أوّلًا' : far ? 'نبقى فوق الحرف الرمادي. نجرّب مرّة أخرى' : 'بقي جزء من الحرف، نكمله');
      if (far) this.clear();
      if (this.fails >= 3) this.cb.onSkipOffer();
    }
  }
}
