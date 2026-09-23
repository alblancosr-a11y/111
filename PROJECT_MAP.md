# PROJECT_MAP — مَدَارِج (حفظ القصائد العربية)

تطبيق Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Drizzle/pg + localStorage.

## البنية المزدوجة (مهم — انتبه لها)

المشروع يحوي **شجرتين متطابقتين**: الجذر (`app/`, `components/`, `lib/`, `hooks/`, `db/`, `ui.tsx`, `App.tsx`) ومسار `src/` (`src/app/`, `src/components/`, ...).

حسب ترتيب حل Next.js المثبت (`next/dist/lib/find-pages-dir.js` → `findDir`):

- **`app/` (الجذر) هو مجلد App Router الفعّال** — ولا يتم استخدام `src/app/` إطلاقًا.
  - `app/layout.tsx` ← يستورد `app/globals.css` (**الفعّال**).
  - `app/page.tsx` ← يستورد `@/App`.
- **`@/*` في `tsconfig.json` → `./src/*`**، لذا كل المكوّنات الفعّالة تُستورد من **`src/`**:
  - `src/App.tsx`, `src/components/*`, `src/ui.tsx`, `src/lib/*`, `src/hooks/*`, `src/db/*`.
- **الكود الميت (لا تُعدَّل)**:
  - `App.tsx`, `components/*`, `ui.tsx`, `lib/*`, `hooks/*`, `db/` في الجذر (تُستبدل بنظيراتها في `src/`).
  - `src/app/*` بالكامل (لا يُخدم لأنه `./app` يفوز).

## النوافذ المنبثقة (Modal System)

كل النوافذ تُدار من `src/App.tsx` عبر حالة `modal` وتُعرض داخل `<Layout>`:

### 1) نوافذ `glass-modal` فوق `.modal-overlay` (المركزة، شفافة)
| النافذة | الملف |
|---|---|
| إضافة/تعديل قصيدة | `src/components/AddPoemModal.tsx` |
| بدء جلسة حفظ | `src/components/SessionStartModal.tsx` |
| الإعدادات | `src/components/SettingsPanel.tsx` |
| الإحصائيات | `src/components/StatsView.tsx` |
| سجل الأخطاء | `src/components/ErrorLogView.tsx` |
| تأكيد الحذف | مضمّن في `src/App.tsx` |

- طبقة الخلفية الموحدة: **`.modal-overlay`** في `app/globals.css`.
- **[تعديل 2026-09-22/23]** رُفع ضباب الخلفية من `blur(6px)` إلى `blur(90px)` (مع `-webkit-`) بحيث يظهر الباك الضبابي خلف كامل الشاشة **وحتى خلف النافذة الشفافة** نفسها (لأن `glass-modal` شفافة)، وليس المحيط فقط — بدرجة "سراب" قصوى تجعل النص الخلفي غير قابل للتمييز إطلاقًا. (مرّ بقيم 24px → 20px → 22px → 48px → استقرّ على 90px.)
- قيم `glass-modal` (شفافية وضبابها الذاتي 40px) لم تتغيّر — خارج نطاق التعديل.

### 2) درج التنقّل الجانبي (جوال)
- `src/components/Layout.tsx` — خلفيته `bg-black/30 backdrop-blur-sm` + النافذة نفسها `glass-modal` (ضباب ذاتي 40px). يعمل دون تعديل.

### 3) طرق عرض ملء الشاشة (معتمة، لا خلفية مرئية خلفها)
- `ReadingView`, `SessionView`, `FateenChallengeView` — حاويتها `fixed inset-0 z-50 app-bg` (خلفية معتمة كاملة). لا يوجد «وراء» يظهر — الضباب غير قابل للتطبيق هندسيًا؛ خارجة عن نطاق هذا التعديل.

## التقنيات / النصوص
- `dev`: `next dev --hostname 0.0.0.0` · `build`: `next build` · `lint`: `eslint .` · `typecheck`: `tsc --noEmit`

## نواقص مسجلة (Deprecated/معالَجة)
- **قيد البيئة فقط**: في بيئات لا تصل إلى `fonts.gstatic.com` يفشل `next/font/google` (الأميري/تاجوال/ريم كوفي) بعنوان `Module not found: .../internal/font/google/font` وتعرض الصفحة 500 — خطأ سابق للتعديل ولا علاقة له به.
- `src/app/globals.css` يحتوي سطرًا مكررًا `--text-3: #00bfff;` (بقايا اختبار) في ملف ميت — لم يُمسّ.
- لا يوجد إطار اختبارات في المشروع؛ التحقق اعتمد على `tsc --noEmit` و`eslint` وفحص CSS مباشر، ويتطلب الفحص البصري تشغيل التطبيق على جهاز المستخدم (يتوفر الإنترنت لديه للخطوط).