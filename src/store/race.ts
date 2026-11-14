import { create } from 'zustand';
import type { JourneyRun } from '@/engine/journey';

export type RaceState = 'idle' | 'countdown' | 'playing' | 'paused' | 'ended';
export interface RaceResult { title: string; stars: number; score: number; gems: number; right: number; total: number; time: number; missed: string[]; en: boolean; journey: boolean }
export interface RaceHud {
  state: RaceState; score: number; gems: number; sec: number; qi: number; total: number; speedLv: number;
  target: { off: boolean; text: string; emoji: string; hideText: boolean; en: boolean };
  count: string | null;
  flash: { id: number; text: string; ok: boolean } | null;
  result: RaceResult | null;
  jr: JourneyRun | null;
}
export const useRace = create<RaceHud>(() => ({
  state: 'idle', score: 0, gems: 0, sec: 0, qi: 0, total: 0, speedLv: 0,
  target: { off: true, text: '', emoji: '', hideText: false, en: false },
  count: null, flash: null, result: null, jr: null,
}));

let flashId = 0;
/** The big praise / correction pill in the middle of the screen. */
export const flash = (text: string, ok: boolean) => useRace.setState({ flash: { id: ++flashId, text, ok } });
