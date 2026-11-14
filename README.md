# سباق الحروف — Sibaq Al-Huruf

لعبة تعليمية ثلاثية الأبعاد لتعليم الأطفال الحروف العربية والإنجليزية: نسمع الحرف، نقود السيارة إلى البوّابة الصحيحة، ثم نكتبه بالإصبع.

## التشغيل

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # نسخة الإنتاج في dist/
```

لوحة الوالدين: زرّ «للوالدين» أعلى أي صفحة، ثم حلّ مسألة الضرب.

## الأصوات

كل التسجيلات (287 ملفًّا × 3 شخصيات) في `public/audio/<sarah|ahmed|kid>/<ar|en>/`، والقائمة في `audio-files-list.csv`.

```bash
npm run audio                                  # يولّد ما ينقص فقط (edge-tts المجاني)
npm run audio -- --force                       # يعيد توليد الكل
npm run audio -- --voice sarah --only ar/word  # جزء محدّد
npm run audio -- --provider openai             # يتطلب OPENAI_API_KEY
npm run audio -- --provider elevenlabs         # يتطلب ELEVENLABS_API_KEY
```

يتطلب Python 3 (يُثبَّت `edge-tts` تلقائيًّا). ترتيب البحث عن أي جملة أثناء اللعب:
تسجيل خاص من لوحة الوالدين ← ملف الشخصية المختارة ← ملف المعلّمة سارة ← صوت الجهاز (فقط إن لم يوجد شيء).

## البنية

```
src/
  data/        المحتوى (الحروف، الكلمات، الأوضاع) وبناء الأسئلة
  engine/      RaceGame (قواعد السباق) · journey (التكرار المتباعد) · tracing (تتبّع الكتابة)
    three/     المشهد ثلاثي الأبعاد: World + السيارة
    audio/     AudioEngine (مؤثرات + موسيقى) · Speech (المعلّم) · clipStore (تسجيلات خاصة)
  store/       الإعدادات، حالة السباق، التنقّل (zustand)
  components/  ui (أسلوب shadcn على Radix) · fx (GSAP: SplitText, TiltCard, ClickSpark…) · SmoothScroll (Lenis)
  screens/     Landing · Setup · race · Journey · Lesson · parent
scripts/       generate_audio.py + generate-audio.mjs
legacy/        النموذج الأولي الأصلي (index.original.html) للمرجع
```

بيانات اللاعبين تُحفظ في المتصفح بالمفاتيح نفسها التي استعملها النموذج الأولي (`sibaq-huruf`, `sibaq-journey`)، فالتقدّم القديم يبقى.
