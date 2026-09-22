"use client";
import { X, Clock, Flame, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Poem, PoemStats, ErrorLogEntry } from '../lib/types';
import {
  getOverallProgress,
  getStabilityLabel,
  calcStreak,
  calcLearnDays,
  calcMemorizationRate,
  formatTimeSince,
  getWeakVerseIndices,
} from '../lib/algorithm';
import { getErrorTypeLabel } from '../lib/errorLog';
import { Card, ProgressBar, Badge } from '../ui';

interface Props {
  poem: Poem;
  stats: PoemStats | undefined;
  errorLog: ErrorLogEntry[];
  onClose: () => void;
}

export default function StatsView({ poem, stats, errorLog, onClose }: Props) {
  const total = poem.verses.length;

  // ===== مستويات الحفظ =====
  const progress = stats
    ? getOverallProgress(stats.verses, total)
    : { mastered: 0, strong: 0, medium: 0, weak: 0, learning: 0, newCount: total };

  // ===== نسبة الحفظ الحقيقية (medium + strong + mastered) =====
  const memorizationRate = stats
    ? calcMemorizationRate(stats.verses, total)
    : 0;

  // ===== الجلسات الفعلية =====
  const totalSessions = stats?.totalSessions || 0;

  // ===== الصحيح والخطأ الفعلي =====
  const totalCorrect = stats?.totalCorrect || 0;
  const totalErrors = stats?.totalErrors || 0;

  // ===== أيام التعلم (الأيام التقويمية الفريدة) =====
  const learnDays = calcLearnDays(poem.studyDays);

  // ===== يوم متتالي =====
  const streak = calcStreak(poem.studyDays);

  // ===== منذ آخر جلسة =====
  const lastSessionLabel = formatTimeSince(stats?.lastSession ?? null);

  // ===== الأبيات الضعيفة (خطأ فعلي) =====
  const weakIndices = stats ? getWeakVerseIndices(stats.verses, total) : [];

  // ===== سجل الأخطاء لهذه القصيدة =====
  const poemErrors = errorLog
    .filter(e => e.poemId === poem.id)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  // ===== الأبيات الأصعب (من stats) =====
  const hardestVerses = stats
    ? Object.values(stats.verses)
        .filter(vs => vs.errors > 0)
        .sort((a, b) => b.errors - a.errors)
        .slice(0, 5)
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[92vh] glass-modal rounded-xl overflow-hidden animate-scale-in flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-0)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-0)] relative right-[8px]">إحصائيات</h2>
            <p className="text-[11px] text-[var(--text-3)]">{poem.title} — {poem.poet}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-colors relative left-[8px]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

          {/* نسبة الحفظ */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-xs font-bold text-[var(--text-1)]">نسبة الحفظ الحقيقية</span>
              <span className="text-xl font-extrabold text-[var(--accent)] tabular-nums">{memorizationRate}%</span>
            </div>
            <ProgressBar value={memorizationRate} className="h-3" />
            <p className="text-[10px] text-[var(--text-3)] text-center font-bold opacity-60">
               ({progress.medium + progress.strong + progress.mastered} من {total} بيت متقن أو ثابت)
            </p>
          </div>

          {/* الأرقام الأساسية */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'جلسات', value: totalSessions, color: 'text-[var(--text-0)]' },
              { label: 'أيام التعلم', value: learnDays, color: 'text-[var(--text-0)]' },
              { label: 'إجابة صحيحة', value: totalCorrect, color: 'text-[var(--success)]' },
              { label: 'أخطاء', value: totalErrors, color: 'text-[var(--error)]' }
            ].map((s, i) => (
              <div key={i} className="p-4 glass-inner rounded-2xl flex flex-col items-center gap-1 border border-[var(--border-0)]">
                <p className={`text-xl font-extrabold ${s.color} tabular-nums`}>{s.value}</p>
                <p className="text-[10px] text-[var(--text-3)] font-bold uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* سلسلة الأيام + آخر جلسة */}
          <div className="flex gap-4 justify-center items-center py-2">
            {[
              { icon: Flame, value: streak, label: 'يوم متتالي', color: 'text-orange-500' },
              { icon: Calendar, value: learnDays, label: 'يوم تعلم', color: 'text-blue-500' },
              { icon: Clock, value: stats?.lastSession ? lastSessionLabel : '—', label: 'آخر جلسة', color: 'text-purple-500' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-full bg-white/40 dark:bg-black/20 flex items-center justify-center ${item.color}`}>
                  <item.icon size={18} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sm font-extrabold text-[var(--text-0)] leading-none truncate max-w-[80px]">{item.value}</p>
                  <p className="text-[9px] text-[var(--text-3)] font-bold uppercase tracking-tight mt-1 opacity-60">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* مستويات الحفظ */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[var(--text-1)] px-1 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} strokeWidth={2.5} />
              مستويات الحفظ
            </h4>
            <div className="flex flex-col gap-2 glass-inner rounded-3xl p-5 border border-[var(--border-0)]">
              {[
                { l: 'متقن', c: progress.mastered, color: 'bg-amber-500', cl: 'text-amber-600' },
                { l: 'ثابت', c: progress.strong, color: 'bg-emerald-500', cl: 'text-emerald-600' },
                { l: 'متوسط', c: progress.medium, color: 'bg-violet-500', cl: 'text-violet-600' },
                { l: 'ضعيف', c: progress.weak, color: 'bg-orange-500', cl: 'text-orange-600' },
                { l: 'جديد', c: progress.learning + progress.newCount, color: 'bg-gray-400', cl: 'text-gray-500' },
              ].map(x => (
                <div key={x.l} className="flex items-center gap-4 group">
                  <span className={`text-[10px] font-bold w-10 shrink-0 ${x.cl}`}>{x.l}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden relative border border-black/5 shadow-inner">
                    <div
                      className={`absolute top-0 bottom-0 right-0 rounded-full transition-all duration-1000 ease-out ${x.color}`}
                      style={{ width: total > 0 ? `${Math.round((x.c / total) * 100)}%` : '0%' }}
                    />
                  </div>
                  <span className="text-[11px] font-extrabold text-[var(--text-2)] w-8 text-left tabular-nums">{x.c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* الأبيات الضعيفة */}
          {weakIndices.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text-1)] mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} strokeWidth={1.5} className="text-[var(--warning)]" />
                الأبيات الضعيفة ({weakIndices.length})
              </h4>
              <div className="!space-y-9">
                {weakIndices.slice(0, 5).map(vIdx => {
                  const v = poem.verses[vIdx];
                  const vs = stats?.verses[vIdx];
                  if (!v || !vs) return null;
                  return (
                    <div key={vIdx} className="p-2.5 rounded-lg bg-[var(--error-light)] border border-[var(--error)]/20">
                      <p className="text-[11px] text-[var(--text-1)] truncate" style={{ fontFamily: 'var(--font-poem)' }}>
                        {vIdx + 1}. {v.sadr}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="error">{vs.errors} خطأ</Badge>
                        <span className="text-[10px] text-[var(--text-3)]">{getStabilityLabel(vs.memory.standalone)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* سجل الأخطاء الأخير */}
          {poemErrors.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text-1)] mb-2">آخر الأخطاء</h4>
              <div className="space-y-3">
                {poemErrors.map(err => {
                  const verse = poem.verses[err.verseIndex];
                  return (
                    <div key={err.id} className="p-2 rounded-lg glass-inner text-[11px]">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-medium text-[var(--text-0)]">البيت {err.verseIndex + 1}</span>
                        <span className="text-[var(--text-3)]">{err.date}</span>
                      </div>
                      {verse && (
                        <p className="text-[var(--text-2)] truncate" style={{ fontFamily: 'var(--font-poem)' }}>
                          {verse.sadr}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="error">{getErrorTypeLabel(err.errorType)}</Badge>
                        {err.level && <span className="text-[var(--text-3)]">م{err.level}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* الأبيات الأصعب من stats */}
          {hardestVerses.length > 0 && poemErrors.length === 0 && (
            <div>
              <h4 className="text-xs font-medium text-[var(--text-1)] mb-2">الأبيات الأصعب</h4>
              <div className="space-y-3">
                {hardestVerses.map(vs => {
                  const v = poem.verses[vs.verseIndex];
                  if (!v) return null;
                  return (
                    <div key={vs.verseIndex} className="p-2 rounded-lg glass-inner">
                      <p className="text-[11px] text-[var(--text-1)] truncate" style={{ fontFamily: 'var(--font-poem)' }}>
                        {vs.verseIndex + 1}. {v.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="error">{vs.errors} خطأ</Badge>
                        <span className="text-[10px] text-[var(--text-3)]">{getStabilityLabel(vs.memory.standalone)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
