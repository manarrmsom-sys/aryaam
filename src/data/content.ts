import { pad2 } from '@/lib/utils';

/* ================= Types ================= */
export type Lang = 'ar' | 'en';
export type Mode = 'letters' | 'vowels' | 'words' | 'journey';
export type Diff = 'easy' | 'medium' | 'hard';
export type VoiceId = 'sarah' | 'ahmed' | 'kid';

export interface Letter { ch: string; base: string; name: string; k: string; low?: string }
export interface Word { show: string; say: string; emoji: string }
export interface Opt { show: string; say: string; emoji?: string; clip?: string; key?: number }
export interface Question extends Opt { card?: string; opts: Opt[]; lane?: number; again?: boolean }
/** Start of the first stroke: x, y inside the glyph box (0..1) and the direction it heads. */
export type StrokeStart = [number, number, number, number];

/* ================= Arabic ================= */
export const LETTERS: Letter[] = ([
  ['أ', 'أ', 'أَلِف'], ['ب', 'ب', 'بَاء'], ['ت', 'ت', 'تَاء'], ['ث', 'ث', 'ثَاء'], ['ج', 'ج', 'جِيم'], ['ح', 'ح', 'حَاء'], ['خ', 'خ', 'خَاء'],
  ['د', 'د', 'دَال'], ['ذ', 'ذ', 'ذَال'], ['ر', 'ر', 'رَاء'], ['ز', 'ز', 'زَاي'], ['س', 'س', 'سِين'], ['ش', 'ش', 'شِين'], ['ص', 'ص', 'صَاد'],
  ['ض', 'ض', 'ضَاد'], ['ط', 'ط', 'طَاء'], ['ظ', 'ظ', 'ظَاء'], ['ع', 'ع', 'عَيْن'], ['غ', 'غ', 'غَيْن'], ['ف', 'ف', 'فَاء'], ['ق', 'ق', 'قَاف'],
  ['ك', 'ك', 'كَاف'], ['ل', 'ل', 'لَام'], ['م', 'م', 'مِيم'], ['ن', 'ن', 'نُون'], ['هـ', 'ه', 'هَاء'], ['و', 'و', 'وَاو'], ['ي', 'ي', 'يَاء'],
] as const).map(([ch, base, name]) => ({ ch, base, name, k: ch }));

export const SIMILAR = [['ب', 'ت', 'ث', 'ن', 'ي'], ['ج', 'ح', 'خ'], ['د', 'ذ'], ['ر', 'ز', 'و'], ['س', 'ش'], ['ص', 'ض'], ['ط', 'ظ'], ['ع', 'غ'], ['ف', 'ق'], ['ك', 'ل', 'أ'], ['م', 'هـ']];

export const WORDS: Word[] = ([
  ['أَسَد', '🦁'], ['بَطَّة', '🦆'], ['تُفَّاح', '🍎'], ['ثَعْلَب', '🦊'], ['جَمَل', '🐪'], ['حِصَان', '🐴'], ['خَرُوف', '🐑'],
  ['دُبّ', '🐻'], ['ذُرَة', '🌽'], ['رُزّ', '🍚'], ['زَرَافَة', '🦒'], ['سَمَكَة', '🐟'], ['شَمْس', '☀️'], ['صَقْر', '🦅'],
  ['ضِفْدَع', '🐸'], ['طَائِرَة', '✈️'], ['ظَرْف', '✉️'], ['عِنَب', '🍇'], ['غَزَال', '🦌'], ['فِيل', '🐘'], ['قَلَم', '✏️'],
  ['كِتَاب', '📖'], ['لَيْمُون', '🍋'], ['مَوْز', '🍌'], ['نَحْلَة', '🐝'], ['هِلَال', '🌙'], ['وَرْدَة', '🌹'], ['يَد', '✋'],
] as const).map(([w, e]) => ({ show: w, say: w, emoji: e }));

/** Short vowels are spoken with a closing "هْ" so the narrator says the sound (بَهْ) and not the letter name (باء). */
export function forms(L: Letter): { show: string; say: string }[] {
  const b = L.base;
  const raw = L.ch === 'أ'
    ? [['أَ', 'أَهْ'], ['أُ', 'أُهْ'], ['إِ', 'إِهْ'], ['آ', 'آ'], ['أُو', 'أُو'], ['إِي', 'إِي']]
    : [[b + 'َ', b + 'َهْ'], [b + 'ُ', b + 'ُهْ'], [b + 'ِ', b + 'ِهْ'], [b + 'َا', b + 'َا'], [b + 'ُو', b + 'ُو'], [b + 'ِي', b + 'ِي']];
  return raw.map(([show, say]) => ({ show, say }));
}
export const FORM_NAMES = ['الفتحة', 'الضمّة', 'الكسرة', 'مدّ الألف', 'مدّ الواو', 'مدّ الياء'];

/* ================= English ================= */
export const EN: Letter[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(u => ({ ch: u + u.toLowerCase(), base: u, low: u.toLowerCase(), name: u, k: u.toLowerCase() }));
export const EN_SIMILAR = [['b', 'd', 'p', 'q'], ['m', 'n', 'h'], ['u', 'v', 'w'], ['i', 'l', 'j', 't'], ['c', 'e', 'o', 'a'], ['g', 'y'], ['s', 'z'], ['k', 'x'], ['f', 'r']];
export const EN_WORDS: Word[] = ([
  ['apple', '🍎'], ['ball', '⚽'], ['cat', '🐱'], ['dog', '🐶'], ['egg', '🥚'], ['fish', '🐟'], ['goat', '🐐'], ['hat', '🎩'], ['insect', '🐜'],
  ['jet', '✈️'], ['key', '🔑'], ['lion', '🦁'], ['moon', '🌙'], ['nose', '👃'], ['orange', '🍊'], ['pen', '🖊️'], ['queen', '👸'], ['rabbit', '🐰'],
  ['sun', '☀️'], ['tree', '🌳'], ['umbrella', '☂️'], ['van', '🚐'], ['watch', '⌚'], ['box', '📦'], ['yarn', '🧶'], ['zebra', '🦓'],
] as const).map(([w, e]) => ({ show: w, say: w, emoji: e }));

/* ================= Stroke starts (finger tracing) ================= */
export const START: StrokeStart[] = [[.5, .4, 0, 1], [.97, .08, -.3, 1], [.97, .5, -.3, 1], [.97, .55, -.3, 1], [.12, .12, 1, 0], [.12, .12, 1, 0], [.12, .35, 1, 0], [.5, .05, .5, 1], [.5, .38, .5, 1], [.9, .05, -.3, 1], [.9, .35, -.3, 1], [.97, .1, -.2, 1], [.97, .5, -.2, 1], [.5, .35, 1, -.6], [.5, .5, 1, -.6], [.12, .8, 1, -.5], [.12, .8, 1, -.5], [.8, .08, -1, .2], [.8, .3, -1, .2], [.8, .55, 0, -1], [.75, .45, 0, -1], [.9, .03, 0, 1], [.85, .03, 0, 1], [.7, .2, -1, 0], [.97, .4, -.2, 1], [.6, .05, -1, .5], [.85, .3, -.3, -1], [.85, .1, -1, 0]];
// English capitals and small letters (single-storey a and g, as children write them).
export const EN_UP: StrokeStart[] = [[.5, 0, -.4, 1], [.08, 0, 0, 1], [.85, .2, -1, -.5], [.08, 0, 0, 1], [.08, 0, 0, 1], [.08, 0, 0, 1], [.85, .2, -1, -.5], [.08, 0, 0, 1], [.5, 0, 0, 1], [.75, 0, 0, 1], [.08, 0, 0, 1], [.1, 0, 0, 1], [.08, 0, 0, 1], [.08, 0, 0, 1], [.5, 0, -1, .3], [.08, 0, 0, 1], [.5, 0, -1, .3], [.08, 0, 0, 1], [.85, .15, -1, -.5], [.5, 0, 0, 1], [.08, 0, 0, 1], [.05, 0, .4, 1], [.03, 0, .3, 1], [.08, 0, .6, 1], [.05, 0, .5, 1], [.08, .02, 1, 0]];
export const EN_LOW: StrokeStart[] = [[.8, .2, -1, -.3], [.1, 0, 0, 1], [.85, .25, -1, -.5], [.75, .5, -1, -.4], [.15, .5, 1, 0], [.85, .08, -1, -.3], [.78, .15, -1, -.3], [.1, 0, 0, 1], [.5, .4, 0, 1], [.7, .3, 0, 1], [.1, 0, 0, 1], [.5, 0, 0, 1], [.06, .02, 0, 1], [.1, .02, 0, 1], [.5, 0, -1, .3], [.1, .02, 0, 1], [.78, .15, -1, -.3], [.15, .02, 0, 1], [.85, .18, -1, -.5], [.4, 0, 0, 1], [.1, .02, 0, 1], [.05, 0, .4, 1], [.03, 0, .3, 1], [.08, 0, .6, 1], [.05, 0, .5, 1], [.08, .03, 1, 0]];

/* ================= Packs: one per language — same game, same plan, different letters ================= */
export interface Pack {
  lang: Lang; letters: Letter[]; similar: string[][]; words: Word[]; arrows: number;
  font: (fs: number) => string;
  trace: (i: number, stage: number) => { ch: string; s: StrokeStart };
  sub: (L: Letter) => string;
  hints: string[];
}
export const PACKS: Record<Lang, Pack> = {
  ar: {
    lang: 'ar', letters: LETTERS, similar: SIMILAR, words: WORDS, arrows: 1,
    font: fs => `800 ${fs}px Tajawal, Cairo, sans-serif`,
    trace: i => ({ ch: LETTERS[i].base, s: START[i] }), sub: L => L.name,
    hints: ['نبدأ من النقطة الخضراء ونتبع السهم', 'مرّة ثانية: نبدأ من النقطة الخضراء', 'والآن الحرف خافت: نكتبه وحدنا'],
  },
  en: {
    lang: 'en', letters: EN, similar: EN_SIMILAR, words: EN_WORDS, arrows: 2,
    font: fs => `700 ${fs}px Andika, "Comic Sans MS", Tajawal, sans-serif`,
    trace: (i, st) => (st === 0 ? { ch: EN[i].base, s: EN_UP[i] } : { ch: EN[i].low!, s: EN_LOW[i] }),
    sub: L => 'كبير ' + L.base + ' · صغير ' + L.low,
    hints: ['الحرف الكبير: نبدأ من النقطة الخضراء ونتبع السهم', 'الحرف الصغير: نبدأ من النقطة الخضراء ونتبع السهم', 'والآن الحرف الصغير خافت: نكتبه وحدنا'],
  },
};
export const packOf = (lang: Lang) => PACKS[lang] || PACKS.ar;
export const clipOf = (lang: Lang, kind: string, i: number, f?: number) => lang + '/' + kind + '-' + pad2(i + 1) + (f == null ? '' : '-' + (f + 1));

/* ================= Settings options ================= */
export const LANGS: { id: Lang; t: string; d: string; ex: string }[] = [
  { id: 'ar', t: 'الحروف العربية', d: 'من الألف إلى الياء', ex: 'أ ب ت' },
  { id: 'en', t: 'الحروف الإنجليزية', d: 'من A إلى Z', ex: 'Aa Bb Cc' },
];
export interface ModeDef { id: Mode; t: string; d: string; ex: string }
export const MODES_BY: Record<Lang, ModeDef[]> = {
  ar: [
    { id: 'letters', t: 'الحروف الهجائية', d: 'من الألف إلى الياء', ex: 'أ ب ت' },
    { id: 'vowels', t: 'الحركات والمدود', d: 'فتحة وضمّة وكسرة ومدّ', ex: 'بَ بُ بِ بَا' },
    { id: 'words', t: 'كلمات بسيطة', d: '٢٨ كلمة مشكولة', ex: 'أَسَد بَطَّة' },
    { id: 'journey', t: 'رحلة الحروف', d: 'بالترتيب: أسمع، أنطق، أكتب، أسابق', ex: 'أ ← ب ← ت' },
  ],
  en: [
    { id: 'letters', t: 'الحروف الإنجليزية', d: 'الكبيرة والصغيرة من A إلى Z', ex: 'Aa Bb Cc' },
    { id: 'vowels', t: 'صوت أوّل الكلمة', d: 'نسمع الكلمة ونختار حرفها الأوّل', ex: 'b → ball' },
    { id: 'words', t: 'كلمات بسيطة', d: '٢٦ كلمة قصيرة', ex: 'cat dog sun' },
    { id: 'journey', t: 'رحلة الحروف', d: 'بالترتيب: أسمع، أنطق، أكتب، أسابق', ex: 'A → B → C' },
  ],
};
export const DIFFS: { id: Diff; t: string; d: string; n: number; sp: number }[] = [
  { id: 'easy', t: 'سهل', d: '٨ أسئلة · المطلوب ظاهر', n: 8, sp: 0 },
  { id: 'medium', t: 'متوسّط', d: '١٢ سؤالًا · يظهر ثم يختفي', n: 12, sp: 2 },
  { id: 'hard', t: 'صعب', d: '١٦ سؤالًا · بالاستماع', n: 16, sp: 3 },
];
export const COLORS = [
  { id: 'red', t: 'أحمر', hex: '#f5333f' }, { id: 'blue', t: 'أزرق', hex: '#1f7bff' }, { id: 'yellow', t: 'أصفر', hex: '#ffc60a' },
  { id: 'green', t: 'أخضر', hex: '#1fbf5f' }, { id: 'purple', t: 'بنفسجي', hex: '#8b3dff' }, { id: 'orange', t: 'برتقالي', hex: '#ff7a1a' },
];
export const VOICES: { id: VoiceId; t: string; av: string; bg: string; pitch: number; rate: number; hi: string; d: string }[] = [
  { id: 'sarah', t: 'المعلّمة سارة', av: 'س', bg: '#F43F5E', pitch: 1.1, rate: .85, hi: 'أَنَا الْمُعَلِّمَةُ سَارَة', d: 'صوت دافئ وهادئ' },
  { id: 'ahmed', t: 'المعلّم أحمد', av: 'أ', bg: '#1E3A8A', pitch: .9, rate: .85, hi: 'أَنَا الْمُعَلِّمُ أَحْمَد', d: 'صوت واضح ومطمئن' },
  { id: 'kid', t: 'الطفل الذكي', av: 'ط', bg: '#10B981', pitch: 1.4, rate: .92, hi: 'أَنَا الطِّفْلُ الذَّكِيّ', d: 'صوت مرح وخفيف' },
];
export const SPEEDS = [{ t: 'بطيء', v: 14 }, { t: 'هادئ', v: 20 }, { t: 'عادي', v: 27 }, { t: 'سريع', v: 35 }, { t: 'توربو', v: 46 }];
export const PRAISE = ['مُمْتَاز', 'رَائِع', 'أَحْسَنْت', 'إِجَابَةٌ صَحِيحَة', 'عَمَلٌ رَائِع'];
export const PHRASES: Record<string, string> = {
  'say-go': 'هَيَّا بِنَا', 'say-correct': 'الْإِجَابَةُ الصَّحِيحَة', 'say-write': 'نَكْتُبُ الْحَرْف', 'say-mastered': 'أَتْقَنَّا الْحَرْف',
  'say-retry': 'اِقْتَرَبْنَا! نُعِيدُ السِّبَاق', 'say-finish': 'عَمَلٌ رَائِع! وَصَلْنَا إِلَى خَطِّ النِّهَايَة',
};
export const byId = <T extends { id: string }>(list: T[], id: string): T => list.find(x => x.id === id) || list[0];

/* ================= The full list of recordable clips (mirrors audio-files-list.csv: 287 files) ================= */
export type ClipGroup = 'ar-letter' | 'ar-sound' | 'ar-word' | 'ar-praise' | 'ar-say' | 'en-letter' | 'en-word';
export interface ClipDef { clip: string; text: string; say: string; kind: string; group: ClipGroup; lang: Lang }
export const CLIP_GROUPS: { id: ClipGroup; t: string }[] = [
  { id: 'ar-letter', t: 'أسماء الحروف العربية' }, { id: 'ar-sound', t: 'الحركات والمدود' }, { id: 'ar-word', t: 'الكلمات العربية' },
  { id: 'ar-praise', t: 'عبارات التشجيع' }, { id: 'ar-say', t: 'عبارات اللعبة' }, { id: 'en-letter', t: 'الحروف الإنجليزية' }, { id: 'en-word', t: 'الكلمات الإنجليزية' },
];
export function audioList(): ClipDef[] {
  const out: ClipDef[] = [];
  LETTERS.forEach((L, i) => out.push({ clip: 'ar/letter-' + pad2(i + 1), text: L.name, say: L.name, kind: 'اسم الحرف ' + L.ch, group: 'ar-letter', lang: 'ar' }));
  LETTERS.forEach((L, i) => forms(L).forEach((f, k) => out.push({ clip: 'ar/sound-' + pad2(i + 1) + '-' + (k + 1), text: f.show, say: f.say, kind: 'صوت الحرف مع ' + FORM_NAMES[k], group: 'ar-sound', lang: 'ar' })));
  WORDS.forEach((W, i) => out.push({ clip: 'ar/word-' + pad2(i + 1), text: W.show, say: W.say, kind: 'كلمة', group: 'ar-word', lang: 'ar' }));
  PRAISE.forEach((t, i) => out.push({ clip: 'ar/praise-' + (i + 1), text: t, say: t, kind: 'تشجيع', group: 'ar-praise', lang: 'ar' }));
  Object.keys(PHRASES).forEach(k => out.push({ clip: 'ar/' + k, text: PHRASES[k], say: PHRASES[k], kind: 'عبارة', group: 'ar-say', lang: 'ar' }));
  EN.forEach((L, i) => out.push({ clip: 'en/letter-' + pad2(i + 1), text: L.name, say: L.name, kind: 'English letter name', group: 'en-letter', lang: 'en' }));
  EN_WORDS.forEach((W, i) => out.push({ clip: 'en/word-' + pad2(i + 1), text: W.show, say: W.say, kind: 'English word', group: 'en-word', lang: 'en' }));
  return out;
}
