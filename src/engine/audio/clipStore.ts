/** Custom recordings (mum's or the teacher's voice) live in IndexedDB, keyed by "<voice>/<lang>/<name>". */
const DB = 'sibaq-audio', STORE = 'clips';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((res, rej) => {
    const t = db.transaction(STORE, mode), rq = run(t.objectStore(STORE));
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
    t.oncomplete = () => db.close();
  }));
}

const urls = new Map<string, string>();
let keysCache: Set<string> | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach(f => f());

export const clipStore = {
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; },
  async keys(): Promise<Set<string>> {
    if (keysCache) return keysCache;
    try { keysCache = new Set((await tx('readonly', s => s.getAllKeys())).map(String)); } catch { keysCache = new Set(); }
    return keysCache;
  },
  has(key: string) { return !!keysCache && keysCache.has(key); },
  async get(key: string): Promise<{ url: string; format: string } | null> {
    if (!(await this.keys()).has(key)) return null;
    try {
      const blob = await tx<Blob | undefined>('readonly', s => s.get(key));
      if (!blob) return null;
      let url = urls.get(key);
      if (!url) { url = URL.createObjectURL(blob); urls.set(key, url); }
      return { url, format: formatOf(blob.type) };
    } catch { return null; }
  },
  async put(key: string, blob: Blob) {
    await tx('readwrite', s => s.put(blob, key));
    const old = urls.get(key); if (old) { URL.revokeObjectURL(old); urls.delete(key); }
    (await this.keys()).add(key); changed();
  },
  async del(key: string) {
    await tx('readwrite', s => s.delete(key));
    const old = urls.get(key); if (old) { URL.revokeObjectURL(old); urls.delete(key); }
    (await this.keys()).delete(key); changed();
  },
};

export function formatOf(mime: string): string {
  if (/webm/.test(mime)) return 'webm';
  if (/ogg/.test(mime)) return 'ogg';
  if (/mp4|m4a|aac/.test(mime)) return 'mp4';
  if (/wav/.test(mime)) return 'wav';
  return 'mp3';
}
