import { clipOf, forms, packOf, type Diff, type Lang, type Letter, type Mode, type Opt, type Question } from './content';
import { pick, shuffle } from '@/lib/utils';

export function others<T>(list: T[], not: T, n: number): T[] {
  const out: T[] = [];
  let guard = 200;
  while (out.length < n && guard--) { const r = pick(list); if (r !== not && !out.includes(r)) out.push(r); }
  return out;
}

/** Builds the question queue for the three free-play modes (letters, vowels/sounds, words). */
export function buildQueue(lang: Lang, mode: Mode, diff: Diff, n: number): Question[] {
  const P = packOf(lang), Ls = P.letters, en = P.lang === 'en', q: Question[] = [], want = diff === 'easy' ? 0 : diff === 'medium' ? 1 : 2;
  const distract = (L: Letter): Letter[] => {
    const sim = ((P.similar.find(g => g.includes(L.k)) || []).filter(c => c !== L.k)).map(c => Ls.find(x => x.k === c)!);
    const d = shuffle(sim).slice(0, want);
    others(Ls, L, 6).forEach(o => { if (d.length < 2 && !d.includes(o)) d.push(o); });
    return d;
  };
  if (mode === 'letters') {
    // English: easy shows the pair (Bb); from medium up the card shows the capital and the gates the small letters.
    const f = en && diff !== 'easy' ? (x: Letter) => x.low! : (x: Letter) => x.ch;
    shuffle(Ls.slice()).slice(0, n).forEach(L => q.push({
      show: f(L), say: L.name, clip: clipOf(lang, 'letter', Ls.indexOf(L)), card: en && diff !== 'easy' ? L.base : undefined,
      opts: distract(L).map(o => ({ show: f(o), say: o.name })),
    }));
  } else if (mode === 'vowels' && en) {
    // English sounds: hear a word, pick the letter it begins with.
    shuffle(Ls.map((_, i) => i).filter(i => Ls[i].low !== 'x')).slice(0, n).forEach(i => {
      const L = Ls[i], W = P.words[i];
      q.push({ show: L.low!, say: W.say, clip: clipOf(lang, 'word', i), emoji: W.emoji, card: W.show, opts: distract(L).map(o => ({ show: o.low!, say: o.name })) });
    });
  } else if (mode === 'vowels') {
    shuffle(Ls.slice()).slice(0, n).forEach(L => {
      const f = forms(L), ti = (Math.random() * 6) | 0, d: Opt[] = [];
      const same = shuffle([0, 1, 2, 3, 4, 5].filter(i => i !== ti));
      const twin = (ti + 3) % 6; // بَ ↔ بَا
      if (diff === 'hard') { d.push(f[twin]); d.push(f[same.find(i => i !== twin)!]); }
      else if (diff === 'medium') { d.push(f[twin]); d.push(forms(others(Ls, L, 1)[0])[ti]); }
      else others(Ls, L, 2).forEach(o => d.push(forms(o)[ti]));
      q.push({ show: f[ti].show, say: f[ti].say, clip: clipOf(lang, 'sound', Ls.indexOf(L), ti), opts: d });
    });
  } else {
    shuffle(P.words.slice()).slice(0, n).forEach(W => q.push({ show: W.show, say: W.say, clip: clipOf(lang, 'word', P.words.indexOf(W)), emoji: W.emoji, opts: others(P.words, W, 2) }));
  }
  return q;
}
