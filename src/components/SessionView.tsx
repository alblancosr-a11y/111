import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Lightbulb, CheckCircle2, Navigation } from 'lucide-react';
import type { Poem, PoemStats, AppSettings, VerseStats, Verse, ErrorLogEntry, SuccessLogEntry, SessionSource } from '../lib/types';
import { defaultVerseStats } from '../lib/storage';
import {
  generateLevelExercises,
  generatePairReview,
  generateComprehensiveReview,
  getExerciseLabel,
  getArabicVerseOrdinal,
  type Exercise,
} from '../lib/exercises';
import { compareAnswers, removeTashkeel, splitVerse } from '../lib/poem-parser';
import { updateVerseStatsAfterAnswer } from '../lib/algorithm';
import { detectErrorType, createErrorEntry, createSuccessEntry } from '../lib/errorLog';
import { Button, ProgressBar, Badge } from '../ui';

interface Props {
  poem: Poem;
  stats: PoemStats | undefined;
  settings: AppSettings;
  mode: string;
  source?: SessionSource;
  startFromVerse?: number;
  newVerseIndex?: number;
  segmentIndex?: number;
  weakVerseIndex?: number;
  onClose: () => void;
  onVerseUpdate: (poemId: string, vs: VerseStats) => void;
  onSessionComplete: (poemId: string, correct: number, errors: number) => void;
  onCurrentVerseUpdate: (poemId: string, idx: number, markCompleted?: boolean) => void;
  onErrorLog?: (entry: ErrorLogEntry) => void;
  onSuccessLog?: (entry: SuccessLogEntry) => void;
}

type Phase = 'preview' | 'practice' | 'pair_review' | 'comprehensive_review' | 'session_complete';

/**
 * مكون عرض البيت الشعري على سطرين منفصلين:
 * السطر الأول = صدر البيت (يتجه نحو اليمين قليلًا)
 * السطر الثاني = عجز البيت (يتجه نحو اليسار قليلًا)
 */
export function PoeticVerseLines({
  sadr,
  ajar,
  text,
  showTashkeel = true,
  fontSize = '1.25rem',
}: {
  sadr?: string;
  ajar?: string;
  text?: string;
  showTashkeel?: boolean;
  fontSize?: string;
}) {
  let finalSadr = sadr ?? '';
  let finalAjar = ajar ?? '';

  if (!finalSadr && text) {
    const parsed = splitVerse(text, 0);
    finalSadr = parsed.sadr;
    finalAjar = parsed.ajar;
  }

  const formatText = (t: string) => (showTashkeel ? t : removeTashkeel(t));

  if (!finalAjar || !finalAjar.trim()) {
    return (
      <div
        className="poetic-verse"
        style={{ fontFamily: 'var(--font-poem)', fontSize, lineHeight: '2.1', color: 'var(--text-0)' }}
      >
        <div className="poetic-sadr">{formatText(finalSadr || text || '')}</div>
      </div>
    );
  }

  return (
    <div
      className="poetic-verse"
      style={{ fontFamily: 'var(--font-poem)', fontSize, lineHeight: '2.1', color: 'var(--text-0)' }}
    >
      <div className="poetic-sadr">{formatText(finalSadr)}</div>
      <div className="poetic-ajar">{formatText(finalAjar)}</div>
    </div>
  );
}

/** تحديد آخر بيت أتم المستخدم حفظه */
export function getLastCompletedVerseIndex(poem: Poem, stats?: PoemStats): number {
  if (typeof poem.lastCompletedVerseIndex === 'number') {
    if (poem.lastCompletedVerseIndex >= 0) {
      return Math.min(poem.lastCompletedVerseIndex, poem.verses.length - 1);
    }
    // إذا كان -1 ولكن هناك currentVerseIndex محفوظ سابقًا > 0
    if (poem.currentVerseIndex > 0) {
      return Math.min(poem.currentVerseIndex, poem.verses.length - 1);
    }
    return -1;
  }

  // توافق مع البيانات المحفوظة مسبقًا
  const practicedIndices = stats?.verses
    ? Object.values(stats.verses)
        .filter(v => v.correct > 0 || v.attempts > 0)
        .map(v => v.verseIndex)
    : [];

  if (poem.currentVerseIndex > 0) {
    return Math.min(poem.currentVerseIndex, poem.verses.length - 1);
  }

  if (practicedIndices.length > 0) {
    return Math.min(Math.max(...practicedIndices), poem.verses.length - 1);
  }

  return -1;
}

export default function SessionView({
  poem,
  stats,
  settings,
  mode,
  source,
  startFromVerse,
  segmentIndex,
  weakVerseIndex,
  onClose,
  onVerseUpdate,
  onSessionComplete,
  onCurrentVerseUpdate,
  onErrorLog,
  onSuccessLog,
}: Props) {
  const sessionSource: SessionSource = source ||
    (mode === 'cumulative' ? 'cumulative' :
     mode === 'review' ? 'review' :
     mode === 'weak_verses' ? 'weak_verses' :
     mode === 'chain' ? 'chain' :
     mode === 'where_am_i' ? 'where_am_i' : 'other');
  const statsMap = stats?.verses || {};
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const totalVerses = poem.verses.length;
  const lastCompletedIdx = getLastCompletedVerseIndex(poem, stats);

  const initialVerseIdx = (() => {
    if (mode === 'continue_from' && startFromVerse !== undefined) return startFromVerse;
    if (mode === 'weak_verses' && weakVerseIndex !== undefined) return weakVerseIndex;
    if (mode === 'review' || mode === 'chain' || mode === 'where_am_i') return 0;
    // في الوضع التراكمي: نحترم startFromVerse إن حُدد (من بوابة الخيارات)
    if (mode === 'cumulative' && startFromVerse !== undefined) return startFromVerse;
    // افتراضي: نبدأ من البيت الذي يلي آخر بيت مكتمل
    if (lastCompletedIdx >= 0 && lastCompletedIdx + 1 < totalVerses) {
      return lastCompletedIdx + 1;
    }
    return 0;
  })();

  const initialPhase: Phase =
    mode === 'review' || mode === 'chain' ? 'comprehensive_review' : 'preview';

  const [currentVerseIdx, setCurrentVerseIdx] = useState(initialVerseIdx);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [exerciseSet, setExerciseSet] = useState<Exercise[]>([]);
  const [exIdx, setExIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [resultQuality, setResultQuality] = useState<'mastered' | 'correct' | 'review' | 'wrong'>('correct');
  const [diffTokens, setDiffTokens] = useState<Array<{ text: string; type: string }>>([]);
  const [selectedWordIndices, setSelectedWordIndices] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [versesCompleted, setVersesCompleted] = useState(0);
  const [showTashkeel, setShowTashkeel] = useState(true);
  const [currentLevel, setCurrentLevel] = useState(1);

  const currentVerse: Verse | undefined = poem.verses[currentVerseIdx];
  const currentExercise = exerciseSet[exIdx] || null;

  useEffect(() => {
    if (!showResult && phase === 'practice' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [exIdx, showResult, phase]);

  // ===== بدء تمرين مستوى محدد =====
  const startVersePractice = useCallback(
    (idx: number, level = 1) => {
      const verse = poem.verses[idx];
      if (!verse) return;
      const exercises = generateLevelExercises(level, verse, poem.verses);
      setExerciseSet(exercises);
      setCurrentLevel(level);
      setExIdx(0);
      setUserAnswer('');
      setSelectedWordIndices([]);
      setShowResult(false);
      setShowHint(false);
      setDiffTokens([]);
      setPhase('practice');
    },
    [poem]
  );

  const startComprehensiveReview = useCallback(() => {
    if (poem.verses.length === 0) return;
    setExerciseSet(generateComprehensiveReview(poem.verses, poem.currentVerseIndex, segmentIndex));
    setExIdx(0);
    setUserAnswer('');
    setSelectedWordIndices([]);
    setShowResult(false);
    setShowHint(false);
    setDiffTokens([]);
    setPhase('comprehensive_review');
  }, [poem]);

  // ===== التحقق من الإجابة =====
  const checkAnswer = useCallback(() => {
    if (!currentExercise) return;
    let answer = userAnswer;

    if (currentExercise.scrambledWords && selectedWordIndices.length > 0) {
      answer = selectedWordIndices.map(idx => currentExercise.scrambledWords![idx]).join(' ');
    }

    if (currentExercise.choices && userAnswer) {
      answer = userAnswer;
    }

    const result = compareAnswers(answer, currentExercise.answer, {
      requireTashkeel: settings.requireTashkeel,
    });
    setResultQuality(result.quality);
    setDiffTokens(result.diffTokens);
    setShowResult(true);

    const isCorrect = result.isCorrect;

    if (isCorrect) {
      setCorrectCount(c => c + 1);
    } else {
      setErrorCount(e => e + 1);
    }

    // تحديث إحصائيات البيت
    const verseIdx = currentExercise.verseIndex;
    const existingStats = statsMap[verseIdx] || defaultVerseStats(verseIdx);
    const updatedStats = updateVerseStatsAfterAnswer(existingStats, result.quality, currentExercise.type);
    onVerseUpdate(poem.id, updatedStats);

    // ===== تسجيل الخطأ أو النجاح في السجل =====
    const verse = poem.verses[verseIdx];
    const level = currentExercise.level ?? null;
    if (!isCorrect && onErrorLog && verse) {
      const hasAjar = Boolean(verse.ajar?.trim());
      const errorType = detectErrorType(currentExercise.type, result.diffTokens, hasAjar);
      onErrorLog(createErrorEntry({
        poemId: poem.id,
        verseIndex: verseIdx,
        verseText: verse.text,
        exerciseType: currentExercise.type,
        source: sessionSource,
        level,
        errorType,
        userAnswer: userAnswer,
      }));
    } else if (isCorrect && onSuccessLog) {
      onSuccessLog(createSuccessEntry({
        poemId: poem.id,
        verseIndex: verseIdx,
        exerciseType: currentExercise.type,
        source: sessionSource,
        level,
      }));
    }
  }, [currentExercise, userAnswer, selectedWordIndices, settings, statsMap, poem, onVerseUpdate, onErrorLog, onSuccessLog, sessionSource]);

  // ===== الانتقال إلى البيت التالي أو المراجعة الثنائية =====
  const advanceToNextVerse = useCallback(() => {
    // تسجيل إتمام حفظ البيت الحالي رسميًا
    onCurrentVerseUpdate(poem.id, currentVerseIdx, true);

    const nextIdx = currentVerseIdx + 1;

    // بعد إتمام حفظ بيتين جديدين (فهرس فردي 0-indexed = بيت زوجي 1-indexed) → مراجعة البيتين
    if (currentVerseIdx % 2 === 1) {
      const i1 = currentVerseIdx - 1;
      const i2 = currentVerseIdx;
      const v1 = poem.verses[i1];
      const v2 = poem.verses[i2];
      if (v1 && v2) {
        setExerciseSet(generatePairReview(v1, v2, poem.verses));
        setExIdx(0);
        setUserAnswer('');
        setSelectedWordIndices([]);
        setShowResult(false);
        setShowHint(false);
        setDiffTokens([]);
        setPhase('pair_review');
      } else {
        if (nextIdx >= totalVerses) {
          setVersesCompleted(v => v + 1);
          setPhase('session_complete');
          onSessionComplete(poem.id, correctCount, errorCount);
          return;
        }
        setCurrentVerseIdx(nextIdx);
        setCurrentLevel(1);
        setPhase('preview');
        setExerciseSet([]);
        setExIdx(0);
        setUserAnswer('');
        setSelectedWordIndices([]);
        setShowResult(false);
        setShowHint(false);
        setDiffTokens([]);
        setVersesCompleted(v => v + 1);
      }
      return;
    }

    if (nextIdx >= totalVerses) {
      setVersesCompleted(v => v + 1);
      setPhase('session_complete');
      onSessionComplete(poem.id, correctCount, errorCount);
      return;
    }

    setCurrentVerseIdx(nextIdx);
    setCurrentLevel(1);
    setPhase('preview');
    setExerciseSet([]);
    setExIdx(0);
    setUserAnswer('');
    setSelectedWordIndices([]);
    setShowResult(false);
    setShowHint(false);
    setDiffTokens([]);
    setVersesCompleted(v => v + 1);
  }, [currentVerseIdx, totalVerses, poem, correctCount, errorCount, onSessionComplete, onCurrentVerseUpdate]);

  // ===== الانتقال بعد إكمال المراجعة الثنائية =====
  const advanceAfterPairReview = useCallback(() => {
    const nextIdx = currentVerseIdx + 1;

    if (nextIdx >= totalVerses) {
      setPhase('session_complete');
      onSessionComplete(poem.id, correctCount, errorCount);
      return;
    }

    setCurrentVerseIdx(nextIdx);
    setCurrentLevel(1);
    setPhase('preview');
    setExerciseSet([]);
    setExIdx(0);
    setUserAnswer('');
    setSelectedWordIndices([]);
    setShowResult(false);
    setShowHint(false);
    setDiffTokens([]);
  }, [currentVerseIdx, totalVerses, poem, correctCount, errorCount, onSessionComplete]);

  // ===== الانتقال بعد الإجابة =====
  const handleNextExercise = useCallback(() => {
    if (!currentExercise) return;

    const isCorrect = resultQuality === 'mastered' || resultQuality === 'correct';

    // في وضع التدرج (practice phase مع مستويات)
    if (phase === 'practice' && currentExercise.level) {
      const actualLevel = currentExercise.level;

      if (isCorrect) {
        if (exIdx < exerciseSet.length - 1) {
          setExIdx(exIdx + 1);
          setUserAnswer('');
          setSelectedWordIndices([]);
          setShowResult(false);
          setShowHint(false);
          setDiffTokens([]);
        } else {
          const nextLevel = actualLevel + 1;
          if (nextLevel > 6) {
            advanceToNextVerse();
          } else {
            startVersePractice(currentVerseIdx, nextLevel);
          }
        }
      } else {
        // عند الخطأ: الرجوع مستوى واحدًا فقط (6→5، 5→4، 4→3، 3→2، 2→1، 1→1)
        const prevLevel = Math.max(1, actualLevel - 1);
        startVersePractice(currentVerseIdx, prevLevel);
      }
      return;
    }

    // في وضع المراجعة الثنائية أو الشاملة
    if (exIdx < exerciseSet.length - 1) {
      setExIdx(exIdx + 1);
      setUserAnswer('');
      setSelectedWordIndices([]);
      setShowResult(false);
      setShowHint(false);
      setDiffTokens([]);
    } else {
      if (phase === 'pair_review') {
        advanceAfterPairReview();
      } else if (phase === 'comprehensive_review') {
        setPhase('session_complete');
        onSessionComplete(poem.id, correctCount, errorCount);
      }
    }
  }, [
    currentExercise,
    resultQuality,
    phase,
    currentVerseIdx,
    exIdx,
    exerciseSet,
    correctCount,
    errorCount,
    poem,
    onSessionComplete,
    startVersePractice,
    advanceToNextVerse,
    advanceAfterPairReview,
  ]);

  // بدء المراجعة الشاملة عند التحميل
  useEffect(() => {
    if (phase === 'comprehensive_review' && exerciseSet.length === 0 && mode !== 'where_am_i') {
      startComprehensiveReview();
    }
  }, [phase, exerciseSet.length, mode, startComprehensiveReview]);

  // معالجة اختيار كلمة
  const handleWordSelect = useCallback(
    (wordIdx: number) => {
      if (selectedWordIndices.includes(wordIdx)) return;
      setSelectedWordIndices(prev => [...prev, wordIdx]);
    },
    [selectedWordIndices]
  );

  // إزالة آخر كلمة مختارة
  const handleWordDeselect = useCallback(() => {
    setSelectedWordIndices(prev => prev.slice(0, -1));
  }, []);

  // التحقق التلقائي عند اكتمال الكلمات المختارة
  useEffect(() => {
    if (!currentExercise?.scrambledWords || !selectedWordIndices.length) return;
    if (currentExercise.level === 4 && currentExercise.subPhase === 1) {
      const blankCount =
        currentExercise.blankCount ||
        (
          `${currentExercise.displayedSadr || ''} ${currentExercise.displayedAjar || ''} ${currentExercise.prompt}`.match(
            /______/g
          ) || []
        ).length;
      if (blankCount > 0 && selectedWordIndices.length === blankCount && !showResult) {
        const timer = setTimeout(() => checkAnswer(), 300);
        return () => clearTimeout(timer);
      }
    }
    if (
      currentExercise.level === 2 &&
      selectedWordIndices.length === currentExercise.scrambledWords.length &&
      !showResult
    ) {
      const timer = setTimeout(() => checkAnswer(), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedWordIndices, currentExercise, showResult, checkAnswer]);

  // ===== شاشة «الأبيات الضعيفة» — قائمة الأبيات التي تحتاج إلى تقوية =====
  if (mode === 'weak_verses') {
    // إذا حُدد بيت ضعيف، نبدأ اختباراته مباشرة باستخدام نفس نظام الحفظ التراكمي
    if (weakVerseIndex !== undefined && weakVerseIndex >= 0 && weakVerseIndex < totalVerses) {
      // هذا السقوط يُنزل إلى عرض الجلسة القياسية أدناه مع initialVerseIdx = weakVerseIndex
      // وبالتالي ي! نحتاج فقط للتأكد أن phase هي 'preview' و currentVerseIdx صحيح
      // وهذا يحدث افتراضيًا بفضل initialVerseIdx أعلاه
    } else {
      return (
        <div className="fixed inset-0 z-50 app-bg flex flex-col">
          <div className="flex items-center justify-between session-content py-3 border-b border-[var(--border-0)] glass-header shrink-0">
            <div />
            <div className="text-center flex-1">
              <p className="text-xs font-medium text-[var(--text-0)] relative right-[8px]">{poem.title}</p>
              <p className="text-[10px] text-[var(--text-3)]">الأبيات الضعيفة</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-colors relative left-[8px]"><X size={16} strokeWidth={1.5} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[var(--text-2)]">اختاري بيتًا ضعيفًا من القائمة</p>
          </div>
        </div>
      );
    }
  }

  // ===== شاشة «أين أنا؟» (معرفة آخر بيت تم حفظه + عرض نصه + التقدم + الأبيات المتبقية) =====
  if (mode === 'where_am_i') {
    const completedVerses =
      lastCompletedIdx >= 0 ? poem.verses.slice(0, lastCompletedIdx + 1) : [];
    const remainingVerses =
      lastCompletedIdx >= 0 ? poem.verses.slice(lastCompletedIdx + 1) : poem.verses;
    const lastCompletedVerse = lastCompletedIdx >= 0 ? poem.verses[lastCompletedIdx] : null;
    const progressPct =
      totalVerses > 0 ? Math.round((completedVerses.length / totalVerses) * 100) : 0;

    return (
      <div className="fixed inset-0 z-50 app-bg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between session-content py-3 border-b border-[var(--border-0)] glass-header shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowTashkeel(s => !s)}
              className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-2)]"
            >
              {showTashkeel ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs font-medium text-[var(--text-0)] relative right-[8px]">{poem.title}</p>
            <p className="text-[10px] text-[var(--text-3)]">أين أنا؟ — موضعك الحالي وتقدمك في القصيدة</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-colors relative left-[8px]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-2 border-b border-[var(--border-0)] glass-inner">
          <ProgressBar value={progressPct} />
          <div className="flex justify-between text-[10px] text-[var(--text-3)] mt-1">
            <span>
              المحفوظ: {completedVerses.length} من {totalVerses}
            </span>
            <span>المتبقي: {remainingVerses.length} بيت</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* بطاقة آخر بيت محفوظ */}
            {lastCompletedVerse ? (
              <div className="p-6 rounded-xl glass-inner border border-[var(--accent)]/30 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] text-sm font-semibold">
                  <Navigation size={14} strokeWidth={2} />
                  <span>أكملتِ {getArabicVerseOrdinal(lastCompletedIdx)}</span>
                </div>

                <div className="p-4 rounded-xl glass-inner border border-[var(--border-0)]">
                  <PoeticVerseLines
                    sadr={lastCompletedVerse.sadr}
                    ajar={lastCompletedVerse.ajar}
                    text={lastCompletedVerse.text}
                    showTashkeel={showTashkeel}
                    fontSize="1.35rem"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl glass-inner border border-[var(--border-0)] text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-2)] text-[var(--text-1)] text-sm font-medium">
                  <Navigation size={14} strokeWidth={1.8} />
                  <span>لم تكملي حفظ أي بيت بعد</span>
                </div>
                <p className="text-xs text-[var(--text-2)]">
                  ابدئي جلسة «الحفظ التراكمي» لحفظ البيت الأول، وسيتحدث موضعك هنا تلقائيًا.
                </p>
              </div>
            )}

            {/* الأبيات المحفوظة ✓ */}
            {completedVerses.length > 0 && (
              <div className="p-5 rounded-xl glass-inner border border-[var(--border-0)] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-0)]">ما أتممتِ حفظه:</h3>
                  <Badge variant="success">{completedVerses.length} مكتمل</Badge>
                </div>
                <div className="space-y-2">
                  {completedVerses.map(v => (
                    <div
                      key={v.index}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg glass-inner border border-[var(--border-0)]"
                    >
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--success-light)] text-[var(--success)] text-xs font-bold">
                          ✓
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-0)]">
                          {getArabicVerseOrdinal(v.index)}
                        </span>
                      </div>
                      <p
                        className="text-xs text-[var(--text-2)] truncate flex-1 text-left"
                        style={{ fontFamily: 'var(--font-poem)' }}
                      >
                        {showTashkeel ? v.sadr : removeTashkeel(v.sadr)}
                        {v.ajar ? ' ...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* الأبيات المتبقية */}
            <div className="p-5 rounded-xl glass-inner border border-[var(--border-0)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-0)]">الأبيات المتبقية:</h3>
                <Badge variant="default">{remainingVerses.length} متبقٍ</Badge>
              </div>

              {remainingVerses.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[var(--success)] text-sm font-medium">
                  <CheckCircle2 size={18} />
                  <span>أتممتِ حفظ جميع أبيات القصيدة بحمد الله!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {remainingVerses.map(v => (
                    <div
                      key={v.index}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg glass-inner border border-[var(--border-0)]"
                    >
                      <span className="text-xs font-medium text-[var(--text-1)] shrink-0">
                        {getArabicVerseOrdinal(v.index)}
                      </span>
                      <p
                        className="text-xs text-[var(--text-3)] truncate flex-1 text-left"
                        style={{ fontFamily: 'var(--font-poem)' }}
                      >
                        {showTashkeel ? v.sadr : removeTashkeel(v.sadr)}
                        {v.ajar ? ' ...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Button variant="primary" onClick={onClose}>
                عودة
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== العرض القياسي للجلسات (الحفظ التراكمي / مراجعة البيتين / المراجعة الشاملة بنظام الرباعيات) =====
  const verseProgress = Math.round((versesCompleted / Math.max(totalVerses, 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 app-bg flex flex-col">
      {/* Header — بدون زر استماع غير عامل */}
      <div className="flex items-center justify-between session-content py-3 border-b border-[var(--border-0)] glass-header shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTashkeel(s => !s)}
            className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-2)]"
          >
            {showTashkeel ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <div className="text-center flex-1">
          <p className="text-xs font-medium text-[var(--text-0)] relative right-[8px]">{poem.title}</p>
          <p className="text-[10px] text-[var(--text-3)]">
            {phase === 'practice' && currentExercise?.level === 4 && currentExercise?.subPhase === 1 && `المستوى 4A من 6`}
            {phase === 'practice' && currentExercise?.level === 4 && currentExercise?.subPhase === 2 && `المستوى 4B من 6`}
            {phase === 'practice' && currentExercise?.level !== 4 && `المستوى ${currentLevel} من 6`}
            {phase === 'preview' && `البيت ${currentVerseIdx + 1} من ${totalVerses}`}
            {phase === 'pair_review' && 'مراجعة البيتين'}
            {phase === 'comprehensive_review' &&
              (currentExercise?.segmentTitle
                ? `المراجعة الشاملة · ${currentExercise.segmentTitle}`
                : 'المراجعة الشاملة')}
            {phase === 'session_complete' && 'اكتملت الجلسة'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-colors relative left-[8px]"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-2 border-b border-[var(--border-0)] glass-inner">
        <ProgressBar
          value={
            phase === 'comprehensive_review' && exerciseSet.length > 0
              ? Math.round((exIdx / exerciseSet.length) * 100)
              : verseProgress
          }
        />
        <div className="flex justify-between text-[10px] text-[var(--text-3)] mt-1">
          <span>
            {phase === 'comprehensive_review' && currentExercise
              ? `${currentExercise.segmentTitle || 'المراجعة'} (${exIdx + 1} / ${exerciseSet.length})`
              : `البيت ${currentVerseIdx + 1} / ${totalVerses}`}
          </span>
          <span>
            ✓ {correctCount} · ✗ {errorCount}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl mx-auto">
          {/* ===== PREVIEW ===== */}
          {phase === 'preview' && currentVerse && (
            <div className="animate-fade-in">
              <div className="text-center mb-4">
                <span className="text-xs text-[var(--text-3)]">
                  {getArabicVerseOrdinal(currentVerseIdx)} ({currentVerseIdx + 1} من {totalVerses})
                </span>
              </div>

              <div className="mb-8 p-6 rounded-xl glass-inner border border-[var(--border-0)]">
                <PoeticVerseLines
                  sadr={currentVerse.sadr}
                  ajar={currentVerse.ajar}
                  text={currentVerse.text}
                  showTashkeel={showTashkeel}
                  fontSize="1.4rem"
                />
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button variant="primary" onClick={() => startVersePractice(currentVerseIdx, 1)}>
                  ابدئي التمرين
                </Button>
              </div>
            </div>
          )}

          {/* ===== EXERCISE (practice / pair_review / comprehensive_review) ===== */}
          {(phase === 'practice' || phase === 'pair_review' || phase === 'comprehensive_review') &&
            currentExercise && (
              <div className="animate-fade-in">
                {/* شارة الرباعية في المراجعة الشاملة */}
                {phase === 'comprehensive_review' && currentExercise.segmentTitle && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Badge variant="accent">
                      {currentExercise.segmentTitle}
                      {currentExercise.segmentRange ? ` · ${currentExercise.segmentRange}` : ''}
                    </Badge>
                  </div>
                )}

                {/* شريط المستويات */}
                {phase === 'practice' && currentExercise.level && (
                  <div className="flex items-center justify-center gap-1.5 mb-4">
                    {[1, 2, 3, 4, 5, 6].map(l => (
                      <div
                        key={l}
                        className={`w-8 h-2 rounded-full transition-all duration-300 ${
                          l < currentLevel
                            ? 'bg-[var(--success)]'
                            : l === currentLevel
                            ? 'bg-[var(--accent)]'
                            : 'bg-[var(--bg-3)]'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] text-[var(--text-2)] mr-2">
                      المستوى {currentLevel}
                      {currentExercise?.level === 4 && currentExercise?.subPhase === 1 ? 'A' : ''}
                      {currentExercise?.level === 4 && currentExercise?.subPhase === 2 ? 'B' : ''}
                    </span>
                  </div>
                )}

                {/* عنوان التمرين */}
                <div className="flex items-center justify-center gap-2 mb-4 text-xs text-[var(--text-2)]">
                  <span>{getExerciseLabel(currentExercise.type)}</span>
                  {phase === 'pair_review' && <span>· مراجعة البيتين</span>}
                  <span>
                    · {exIdx + 1}/{exerciseSet.length}
                  </span>
                </div>

                {/* النص المطلوب + عرض البيت الشعري على سطرين منفصلين (صدر يمينًا قليلًا، عجز يسارًا قليلًا) */}
                <div className="mb-6 p-5 rounded-xl glass-inner border border-[var(--border-0)] space-y-4">
                  <div
                    className="text-center text-sm font-medium text-[var(--text-1)]"
                    
                  >
                    {currentExercise.prompt.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>

                  {(currentExercise.displayedSadr || currentExercise.displayedAjar) && (
                    <div className="pt-2 border-t border-[var(--border-0)]">
                      <PoeticVerseLines
                        sadr={currentExercise.displayedSadr}
                        ajar={currentExercise.displayedAjar}
                        showTashkeel={showTashkeel}
                        fontSize="1.25rem"
                      />
                    </div>
                  )}
                </div>

                {!showResult ? (
                  <div className="space-y-4">
                    {/* اختيار من متعدد (المستوى ١) — كل خيار يُعرض كبيت شعري من سطرين */}
                    {currentExercise.choices && (
                      <div className="space-y-2.5">
                        {currentExercise.choices.map((choice, i) => {
                          const cv = currentExercise.choiceVerses?.[i];
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                setUserAnswer(choice);
                                setSelectedWordIndices([]);
                              }}
                              className={`w-full p-4 rounded-xl border transition-all ${
                                userAnswer === choice
                                  ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent-text)]'
                                  : 'border-[var(--border-0)] glass-inner text-[var(--text-0)] hover:border-[var(--border-1)]'
                              }`}
                            >
                              <PoeticVerseLines
                                sadr={cv?.sadr}
                                ajar={cv?.ajar}
                                text={choice}
                                showTashkeel={showTashkeel}
                                fontSize="1.05rem"
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* كلمات مبعثرة (المستوى ٢، والمستوى ٤ مرحلة A فقط) */}
                    {currentExercise.scrambledWords &&
                      !(currentExercise.level === 4 && currentExercise.subPhase === 2) && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {currentExercise.scrambledWords.map((word, i) => (
                              <button
                                key={i}
                                onClick={() => handleWordSelect(i)}
                                className={`word-tag ${selectedWordIndices.includes(i) ? 'selected' : ''}`}
                                disabled={selectedWordIndices.includes(i)}
                              >
                                {showTashkeel ? word : removeTashkeel(word)}
                              </button>
                            ))}
                          </div>

                          {selectedWordIndices.length > 0 && (
                            <div className="text-center">
                              <p className="text-xs text-[var(--text-2)] mb-2">ترتيبك:</p>
                              <div className="flex flex-wrap gap-2 justify-center">
                                {selectedWordIndices.map((idx, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--accent-light)] text-[var(--accent-text)] text-sm"
                                    style={{ fontFamily: 'var(--font-poem)' }}
                                  >
                                    {currentExercise.scrambledWords![idx]}
                                    {i === selectedWordIndices.length - 1 && (
                                      <button
                                        onClick={handleWordDeselect}
                                        className="text-[var(--text-3)] hover:text-[var(--error)] text-xs"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                              <button
                                onClick={handleWordDeselect}
                                className="text-xs text-[var(--text-3)] hover:text-[var(--error)] mt-2"
                              >
                                ← تراجع عن آخر كلمة
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    {/* حقل إدخال يدوي */}
                    {!currentExercise.choices &&
                      !(
                        currentExercise.scrambledWords &&
                        (currentExercise.level === 2 ||
                          (currentExercise.level === 4 && currentExercise.subPhase === 1))
                      ) && (
                        <div className="space-y-2">
                          <textarea
                            ref={textareaRef}
                            value={userAnswer}
                            onChange={e => setUserAnswer(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (userAnswer.trim()) checkAnswer();
                              }
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-[var(--border-1)] bg-[var(--glass-bg)] backdrop-blur-[8px] text-[var(--text-0)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors outline-none resize-none"
                            style={{
                              fontFamily: 'var(--font-poem)',
                              fontSize: '1rem',
                              lineHeight: '2',
                              minHeight: '80px',
                            }}
                            placeholder="اكتبي إجابتك هنا..."
                            dir="rtl"
                          />
                        </div>
                      )}

                    {/* زر التحقق */}
                    <div className="flex items-center justify-center gap-3">
                      {currentExercise.hint && (
                        <Button variant="ghost" size="sm" onClick={() => setShowHint(h => !h)}>
                          <Lightbulb size={14} />
                          تلميح
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        onClick={checkAnswer}
                        disabled={
                          !currentExercise.choices &&
                          !(currentExercise.scrambledWords && selectedWordIndices.length > 0) &&
                          !userAnswer.trim()
                        }
                      >
                        تحقق
                      </Button>
                    </div>

                    {/* التلميح */}
                    {showHint && currentExercise.hint && (
                      <div className="text-center text-sm text-[var(--text-2)] p-3 rounded-lg glass-inner animate-fade-in">
                        💡 {currentExercise.hint}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ===== النتيجة ===== */
                  <div className="animate-fade-in text-center space-y-4">
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                        resultQuality === 'mastered'
                          ? 'bg-[var(--success-light)] text-[var(--success)]'
                          : resultQuality === 'correct'
                          ? 'bg-[var(--success-light)] text-[var(--success)]'
                          : resultQuality === 'review'
                          ? 'bg-[var(--warning-light)] text-[var(--warning)]'
                          : 'bg-[var(--error-light)] text-[var(--error)]'
                      }`}
                    >
                      {resultQuality === 'mastered' && '✓ متقن!'}
                      {resultQuality === 'correct' && '✓ صحيح'}
                      {resultQuality === 'review' && '~ يحتاج مراجعة'}
                      {resultQuality === 'wrong' && '✗ خطأ'}
                    </div>

                    {/* الإجابة الصحيحة مع الفروق */}
                    {diffTokens.length > 0 && (
                      <div
                        className="p-4 rounded-xl glass-inner border border-[var(--border-0)]"
                        style={{ fontFamily: 'var(--font-poem)', fontSize: '1rem', lineHeight: '2' }}
                      >
                        {diffTokens.map((token, i) => (
                          <span
                            key={i}
                            className={
                              token.type === 'correct'
                                ? 'diff-correct'
                                : token.type === 'missing'
                                ? 'diff-missing'
                                : token.type === 'extra'
                                ? 'diff-error'
                                : 'diff-error'
                            }
                          >
                            {token.text}{' '}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* الإجابة الصحيحة الكاملة — معروضة كسطرين إن كانت بيتًا كاملًا */}
                    <div className="p-4 rounded-xl glass-inner border border-[var(--border-0)]">
                      <p className="text-[11px] text-[var(--text-3)] mb-2">الإجابة الصحيحة:</p>
                      <PoeticVerseLines
                        text={currentExercise.answer}
                        showTashkeel={showTashkeel}
                        fontSize="1.1rem"
                      />
                    </div>

                    <Button variant="primary" onClick={handleNextExercise}>
                      التالي ←
                    </Button>
                  </div>
                )}
              </div>
            )}

          {/* ===== SESSION COMPLETE ===== */}
          {phase === 'session_complete' && (
            <div className="animate-fade-in text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[var(--success-light)] flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-0)] mb-2">اكتملت الجلسة!</h2>
              <p className="text-sm text-[var(--text-2)] mb-6">{poem.title}</p>

              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--success)]">{correctCount}</p>
                  <p className="text-xs text-[var(--text-3)]">صحيح</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--error)]">{errorCount}</p>
                  <p className="text-xs text-[var(--text-3)]">خطأ</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-0)]">{versesCompleted}</p>
                  <p className="text-xs text-[var(--text-3)]">أبيات</p>
                </div>
              </div>

              <Button variant="primary" onClick={onClose}>
                عودة
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
