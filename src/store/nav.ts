import { create } from 'zustand';
import { initGame, getGame } from '@/engine/RaceGame';
import { audio } from '@/engine/audio/AudioEngine';
import { Speech } from '@/engine/audio/Speech';
import type { JourneyRun } from '@/engine/journey';
import { S, useSettings } from './settings';

export type ScreenId = 'landing' | 'setup' | 'race' | 'journey' | 'lesson' | 'parent';
interface Nav {
  screen: ScreenId;
  lessonIdx: number;
  /** Set when a lesson race has just ended; the lesson screen shows the outcome. */
  lessonResult: { right: number; total: number } | null;
  /** Bumped to remount the lesson screen when the same letter is reopened. */
  lessonKey: number;
}
export const useNav = create<Nav>(() => ({ screen: 'landing', lessonIdx: 0, lessonResult: null, lessonKey: 0 }));

let canvas: HTMLCanvasElement | null = null;
export const setGameCanvas = (c: HTMLCanvasElement | null) => { canvas = c; };

export const go = (screen: ScreenId) => { Speech.stop(); useNav.setState({ screen }); };

/** Start a race. Without a journey run, "journey" mode opens the map instead. */
export function startRace(jr: JourneyRun | null = null) {
  if (!canvas) return;
  audio.ac(); useSettings.getState().saveProfile();
  if (!jr && S().mode === 'journey') return go('journey');
  const game = initGame(canvas);
  game.onLessonDone = r => useNav.setState(n => ({ screen: 'lesson', lessonResult: r, lessonKey: n.lessonKey + 1 }));
  useNav.setState({ screen: 'race' });
  game.startRun(jr);
}
/** Leave the race for the map (journey runs) or the setup screen. */
export function leaveRace() {
  const g = getGame(), wasJourney = !!g?.jr;
  g?.stop(); go(wasJourney ? 'journey' : 'setup');
}
export function openLesson(idx: number) {
  audio.ac(); Speech.stop();
  useNav.setState(n => ({ screen: 'lesson', lessonIdx: idx, lessonResult: null, lessonKey: n.lessonKey + 1 }));
}
