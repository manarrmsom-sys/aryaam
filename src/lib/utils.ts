import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const AR = '٠١٢٣٤٥٦٧٨٩';
export const AR_DIGITS = AR;
export const arNum = (n: number | string) => String(n).replace(/\d/g, d => AR[+d]);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];
export const shuffle = <T,>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const fmtTime = (s: number) => {
  s = Math.floor(s);
  return arNum(pad2((s / 60) | 0) + ':' + pad2(s % 60));
};
/** Days since epoch in local time — the unit the spaced-repetition schedule works in. */
export const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
