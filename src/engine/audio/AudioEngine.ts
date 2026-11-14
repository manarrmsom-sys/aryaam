/**
 * Sound effects + a calm, generated background tune, on one Web Audio graph:
 *   sfx ─┐
 *   music ┴─ master ─ compressor ─ speakers
 * Nothing is downloaded: every sound is synthesised, so it works offline and loops seamlessly.
 */
import { S, useSettings } from '@/store/settings';

type Wave = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private musicOn = false;
  private timer = 0;
  private nextBeat = 0;
  private beat = 0;
  private ducked = false;
  private mood: 'calm' | 'race' = 'calm';

  /** Creates/resumes the context. Must first be called from a user gesture. */
  ac(): AudioContext | null {
    try {
      if (!this.ctx) {
        const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!C) return null;
        const a = (this.ctx = new C());
        const comp = a.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .005; comp.release.value = .2;
        this.master = a.createGain(); this.master.gain.value = .9;
        this.sfxBus = a.createGain(); this.sfxBus.gain.value = 1;
        this.musicBus = a.createGain(); this.musicBus.gain.value = 0;
        this.sfxBus.connect(this.master); this.musicBus.connect(this.master);
        this.master.connect(comp); comp.connect(a.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch { return null; }
  }

  /* ---------- SFX ---------- */
  tone(f: number, at: number, dur: number, type: Wave = 'sine', vol = .2, f2?: number) {
    if (S().muted) return;
    const a = this.ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + dur + .03);
  }
  /** A soft bell: fundamental + a quiet octave partial, long decay. */
  private bell(f: number, at: number, vol: number, dur = 1.1, bus?: AudioNode) {
    const a = this.ac(); if (!a) return;
    const t = a.currentTime + at, g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(bus || this.sfxBus);
    [[1, 1], [2, .28], [3.01, .08]].forEach(([m, v]) => {
      const o = a.createOscillator(), og = a.createGain();
      o.type = 'sine'; o.frequency.value = f * m; og.gain.value = v;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + .05);
    });
  }
  sfx = {
    ok: () => { if (!S().muted) [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(f, i * .075, .16, .7)); },
    bad: () => { this.tone(220, 0, .22, 'triangle', .13, 150); this.tone(165, .12, .3, 'triangle', .11, 110); },
    gem: () => { if (!S().muted) { this.bell(1318.5, 0, .1, .35); this.bell(1760, .06, .1, .5); } },
    move: () => this.tone(380, 0, .09, 'sine', .06, 620),
    tick: () => { if (!S().muted) this.bell(660, 0, .12, .25); },
    go: () => { if (!S().muted) { this.bell(880, 0, .16, .6); this.bell(1320, 0, .1, .6); } },
    tap: () => this.tone(520, 0, .06, 'sine', .05, 700),
    soft: () => this.tone(330, 0, .18, 'sine', .1, 260),
    speed: (i: number) => this.tone(300 + i * 110, 0, .12, 'triangle', .1),
    win: () => { if (!S().muted) [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => this.bell(f, i * .09, .15, 1)); },
  };

  /* ---------- Music ---------- */
  // C major pentatonic lullaby over I–vi–IV–V. Eight bars, eighth-note grid; null = rest.
  private static CHORDS = [[130.81, 196, 329.63], [110, 164.81, 261.63], [87.31, 174.61, 261.63], [98, 146.83, 246.94]];
  private static N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, G4: 392, A4: 440 };
  private static MELODY: (number | null)[][] = (() => {
    const n = AudioEngine.N;
    return [
      [n.E5, null, n.G5, null, n.A5, null, n.G5, null],
      [n.E5, null, n.C5, null, n.D5, null, n.E5, null],
      [n.A4, null, n.C5, null, n.E5, null, n.D5, null],
      [n.G4, null, n.D5, null, n.G5, null, null, null],
      [n.E5, null, n.G5, null, n.C6, null, n.A5, null],
      [n.G5, null, n.E5, null, n.C5, null, n.E5, null],
      [n.A5, null, n.G5, null, n.E5, null, n.D5, null],
      [n.C5, null, null, null, n.G4, null, null, null],
    ];
  })();

  private scheduleBeat(i: number, t: number) {
    const a = this.ctx!, eighth = this.eighth(), bar = Math.floor(i / 8) % 8, step = i % 8, at = t - a.currentTime;
    // pad: one warm chord per bar
    if (step === 0) {
      const ch = AudioEngine.CHORDS[bar % 4], dur = eighth * 8;
      ch.forEach((f, k) => {
        const o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 900;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(k === 0 ? .12 : .07, t + dur * .3); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.02);
        o.connect(lp); lp.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + dur * 1.05);
      });
    }
    // melody: music-box bells
    const m = AudioEngine.MELODY[bar][step];
    if (m) this.bell(m, at, .11, eighth * 3.2, this.musicBus);
    // light pulse on the off-beats during a race
    if (this.mood === 'race' && step % 2 === 1) {
      const ch = AudioEngine.CHORDS[bar % 4];
      this.bell(ch[2] * 2, at, .035, eighth * .9, this.musicBus);
    }
  }
  private eighth() { return 60 / (this.mood === 'race' ? 96 : 80) / 2; }
  private pump = () => {
    const a = this.ctx; if (!a || !this.musicOn) return;
    while (this.nextBeat < a.currentTime + .25) { this.scheduleBeat(this.beat, this.nextBeat); this.nextBeat += this.eighth(); this.beat++; }
  };
  private level() { const s = S(); return s.muted || !s.music ? 0 : s.musicVol * (this.ducked ? .35 : 1) * .5; }
  private applyLevel(fade = .4) {
    const a = this.ctx; if (!a) return;
    this.musicBus.gain.cancelScheduledValues(a.currentTime);
    this.musicBus.gain.setTargetAtTime(this.level(), a.currentTime, fade / 3);
  }
  /** Start or stop the tune according to the settings. Safe to call often. */
  syncMusic() {
    const s = S(), want = s.music && !s.muted && s.musicVol > 0;
    if (want && !this.musicOn) {
      const a = this.ac(); if (!a) return;
      this.musicOn = true; this.nextBeat = a.currentTime + .1; this.beat = 0;
      this.timer = window.setInterval(this.pump, 60);
    } else if (!want && this.musicOn) {
      this.musicOn = false; window.clearInterval(this.timer);
    }
    this.applyLevel();
  }
  setMood(m: 'calm' | 'race') { this.mood = m; }
  /** Lower the music while the teacher speaks. */
  duck(on: boolean) { if (this.ducked === on) return; this.ducked = on; this.applyLevel(on ? .15 : .6); }
  /** Pause everything when the tab is hidden. */
  suspend(on: boolean) { if (!this.ctx) return; if (on) void this.ctx.suspend(); else if (S().music || !S().muted) void this.ctx.resume(); }
}

export const audio = new AudioEngine();
useSettings.subscribe((s, p) => { if (s.muted !== p.muted || s.music !== p.music || s.musicVol !== p.musicVol) audio.syncMusic(); });
