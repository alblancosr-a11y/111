import { useState } from 'react';
import { X, Play, RefreshCw, Navigation, ChevronLeft, ChevronRight, AlertTriangle, List, Sparkles } from 'lucide-react';
import type { Poem, PoemStats } from '../lib/types';
import { getOverallProgress, getWeakVerseIndices } from '../lib/algorithm';
import { getVerseSegments, getArabicVerseOrdinal } from '../lib/exercises';
import { ProgressBar, Badge } from '../ui';

type Mode = 'cumulative' | 'chain' | 'continue_from' | 'where_am_i' | 'review' | 'weak_verses' | 'fateen';
interface Props {
  poem: Poem;
  stats: PoemStats | undefined;
  onStart: (mode: Mode, opts?: { startFromVerse?: number; newVerseIndex?: number; segmentIndex?: number; weakVerseIndex?: number }) => void;
  onFateen?: () => void;
  onClose: () => void;
}

type SubScreen = 'main' | 'cumulative_options' | 'review_options' | 'weak_verses_list';

export default function SessionStartModal({ poem, stats, onStart, onFateen, onClose }: Props) {
  const total = poem.verses.length;
  const maxVerse = poem.currentVerseIndex;
  const progress = stats
    ? getOverallProgress(stats.verses, total)
    : { mastered: 0, strong: 0, medium: 0, weak: 0, learning: 0, newCount: total };
  const learnedPct = Math.round(((progress.mastered + progress.strong) / Math.max(total, 1)) * 100);
  const weakIndices = stats ? getWeakVerseIndices(stats.verses, total) : [];
  const segments = getVerseSegments(poem.verses);

  // آخر بيت متقن: نستخدم lastCompletedVerseIndex أو currentVerseIndex
  const lastCompletedIdx = typeof poem.lastCompletedVerseIndex === 'number' && poem.lastCompletedVerseIndex >= 0
    ? poem.lastCompletedVerseIndex
    : poem.currentVerseIndex > 0 ? poem.currentVerseIndex : -1;
  const canResume = lastCompletedIdx >= 0 && lastCompletedIdx + 1 < total;

  const [subScreen, setSubScreen] = useState<SubScreen>('main');

  const modes: Array<{
    id: Mode;
    icon: typeof Play;
    title: string;
    desc: string;
    disabled?: boolean;
    primary?: boolean;
    badge?: string;
  }> = [
    {
      id: 'cumulative',
      icon: Play,
      title: 'حفظ تراكمي',
      desc: 'النظام الأساسي لحفظ الأبيات واختبارات المستويات',
      primary: true,
    },
    {
      id: 'review',
      icon: RefreshCw,
      title: 'مراجعة شاملة',
      desc: 'مراجعة القصيدة بنظام المقاطع',
      disabled: total < 1,
    },
    {
      id: 'where_am_i',
      icon: Navigation,
      title: 'أين أنا؟',
      desc: 'معرفة آخر بيت تم حفظه وعرض التقدم والأبيات المتبقية',
      disabled: false,
    },
    {
      id: 'weak_verses',
      icon: AlertTriangle,
      title: 'الأبيات الضعيفة',
      desc: weakIndices.length > 0 ? `${weakIndices.length} بيت يحتاج تقوية` : 'لا توجد أبيات ضعيفة حاليًا',
      disabled: weakIndices.length === 0,
      badge: weakIndices.length > 0 ? `${weakIndices.length}` : undefined,
    },
    ...(onFateen ? [{
      id: 'fateen' as const,
      icon: Sparkles,
      title: 'تحدي فطين',
      desc: 'استحضري البيت من كلمة واحدة فقط',
      disabled: false,
      primary: false,
    }] : []),
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-md glass-modal rounded-xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-0)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-0)] relative right-[8px]">
              {subScreen === 'cumulative_options' ? 'الحفظ التراكمي' :
               subScreen === 'review_options' ? 'المراجعة الشاملة' :
               subScreen === 'weak_verses_list' ? 'الأبيات الضعيفة' :
               'ابدئي جلسة الحفظ'}
            </h2>
            <p className="text-[11px] text-[var(--text-3)]">
              {poem.title} · البيت {Math.min(maxVerse + 1, total)}/{total}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-colors relative left-[8px]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-[var(--border-0)]">
          <ProgressBar value={learnedPct} className="mb-1" />
          <div className="flex gap-3 text-[11px] text-[var(--text-3)]">
            <span>متقن: {progress.mastered}</span>
            <span>ثابت: {progress.strong}</span>
            <span>جديد: {progress.newCount}</span>
          </div>
        </div>

        {/* ===== الشاشة الرئيسية ===== */}
        {subScreen === 'main' && (
          <div className="px-6 py-5 flex flex-col gap-3">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  if (m.id === 'cumulative') {
                    setSubScreen('cumulative_options');
                  } else if (m.id === 'review') {
                    setSubScreen('review_options');
                  } else if (m.id === 'weak_verses') {
                    setSubScreen('weak_verses_list');
                  } else {
                    onStart(m.id);
                  }
                }}
                disabled={m.disabled}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-right transition-all group ${
                  m.disabled
                    ? 'opacity-30 cursor-not-allowed grayscale'
                    : 'hover:border-[var(--accent)]/30 hover:bg-[var(--accent-light)]/50 cursor-pointer active:scale-[0.98]'
                } ${
                  m.primary
                    ? 'border-[var(--accent)]/40 bg-[var(--accent-light)]'
                    : 'border-[var(--border-1)] bg-white/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.primary ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-2)] text-[var(--text-2)]'}`}>
                  <m.icon
                    size={18}
                    strokeWidth={2.5}
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${m.primary ? 'text-[var(--accent-text)]' : 'text-[var(--text-0)]'}`}>
                      {m.title}
                    </span>
                    {m.badge && <Badge variant="warning">{m.badge}</Badge>}
                  </div>
                  <p className="text-[11px] text-[var(--text-3)] font-medium leading-tight truncate">{m.desc}</p>
                </div>
                {!m.disabled && (
                  <ChevronLeft size={16} className="text-[var(--text-3)] opacity-40 group-hover:opacity-100 group-hover:translate-x-[-2px] transition-all" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* ===== خيارات الحفظ التراكمي ===== */}
        {subScreen === 'cumulative_options' && (
          <div className="px-6 py-4 space-y-2">
            <button
              onClick={() => onStart('cumulative', { startFromVerse: 0 })}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-light)] text-right transition-all hover:bg-[var(--accent-light)] cursor-pointer"
            >
              <Play size={16} className="text-[var(--accent)]" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--accent-text)]">الحفظ من البداية</p>
                <p className="text-[11px] text-[var(--text-3)]">يبدأ من البيت الأول</p>
              </div>
              <ChevronRight size={14} className="text-[var(--text-3)]" strokeWidth={1.5} />
            </button>

            <button
              onClick={() => onStart('cumulative', { startFromVerse: canResume ? lastCompletedIdx + 1 : 0 })}
              disabled={!canResume}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-right transition-all ${
                canResume
                  ? 'border-[var(--border-0)] hover:border-[var(--border-1)] hover:bg-[var(--bg-2)] cursor-pointer'
                  : 'opacity-30 cursor-not-allowed border-[var(--border-0)]'
              }`}
            >
              <Play size={16} className={canResume ? 'text-[var(--success)]' : 'text-[var(--text-3)]'} strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm text-[var(--text-0)]">الحفظ من آخر بيت متقن</p>
                <p className="text-[11px] text-[var(--text-3)]">
                  {canResume
                    ? `يبدأ من ${getArabicVerseOrdinal(lastCompletedIdx + 1)} (البيت ${lastCompletedIdx + 2})`
                    : 'لم تكملي حفظ أي بيت بعد'}
                </p>
              </div>
              {canResume && <ChevronRight size={14} className="text-[var(--text-3)]" strokeWidth={1.5} />}
            </button>

            <button
              onClick={() => setSubScreen('main')}
              className="w-full text-center text-xs text-[var(--text-3)] hover:text-[var(--text-1)] py-2"
            >
              ← رجوع
            </button>
          </div>
        )}

        {/* ===== خيارات المراجعة الشاملة ===== */}
        {subScreen === 'review_options' && (
          <div className="px-6 py-4 space-y-2">
            <button
              onClick={() => onStart('review', { segmentIndex: -1 })}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-light)] text-right transition-all hover:bg-[var(--accent-light)] cursor-pointer"
            >
              <RefreshCw size={16} className="text-[var(--accent)]" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--accent-text)]">مراجعة القصيدة كاملة</p>
                <p className="text-[11px] text-[var(--text-3)]">جميع المقاطع ({segments.length} مقطع)</p>
              </div>
              <ChevronRight size={14} className="text-[var(--text-3)]" strokeWidth={1.5} />
            </button>

            <div className="pt-2 border-t border-[var(--border-0)]">
              <p className="text-[11px] text-[var(--text-3)] mb-2">أو اختاري مقطعًا محددًا:</p>
              <div className="space-y-1.5">
                {segments.map((seg, idx) => (
                  <button
                    key={idx}
                    onClick={() => onStart('review', { segmentIndex: idx })}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border-0)] text-right transition-all hover:border-[var(--border-1)] hover:bg-[var(--bg-2)] cursor-pointer"
                  >
                    <List size={14} className="text-[var(--text-3)]" strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[var(--text-0)]">{seg.title}</p>
                      <p className="text-[10px] text-[var(--text-3)]">{seg.range} · {seg.verses.length} بيت</p>
                    </div>
                    <ChevronRight size={12} className="text-[var(--text-3)]" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSubScreen('main')}
              className="w-full text-center text-xs text-[var(--text-3)] hover:text-[var(--text-1)] py-2"
            >
              ← رجوع
            </button>
          </div>
        )}

        {/* ===== قائمة الأبيات الضعيفة ===== */}
        {subScreen === 'weak_verses_list' && (
          <div className="px-6 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {weakIndices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--text-1)] mb-1">لا توجد أبيات ضعيفة حاليًا</p>
                <p className="text-xs text-[var(--text-3)]">جميع الأبيات المحفوظة في حالة جيدة بحمد الله</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {weakIndices.map(idx => {
                  const verse = poem.verses[idx];
                  const vs = stats?.verses[idx];
                  if (!verse) return null;
                  const stability = vs?.memory.standalone || 'new';
                  const errorCount = vs?.errors || 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => onStart('weak_verses', { weakVerseIndex: idx })}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border-0)] text-right transition-all hover:border-[var(--warning)] hover:bg-[var(--warning-light)] cursor-pointer"
                    >
                      <AlertTriangle size={14} className="text-[var(--warning)]" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-0)]">{getArabicVerseOrdinal(idx)}</p>
                        <p className="text-[10px] text-[var(--text-3)] truncate" style={{ fontFamily: 'var(--font-poem)' }}>
                          {verse.sadr}{verse.ajar ? ' ◇ ' : ''}{verse.ajar}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={stability === 'weak' ? 'error' : stability === 'learning' ? 'warning' : 'default'}>
                          {stability === 'weak' ? 'ضعيف' : stability === 'learning' ? 'قيد الحفظ' : 'متوسط'}
                        </Badge>
                        {errorCount > 0 && <span className="text-[10px] text-[var(--error)]">{errorCount} ✗</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setSubScreen('main')}
              className="w-full text-center text-xs text-[var(--text-3)] hover:text-[var(--text-1)] py-2"
            >
              ← رجوع
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
