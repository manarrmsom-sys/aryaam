import { create } from 'zustand';
import type { Diff, Lang, Mode, VoiceId } from '@/data/content';

export interface Profile { name: string; color: string; voice: VoiceId }

export interface Settings {
  name: string; lang: Lang; mode: Mode; diff: Diff; color: string; voice: VoiceId; muted: boolean;
  /** Background music on/off and level (0..1). */
  music: boolean; musicVol: number;
  /** -1 follows the chosen level; 0..4 forces a starting speed for every race. */
  defaultSpeed: number;
  /** Children on this device. The active one is `name`. */
  profiles: Profile[];
}
const KEY = 'sibaq-huruf';
const DEFAULTS: Settings = { name: '', lang: 'ar', mode: 'letters', diff: 'easy', color: 'red', voice: 'sarah', muted: false, music: true, musicVol: .35, defaultSpeed: -1, profiles: [] };

function load(): Settings {
  let s: Settings = { ...DEFAULTS };
  try { s = { ...s, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* first run */ }
  if (!Array.isArray(s.profiles)) s.profiles = [];
  if (s.name && !s.profiles.some(p => p.name === s.name)) s.profiles = [...s.profiles, { name: s.name, color: s.color, voice: s.voice }];
  return s;
}

interface Store extends Settings {
  set: (patch: Partial<Settings>) => void;
  /** Make a child the active driver (creates the profile when new). */
  selectProfile: (name: string) => void;
  saveProfile: () => void;
  removeProfile: (name: string) => void;
}

export const useSettings = create<Store>((set, get) => ({
  ...load(),
  set: patch => set(patch),
  selectProfile: name => {
    const p = get().profiles.find(x => x.name === name);
    if (p) set({ name: p.name, color: p.color, voice: p.voice });
    else set({ name });
  },
  saveProfile: () => {
    const { name, color, voice, profiles } = get();
    if (!name) return;
    const rest = profiles.filter(p => p.name !== name);
    set({ profiles: [...rest, { name, color, voice }] });
  },
  removeProfile: name => {
    const s = get();
    set({ profiles: s.profiles.filter(p => p.name !== name), ...(s.name === name ? { name: '' } : {}) });
  },
}));

useSettings.subscribe(s => {
  try {
    const { name, lang, mode, diff, color, voice, muted, music, musicVol, defaultSpeed, profiles } = s;
    localStorage.setItem(KEY, JSON.stringify({ name, lang, mode, diff, color, voice, muted, music, musicVol, defaultSpeed, profiles }));
  } catch { /* storage unavailable */ }
});

export const S = () => useSettings.getState();
