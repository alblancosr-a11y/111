import type { Poem, PoemStats, VerseStats, ErrorLogEntry } from './types';
import { getWeakVerseIndices } from './algorithm';

export type TodayTaskReason =
  | 'needs_strengthening'  // يحتاج إلى تقوية (خطأ فعلي)
  | 'due_for_review'       // مراجعة مستحقة
  | 'new_verse';           // بيت جديد

export interface TodayTask {
  poemId: string;
  poemTitle: string;
  poemPoet: string;
  verseIndex: number;
  verseText: string;
  reason: TodayTaskReason;
  /** وصف قصير للسبب */
  reasonLabel: string;
}

export interface TodaySessionData {
  tasks: TodayTask[];
  hasWeakVerses: boolean;
  hasDueReviews: boolean;
  hasNewVerses: boolean;
  totalCount: number;
}

function getReasonLabel(reason: TodayTaskReason): string {
  switch (reason) {
    case 'needs_strengthening': return 'يحتاج إلى تقوية';
    case 'due_for_review': return 'مراجعة مستحقة';
    case 'new_verse': return 'بيت جديد';
  }
}

/**
 * بناء قائمة مهام جلسة اليوم بدون تكرار بيت واحد
 * الأولوية: تقوية → مراجعة مستحقة → جديد
 */
export function buildTodaySession(
  poems: Poem[],
  stats: Record<string, PoemStats>,
  errorLog: ErrorLogEntry[]
): TodaySessionData {
  const now = Date.now();
  // مجموعة لمنع التكرار: `${poemId}:${verseIndex}`
  const seen = new Set<string>();
  const tasks: TodayTask[] = [];

  let hasWeakVerses = false;
  let hasDueReviews = false;
  let hasNewVerses = false;

  // ===== المرور الأول: الأبيات الضعيفة (خطأ فعلي) =====
  for (const poem of poems) {
    const pStats = stats[poem.id];
    if (!pStats) continue;
    const weakIndices = getWeakVerseIndices(pStats.verses, poem.verses.length);
    for (const vIdx of weakIndices) {
      const key = `${poem.id}:${vIdx}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hasWeakVerses = true;
      const verse = poem.verses[vIdx];
      if (!verse) continue;
      tasks.push({
        poemId: poem.id,
        poemTitle: poem.title,
        poemPoet: poem.poet,
        verseIndex: vIdx,
        verseText: verse.text,
        reason: 'needs_strengthening',
        reasonLabel: getReasonLabel('needs_strengthening'),
      });
    }
  }

  // ===== المرور الثاني: المراجعات المستحقة (حان موعدها) =====
  for (const poem of poems) {
    const pStats = stats[poem.id];
    if (!pStats) continue;
    for (let vIdx = 0; vIdx < poem.verses.length; vIdx++) {
      const key = `${poem.id}:${vIdx}`;
      if (seen.has(key)) continue;
      const vStats: VerseStats | undefined = pStats.verses[vIdx];
      if (!vStats) continue;
      if (vStats.memory.standalone === 'new') continue;
      // تجاهل الأبيات التي حان موعد مراجعتها بسبب الضعف (تم تضمينها أعلاه)
      if (now >= vStats.nextReviewAt) {
        seen.add(key);
        hasDueReviews = true;
        const verse = poem.verses[vIdx];
        if (!verse) continue;
        tasks.push({
          poemId: poem.id,
          poemTitle: poem.title,
          poemPoet: poem.poet,
          verseIndex: vIdx,
          verseText: verse.text,
          reason: 'due_for_review',
          reasonLabel: getReasonLabel('due_for_review'),
        });
      }
    }
  }

  // ===== المرور الثالث: الأبيات الجديدة التي لم تُبدأ =====
  for (const poem of poems) {
    const pStats = stats[poem.id];
    // الأبيات الجديدة = التي لم يتم حفظها بعد (ما بعد آخر بيت مكتمل)
    const lastCompleted = typeof poem.lastCompletedVerseIndex === 'number' && poem.lastCompletedVerseIndex >= 0
      ? poem.lastCompletedVerseIndex
      : -1;
    const nextNewIdx = lastCompleted + 1;
    if (nextNewIdx >= poem.verses.length) continue;

    for (let vIdx = nextNewIdx; vIdx < poem.verses.length; vIdx++) {
      const key = `${poem.id}:${vIdx}`;
      if (seen.has(key)) continue;
      const vStats = pStats?.verses[vIdx];
      // بيت جديد = لم يُبدأ حفظه بعد
      if (!vStats || vStats.memory.standalone === 'new') {
        seen.add(key);
        hasNewVerses = true;
        const verse = poem.verses[vIdx];
        if (!verse) continue;
        tasks.push({
          poemId: poem.id,
          poemTitle: poem.title,
          poemPoet: poem.poet,
          verseIndex: vIdx,
          verseText: verse.text,
          reason: 'new_verse',
          reasonLabel: getReasonLabel('new_verse'),
        });
        // اعرض بيتًا جديدًا واحدًا فقط لكل قصيدة لتجنب الإرهاق
        break;
      }
    }
  }

  return {
    tasks,
    hasWeakVerses,
    hasDueReviews,
    hasNewVerses,
    totalCount: tasks.length,
  };
}
