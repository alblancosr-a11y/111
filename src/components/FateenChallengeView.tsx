"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { X, CheckCircle2, XCircle, Sparkles, AlertTriangle } from 'lucide-react';
import type { Poem, AppSettings, VerseStats, ErrorLogEntry, SuccessLogEntry, PoemStats } from '../lib/types';
import type { FateenRoundState } from '../lib/fateenChallenge';
import {
  createFateenRound,
  getCurrentVerseIndex,
  getCurrentKeyword,
  submitAnswer,
  getRemainingCount,
  getTotalCount,
  getProgressPercent,
  hasKeywordForVerse,
  selectKeywords,
} from '../lib/fateenChallenge';
import { compareAnswers, removeTashkeel, type ComparisonResult, type DiffToken } from '../lib/poem-parser';
import { detectErrorType, createErrorEntry, createSuccessEntry } from '../lib/errorLog';
import { defaultVerseStats } from '../lib/storage';
import { Button, ProgressBar, Card } from '../ui';
import GazelleIcon from './GazelleIcon';

// ===== أنواع =====

type Phase = 'intro' | 'question' | 'feedback' | 'complete';

interface Props {
  poem: Poem;
  settings: AppSettings;
  poemStats: PoemStats | undefined;
  onClose: () => void;
  onVerseUpdate: (poemId: string, vs: VerseStats) => void;
  onErrorLog: (entry: ErrorLogEntry) => void;
  onSuccessLog: (entry: SuccessLogEntry) => void;
}

// ===== رسائل فطين الافتتاحية =====

const FATEEN_INTROS = [
  "مرحبًا! أنا فطين.\nأحضرتِ قصيدتكِ، وأنا أحضرتُ لكِ تحديًا صغيرًا...\nسأتنقّل بين أبياتها على غير ترتيب، وأعطيكِ من كل بيت كلمةً واحدة فقط.\nإن استطعتِ أن تستحضري البيت من تلك الكلمة، فلكِ الجولة.\nلكن انتبهي... لن تعرفي أيَّ بيت سأختار بعد ذلك!\nهل تستطيعين أن تسبقي فطين؟",

  "أهلًا! أنا فطين.\nتحدي اليوم بسيط: من كل بيت أعطيكِ كلمة واحدة فقط، وعليكِ أن تستحضري البيت كاملًا.\nالأبيات مختلطة، والكلمات منتقاة بعناية... فهل ذاكرتكِ أقوى من حيلتي؟",

  "مرحبًا! أنا فطين، غزالُ التحديات.\nاخترتُ لكِ من كل بيت كلمةً واحدة، وتركتُ الباقي لكِ...\nلن تأتي الأبيات بالترتيب، ولن تكون الكلمة سهلة.\nهيّا نرى ما في ذاكرتكِ!",
];

// ===== رسائل فطين أثناء الجولة =====
// صياغات متنوعة (اعتراف، تعليق ذكي، مزاح خفيف، إحاطة بالبيت)
// قصيرة، أدبية، وفي شخصية فطين: ذكي، واثق، لطيف، مشاكس بخفة.

const FATEEN_CORRECT_MSGS = [
  'أحسنتِ! هذا البيت كان في جيبي، لكنه خرج إلى ذاكرتكِ.',
  'صحيح — الكلمة كانت خيطًا، وأنتِ نسجتِ منها البيتَ كلَّه.',
  'لم أظنّ أن هذه الكلمة ستفتحُ البيتَ بهذه السرعة.',
  'واحدةٌ لكِ... لكن لا تفرحي بعدُ، فالأبياتُ الباقية أدقّ.',
  'أصبتِ! ذاكرتكِ أسرعُ من حيلتي هذه المرة.',
  'وجدتِه! هيا، فسأرمي لكِ بكلمةٍ أدهى.',
  'إجابةٌ سليمة... أعترف، كدتُ أنسى أن هذا البيت لي.',
  'بنيتِ البيتَ كلمةً كلمة، ولم يتردّد حرفٌ واحد.',
  'ممتاز! لكنّ البيتَ التالي أخفى ملامحَ في ذاكرتكِ.',
  'حسبتُ أني أخبّأتُ هذه الكلمة جيدًا، فما كانت إلّا مفتاحًا في يدكِ.',
  'صحيح! ذاكرةُ حافظةِ الشعر لا تسقطُ في حيلة.',
  'أحسنتِ! بقيت لي كلماتٌ لم أرمِها بعد.',
  'ضربةُ معلم — استحضرتِ الصدرَ والعجزَ معًا بلا تردّد.',
  'هذه كانت لكِ من أوّلها... لكنّ الجولاتِ تُحسب في الآخر.',
];

const FATEEN_WRONG_MSGS = [
  'هاه! أمسكتُ بهذا البيت... لكنّكِ ستعودين إليه أقوى.',
  'هذا البيت كان معي قبل أن تُكملي الكلمة الأخيرة.',
  'وجدتُ ثغرةً صغيرة — لا بأس، الذاكرةُ تُبنى على التكرار.',
  'أفلت منكِ هذا... وقد أعددتُ له مكانًا عندكِ في التقوية.',
  'أمسكتُ به! الكلمةُ أراوغتكِ عند آخر حرف.',
  'خطوةٌ واحدة أبعدتْكِ عن البيت، وما زالت أمامكِ أن تدوسيها.',
  'هذا لي هذه المرة... لكنّ الجولةَ أطولُ من بيت.',
  'كاد يكون لكِ! الحرفُ الأخير خائَنكِ، وأنا لستُ بذيّ.',
  'أمسكتُ بهذا البيت... وسيبقى عندكِ حتى تثبّتي عليه.',
  'هذه لي! لكنّ ذاكرتكِ أقربُ إلى الصواب مما تظنّين.',
  'رأيتكِ تتذكّرين الصدرَ ثم تلتفتين... والعجزُ كان قد ذهب معي.',
  'أمسكتُ به قبل أن تكتمل الكلمة! اجمعي قواكِ فالحكايةُ طويلة.',
  'هذه المرة لي. لا تملّي، فالأبياتُ الصعبة هي التي تصنعُ الحافِظين.',
  'كاد بيتُكِ يتصدّع عند آخر سطر — وأنا أمسكتُه قبل أن يسقط.',
];

/** عدد الرسائل الأخيرة التي يُجنَّب فطين إعادةَ أيٍّ منها ما دام يوجد بدائل كافية */
const FATEEN_MSG_RECENT_LIMIT = 5;

// ===== رسائل فطين الختامية =====

const FATEEN_WIN_MSGS = [
  "لااا... هزمتِ فطين!\n\nلم أستطع أن أفلت منكِ بيتًا واحدًا.\nأقرّ بهزيمتي هذه المرة...\nذاكرتكِ كانت أسرع مني!\n\nأحسنتِ يا حافظة الشعر.",

  "هزيمة... لم أستطع أن أخدعكِ ولو ببيت واحد!\n\nأنتِ أثبتِّ أن ذاكرتكِ لا تُخطئ.\nفطين يرفع قرنيه احترامًا لكِ.\n\nجولة رائعة!",

  "اعترف... هذه الجولة كانت لكِ بالكامل.\n\nكل بيت استحضرتِه من كلمة واحدة —\nهذا ليس سهلًا كما يبدو!\n\nفطين مهزوم هذه المرة. أحسنتِ!",
];

const FATEEN_LOSS_MSGS = [
  "هذه الجولة لي!\n\nأمسكتُ ببعض أبياتكِ، لكن لا تفرحي كثيرًا...\nالأبيات التي أخطأتِ فيها ما زالت أمامكِ.\n\nقوّيها، ثم عودي إليّ،\nولنرَ من سيفوز في الجولة القادمة.",

  "ها! هذه المرة تفوّقتُ عليكِ.\n\nلكنني أعرف أنكِ لن تتركي الأمر هكذا...\nالأبيات التي خانت ذاكرتكِ تحتاج فقط إلى مزيد من التكرار.\n\nعودي عندما تكوني مستعدة!",

  "فطين يفوز هذه الجولة!\n\nلكن لا تحزني — كل بيت أخطأتِ فيه\nهو دعوة لمزيد من التمرين، لا نهاية.\n\nهيّا، جولة جديدة وذاكرة أقوى!",
];

/** اختيار رسالة عشوائية من مصفوفة */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== عرض البيت الشعري =====

function PoeticVerseDisplay({
  sadr,
  ajar,
  showTashkeel = true,
  fontSize = '1.25rem',
}: {
  sadr: string;
  ajar: string;
  showTashkeel?: boolean;
  fontSize?: string;
}) {
  const fmt = (t: string) => (showTashkeel ? t : removeTashkeel(t));

  if (!ajar || !ajar.trim()) {
    return (
      <div className="poetic-verse" style={{ fontFamily: 'var(--font-poem)', fontSize, lineHeight: '2.1', color: 'var(--text-0)' }}>
        <div className="poetic-sadr">{fmt(sadr)}</div>
      </div>
    );
  }

  return (
    <div className="poetic-verse" style={{ fontFamily: 'var(--font-poem)', fontSize, lineHeight: '2.1', color: 'var(--text-0)' }}>
      <div className="poetic-sadr">{fmt(sadr)}</div>
      <div className="poetic-ajar">{fmt(ajar)}</div>
    </div>
  );
}

// ===== عرض الفروق =====

function DiffDisplay({ tokens }: { tokens: DiffToken[] }) {
  return (
   <p className="inline-block text-sm leading-loose" style={{ fontFamily: 'var(--font-poem)' }}>
      {tokens.map((t, i) => (
        <span
          key={i}
          className={
            t.type === 'correct' ? 'diff-correct' :
            t.type === 'missing' ? 'diff-missing' :
            'diff-error'
          }
        >
          {t.text}{' '}
        </span>
      ))}
    </p>
  );
}

// ===== المكون الرئيسي =====

export default function FateenChallengeView({
  poem,
  settings,
  poemStats,
  onClose,
  onVerseUpdate,
  onErrorLog,
  onSuccessLog,
}: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState<FateenRoundState | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showTashkeel, setShowTashkeel] = useState(true);
  const [lastResult, setLastResult] = useState<ComparisonResult | null>(null);
  const [lastVerseIndex, setLastVerseIndex] = useState<number | null>(null);
  const [fateenMsg, setFateenMsg] = useState<string | null>(null);
  // سجل الرسائل الأخيرة المعروضة — لمنع التكرار المتتالي
  const msgHistoryRef = useRef<string[]>([]);
  const [introMsg] = useState(() =>
    FATEEN_INTROS[Math.floor(Math.random() * FATEEN_INTROS.length)]
  );
  const [endMsg] = useState(() => null); // ستُختار عند الإكمال

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fontSizes = ['1.1rem', '1.4rem', '1.7rem'];
  const verseFontSize = fontSizes[settings.fontSize - 1] || '1.4rem';

  // ─── فحص صلاحية القصيدة للتحدي ───
  // تُحسب مرة واحدة فقط. لا تُستخدم الكلمات المحسوبة هنا في الجولة،
  // بل العدد فقط — لأن الجولة تختار كلماتها الخاصة وتُثبّتها عند البدء.
  const availability = useMemo(() => {
    const { keywords, noKeywordVerses } = selectKeywords(poem.verses);
    return {
      playable: Object.keys(keywords).length,
      total: poem.verses.length,
      unavailable: noKeywordVerses.length,
    };
  }, [poem.verses]);

  const isPlayable = availability.playable > 0;

  // ─── تجاوز الأبيات بدون كلمة مفتاح ───
  const skipNoKeywordVerses = useCallback((r: FateenRoundState): FateenRoundState => {
    let current = r;
    while (
      !current.isComplete &&
      getCurrentVerseIndex(current) !== null &&
      !hasKeywordForVerse(current, getCurrentVerseIndex(current)!)
    ) {
      current = submitAnswer(current, false);
    }
    return current;
  }, []);

  /**
   * اختيار رسالة فطين مع التنويع:
   * - القاعدة الحتمية: لا تُكرر الرسالة نفسها في بيتين متتاليين.
   * - ما دام يوجد بدائل كافية: يُجنَّب فطين إعادة أيٍّ من آخر
   *   FATEEN_MSG_RECENT_LIMIT رسائل ظهر بها (من المجموعتين معًا).
   */
  const pickFateenMsg = useCallback((isCorrect: boolean): string => {
    const pool = isCorrect ? FATEEN_CORRECT_MSGS : FATEEN_WRONG_MSGS;
    const history = msgHistoryRef.current;
    const recent = history.slice(-FATEEN_MSG_RECENT_LIMIT);
    let candidates = pool.filter(m => !recent.includes(m));
    if (candidates.length === 0) {
      // fallback: تُطبَّق القاعدة الحتمية فقط — لا تكرر الرسالة السابقة
      const last = history[history.length - 1];
      candidates = pool.filter(m => m !== last);
    }
    if (candidates.length === 0) candidates = pool;
    const msg = candidates[Math.floor(Math.random() * candidates.length)];
    msgHistoryRef.current = [...history, msg].slice(-24);
    return msg;
  }, []);

  // ─── بدء الجولة ───
  const startRound = useCallback(() => {
    // بداية جولة جديدة = بداية جديدة لرسائل فطين أيضًا
    msgHistoryRef.current = [];
    const newRound = createFateenRound(poem);
    const adjusted = skipNoKeywordVerses(newRound);
    setRound(adjusted);

    if (adjusted.isComplete) {
      setPhase('complete');
    } else {
      setUserAnswer('');
      setLastResult(null);
      setLastVerseIndex(null);
      setFateenMsg(null);
      setPhase('question');
    }
  }, [poem, skipNoKeywordVerses]);

  // ─── التحقق من الإجابة ───
  const checkAnswer = useCallback(() => {
    if (!round) return;
    const verseIndex = getCurrentVerseIndex(round);
    if (verseIndex === null) return;

    const verse = poem.verses[verseIndex];
    const result = compareAnswers(userAnswer, verse.text, {
      requireTashkeel: settings.requireTashkeel,
    });

    const newRound = submitAnswer(round, result.isCorrect);
    setLastResult(result);
    setLastVerseIndex(verseIndex);
    setRound(newRound);

    // رد فطين يظهر بعد كل إجابة — دائمًا، مع تنويع وبدون تكرار متتالٍ
    setFateenMsg(pickFateenMsg(result.isCorrect));

    // ─── تسجيل الخطأ/النجاح في سجل التطبيق ───
    const targetVerse = poem.verses[verseIndex];
    if (targetVerse) {
      if (!result.isCorrect) {
        // تسجيل الخطأ في سجل الأخطاء العام
        const hasAjar = Boolean(targetVerse.ajar?.trim());
        const errorType = detectErrorType('write_all', result.diffTokens, hasAjar);
        onErrorLog(createErrorEntry({
          poemId: poem.id,
          verseIndex,
          verseText: targetVerse.text,
          exerciseType: 'write_all',
          source: 'fateen',
          level: null,
          errorType,
          userAnswer,
        }));

        // تحديث إحصائيات البيت جزئيًا: نزيد errors فقط
        // دون تشغيل SM-2 أو تغيير مستوى الثبات
        const existingStats = poemStats?.verses[verseIndex] || defaultVerseStats(verseIndex);
        onVerseUpdate(poem.id, {
          ...existingStats,
          attempts: existingStats.attempts + 1,
          errors: existingStats.errors + 1,
          sessionErrors: existingStats.sessionErrors + 1,
        });
      } else {
        // تسجيل النجاح في سجل النجاحات العام
        onSuccessLog(createSuccessEntry({
          poemId: poem.id,
          verseIndex,
          exerciseType: 'write_all',
          source: 'fateen',
          level: null,
        }));

        // تحديث إحصائيات البيت جزئيًا: نزيد correct فقط
        // دون تشغيل SM-2 أو تغيير مستوى الثبات
        const existingStats = poemStats?.verses[verseIndex] || defaultVerseStats(verseIndex);
        onVerseUpdate(poem.id, {
          ...existingStats,
          attempts: existingStats.attempts + 1,
          correct: existingStats.correct + 1,
          sessionCorrect: existingStats.sessionCorrect + 1,
        });
      }
    }

    setPhase('feedback');
  }, [round, userAnswer, poem, settings, poemStats, onVerseUpdate, onErrorLog, onSuccessLog, pickFateenMsg]);

  // ─── الانتقال للسؤال التالي ───
  const nextQuestion = useCallback(() => {
    if (!round) return;

    if (round.isComplete) {
      setPhase('complete');
      return;
    }

    const adjusted = skipNoKeywordVerses(round);
    setRound(adjusted);

    if (adjusted.isComplete) {
      setPhase('complete');
    } else {
      setUserAnswer('');
      setLastResult(null);
      setLastVerseIndex(null);
      setFateenMsg(null);
      setPhase('question');
    }
  }, [round, skipNoKeywordVerses]);

  // ─── التركيز على حقل الإدخال ───
  useEffect(() => {
    if (phase === 'question' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [phase]);

  // ===== الحصول على البيانات الحالية =====
  const currentVerseIndex = round ? getCurrentVerseIndex(round) : null;
  const currentKeyword = round && currentVerseIndex !== null ? getCurrentKeyword(round) : null;
  const lastVerse = lastVerseIndex !== null ? poem.verses[lastVerseIndex] : null;

  // ===== التصيير =====
  return (
    <div className="fixed inset-0 z-50 app-bg flex flex-col">
      {/* الرأس */}
      <div className="glass-header flex items-center justify-between session-content py-3 border-b border-[var(--border-0)] shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTashkeel(s => !s)}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-2)] transition-colors"
            title={showTashkeel ? 'إخفاء التشكيل' : 'إظهار التشكيل'}
          >
            <Sparkles size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-0.5">
           <GazelleIcon size={18} className="text-[var(--accent)] translate-y-[4px]" />
           <p className="text-sm font-bold text-[var(--text-0)] relative right-[2px] translate-y-[3px]">تحدي فطين</p>
          </div>
         <p className="text-[10px] text-[var(--text-3)] translate-y-[2px]">
  {poem.title} · {poem.verses.length} بيت
</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-colors relative left-[8px]"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* شريط التقدم */}
      {round && (phase === 'question' || phase === 'feedback' || phase === 'complete') && (
        <div className="px-8 py-2.5 border-b border-[var(--border-0)]">
          <ProgressBar value={getProgressPercent(round)} className="mx-8" />
          <div className="flex justify-between text-[12px] text-[var(--text-3)] mt-1.5 !px-4">
  <span>{round.tested.length} / {getTotalCount(round)}</span>
  <span>{getRemainingCount(round)} متبقٍ</span>
</div>
        </div>
      )}

      {/* المحتوى */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-6 animate-fade-in">

          {/* ═══ المقدمة ═══ */}
          {phase === 'intro' && (
            <>
              <div className="flex justify-center mb-5">
  <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-[var(--accent)]/25 accent-glow translate-y-[7px]">
    <GazelleIcon size={50} className="text-white translate-y-[4px]" />
                </div>
              </div>

              <Card className="p-6 w-full max-w-[92%] self-center translate-y-[14px]">
                <div className="space-y-3">
                  {introMsg.split('\n').map((line, i) => (
                    <p
                      key={i}
                     className={`text-[12px] leading-7 text-center ${i === 0 ? 'font-medium text-[var(--text-0)]' : 'text-[var(--text-1)]'}`}
                      
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </Card>

              <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--text-3)] translate-y-[16px]">
                <span>{poem.title}</span>
                <span>·</span>
                <span>{poem.verses.length} بيت</span>
                <span>·</span>
                <span>{availability.playable} كلمة مفتاح</span>
              </div>

              {isPlayable ? (
                <>
                  {availability.unavailable > 0 && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--warning-light)] border border-[var(--warning)]/20">
                      <AlertTriangle size={14} className="text-[var(--warning)] shrink-0 mt-0.5" strokeWidth={1.5} />
                      <p className="text-[11px] text-[var(--text-1)] leading-5" >
                        {availability.unavailable} من أبيات هذه القصيدة لا تتوفر له كلمة مفتاح فريدة،
                        لذا سيتخطّاه فطين تلقائيًا.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center pt-3 translate-y-[24px]">
                    <Button variant="primary" size="lg" onClick={startRound} className="!px-6">
  هيّا نبدأ
</Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 p-4 rounded-xl bg-[var(--warning-light)] border border-[var(--warning)]/20">
                    <AlertTriangle size={15} className="text-[var(--warning)] shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[var(--text-0)]" >
                        هذه القصيدة لا تصلح للتحدي حاليًا
                      </p>
                      <p className="text-[11px] text-[var(--text-1)] leading-5" >
                        لم يجد فطين كلمةً فريدةً في أي بيت منها — فالكلمات إما مشتركة بين أبيات
                        القصيدة أو وظيفية لا تصلح مفتاحًا. اختاري قصيدة أخرى.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button variant="ghost" size="md" onClick={onClose}>
                      عودة لاختيار قصيدة
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══ السؤال ═══ */}
          {phase === 'question' && round && currentKeyword && (
            <>
              <div className="space-y-5">
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-3)]">
                  <GazelleIcon size={13} className="text-[var(--accent)]" />
                  <span className="font-bold translate-y-[2px]">كلمة فطين</span>
                </div>

                <div className="flex justify-center">
                <div className="glass-card inline-flex items-center justify-center w-[6rem] py-5 rounded-2xl accent-glow border-[var(--accent)]/25">
                    <p
                     className="text-xl font-medium gradient-accent-text text-center translate-y-[3px]"
                      style={{ fontFamily: 'var(--font-poem)', lineHeight: '2' }}
                    >
                      {currentKeyword}
                    </p>
                  </div>
                </div>

                <p className="text-center text-sm text-[var(--text-2)] translate-y-[6px]">
                  استحضري البيت كاملًا
                </p>
              </div>

              <div className="space-y-4">
                <textarea
                  ref={textareaRef}
                  value={userAnswer}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserAnswer(e.target.value)}
                  placeholder="اكتبي البيت كاملًا..."
                  dir="rtl"
                  rows={3}
                  style={{ fontFamily: 'var(--font-poem)', lineHeight: '2', fontSize: '1.25rem' }}
                className="w-[140%] relative right-1/2 translate-x-[50%] translate-y-[10px] px-4 py-3 rounded-xl border border-[var(--border-0)] bg-[var(--glass-bg)] backdrop-blur-[8px] text-[var(--text-0)] text-sm placeholder:text-[var(--text-3)] focus:border-[var(--accent-soft)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all duration-200 outline-none resize-none text-center"
                />

                <div className="flex justify-center translate-y-[10px]">
                  <Button
  variant="primary"
  size="md"
  onClick={checkAnswer}
  disabled={!userAnswer.trim()}
  className="!px-4"
>
                    أجيبي
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ═══ نتيجة الإجابة ═══ */}
          {phase === 'feedback' && round && lastVerse && lastResult && (
            <>
              <div className="flex flex-col items-center gap-3 py-2">
                {lastResult.isCorrect ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-[var(--success-light)] flex items-center justify-center translate-y-[10px]">
                      <CheckCircle2 size={20} className="text-[var(--success)]" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-[var(--success)]" >
                      استحضرتِ البيت بنجاح
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-[var(--error-light)] flex items-center justify-center translate-y-[10px]">
                      <XCircle size={20} className="text-[var(--error)]" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-[var(--error)]" >
                      لم تتمي استحضار البيت
                    </p>
                  </>
                )}
              </div>

          {/* رسالة فطين */}
{fateenMsg && (
  <div className="inline-flex items-start rounded-xl bg-[var(--glass-bg)] mx-auto">
    <div className="flex items-start gap-0.5 py-3.5 !px-[10px]">
      <GazelleIcon
        size={14}
        className="text-[var(--accent)] shrink-0 mt-1 translate-y-[2px]"
      />
      <p className="text-xs text-[var(--text-1)] leading-6">
        {fateenMsg}
      </p>
    </div>
  </div>
)}

              <Card className="p-5 !px-[28px] translate-y-[10px]">
                <p className="text-[11px] text-[var(--text-3)] mb-3 text-center translate-y-[-3px]" >
                  البيت الصحيح:
                </p>
                <PoeticVerseDisplay
                  sadr={lastVerse.sadr}
                  ajar={lastVerse.ajar}
                  showTashkeel={showTashkeel}
                  fontSize="1.25rem"
                />
              </Card>

              {!lastResult.isCorrect && lastResult.diffTokens.length > 0 && (
               <Card className="w-fit mx-auto p-4 !px-[10px] translate-y-[20px]">
                  <p className="text-[11px] text-[var(--text-3)] mb-2 text-center" >
                    إجابتكِ:
                  </p>
                  <div className="text-center">
                    <DiffDisplay tokens={lastResult.diffTokens} />
                  </div>
                </Card>
              )}

              <div className="flex justify-center pt-3 translate-y-[30px]">
                <Button variant="primary" size="md" onClick={nextQuestion} className="!px-[20px]">
                  {round.isComplete ? 'أنهي الجولة' : 'التالي'}
                </Button>
              </div>
            </>
          )}

          {/* ═══ الإكمال ═══ */}
          {phase === 'complete' && round && (
            <>
              {(() => {
                const userWins = round.errors.length === 0;
                const endMessage = userWins
                  ? pickRandom(FATEEN_WIN_MSGS)
                  : pickRandom(FATEEN_LOSS_MSGS);

                return (
                  <>
                    {/* الفائز */}
                    <div className="flex flex-col items-center gap-4 py-8">
                     <div className={`w-16 h-16 rounded-2xl flex items-center justify-center translate-y-[10px] ${userWins ? 'bg-[var(--success-light)]' : 'gradient-accent shadow-lg shadow-[var(--accent)]/25'}`}>
                        {userWins ? (
                          <CheckCircle2 size={32} className="text-[var(--success)]" strokeWidth={1.5} />
                        ) : (
                          <GazelleIcon size={32} className="text-white" />
                        )}
                      </div>

                      <div className="text-center space-y-1.5">
                        <p className="text-lg font-bold text-[var(--text-0)]" >
                          {userWins ? 'أنتِ الفائزة!' : 'فطين هو الفائز'}
                        </p>
                        <p className="text-sm text-[var(--text-2)]" >
                          {userWins
                            ? 'لم يستطع فطين أن يفلت منكِ ببيت واحد'
                            : 'أمسكَ فطين ببعض أبياتكِ'}
                        </p>
                      </div>
                    </div>

                    {/* رسالة فطين الختامية */}
                   <Card className="p-5 !px-7">
  <div className="translate-y-[3px]">
    {endMessage.split('\n').map((line, i) => (
      <p
        key={i}
        className={`text-sm leading-7 ${i === 0 ? 'font-medium text-[var(--text-0)]' : 'text-[var(--text-1)]'}`}
      >
        {i === 0 && (
          <GazelleIcon
            size={18}
            className={`inline-block align-middle ml-1 ${userWins ? 'text-[var(--success)]' : 'text-[var(--accent)]'}`}
          />
        )}
        {line}
      </p>
    ))}
  </div>
</Card>

                    {/* الإحصائيات */}
                   <div className="grid grid-cols-3 gap-3 translate-y-[10px]">
                     <Card className="p-4 !px-3 text-center">
                        <p className="text-xl font-bold text-[var(--text-0)]">{round.verseOrder.length}</p>
                       <p className="text-[10px] text-[var(--text-3)] !relative -top-[5px]">
  إجمالي الأبيات
</p>
                      </Card>
                     <Card className="p-4 !px-3 text-center">
                        <p className="text-xl font-bold text-[var(--success)]">{round.correct.length}</p>
                        <p className="text-[10px] text-[var(--text-3)] !relative -top-[5px]">
                          صحيح
                        </p>
                      </Card>
                     <Card className="p-4 !px-3 text-center">
                        <p className="text-xl font-bold text-[var(--error)]">{round.errors.length}</p>
                        <p className="text-[10px] text-[var(--text-3)] !relative -top-[5px]">
                          خطأ
                        </p>
                      </Card>
                    </div>

                    {/* الأبيات التي أخطأت فيها */}
                    {!userWins && round.errors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-[var(--text-1)] mb-3 translate-y-[14px]" >
                          الأبيات التي أخطأتِ فيها:
                        </h4>
                        <div className="space-y-0 translate-y-[14px]">
                          {round.errors.map((verseIdx, i) => {
                            const v = poem.verses[verseIdx];
                            if (!v) return null;
                            return (
                              <Card key={verseIdx} className="p-3.5 !mb-[6px]">
                                <div className="flex items-start gap-3">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--error-light)] text-[var(--error)] text-[10px] font-bold shrink-0">
                                    {i + 1}
                                  </span>
                                 <div className="flex-1 min-w-0 flex flex-col justify-center !pl-[40px]">
                                    <p className="text-[10px] text-[var(--text-3)] mb-1" >
                                      البيت {verseIdx + 1}
                                    </p>
                                    <PoeticVerseDisplay
                                      sadr={v.sadr}
                                      ajar={v.ajar}
                                      showTashkeel={showTashkeel}
                                      fontSize="1rem"
                                    />
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* أزرار */}
                 <div className="flex justify-center gap-3 pt-3 translate-y-[14px]">
  <Button variant="ghost" size="md" onClick={onClose}>
    عودة
  </Button>
  <Button variant="primary" size="md" onClick={startRound} className="!px-4">
  جولة جديدة
</Button>
</div>

<div className="h-[200px] shrink-0" />
                  </>
                );
              })()}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
