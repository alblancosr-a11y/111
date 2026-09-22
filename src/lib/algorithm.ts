import type { VerseStats, StabilityLevel, ExerciseType, AnswerQuality, SessionItem, Verse } from './types';
import { defaultVerseStats } from './storage';

const REPS_TO_PROMOTE: Record<StabilityLevel, number> = {
  new: 1,
  learning: 2,
  weak: 3,
  medium: 4,
  strong: 5,
  mastered: 999,
};

export function getStabilityLabel(level: StabilityLevel): string {
  const labels: Record<StabilityLevel, string> = {
    new: 'جديد',
    learning: 'قيد الحفظ',
    weak: 'ضعيف',
    medium: 'متوسط',
    strong: 'ثابت',
    mastered: 'متقن',
  };
  return labels[level];
}

export function getStabilityOrder(level: StabilityLevel): number {
  const order: Record<StabilityLevel, number> = {
    new: 0,
    learning: 1,
    weak: 2,
    medium: 3,
    strong: 4,
    mastered: 5,
  };
  return order[level];
}

function qualityToNumber(quality: AnswerQuality): number {
  switch (quality) {
    case 'mastered': return 5;
    case 'correct': return 4;
    case 'review': return 2;
    case 'wrong': return 0;
  }
}

function promoteLevel(level: StabilityLevel): StabilityLevel {
  const levels: StabilityLevel[] = ['new', 'learning', 'weak', 'medium', 'strong', 'mastered'];
  const idx = levels.indexOf(level);
  return levels[Math.min(idx + 1, levels.length - 1)];
}

function demoteLevel(level: StabilityLevel, steps: number): StabilityLevel {
  const levels: StabilityLevel[] = ['new', 'learning', 'weak', 'medium', 'strong', 'mastered'];
  const idx = levels.indexOf(level);
  return levels[Math.max(idx - steps, 0)];
}

export function applySM2(stats: VerseStats, quality: AnswerQuality): VerseStats {
  const qualityNum = qualityToNumber(quality);
  let { easeFactor, interval, repetitions } = stats;

  if (qualityNum < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  easeFactor = easeFactor + (0.1 - (5 - qualityNum) * (0.08 + (5 - qualityNum) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  if (easeFactor > 4.0) easeFactor = 4.0;

  const nextReviewAt = Date.now() + interval * 60 * 1000;

  return {
    ...stats,
    easeFactor,
    interval,
    repetitions,
    nextReviewAt,
    lastReviewed: Date.now(),
  };
}

export function updateStability(stats: VerseStats, quality: AnswerQuality): StabilityLevel {
  const current = stats.memory.standalone;

  if (quality === 'mastered' || quality === 'correct') {
    const newReps = stats.repetitions + 1;
    if (newReps >= REPS_TO_PROMOTE[current]) {
      return promoteLevel(current);
    }
    return current;
  } else if (quality === 'review') {
    return demoteLevel(current, 1);
  } else {
    return demoteLevel(current, 2);
  }
}

export function getEligibleExercises(
  stability: StabilityLevel,
  hasAjar: boolean,
  verseIndex: number,
  totalVerses: number
): ExerciseType[] {
  const exercises: ExerciseType[] = [];

  switch (stability) {
    case 'new':
    case 'learning':
      exercises.push('complete_verse');
      if (hasAjar) {
        exercises.push('sadr_to_ajar');
        exercises.push('fill_blank');
      }
      break;
    case 'weak':
      exercises.push('complete_verse');
      exercises.push('fill_blank');
      if (hasAjar) {
        exercises.push('sadr_to_ajar');
        exercises.push('ajar_to_sadr');
        exercises.push('fill_blanks');
      }
      break;
    case 'medium':
      exercises.push('fill_blank');
      exercises.push('fill_blanks');
      if (hasAjar) {
        exercises.push('sadr_to_ajar');
        exercises.push('ajar_to_sadr');
      }
      exercises.push('word_order');
      if (verseIndex > 0) exercises.push('prev_verse');
      if (verseIndex < totalVerses - 1) exercises.push('next_verse');
      break;
    case 'strong':
      if (hasAjar) {
        exercises.push('sadr_to_ajar');
        exercises.push('ajar_to_sadr');
      }
      exercises.push('first_word');
      exercises.push('word_order');
      exercises.push('write_all');
      if (verseIndex > 0) exercises.push('prev_verse');
      if (verseIndex < totalVerses - 1) exercises.push('next_verse');
      break;
    case 'mastered':
      exercises.push('first_word');
      exercises.push('write_all');
      if (verseIndex > 0) exercises.push('prev_verse');
      if (verseIndex < totalVerses - 1) exercises.push('next_verse');
      break;
  }

  return exercises.length > 0 ? exercises : ['complete_verse'];
}

export function selectExerciseType(
  stats: VerseStats,
  verses: Verse[],
  verseIndex: number
): ExerciseType {
  const verse = verses[verseIndex];
  const hasAjar = Boolean(verse?.ajar?.trim());
  const eligible = getEligibleExercises(stats.memory.standalone, hasAjar, verseIndex, verses.length);

  const weights = eligible.map(type => {
    const history = stats.exerciseHistory[type];
    if (!history) return 1;
    const errorRate = history.errors / Math.max(history.correct + history.errors, 1);
    return 1 + errorRate * 2;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < eligible.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return eligible[i];
  }

  return eligible[0];
}

export function buildCumulativeQueue(
  verses: Verse[],
  statsMap: Record<number, VerseStats>,
  maxVerseReached: number,
  newVerseIndex: number | null
): SessionItem[] {
  const queue: SessionItem[] = [];
  const now = Date.now();

  if (newVerseIndex !== null && newVerseIndex < verses.length) {
    const verse = verses[newVerseIndex];
    const hasAjar = Boolean(verse.ajar.trim());
    queue.push({ verseIndex: newVerseIndex, exerciseType: 'complete_verse', priority: 3, attempts: 0 });
    if (hasAjar) {
      queue.push({ verseIndex: newVerseIndex, exerciseType: 'sadr_to_ajar', priority: 3, attempts: 0 });
    }
    queue.push({ verseIndex: newVerseIndex, exerciseType: 'fill_blank', priority: 3, attempts: 0 });
  }

  const dueVerses: Array<{ index: number; stats: VerseStats; overdue: number }> = [];
  for (let i = 0; i <= Math.min(maxVerseReached, verses.length - 1); i++) {
    const stats = statsMap[i] || defaultVerseStats(i);
    const overdue = now - stats.nextReviewAt;
    if (overdue >= 0 || stats.memory.standalone === 'new') {
      if (i === newVerseIndex) continue;
      dueVerses.push({ index: i, stats, overdue: Math.max(overdue, 0) });
    }
  }

  dueVerses.sort((a, b) => {
    const aScore = a.stats.memory.standalone === 'new' ? 100 : a.overdue + (a.stats.errors - a.stats.correct) * 0.1;
    const bScore = b.stats.memory.standalone === 'new' ? 100 : b.overdue + (b.stats.errors - b.stats.correct) * 0.1;
    return bScore - aScore;
  });

  const sessionVerses = dueVerses.slice(0, 14);
  for (const { index, stats } of sessionVerses) {
    const exerciseType = selectExerciseType(stats, verses, index);
    queue.push({
      verseIndex: index,
      exerciseType,
      priority: stats.memory.standalone === 'new' ? 2 : 1,
      attempts: 0,
    });
  }

  if (maxVerseReached >= 4) {
    const chainVerses = selectChainVerses(verses, statsMap, maxVerseReached);
    for (const idx of chainVerses) {
      if (!queue.find(q => q.verseIndex === idx)) {
        queue.push({ verseIndex: idx, exerciseType: 'next_verse', priority: 0, attempts: 0 });
      }
    }
  }

  return queue;
}

function selectChainVerses(verses: Verse[], _statsMap: Record<number, VerseStats>, maxVerse: number): number[] {
  const count = Math.min(maxVerse + 1, verses.length);
  if (count <= 1) return [];
  const selected: number[] = [0];
  if (maxVerse > 0) selected.push(maxVerse);
  const mid = Math.floor(maxVerse / 2);
  if (!selected.includes(mid)) selected.push(mid);
  const rand = Math.floor(Math.random() * (maxVerse + 1));
  if (!selected.includes(rand)) selected.push(rand);
  return selected.sort((a, b) => a - b);
}

export function buildChainQueue(
  verses: Verse[],
  statsMap: Record<number, VerseStats>,
  maxVerseReached: number
): SessionItem[] {
  const queue: SessionItem[] = [];
  const exerciseTypes: ExerciseType[] = ['complete_verse', 'sadr_to_ajar', 'fill_blank', 'next_verse', 'write_all'];

  for (let i = 0; i <= Math.min(maxVerseReached, verses.length - 1); i++) {
    const stats = statsMap[i] || defaultVerseStats(i);
    const verse = verses[i];
    const hasAjar = Boolean(verse.ajar.trim());
    let type = exerciseTypes[i % exerciseTypes.length];
    if (!hasAjar && (type === 'sadr_to_ajar' || type === 'ajar_to_sadr')) {
      type = 'complete_verse';
    }
    if (type === 'next_verse' && i >= verses.length - 1) {
      type = 'write_all';
    }
    queue.push({ verseIndex: i, exerciseType: type, priority: stats.errors > stats.correct ? 2 : 1, attempts: 0 });
  }

  return queue;
}

export function buildWhereAmIQueue(
  verses: Verse[],
  statsMap: Record<number, VerseStats>,
  maxVerseReached: number
): SessionItem[] {
  const queue: SessionItem[] = [];
  const candidates = Array.from({ length: Math.min(maxVerseReached + 1, verses.length) }, (_, i) => i)
    .filter(i => {
      const stats = statsMap[i];
      return stats && stats.memory.standalone !== 'new';
    });

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const selected = candidates.slice(0, 8);
  for (const idx of selected) {
    if (idx > 0) queue.push({ verseIndex: idx, exerciseType: 'prev_verse', priority: 1, attempts: 0 });
    if (idx < verses.length - 1) queue.push({ verseIndex: idx, exerciseType: 'next_verse', priority: 1, attempts: 0 });
  }

  return queue;
}

export function buildReviewQueue(
  verses: Verse[],
  statsMap: Record<number, VerseStats>,
  maxVerseReached: number
): SessionItem[] {
  const queue: SessionItem[] = [];
  const now = Date.now();

  for (let i = 0; i <= Math.min(maxVerseReached, verses.length - 1); i++) {
    const stats = statsMap[i] || defaultVerseStats(i);
    if (stats.memory.standalone === 'new') continue;
    const overdue = now - stats.nextReviewAt;
    if (overdue >= 0) {
      const exerciseType = selectExerciseType(stats, verses, i);
      queue.push({
        verseIndex: i,
        exerciseType,
        priority: stats.errors > stats.correct ? 2 : 1,
        attempts: 0,
      });
    }
  }

  queue.sort((a, b) => b.priority - a.priority);
  return queue;
}

export function updateVerseStatsAfterAnswer(
  stats: VerseStats,
  quality: AnswerQuality,
  exerciseType: ExerciseType
): VerseStats {
  const isCorrect = quality === 'mastered' || quality === 'correct';
  const newSM2 = applySM2(stats, quality);
  const newStandaloneLevel = updateStability(stats, quality);

  const exHistory = { ...stats.exerciseHistory };
  const prev = exHistory[exerciseType] || { correct: 0, errors: 0 };
  exHistory[exerciseType] = {
    correct: prev.correct + (isCorrect ? 1 : 0),
    errors: prev.errors + (isCorrect ? 0 : 1),
  };

  const memory = {
    ...stats.memory,
    standalone: newStandaloneLevel,
  };

  const newStats = { ...newSM2 };

  return {
    ...newStats,
    attempts: stats.attempts + 1,
    correct: stats.correct + (isCorrect ? 1 : 0),
    errors: stats.errors + (isCorrect ? 0 : 1),
    sessionCorrect: stats.sessionCorrect + (isCorrect ? 1 : 0),
    sessionErrors: stats.sessionErrors + (isCorrect ? 0 : 1),
    exerciseHistory: exHistory,
    memory,
  };
}

export function requeueError(
  queue: SessionItem[],
  item: SessionItem,
  verses: Verse[],
  _stats: VerseStats
): SessionItem[] {
  const verse = verses[item.verseIndex];
  const hasAjar = Boolean(verse?.ajar?.trim());
  const currentType = item.exerciseType;
  const alternatives: ExerciseType[] = ['complete_verse', 'fill_blank', 'sadr_to_ajar', 'write_all']
    .filter(t => t !== currentType && (hasAjar || (t !== 'sadr_to_ajar' && t !== 'ajar_to_sadr'))) as ExerciseType[];

  const newType = alternatives[Math.floor(Math.random() * alternatives.length)] || 'complete_verse';
  const insertAt = Math.min(queue.length, 2);
  const newQueue = [...queue];
  newQueue.splice(insertAt, 0, { verseIndex: item.verseIndex, exerciseType: newType, priority: 2, attempts: item.attempts + 1 });
  return newQueue;
}

export function detectWeakTransitions(statsMap: Record<number, VerseStats>, maxVerse: number): number[] {
  const weak: number[] = [];
  for (let i = 0; i <= maxVerse; i++) {
    const s = statsMap[i];
    if (!s || s.memory.transition === 'new' || s.memory.transition === 'weak') {
      weak.push(i);
    }
  }
  return weak;
}

export function isDueForReview(stats: VerseStats | undefined): boolean {
  if (!stats) return true;
  return Date.now() >= stats.nextReviewAt || stats.memory.standalone === 'new';
}

export function getOverallProgress(
  statsMap: Record<number, VerseStats>,
  totalVerses: number
): { mastered: number; strong: number; medium: number; weak: number; learning: number; newCount: number } {
  let mastered = 0, strong = 0, medium = 0, weak = 0, learning = 0, newCount = 0;
  for (let i = 0; i < totalVerses; i++) {
    const stats = statsMap[i];
    const level = stats?.memory.standalone || 'new';
    switch (level) {
      case 'mastered': mastered++; break;
      case 'strong': strong++; break;
      case 'medium': medium++; break;
      case 'weak': weak++; break;
      case 'learning': learning++; break;
      default: newCount++; break;
    }
  }
  return { mastered, strong, medium, weak, learning, newCount };
}

/**
 * تحديد الأبيات الضعيفة بناءً على الأخطاء الفعلية المسجلة.
 * البيت ضعيف إذا كان لديه errors > 0 في إحصائياته
 * ومستوى ثباته ليس strong أو mastered بعد (لم يتعافَ بعد).
 */
export function getWeakVerseIndices(
  statsMap: Record<number, VerseStats>,
  totalVerses: number
): number[] {
  const weakIndices: Array<{ index: number; priority: number }> = [];

  for (let i = 0; i < totalVerses; i++) {
    const stats = statsMap[i];
    if (!stats) continue;
    // البيت ضعيف إذا كان لديه خطأ فعلي مسجل ومستواه لم يتعافَ بعد
    if (stats.errors === 0) continue;
    const level = stats.memory.standalone;
    // إذا وصل إلى strong أو mastered رغم الأخطاء يعتبر تعافى
    if (level === 'strong' || level === 'mastered') continue;
    // الأولوية: الأكثر خطأً أولًا، ثم الأضعف مستوىً
    const levelPriority: Record<StabilityLevel, number> = {
      weak: 0, learning: 1, medium: 2, new: 3, strong: 10, mastered: 10,
    };
    const priority = levelPriority[level] + (stats.errors > stats.correct ? 0 : 5);
    weakIndices.push({ index: i, priority });
  }

  weakIndices.sort((a, b) => a.priority - b.priority);
  return weakIndices.map(w => w.index);
}

/**
 * حساب نسبة الحفظ الحقيقية:
 * البيت "محفوظ" إذا وصل إلى مستوى medium أو أعلى
 */
export function calcMemorizationRate(
  statsMap: Record<number, VerseStats>,
  totalVerses: number
): number {
  if (totalVerses === 0) return 0;
  let memorized = 0;
  for (let i = 0; i < totalVerses; i++) {
    const stats = statsMap[i];
    const level = stats?.memory.standalone || 'new';
    if (level === 'medium' || level === 'strong' || level === 'mastered') {
      memorized++;
    }
  }
  return Math.round((memorized / totalVerses) * 100);
}

/**
 * حساب سلسلة الأيام المتتالية من مصفوفة أيام التعلم
 */
export function calcStreak(days: string[]): number {
  if (!days.length) return 0;
  const sorted = [...new Set(days)].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let check = today;
  for (const d of sorted) {
    if (d === check) {
      streak++;
      const dt = new Date(check);
      dt.setDate(dt.getDate() - 1);
      check = dt.toISOString().split('T')[0];
    } else if (d < check) {
      break;
    }
  }
  return streak;
}

/**
 * حساب عدد أيام التعلم الفريدة
 */
export function calcLearnDays(days: string[]): number {
  return new Set(days).size;
}

/**
 * تنسيق المدة منذ آخر جلسة
 */
export function formatTimeSince(timestamp: number | null): string {
  if (!timestamp) return 'لم تبدأ جلسة بعد';
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMin < 2) return 'منذ لحظات';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffH < 24) return `منذ ${diffH} ساعة`;
  if (diffD === 1) return 'منذ يوم';
  if (diffD < 30) return `منذ ${diffD} يومًا`;
  const diffM = Math.floor(diffD / 30);
  return `منذ ${diffM} شهر`;
}
