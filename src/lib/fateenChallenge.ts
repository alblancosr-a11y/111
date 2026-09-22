/**
 * محرك تحدي فطين — المرحلة الأولى: المنطق الأساسي
 *
 * يُنشئ جولة تحدي تأخذ قصيدة وتُنشئ ترتيبًا عشوائيًا لأبياتها
 * مع كلمة مفتاح فريدة لكل بيت، ويُدير سير الجولة.
 *
 * هذا ملف مستقل لا يُعدّل أي نظام موجود.
 */

import type { Poem, Verse } from './types';
import { removeTashkeel, normalizeForComparison } from './poem-parser';

// ===== الأنواع =====

/** حالة جولة تحدي فطين */
export interface FateenRoundState {
  /** معرّف القصيدة */
  poemId: string;
  /** ترتيب الأبيات العشوائي — ثابت طوال الجولة */
  verseOrder: number[];
  /** الموضع الحالي في verseOrder (0-based) */
  currentStep: number;
  /** كلمة المفتاح لكل بيت: verseIndex → الكلمة الأصلية للعرض */
  keywords: Record<number, string>;
  /** الأبيات التي تم اختبارها (أرقام الأبيات الأصلية) */
  tested: number[];
  /** الأبيات التي أُجيب عنها بصحيحة */
  correct: number[];
  /** الأبيات التي أُخطئ فيها */
  errors: number[];
  /** هل اكتملت الجولة؟ */
  isComplete: boolean;
  /** الأبيات التي لا تتوفر لها كلمة مفتاح فريدة صالحة */
  noKeywordVerses: number[];
}

// ===== قائمة الكلمات الوظيفية =====
// كلمات لا تصلح كمفتاح دلالي لأنها لا تحمل معنى مستقلًا كافيًا
// أو لأنها شائعة جدًا في الشعر العربي وتظهر في أبيات كثيرة

const FUNCTIONAL_WORDS = new Set([
  // ─── حروف الجر ───
  'من', 'إلى', 'عن', 'على', 'في', 'ب', 'ك', 'ل',
  'حتى', 'منذ', 'لدى', 'لدن', 'خلا', 'عدا', 'حاشا',
  'مذ', 'مد', 'رب', 'باء', 'كاف', 'لام',

  // ─── أدوات العطف والربط ───
  'و', 'ف', 'ثم', 'أو', 'أم', 'بل', 'لكن',
  'لا', 'إما', 'ولا', 'أوما', 'وإن', 'فإن',

  // ─── أسماء الإشارة ───
  'هذا', 'هذه', 'ذلك', 'تلك',
  'هذان', 'هاتان', 'هؤلاء', 'أولئك',
  'هنا', 'هناك', 'هنالك',

  // ─── الأسماء الموصولة ───
  'الذي', 'التي', 'اللذان', 'اللتان',
  'اللذين', 'اللاتي', 'اللائي', 'اللوان',
  'اللواتي', 'اللاء',

  // ─── الضمائر المنفصلة ───
  'أنا', 'نحن',
  'أنت', 'أنتما', 'أنتم', 'أنتن',
  'هو', 'هي', 'هما', 'هم', 'هن',
  'إياي', 'إيانا',
  'إياك', 'إياكما', 'إياكم', 'إياكن',
  'إياه', 'إياها', 'إياهما', 'إياهم', 'إياهن',

  // ─── أفعال كَان وأخواتها (كان، صار، أصبح، أمسى، ظل، بات، ما زال، ما برح...) ───
  'كان', 'كانت', 'كانا', 'كانوا', 'كنا', 'كنتم', 'كنتن', 'يكون', 'تكون',
  'صار', 'صارت', 'صاروا', 'يصير', 'تصير',
  'أصبح', 'أصبحت', 'أصبحوا',
  'أمسى', 'أمسى', 'أمسوا',
  'ظل', 'ظلت', 'ظلوا', 'يظل', 'تظل',
  'بات', 'باتت', 'باتوا', 'يبيت', 'تبيت',
  'مازال', 'مازالت', 'مازالا', 'مازالوا',
  'مالبث', 'مالبثت', 'ماانفك', 'ماانفكت',
  'مافتئ', 'مافتأت', 'مابرح', 'مابرحت',
  'دام', 'دامت', 'داموا', 'يدوم', 'تدوم',
  'ليس', 'ليست', 'ليسا', 'ليسوا', 'لست', 'لستما', 'لستم', 'لستن', 'لسنا',

  // ─── أدوات نحوية ───
  'إن', 'أن', 'إنما', 'أنما',
  'لن', 'لم', 'لا', 'قد', 'س', 'سوف',
  'ما', 'من', 'هل',
  'ليت', 'لعل', 'لوت', 'كأن',
  'ليتما', 'لعلما', 'كأنما',
  'لولا', 'لوما', 'لو',

  // ─── أدوات الاستفهام ───
  'هل', 'أ', 'هل', 'متى', 'أين', 'كيف', 'كم', 'أي', 'أنى', 'هلا',

  // ─── أدوات الشرط ───
  'إن', 'من', 'ما', 'متى', 'أين', 'أي', 'حيثما', 'أنى', 'إذما',

  // ─── أدوات الاستثناء ───
  'إلا', 'غير', 'سوى', 'عدا', 'خلا', 'حاشا',

  // ─── ظروف وأسماء شائعة ───
  'بين', 'عند', 'بعد', 'قبل', 'مع', 'دون',
  'كل', 'بعض', 'جميع', 'معظم', 'أكثر', 'أقل',
  'أول', 'آخر', 'حق',
  'أيضا', 'كذلك', 'هكذا', 'فقط', 'وحسب',
  'إذا', 'إذ', 'حين', 'حيث', 'حينما',
  'كلما', 'أما', 'إما', 'فأما', 'وأما',
  'مما', 'لما', 'فما', 'وما',

  // ─── كلمات ربط ───
  'لذلك', 'بذلك', 'فذلك', 'ولذلك', 'فلذلك',

  // ─── أسماء النداء ───
  'يا', 'أيها', 'أيتها', 'آيها',

  // ─── حروف الجواب ───
  'نعم', 'بلى', 'كلا',

  // ─── أسماء مبنية شائعة ───
  'ذات', 'ذو', 'ذي',

  // ─── أعداد ───
  'أحد', 'إحدى', 'واحد', 'واحدة',
  'اثنان', 'اثنتان', 'اثنين', 'اثنتين',
  'ثلاث', 'ثلاثة', 'أربع', 'أربعة',
  'خمس', 'خمسة', 'ست', 'ستة',
  'سبع', 'سبعة', 'ثمان', 'ثمانية',
  'تسع', 'تسعة', 'عشر', 'عشرة',

  // ─── أفعال شائعة جدًا ───
  'قال', 'قالت', 'قالوا', 'يقول', 'تقول',
  'فعل', 'فعلت', 'فعلوا', 'يفعل', 'تفعل',
  'جاء', 'جاءت', 'جاءوا', 'يجيء', 'تجيء',
  'ذهب', 'ذهبت', 'ذهبوا', 'يذهب', 'تذهب',
  'علم', 'علمت', 'يعلم', 'تعلم',
  'رأى', 'رأت', 'يري', 'تري',
  'أخذ', 'أخذت', 'يأخذ', 'تأخذ',
  'جعل', 'جعلت', 'يجعل', 'تجعل',
  'وجد', 'وجدت', 'يجد', 'تجد',
  'علم', 'علمت', 'يعلم', 'تعلم',
  'شاء', 'شاءت', 'يشاء', 'تشاء',
  'شاء', 'شاءت',
  'أراد', 'أرادت', 'أرادوا', 'يريد', 'تريد',
  'استطاع', 'استطاعت', 'يستطيع', 'تستطيع',
  'امر', 'امرأت', 'امرؤ',

  // ─── صفات شائعة جدًا ───
  'كبير', 'كبيرة', 'كبار',
  'صغير', 'صغيرة', 'صغار',
  'طويل', 'طويلة', 'طوال',
  'قصير', 'قصيرة',
  'حسن', 'حسنة', 'حسان',
  'سيء', 'سيئة', 'سيات',
  'جديد', 'جديدة', 'جداد',
  'قديم', 'قديمة', 'قدامي',
  'أول', 'أولي',
  'اخر', 'اخرة',

  // ─── تراكيب شائعة ───
  'لانه', 'لانها', 'لانهما', 'لانهم',
  'بانه', 'بانها', 'بانهما', 'بانهم',
  'فانه', 'فانها', 'فانهما', 'فانهم',
  'وانه', 'وانها', 'وانهما', 'وانهم',
]);

// ===== الدوال الداخلية =====

/**
 * تطبيع كلمة لمقارنة التفرد
 * يزيل التشكيل وعلامات الترقيم ويوحّد الألفات والهاءات
 */
function normalizeForUniqueness(word: string): string {
  return normalizeForComparison(word, {
    ignoreTashkeel: true,
    ignorePunctuation: true,
    ignoreSpaces: true,
  });
}

/**
 * هل الكلمة وظيفية (لا تصلح كمفتاح دلالي)؟
 *
 * تُحقّق الكلمة ضد قائمة شاملة من الكلمات الوظيفية العربية،
 * وتستبعد أيضًا الكلمات القصيرة جدًا (حرف أو حرفان بعد التطبيع).
 */
function isFunctionalWord(word: string): boolean {
  const normalized = normalizeForUniqueness(word);

  // كلمات من حرف واحد لا تصلح أبدًا
  if (normalized.length <= 1) return true;

  // فحص مباشر في القائمة (بعد التطبيع)
  if (FUNCTIONAL_WORDS.has(normalized)) return true;

  // فحص بعد إزالة التشكيل والترقيم فقط (بدون توحيد الألفات)
  const cleaned = removeTashkeel(word)
    .replace(/[،؛؟!.،;?!'"«»()\[\]{}\-_ـ]/g, '')
    .trim();
  if (FUNCTIONAL_WORDS.has(cleaned)) return true;

  // كلمات من حرفين فقط بعد التطبيع — شائعة وغير دلالية
  if (normalized.length <= 2) return true;

  return false;
}

/**
 * تنظيف الكلمة للعرض: إزالة علامات الترقيم من الأطراف فقط
 * مع الحفاظ على التشكيل والهجاء الأصلي
 */
export function cleanWordForDisplay(word: string): string {
  return word
    .replace(/^[،؛؟!.،;?!'"«»()\[\]{}\-_ـ]+/, '')
    .replace(/[،؛؟!.،;?!'"«»()\[\]{}\-_ـ]+$/, '')
    .trim();
}

/**
 * تقسيم بيت إلى كلمات مع الاحتفاظ بالنص الأصلي
 */
function splitVerseToWords(verse: Verse): Array<{ original: string; index: number }> {
  return verse.text
    .split(/\s+/)
    .filter(w => w.trim().length > 0)
    .map((original, index) => ({ original, index }));
}

/**
 * خلط مصفوفة أعداد عشوائيًا في مكانها (Fisher-Yates shuffle)
 */
function shuffleArrayInPlace(arr: number[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ===== اختيار كلمات المفتاح =====

/**
 * حساب ظهور كل كلمة مطعّمة في الأبيات
 * يعيد خريطة: الكلمة المطعّمة → مجموعة أرقام الأبيات التي تظهر فيها
 *
 * كل كلمة تُطعّم (إزالة تشكيل + ترقيم + توحيد ألفات)
 * ويُسجّل أي بيت تظهر فيه. كلمة تظهر في عدة أبيات
 * ليست فريدة ولا تصلح كمفتاح.
 */
function computeWordVerseOccurrences(
  verses: Verse[]
): Map<string, Set<number>> {
  const wordVerseMap = new Map<string, Set<number>>();

  for (const verse of verses) {
    const words = splitVerseToWords(verse);
    for (const { original } of words) {
      const normalized = normalizeForUniqueness(original);
      if (!normalized) continue;

      if (!wordVerseMap.has(normalized)) {
        wordVerseMap.set(normalized, new Set());
      }
      wordVerseMap.get(normalized)!.add(verse.index);
    }
  }

  return wordVerseMap;
}

/**
 * اختيار كلمة مفتاح فريدة لكل بيت
 *
 * الشروط:
 * 1. الكلمة تظهر في بيت واحد فقط من القصيدة (بعد التطبيع)
 * 2. الكلمة ليست وظيفية (حرف جر، ضمير، أداة عطف...)
 * 3. الكلمة ذات طول كافٍ (3 أحرف أو أكثر بعد التطبيع)
 * 4. عند تعدد المرشحين: يُرجّح الأطول والأكثر دلالية
 *
 * إذا لم توجد كلمة فريدة صالحة → يُضاف البيت إلى noKeywordVerses
 * **لا يُكسر شرط التفرد أبدًا**
 */
export function selectKeywords(verses: Verse[]): {
  keywords: Record<number, string>;
  noKeywordVerses: number[];
} {
  const keywords: Record<number, string> = {};
  const noKeywordVerses: number[] = [];

  if (verses.length === 0) {
    return { keywords, noKeywordVerses };
  }

  const wordVerseMap = computeWordVerseOccurrences(verses);

  for (const verse of verses) {
    const words = splitVerseToWords(verse);

    // جمع المرشحين: كلمات فريدة صالحة لهذا البيت
    const candidates: Array<{ original: string; score: number }> = [];

    for (const { original } of words) {
      const normalized = normalizeForUniqueness(original);
      if (!normalized) continue;

      // ─── شرط التفرد: الكلمة تظهر في بيت واحد فقط ───
      const verseSet = wordVerseMap.get(normalized);
      if (!verseSet || verseSet.size !== 1) continue;
      if (!verseSet.has(verse.index)) continue;

      // ─── شرط الدلالية: ليست كلمة وظيفية ───
      if (isFunctionalWord(original)) continue;

      // ─── شرط الطول: 3 أحرف أو أكثر بعد التطبيع ───
      if (normalized.length < 3) continue;

      // ─── نقاط التفضيل ───
      // الأطول أفضل، والكلمات ذات 5+ أحرف أفضل بكثير
      const score =
        normalized.length +
        (normalized.length >= 5 ? 5 : 0) +
        (normalized.length >= 4 ? 2 : 0);

      candidates.push({
        original: cleanWordForDisplay(original),
        score,
      });
    }

    if (candidates.length > 0) {
      // ترتيب حسب النقاط تنازليًا
      candidates.sort((a, b) => b.score - a.score);

      // اختيار عشوائي مرجّح من الأعلى نقاطًا
      // نأخذ المرشحين ذوي النقاط القريبة من الأعلى (فرق ≤ 2)
      const topScore = candidates[0].score;
      const topCandidates = candidates.filter(c => c.score >= topScore - 2);
      const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

      keywords[verse.index] = selected.original;
    } else {
      // لا توجد كلمة فريدة صالحة — حالة خاصة
      // **لا نستخدم كلمة مشتركة — لا نكسر شرط التفرد**
      noKeywordVerses.push(verse.index);
    }
  }

  return { keywords, noKeywordVerses };
}

// ===== إدارة الجولة =====

/**
 * إنشاء جولة تحدي فطين جديدة
 *
 * - يُنشأ ترتيب عشوائي للأبيات ويُثبّت طوال الجولة
 * - تُختار كلمة مفتاح فريدة لكل بيت وتُثبّت طوال الجولة
 * - لا يجوز إعادة توليد الترتيب أو الكلمات بعد بدء الجولة
 * - لا تُنسخ بيانات البيت — تُستخدم الفهارس فقط
 */
export function createFateenRound(poem: Poem): FateenRoundState {
  const verseCount = poem.verses.length;

  // اختيار كلمات المفتاح (ثابتة طوال الجولة)
  const { keywords, noKeywordVerses } = selectKeywords(poem.verses);

  // إنشاء ترتيب عشوائي ثابت — فقط الأبيات التي لها كلمة مفتاح فريدة
  // الأبيات بلا كلمة مفتاح لا تُضمَن في الجولة ولا تُحسب كأخطاء
  const noKeywordSet = new Set(noKeywordVerses);
  const verseOrder = Array.from({ length: verseCount }, (_, i) => i)
    .filter(i => !noKeywordSet.has(i));
  shuffleArrayInPlace(verseOrder);

  return {
    poemId: poem.id,
    verseOrder,
    currentStep: 0,
    keywords,
    tested: [],
    correct: [],
    errors: [],
    isComplete: false,
    noKeywordVerses,
  };
}

/**
 * الحصول على فهرس البيت الحالي في الجولة
 * يعيد null إذا اكتملت الجولة
 */
export function getCurrentVerseIndex(round: FateenRoundState): number | null {
  if (round.isComplete) return null;
  if (round.currentStep >= round.verseOrder.length) return null;
  return round.verseOrder[round.currentStep];
}

/**
 * الحصول على كلمة المفتاح للبيت الحالي
 * يعيد null إذا اكتملت الجولة أو لم تتوفر كلمة للبيت
 */
export function getCurrentKeyword(round: FateenRoundState): string | null {
  const verseIndex = getCurrentVerseIndex(round);
  if (verseIndex === null) return null;
  return round.keywords[verseIndex] ?? null;
}

/**
 * الحصول على كلمة المفتاح لبيت محدد
 */
export function getVerseKeyword(round: FateenRoundState, verseIndex: number): string | null {
  return round.keywords[verseIndex] ?? null;
}

/**
 * هل البيت المحدد يتوفر على كلمة مفتاح فريدة؟
 */
export function hasKeywordForVerse(round: FateenRoundState, verseIndex: number): boolean {
  return round.keywords[verseIndex] !== undefined;
}

/**
 * تسجيل إجابة المستخدمة والانتقال للبيت التالي
 *
 * يُنشأ حالة جديدة (immutability) — لا يُعدّل الحالة الأصلية:
 * - يُضاف البيت إلى tested
 * - يُضاف إلى correct أو errors حسب الإجابة
 * - يُنتقل للبيت التالي في الترتيب الثابت
 * - إذا كان هذا آخر بيت → isComplete = true
 *
 * **لا يُغيّر الترتيب أو كلمات المفتاح أبدًا**
 */
export function submitAnswer(round: FateenRoundState, isCorrect: boolean): FateenRoundState {
  const verseIndex = getCurrentVerseIndex(round);
  if (verseIndex === null) return round;

  const newTested = [...round.tested, verseIndex];
  const newCorrect = isCorrect ? [...round.correct, verseIndex] : round.correct;
  const newErrors = isCorrect ? round.errors : [...round.errors, verseIndex];
  const newStep = round.currentStep + 1;
  const isComplete = newStep >= round.verseOrder.length;

  return {
    ...round,
    currentStep: newStep,
    tested: newTested,
    correct: newCorrect,
    errors: newErrors,
    isComplete,
  };
}

/**
 * عدد الأبيات المتبقية في الجولة
 */
export function getRemainingCount(round: FateenRoundState): number {
  return round.verseOrder.length - round.tested.length;
}

/**
 * عدد الأبيات الكلي في الجولة
 */
export function getTotalCount(round: FateenRoundState): number {
  return round.verseOrder.length;
}

/**
 * نسبة التقدم في الجولة (0-100)
 */
export function getProgressPercent(round: FateenRoundState): number {
  if (round.verseOrder.length === 0) return 0;
  return Math.round((round.tested.length / round.verseOrder.length) * 100);
}
