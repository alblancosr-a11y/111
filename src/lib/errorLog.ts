import type {
  ErrorLogEntry,
  SuccessLogEntry,
  ErrorType,
  ExerciseType,
  SessionSource,
  AnswerQuality,
} from './types';
import type { DiffToken } from './poem-parser';

/**
 * تحديد نوع الخطأ بناءً على نوع الاختبار وتفاصيل الإجابة
 */
export function detectErrorType(
  exerciseType: ExerciseType,
  diffTokens: DiffToken[],
  verseHasAjar: boolean
): ErrorType {
  if (exerciseType === 'where_am_i' || exerciseType === 'continue_from') {
    return 'wrong_choice';
  }

  if (exerciseType === 'word_order') {
    return 'wrong_order_l2';
  }

  if (exerciseType === 'fill_blank' || exerciseType === 'fill_blanks') {
    return 'fill_error';
  }

  if (!diffTokens || diffTokens.length === 0) {
    return 'general';
  }

  const correctCount = diffTokens.filter(t => t.type === 'correct').length;
  const total = diffTokens.length;

  // إذا كانت الإجابة خاطئة تمامًا
  if (correctCount === 0) return 'full_miss';

  const missingCount = diffTokens.filter(t => t.type === 'missing').length;
  const extraCount = diffTokens.filter(t => t.type === 'extra').length;

  if (missingCount > 0 && extraCount === 0) return 'missing_word';
  if (extraCount > 0 && missingCount === 0) return 'extra_word';

  // تحديد ما إذا كان الخطأ في الصدر أو العجز
  if (verseHasAjar && diffTokens.length > 2) {
    const half = Math.floor(diffTokens.length / 2);
    const sadrErrors = diffTokens.slice(0, half).filter(t => t.type !== 'correct').length;
    const ajarErrors = diffTokens.slice(half).filter(t => t.type !== 'correct').length;
    if (sadrErrors > ajarErrors * 2) return 'sadr_error';
    if (ajarErrors > sadrErrors * 2) return 'ajar_error';
  }

  if (correctCount / total >= 0.5 && (missingCount > 0 || extraCount > 0)) {
    return 'wrong_word';
  }

  return 'general';
}

/**
 * إنشاء سجل خطأ جديد
 */
export function createErrorEntry(params: {
  poemId: string;
  verseIndex: number;
  verseText: string;
  exerciseType: ExerciseType;
  source: SessionSource;
  level: number | null;
  errorType: ErrorType;
  userAnswer?: string;
}): ErrorLogEntry {
  const now = Date.now();
  return {
    id: `err_${now}_${params.verseIndex}_${Math.random().toString(36).slice(2, 7)}`,
    poemId: params.poemId,
    verseIndex: params.verseIndex,
    verseText: params.verseText,
    timestamp: now,
    date: new Date(now).toISOString().split('T')[0],
    level: params.level,
    exerciseType: params.exerciseType,
    source: params.source,
    errorType: params.errorType,
    userAnswer: params.userAnswer,
  };
}

/**
 * إنشاء سجل نجاح جديد
 */
export function createSuccessEntry(params: {
  poemId: string;
  verseIndex: number;
  exerciseType: ExerciseType;
  source: SessionSource;
  level: number | null;
}): SuccessLogEntry {
  const now = Date.now();
  return {
    id: `suc_${now}_${params.verseIndex}_${Math.random().toString(36).slice(2, 7)}`,
    poemId: params.poemId,
    verseIndex: params.verseIndex,
    timestamp: now,
    date: new Date(now).toISOString().split('T')[0],
    level: params.level,
    exerciseType: params.exerciseType,
    source: params.source,
  };
}

/**
 * تسمية نوع الخطأ بالعربية
 */
export function getErrorTypeLabel(errorType: ErrorType): string {
  const labels: Record<ErrorType, string> = {
    missing_word: 'كلمة ناقصة',
    wrong_word: 'كلمة خاطئة',
    extra_word: 'كلمة زائدة',
    wrong_order: 'ترتيب خاطئ',
    sadr_error: 'خطأ في الصدر',
    ajar_error: 'خطأ في العجز',
    full_miss: 'لم يُسترجع البيت',
    wrong_choice: 'اختيار خاطئ',
    wrong_order_l2: 'ترتيب كلمات خاطئ',
    fill_error: 'كلمات ناقصة خاطئة',
    general: 'إجابة خاطئة',
  };
  return labels[errorType] || 'إجابة خاطئة';
}

/**
 * تسمية مصدر الجلسة بالعربية
 */
export function getSourceLabel(source: SessionSource): string {
  const labels: Record<SessionSource, string> = {
    cumulative: 'الحفظ التراكمي',
    review: 'المراجعة الشاملة',
    weak_verses: 'الأبيات الضعيفة',
    today_session: 'جلسة اليوم',
    chain: 'مراجعة متسلسلة',
    where_am_i: 'أين أنا؟',
    fateen: 'تحدي فطين',
    other: 'أخرى',
  };
  return labels[source] || 'أخرى';
}

/**
 * الحصول على سجل أخطاء بيت معين لقصيدة
 */
export function getVerseErrorLog(
  errorLog: ErrorLogEntry[],
  poemId: string,
  verseIndex: number
): ErrorLogEntry[] {
  return errorLog
    .filter(e => e.poemId === poemId && e.verseIndex === verseIndex)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * هل هذه الإجابة تُعتبر خطأً؟
 */
export function isErrorQuality(quality: AnswerQuality): boolean {
  return quality === 'wrong' || quality === 'review';
}
