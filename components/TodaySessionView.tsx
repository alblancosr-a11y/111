"use client";
import { Clock, Zap, RefreshCw, BookOpen, CheckCircle2, ChevronLeft } from 'lucide-react';
import type { Poem, AppState } from '../lib/types';
import { buildTodaySession, type TodayTask, type TodayTaskReason } from '../lib/todaySession';
import { Card, Badge, Button } from '../ui';

interface Props {
  state: AppState;
  onStudy: (poem: Poem) => void;
  onStartWeakVerse: (poem: Poem, verseIndex: number) => void;
  onStartCumulative: (poem: Poem, verseIndex: number) => void;
}

function getReasonBadge(reason: TodayTaskReason) {
  switch (reason) {
    case 'needs_strengthening':
      return <Badge variant="error">يحتاج إلى تقوية</Badge>;
    case 'due_for_review':
      return <Badge variant="warning">مراجعة مستحقة</Badge>;
    case 'new_verse':
      return <Badge variant="accent">بيت جديد</Badge>;
  }
}

function getReasonIcon(reason: TodayTaskReason) {
  switch (reason) {
    case 'needs_strengthening':
      return <Zap size={14} className="text-[var(--error)]" strokeWidth={1.5} />;
    case 'due_for_review':
      return <RefreshCw size={14} className="text-[var(--warning)]" strokeWidth={1.5} />;
    case 'new_verse':
      return <BookOpen size={14} className="text-[var(--accent)]" strokeWidth={1.5} />;
  }
}

function getPoemFromState(state: AppState, poemId: string): Poem | undefined {
  return state.poems.find(p => p.id === poemId);
}

export default function TodaySessionView({ state, onStudy, onStartWeakVerse, onStartCumulative }: Props) {
  const todayData = buildTodaySession(state.poems, state.stats, state.errorLog);
  const { tasks, hasWeakVerses, hasDueReviews, hasNewVerses } = todayData;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير';
    if (h < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  if (state.poems.length === 0) {
    return (
      <Card className="px-8 !h-[80px] !min-h-0 !max-h-[80px] overflow-hidden shadow-md flex items-center">
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0 shadow-sm border border-[var(--accent)]/10 relative right-[12px]">
            <Clock size={24} className="text-[var(--accent)] shrink-0" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0 relative top-[2px]">
            <h3 className="text-lg font-bold text-[var(--text-0)] leading-none">جلسة اليوم</h3>
            <p className="text-sm text-[var(--text-2)] font-medium leading-none relative -top-[3px]">أضيفي قصيدة وابدئي رحلة الحفظ</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
   <Card className="px-8 !h-[80px] overflow-hidden shadow-md flex items-center">
      {/* عنوان القسم */}
      <div className="flex items-center gap-5">
      <div className="w-12 h-12 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center shrink-0 shadow-sm border border-[var(--accent)]/10 relative right-[12px]">
  <Clock size={28} className="text-[var(--accent)] shrink-0" strokeWidth={2.2} />
</div>
        <div className="flex-1 min-w-0 flex flex-col gap-0 relative top-[2px]">
          <h2 className="text-lg font-bold text-[var(--text-0)] leading-none">جلسة اليوم</h2>
          <p className="text-sm text-[var(--text-3)] font-bold opacity-60 uppercase tracking-wider leading-none -mt-0.5">
            {greeting()} • {tasks.length === 0 ? 'لا توجد مهام' : `${tasks.length} مهمة`}
          </p>
        </div>
      </div>

      {/* ملخص صغير للحالة */}
      {tasks.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {hasWeakVerses && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--error-light)] text-[var(--error)] text-[11px] font-bold border border-[var(--error)]/10">
              <Zap size={10} strokeWidth={3} />
              <span>تقوية</span>
            </div>
          )}
          {hasDueReviews && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--warning-light)] text-[var(--warning)] text-[11px] font-bold border border-[var(--warning)]/10">
              <RefreshCw size={10} strokeWidth={3} />
              <span>مراجعة</span>
            </div>
          )}
          {hasNewVerses && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] text-[11px] font-bold border border-[var(--accent)]/10">
              <BookOpen size={10} strokeWidth={3} />
              <span>جديد</span>
            </div>
          )}
        </div>
      )}

      {/* قائمة المهام */}
      {tasks.length === 0 ? (
        <div className="py-4 flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col gap-0 relative top-[2px]">
            <p className="text-sm font-bold text-[var(--text-1)]">لا توجد مهام مستحقة الآن</p>
            <p className="text-xs text-[var(--text-3)] leading-tight -mt-0.5">يمكنك المتابعة يدويًا عبر قصائدك</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => {
            const firstPoem = state.poems[0];
            if (firstPoem) onStudy(firstPoem);
          }} className="text-xs">
            ابدئي جلسة يدوية
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.slice(0, 3).map((task, idx) => {
            const poem = getPoemFromState(state, task.poemId);
            if (!poem) return null;
            return (
              <TaskItem
                key={`${task.poemId}:${task.verseIndex}:${idx}`}
                task={task}
                poem={poem}
                onStart={() => {
                  if (task.reason === 'needs_strengthening') {
                    onStartWeakVerse(poem, task.verseIndex);
                  } else if (task.reason === 'due_for_review') {
                    onStartCumulative(poem, task.verseIndex);
                  } else {
                    onStartCumulative(poem, task.verseIndex);
                  }
                }}
              />
            );
          })}
          {tasks.length > 3 && (
            <p className="text-[10px] text-[var(--text-3)] text-center font-medium mt-1">
              و {tasks.length - 3} مهام أخرى...
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function TaskItem({ task, poem: _poem, onStart }: { task: TodayTask; poem: Poem; onStart: () => void }) {
  return (
    <button
      onClick={onStart}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border-0)] transition-all text-right group min-w-0 overflow-hidden"
    >
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/30 shadow-sm border border-white/20">
        {getReasonIcon(task.reason)}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[10px] text-[var(--text-3)] font-bold truncate shrink-0">{task.reasonLabel}</span>
          <span className="text-[9px] text-[var(--text-3)] opacity-60 truncate">| {task.poemTitle}</span>
        </div>
        <p className="text-xs text-[var(--text-1)] font-bold truncate leading-tight" style={{ fontFamily: 'var(--font-poem)' }}>
          {task.verseText}
        </p>
      </div>
      <ChevronLeft size={14} className="text-[var(--text-3)] opacity-40 group-hover:opacity-100 group-hover:translate-x-[-2px] transition-all shrink-0" strokeWidth={2.5} />
    </button>
  );
}
