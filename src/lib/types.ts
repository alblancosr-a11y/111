// ===== Core Types =====

export type StabilityLevel =
  | 'new'       // جديد
  | 'learning'  // قيد الحفظ
  | 'weak'      // ضعيف
  | 'medium'    // متوسط
  | 'strong'    // ثابت
  | 'mastered'; // متقن

export type ExerciseType =
  | 'complete_verse'  // إكمال البيت
  | 'fill_blank'      // إكمال كلمة ناقصة
  | 'fill_blanks'     // إكمال فراغات متعددة
  | 'sadr_to_ajar'    // صدر → عجز
  | 'ajar_to_sadr'    // عجز → صدر
  | 'first_word'      // أول كلمة → البيت كاملًا
  | 'write_all'       // كتابة البيت كاملًا
  | 'word_order'      // ترتيب الكلمات
  | 'next_verse'      // البيت التالي
  | 'prev_verse'      // البيت السابق
  | 'continue_from'   // أكمل من هنا
  | 'where_am_i';     // أين أنا؟

export type AnswerQuality =
  | 'mastered' // متقن - إجابة مثالية
  | 'correct'  // صحيح مع تردد
  | 'review'   // يحتاج مراجعة - إجابة جزئية
  | 'wrong';   // خطأ

export interface VerseMemoryData {
  standalone: StabilityLevel;
  contextual: StabilityLevel;
  transition: StabilityLevel;
  positional: StabilityLevel;
}

export interface VerseStats {
  verseIndex: number;
  attempts: number;
  correct: number;
  errors: number;
  lastReviewed: number | null;
  memory: VerseMemoryData;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: number;
  sessionCorrect: number;
  sessionErrors: number;
  exerciseHistory: Partial<Record<ExerciseType, { correct: number; errors: number }>>;
}

export interface Verse {
  index: number;
  text: string;
  sadr: string;
  ajar: string;
}

export interface Poem {
  id: string;
  title: string;
  poet: string;
  rawText: string;
  verses: Verse[];
  createdAt: number;
  updatedAt: number;
  currentVerseIndex: number;
  /** فهرس آخر بيت أتم المستخدم حفظه (0-indexed، أو -1 إن لم يكتمل أي بيت بعد) */
  lastCompletedVerseIndex?: number;
  lastSession: number | null;
  studyDays: string[];
}

export interface PoemStats {
  poemId: string;
  verses: Record<number, VerseStats>;
  totalSessions: number;
  totalCorrect: number;
  totalErrors: number;
  lastSession: number | null;
}

export interface SessionState {
  poemId: string;
  mode: 'cumulative' | 'chain' | 'continue_from' | 'where_am_i' | 'review';
  currentVerseIndex: number;
  queue: SessionItem[];
  completedCount: number;
  correctCount: number;
  errorCount: number;
  startedAt: number;
  requireTashkeel: boolean;
  continuingFromVerse?: number;
}

export interface SessionItem {
  verseIndex: number;
  exerciseType: ExerciseType;
  priority: number;
  attempts: number;
}

export interface AppSettings {
  darkMode: boolean;
  fontSize: number;
  requireTashkeel: boolean;
  showVerseNumbers: boolean;
  speechRate: number;
  speechPitch: number;
}

// ===== Error Log Types =====

export type ErrorType =
  | 'missing_word'      // نسيان كلمة
  | 'wrong_word'        // كلمة خاطئة
  | 'extra_word'        // إضافة كلمة
  | 'wrong_order'       // تغيير ترتيب الكلمات
  | 'sadr_error'        // خطأ في الصدر
  | 'ajar_error'        // خطأ في العجز
  | 'full_miss'         // عدم استرجاع البيت كاملًا
  | 'wrong_choice'      // اختيار إجابة خاطئة (المستوى 1)
  | 'wrong_order_l2'    // خطأ ترتيب كلمات المستوى 2
  | 'fill_error'        // خطأ في الكلمات الناقصة (المستوى 3-4)
  | 'general';          // إجابة خاطئة عامة

export type SessionSource =
  | 'cumulative'        // الحفظ التراكمي
  | 'review'            // المراجعة الشاملة
  | 'weak_verses'       // الأبيات الضعيفة
  | 'today_session'     // جلسة اليوم
  | 'chain'             // مراجعة متسلسلة
  | 'where_am_i'        // أين أنا؟
  | 'fateen'            // تحدي فطين
  | 'other';            // أخرى

export interface ErrorLogEntry {
  id: string;
  poemId: string;
  verseIndex: number;
  verseText: string;
  timestamp: number;        // وقت الخطأ (Unix ms)
  date: string;             // YYYY-MM-DD
  level: number | null;     // مستوى الاختبار (1-6) أو null
  exerciseType: ExerciseType;
  source: SessionSource;
  errorType: ErrorType;
  userAnswer?: string;      // إجابة المستخدمة
}

export interface SuccessLogEntry {
  id: string;
  poemId: string;
  verseIndex: number;
  timestamp: number;
  date: string;
  level: number | null;
  exerciseType: ExerciseType;
  source: SessionSource;
}

export interface AppState {
  poems: Poem[];
  stats: Record<string, PoemStats>;
  settings: AppSettings;
  activeSessionPoemId: string | null;
  errorLog: ErrorLogEntry[];
  successLog: SuccessLogEntry[];
}
