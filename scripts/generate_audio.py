#!/usr/bin/env python3
"""
استوديو الصوت لـ«سباق الحروف» — يولّد كل التسجيلات المذكورة في audio-files-list.csv
لثلاث شخصيات داخل public/audio/<sarah|ahmed|kid>/<ar|en>/<name>.mp3

المحرّكات:
  edge        (الافتراضي، مجاني، بلا مفاتيح)   pip install edge-tts
  openai      يتطلب OPENAI_API_KEY
  elevenlabs  يتطلب ELEVENLABS_API_KEY  (+ ELEVENLABS_VOICE_SARAH / _AHMED / _KID اختياريًا)

أمثلة:
  python scripts/generate_audio.py                       # كل ما ينقص، للشخصيات الثلاث
  python scripts/generate_audio.py --force               # إعادة توليد الكل
  python scripts/generate_audio.py --voice sarah --only ar/word
  python scripts/generate_audio.py --voice kid --clip ar/letter-05 --force
  python scripts/generate_audio.py --provider openai
"""
import argparse
import asyncio
import csv
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

try:  # يستخدم شهادات النظام (مفيد على ويندوز وخلف برامج الحماية)؛ اختياري: pip install truststore
    import truststore
    truststore.inject_into_ssl()
except Exception:  # noqa: BLE001
    pass

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "audio-files-list.csv"
OUT = ROOT / "public" / "audio"

# ---------- الشخصيات ----------
PERSONAS = {
    "sarah": {
        "edge": {"ar": ("ar-SA-ZariyahNeural", "-12%", "+0Hz"), "en": ("en-US-JennyNeural", "-12%", "+0Hz")},
        "openai": {"voice": "nova", "style": "A warm, gentle female kindergarten teacher. Speak slowly and clearly."},
        "elevenlabs": os.environ.get("ELEVENLABS_VOICE_SARAH", "EXAVITQu4vr4xnSDxMaL"),
    },
    "ahmed": {
        "edge": {"ar": ("ar-SA-HamedNeural", "-10%", "+0Hz"), "en": ("en-US-AndrewNeural", "-10%", "+0Hz")},
        "openai": {"voice": "onyx", "style": "A warm, friendly male teacher speaking to young children. Slow and clear."},
        "elevenlabs": os.environ.get("ELEVENLABS_VOICE_AHMED", "pNInz6obpgDQGcFmaJgB"),
    },
    "kid": {
        "edge": {"ar": ("ar-AE-FatimaNeural", "-6%", "+28Hz"), "en": ("en-US-AnaNeural", "-8%", "+0Hz")},
        "openai": {"voice": "shimmer", "style": "A bright, cheerful young child. Speak clearly and playfully."},
        "elevenlabs": os.environ.get("ELEVENLABS_VOICE_KID", "jBpfuIE2acCO8z3wKNLl"),
    },
}

# أسماء الحروف الإنجليزية تُكتب صوتيًّا حتى لا تُقرأ كأداة تعريف أو كلمة.
EN_NAMES = ["ay", "bee", "see", "dee", "ee", "eff", "jee", "aitch", "eye", "jay", "kay", "el", "em",
            "en", "oh", "pee", "cue", "ar", "ess", "tee", "you", "vee", "double you", "ex", "why", "zee"]


def spoken_text(clip: str, text: str) -> str:
    """النص الذي يُرسَل للمحرّك (قد يختلف قليلًا عن المكتوب لضمان نطق سليم)."""
    lang, name = clip.split("/", 1)
    if lang == "en" and name.startswith("letter-"):
        return EN_NAMES[int(name[7:9]) - 1].capitalize() + "."
    if lang == "ar" and name.startswith("sound-"):
        # الحركة القصيرة تُختم بهاء ساكنة ليُنطق الصوت (بَهْ) لا اسم الحرف (باء).
        if int(name.rsplit("-", 1)[1]) <= 3:
            return text + "هْ"
        return text
    if lang == "en":
        return text.capitalize() + "."
    return text


def load_items():
    items = []
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))
    for row in rows[1:]:
        if len(row) < 2 or not row[0].strip():
            continue
        clip = row[0].strip().removesuffix(".mp3")
        items.append((clip, row[1].strip()))
    return items


# ---------- المحرّكات ----------
async def synth_edge(persona, lang, text, dest):
    import edge_tts
    voice, rate, pitch = PERSONAS[persona]["edge"][lang]
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(dest))


def _post(url, headers, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


async def synth_openai(persona, lang, text, dest):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise SystemExit("OPENAI_API_KEY غير موجود في متغيّرات البيئة.")
    p = PERSONAS[persona]["openai"]
    body = {"model": os.environ.get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"), "voice": p["voice"], "input": text,
            "instructions": p["style"], "response_format": "mp3"}
    data = await asyncio.to_thread(_post, "https://api.openai.com/v1/audio/speech",
                                   {"Authorization": "Bearer " + key}, body)
    dest.write_bytes(data)


async def synth_eleven(persona, lang, text, dest):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY غير موجود في متغيّرات البيئة.")
    vid = PERSONAS[persona]["elevenlabs"]
    body = {"text": text, "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
            "voice_settings": {"stability": 0.55, "similarity_boost": 0.8}}
    data = await asyncio.to_thread(
        _post, f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        {"xi-api-key": key}, body)
    dest.write_bytes(data)


PROVIDERS = {"edge": synth_edge, "openai": synth_openai, "elevenlabs": synth_eleven}


async def main():
    ap = argparse.ArgumentParser(description="مولّد أصوات سباق الحروف")
    ap.add_argument("--provider", choices=list(PROVIDERS), default=os.environ.get("TTS_PROVIDER", "edge"))
    ap.add_argument("--voice", choices=list(PERSONAS) + ["all"], default="all")
    ap.add_argument("--only", help="بادئة مسار، مثل ar/word أو en/")
    ap.add_argument("--clip", help="ملف واحد بعينه، مثل ar/letter-05")
    ap.add_argument("--text", help="نصّ بديل يُنطق (مع --clip)")
    ap.add_argument("--force", action="store_true", help="إعادة التوليد حتى لو كان الملف موجودًا")
    ap.add_argument("--concurrency", type=int, default=6)
    a = ap.parse_args()

    items = load_items()
    if a.clip:
        items = [(c, t) for c, t in items if c == a.clip]
        if not items:
            raise SystemExit(f"لا يوجد ملف بهذا الاسم في القائمة: {a.clip}")
    elif a.only:
        items = [(c, t) for c, t in items if c.startswith(a.only)]
    personas = list(PERSONAS) if a.voice == "all" else [a.voice]
    synth = PROVIDERS[a.provider]

    jobs = []
    for p in personas:
        for clip, text in items:
            dest = OUT / p / (clip + ".mp3")
            if dest.exists() and dest.stat().st_size > 400 and not a.force:
                continue
            say = a.text if (a.text and a.clip) else spoken_text(clip, text)
            jobs.append((p, clip, say, dest))

    total, done, failed = len(jobs), 0, []
    print(f"المحرّك: {a.provider} · الشخصيات: {', '.join(personas)} · المطلوب توليده: {total} ملفًا", flush=True)
    sem = asyncio.Semaphore(max(1, a.concurrency))
    t0 = time.time()

    async def run(p, clip, say, dest):
        nonlocal done
        async with sem:
            dest.parent.mkdir(parents=True, exist_ok=True)
            tmp = dest.with_suffix(".part")
            for attempt in range(4):
                try:
                    await synth(p, clip.split("/")[0], say, tmp)
                    if tmp.stat().st_size < 400:
                        raise RuntimeError("ملف فارغ")
                    os.replace(tmp, dest)
                    break
                except SystemExit:
                    raise
                except Exception as e:  # noqa: BLE001
                    if attempt == 3:
                        failed.append((p, clip, str(e)))
                        tmp.unlink(missing_ok=True)
                    else:
                        await asyncio.sleep(1.5 * (attempt + 1))
            done += 1
            if done % 40 == 0 or done == total:
                print(f"  {done}/{total}  ({time.time() - t0:.0f}s)", flush=True)

    await asyncio.gather(*(run(*j) for j in jobs))

    # فهرس يقرؤه التطبيق ولوحة الوالدين.
    manifest = {"generatedAt": int(time.time()), "provider": a.provider, "voices": {}}
    for p in PERSONAS:
        folder = OUT / p
        manifest["voices"][p] = sorted(
            str(f.relative_to(folder).with_suffix("")).replace("\\", "/") for f in folder.rglob("*.mp3")
        ) if folder.exists() else []
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")

    for p in PERSONAS:
        print(f"  {p}: {len(manifest['voices'][p])} ملفًا")
    if failed:
        print(f"تعذّر توليد {len(failed)} ملفًا:")
        for f in failed[:20]:
            print("   ", *f)
        sys.exit(1)
    print("تمّ.")


if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass
    asyncio.run(main())
