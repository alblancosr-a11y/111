"use client";
import { AlertCircle, CheckCircle2, Filter, X } from 'lucide-react';
import { useState } from 'react';
import type { ErrorLogEntry, SuccessLogEntry, Poem } from '../lib/types';
import { getErrorTypeLabel, getSourceLabel } from '../lib/errorLog';
import { Badge, Card } from '../ui';

interface Props {
  errorLog: ErrorLogEntry[];
  successLog: SuccessLogEntry[];
  poems: Poem[];
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  return `${date} ${time}`;
}

export default function ErrorLogView({ errorLog, successLog, poems, onClose }: Props) {
  const [filterPoemId, setFilterPoemId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'errors' | 'all'>('errors');

  const getPoemTitle = (id: string) => poems.find(p => p.id === id)?.title || 'قصيدة';
  const getPoemVerse = (poemId: string, verseIndex: number) => {
    const poem = poems.find(p => p.id === poemId);
    return poem?.verses[verseIndex]?.sadr || '';
  };

  const filteredErrors = errorLog
    .filter(e => filterPoemId === 'all' || e.poemId === filterPoemId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const filteredSuccess = successLog
    .filter(s => filterPoemId === 'all' || s.poemId === filterPoemId)
    .sort((a, b) => b.timestamp - a.timestamp);

  // دمج الأحداث وترتيبها زمنيًا
  type LogEvent = ({ kind: 'error' } & ErrorLogEntry) | ({ kind: 'success' } & SuccessLogEntry);
  const allEvents: LogEvent[] = viewMode === 'all'
    ? [
        ...filteredErrors.map(e => ({ kind: 'error' as const, ...e })),
        ...filteredSuccess.map(s => ({ kind: 'success' as const, ...s })),
      ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)
    : filteredErrors.slice(0, 50).map(e => ({ kind: 'error' as const, ...e }));

  const poemsWithErrors = [...new Set(errorLog.map(e => e.poemId))];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[92vh] glass-modal rounded-xl overflow-hidden animate-scale-in flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-0)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-0)] relative right-[8px]">سجل الأخطاء</h2>
            <p className="text-[11px] text-[var(--text-3)]">
              {errorLog.length} خطأ · {successLog.length} نجاح
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-colors relative left-[8px]">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-[var(--border-0)] space-y-2 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('errors')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'errors'
                  ? 'bg-[var(--error-light)] text-[var(--error)]'
                  : 'bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text-1)]'
              }`}
            >
              الأخطاء فقط ({filteredErrors.length})
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'all'
                  ? 'bg-[var(--accent-light)] text-[var(--accent-text)]'
                  : 'bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text-1)]'
              }`}
            >
              جميع الأحداث
            </button>
          </div>

          {poemsWithErrors.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-[var(--text-3)] shrink-0" />
              <select
                value={filterPoemId}
                onChange={e => setFilterPoemId(e.target.value)}
                className="flex-1 text-xs bg-[var(--bg-2)] border border-[var(--border-0)] rounded-lg px-2 py-1 text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
              >
                <option value="all">جميع القصائد</option>
                {poemsWithErrors.map(id => (
                  <option key={id} value={id}>{getPoemTitle(id)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Log entries */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {allEvents.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-[var(--success-light)] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-[var(--success)]" strokeWidth={1.5} />
              </div>
              <p className="text-base font-bold text-[var(--text-1)]">لا توجد سجلات حاليًا</p>
              <p className="text-sm text-[var(--text-3)] mt-1 px-10">ستظهر الأخطاء والنجاحات هنا أثناء مراجعة القصائد</p>
            </div>
          ) : (
            allEvents.map(event => (
              <div
                key={event.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  event.kind === 'error'
                    ? 'bg-[var(--error-light)] border-[var(--error)]/10'
                    : 'bg-[var(--success-light)] border-[var(--success)]/10'
                }`}
              >
                <div className="flex gap-3">
                  <div className="shrink-0">
                    {event.kind === 'error' ? (
                      <div className="w-8 h-8 rounded-lg bg-[var(--error)]/10 flex items-center justify-center">
                        <AlertCircle size={16} className="text-[var(--error)]" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-[var(--success)]" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                      <span className="font-bold text-[var(--text-0)] text-sm truncate">
                        {getPoemTitle(event.poemId)} • البيت {event.verseIndex + 1}
                      </span>
                      <span className="text-[10px] text-[var(--text-3)] font-bold opacity-60 tabular-nums shrink-0">{formatTime(event.timestamp)}</span>
                    </div>
                    
                    <p className="text-sm text-[var(--text-2)] font-bold truncate leading-tight" style={{ fontFamily: 'var(--font-poem)' }}>
                      {getPoemVerse(event.poemId, event.verseIndex)}
                    </p>

                    <div className="flex items-center gap-2 mt-0.5">
                      {event.kind === 'error' ? (
                        <Badge variant="error">{getErrorTypeLabel((event as ErrorLogEntry).errorType)}</Badge>
                      ) : (
                        <Badge variant="success">نجاح</Badge>
                      )}
                      <span className="text-[9px] text-[var(--text-3)] font-bold uppercase tracking-wider opacity-60">
                        {getSourceLabel((event as (ErrorLogEntry | SuccessLogEntry)).source)}
                        {event.level && ` • م${event.level}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ملاحظة */}
        <div className="px-5 py-3 border-t border-[var(--border-0)] shrink-0">
          <p className="text-[10px] text-[var(--text-3)] text-center">
            السجل تاريخي — لا تُحذف الأخطاء عند التحسن · يُعرض آخر 50 حدث
          </p>
        </div>
      </div>
    </div>
  );
}
