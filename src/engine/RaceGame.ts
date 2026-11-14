/**
 * The race rules: a queue of questions, three gates per question, the car picks a lane.
 * Same rules as the original prototype — the state machine, scoring, the "missed item returns
 * two questions later" retrieval rule and the journey hooks are unchanged.
 */
import { DIFFS, PRAISE, SPEEDS, byId, COLORS, packOf, type Question } from '@/data/content';
import { buildQueue } from '@/data/questions';
import { arNum, clamp, pick, rand, reducedMotion, shuffle } from '@/lib/utils';
import { S } from '@/store/settings';
import { flash, useRace } from '@/store/race';
import { audio } from './audio/AudioEngine';
import { Speech } from './audio/Speech';
import { J, journeyQueue, type JourneyRun } from './journey';
import { LANE_X, World } from './three/World';

type RunQ = Question & { key?: number };
const set = useRace.setState;

export class RaceGame {
  world: World;
  /** Called when a lesson race ends (the lesson screen shows the result instead of the end overlay). */
  onLessonDone: ((r: { right: number; total: number }) => void) | null = null;

  private G = {
    state: 'idle' as 'idle' | 'countdown' | 'playing' | 'paused' | 'ended', lane: 1, speedLv: 0, cur: 0, score: 0, gems: 0, right: 0, streak: 0, qi: 0,
    queue: [] as RunQ[], q: null as RunQ | null, missed: [] as string[], elapsed: 0, rowActive: false, judged: false, nextIn: 0, shake: 0, dist: 0, reveal: 0,
    jr: null as JourneyRun | null, jrUp: {} as Record<number, 1>,
  };
  private raf = 0; private last = 0; private lastSec = -1; private countT = 0;
  private pd: { x: number; y: number } | null = null;
  private reduce = reducedMotion();

  constructor(canvas: HTMLCanvasElement) {
    this.world = new World(canvas);
    window.addEventListener('resize', () => this.world.resize());
    canvas.addEventListener('pointerdown', e => { this.pd = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
      if (!this.pd) return; const dx = e.clientX - this.pd.x, dy = e.clientY - this.pd.y; this.pd = null;
      if (this.G.state !== 'playing') return;
      if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) this.setLane(this.G.lane + (dx > 0 ? 1 : -1));
      else if (Math.abs(dx) < 14 && Math.abs(dy) < 14) this.setLane(this.world.laneAt(e.clientX, e.clientY, this.G.rowActive));
    });
    canvas.addEventListener('pointercancel', () => { this.pd = null; });
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    document.fonts?.ready.then(() => this.world.repaintText()).catch(() => {});
  }

  get state() { return this.G.state; }
  get jr() { return this.G.jr; }
  get lane() { return this.G.lane; }

  /* ---------- HUD ---------- */
  private hudSync() { const G = this.G; set({ score: G.score, gems: G.gems, qi: Math.min(G.qi + 1, G.queue.length), total: G.queue.length, speedLv: G.speedLv }); }
  private showTarget(on: boolean, off = false) {
    const q = this.G.q; if (!q) return;
    set({ target: { off, emoji: q.emoji || '', text: on ? (q.card || q.show) : (q.emoji ? '' : '؟'), hideText: !on && !!q.emoji, en: S().lang === 'en' } });
  }
  private targetOff() { set(s => ({ target: { ...s.target, off: true } })); }
  private targetPolicy() {
    const G = this.G, s = S();
    const always = Speech.missing(s.lang) || (G.jr ? G.qi === 0 : s.diff === 'easy'), brief = !!G.jr || s.diff === 'medium';
    this.showTarget(always || brief);
    G.reveal = always ? Infinity : (brief ? 2.6 : 0);
  }
  sayTarget(flush: boolean) { const q = this.G.q; if (q) Speech.say(q.say, flush, S().lang, q.clip); }
  /** Tapping the target card: hear it again and peek at it. */
  repeatTarget() {
    const G = this.G; if (G.state !== 'playing' || !G.q) return;
    this.sayTarget(true); this.showTarget(true); if (G.reveal !== Infinity) G.reveal = 2;
  }

  /* ---------- controls ---------- */
  setLane(i: number) { i = clamp(i, 0, 2); const G = this.G; if (G.state !== 'playing' || i === G.lane) return; G.lane = i; audio.sfx.move(); }
  setSpeed(i: number) { i = clamp(i, 0, SPEEDS.length - 1); if (i === this.G.speedLv) return; this.G.speedLv = i; set({ speedLv: i }); audio.sfx.speed(i); }
  nudgeSpeed(d: number) { if (this.G.state === 'playing') this.setSpeed(this.G.speedLv + d); }
  private onKey = (e: KeyboardEvent) => {
    const G = this.G; if (G.state === 'idle') return;
    const tgt = e.target as HTMLElement | null; if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
    const k = e.key;
    if (k === 'ArrowLeft') this.setLane(G.lane - 1);
    else if (k === 'ArrowRight') this.setLane(G.lane + 1);
    else if (k === '1' || k === '١') this.setLane(2);
    else if (k === '2' || k === '٢') this.setLane(1);
    else if (k === '3' || k === '٣') this.setLane(0);
    else if (k === '+' || k === '=') this.nudgeSpeed(1);
    else if (k === '-' || k === '_') this.nudgeSpeed(-1);
    else if (k === ' ' || k === 'p' || k === 'P' || k === 'Escape') { if (G.state === 'playing') this.pause(); else if (G.state === 'paused') this.resume(); }
    else return;
    e.preventDefault();
  };

  /* ---------- questions ---------- */
  private spawnRow() {
    const G = this.G, w = this.world, P = packOf(S().lang), en = P.lang === 'en';
    const q = (G.q = G.queue[G.qi]);
    const lanes = shuffle([0, 1, 2]); q.lane = lanes[0];
    w.drawSign(lanes[0], q.show, P.font, en); w.drawSign(lanes[1], q.opts[0].show, P.font, en); w.drawSign(lanes[2], q.opts[1].show, P.font, en);
    const D = clamp(SPEEDS[G.speedLv].v * 4.4, 95, 175);
    w.row.position.z = -D; w.row.visible = true; G.rowActive = true; G.judged = false;
    const n = 1 + ((Math.random() * 2) | 0);
    w.gems.forEach((m, i) => { m.visible = i < n; if (i < n) m.position.set(LANE_X[(Math.random() * 3) | 0], 1.1, -D * (.32 + i * .2)); });
    this.targetPolicy(); this.sayTarget(false); this.hudSync();
  }
  private judge() {
    const G = this.G, q = G.q!, s = S(), w = this.world; G.judged = true;
    if (G.jr && q.key != null) J.answer(q.key, G.lane === q.lane, G.jrUp);
    if (G.lane === q.lane) {
      G.streak++; G.right++; G.score += 10 + (G.streak >= 3 ? 5 : 0);
      w.burst(w.car.position.x, 1.2, -1, 80); w.flash(w.car.position.x); audio.sfx.ok();
      const p = pick(PRAISE); flash(p + '!', true);
      Speech.say(s.name && G.right % 3 === 0 ? p + ' يَا ' + s.name + '!' : p + '!', true, 'ar', 'ar/praise-' + (PRAISE.indexOf(p) + 1));
      if (G.jr && G.streak % 3 === 0 && G.speedLv < 2) this.setSpeed(G.speedLv + 1);   // fluency: a little faster after three in a row
      G.nextIn = .9;
    } else {
      G.streak = 0; if (!G.missed.includes(q.show)) G.missed.push(q.show);
      audio.sfx.bad(); G.shake = .45; flash('الصحيح: ' + q.show, false);
      Speech.say('الْإِجَابَةُ الصَّحِيحَة', true, 'ar', 'ar/say-correct'); Speech.say(q.say, false, s.lang, q.clip);
      // a missed item comes back two questions later, once, so the child retrieves it while it is fresh
      if (!q.again && !(G.jr && G.jr.type === 'lesson')) G.queue.splice(Math.min(G.queue.length, G.qi + 3), 0, Object.assign({}, q, { again: true }));
      if (G.jr && G.speedLv > 0) this.setSpeed(G.speedLv - 1);
      G.nextIn = 2.3;
    }
    G.qi++; this.targetOff(); set({ score: G.score });
  }

  /* ---------- run lifecycle ---------- */
  private resetRun() {
    const G = this.G, s = S(), d = byId(DIFFS, s.diff), w = this.world;
    Object.assign(G, { jrUp: {}, lane: 1, speedLv: G.jr ? 0 : (s.defaultSpeed >= 0 ? clamp(s.defaultSpeed, 0, SPEEDS.length - 1) : d.sp), score: 0, gems: 0, right: 0, streak: 0, qi: 0, q: null, missed: [], elapsed: 0, rowActive: false, judged: false, nextIn: 0, shake: 0 });
    G.queue = G.jr ? journeyQueue(G.jr) : buildQueue(s.lang, s.mode, s.diff, d.n);
    w.row.visible = false; w.gems.forEach(m => { m.visible = false; }); w.car.position.x = 0;
    this.lastSec = -1;
    set({ sec: 0, result: null, flash: null, jr: G.jr }); this.targetOff(); this.hudSync();
  }
  startRun(jr: JourneyRun | null = null) {
    const G = this.G, s = S(); audio.ac();
    G.jr = jr;
    this.world.paint(byId(COLORS, s.color).hex);
    this.resetRun(); G.state = 'countdown'; set({ state: 'countdown' });
    audio.setMood('race'); audio.syncMusic();
    requestAnimationFrame(() => this.world.resize());
    Speech.say(s.name ? 'هَيَّا بِنَا يَا ' + s.name + '!' : 'هَيَّا بِنَا!', true, 'ar', 'ar/say-go');
    const steps = ['٣', '٢', '١', 'هيّا!']; let i = 0;
    clearInterval(this.countT);
    const step = () => {
      if (i < steps.length) { set({ count: steps[i] }); if (i < 3) audio.sfx.tick(); else audio.sfx.go(); i++; }
      else { clearInterval(this.countT); set({ count: null }); if (G.state === 'countdown') { G.state = 'playing'; G.nextIn = .2; set({ state: 'playing' }); } }
    };
    step(); this.countT = window.setInterval(step, 800);
    this.loop();
  }
  rerun() { this.startRun(this.G.jr); }
  pause() { const G = this.G; if (G.state !== 'playing') return; G.state = 'paused'; Speech.stop(); set({ state: 'paused' }); }
  resume() { const G = this.G; if (G.state !== 'paused') return; G.state = 'playing'; set({ state: 'playing' }); if (G.rowActive && !G.judged) this.sayTarget(true); }
  /** Leave the race (to the setup screen or the journey map). */
  stop() {
    clearInterval(this.countT); Speech.stop(); this.G.state = 'idle'; this.G.jr = null;
    cancelAnimationFrame(this.raf); this.raf = 0;
    audio.setMood('calm');
    set({ state: 'idle', count: null, result: null, jr: null });
  }
  private finish() {
    const G = this.G, s = S(), w = this.world; this.targetOff();
    if (G.jr && G.jr.type === 'lesson') {
      const r = { right: G.right, total: G.queue.length };
      this.stop(); this.onLessonDone?.(r); return;
    }
    G.state = 'ended';
    const total = G.queue.length, ratio = G.right / total, stars = ratio >= .9 ? 3 : ratio >= .6 ? 2 : 1;
    set({ state: 'ended', result: { title: s.name ? 'عملٌ رائع يا ' + s.name + '!' : 'خطّ النهاية!', stars, score: G.score, gems: G.gems, right: G.right, total, time: G.elapsed, missed: G.missed.slice(), en: s.lang === 'en', journey: !!G.jr } });
    [0, .25, .5].forEach(t => setTimeout(() => w.burst(rand(-3, 3), 2, -3, 60), t * 1000)); audio.sfx.win(); audio.setMood('calm');
    Speech.say(s.name ? 'عَمَلٌ رَائِعٌ يَا ' + s.name + '! وَصَلْنَا إِلَى خَطِّ النِّهَايَة.' : 'عَمَلٌ رَائِع! وَصَلْنَا إِلَى خَطِّ النِّهَايَة.', true, 'ar', 'ar/say-finish');
  }

  /* ---------- loop ---------- */
  private loop() {
    if (this.raf) return;
    this.last = performance.now();
    const frame = (now: number) => {
      if (this.G.state === 'idle') { this.raf = 0; return; }
      this.raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
      if (this.G.state !== 'paused') this.update(dt, now / 1000);
      this.world.render();
    };
    this.raf = requestAnimationFrame(frame);
  }
  private update(dt: number, t: number) {
    const G = this.G, w = this.world;
    const want = G.state === 'playing' ? SPEEDS[G.speedLv].v : G.state === 'countdown' ? 9 : 6;
    G.cur += (want - G.cur) * Math.min(1, dt * 2.5);
    const d = G.cur * dt; G.dist += d;
    w.scroll(d, G.dist, dt);
    w.driveCar(G.lane, d, dt, t, G.cur);

    if (G.state === 'playing') {
      G.elapsed += dt; const sec = Math.floor(G.elapsed); if (sec !== this.lastSec) { this.lastSec = sec; set({ sec }); }
      if (G.reveal !== Infinity && G.reveal > 0) { G.reveal -= dt; if (G.reveal <= 0) this.showTarget(false); }
      if (G.rowActive) {
        w.row.position.z += d;
        if (!G.judged && w.row.position.z >= -1.4) this.judge();
        if (w.row.position.z > 20) { w.row.visible = false; G.rowActive = false; }
      } else if (G.nextIn > 0) {
        G.nextIn -= dt;
        if (G.nextIn <= 0) { if (G.qi >= G.queue.length) this.finish(); else this.spawnRow(); }
      }
      for (const m of w.gems) {
        if (!m.visible) continue;
        m.position.z += d; m.rotation.y += dt * 3; m.position.y = 1.1 + Math.sin(t * 4 + m.position.x) * .15;
        if (Math.abs(m.position.z) < 1.5 && Math.abs(m.position.x - w.car.position.x) < 1.3) {
          m.visible = false; G.gems++; set({ gems: G.gems }); audio.sfx.gem(); w.burst(m.position.x, 1.2, 0, 18, [[.2, .85, 1], [1, 1, 1]]);
        } else if (m.position.z > 14) m.visible = false;
      }
    }
    w.particles(dt, G.cur);
    let sx = 0, sy = 0;
    if (G.shake > 0) { G.shake -= dt; if (!this.reduce) { sx = (Math.random() - .5) * G.shake * 1.2; sy = (Math.random() - .5) * G.shake * .8; } }
    w.aimCamera(sx, sy);
  }
}

let game: RaceGame | null = null;
export const getGame = () => game;
export function initGame(canvas: HTMLCanvasElement): RaceGame { return game || (game = new RaceGame(canvas)); }
export const fmtCount = (a: number, b: number) => arNum(a) + ' / ' + arNum(b);
