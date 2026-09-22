import { Plus, MoreHorizontal, Play, BookOpen, Trash2, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import type { Poem, AppState } from '../lib/types';
import { getOverallProgress } from '../lib/algorithm';
import { Card, ProgressBar, Button, Badge } from '../ui';

interface Props {
  state: AppState;
  onAdd: () => void;
  onStudy: (poem: Poem) => void;
  onRead: (poem: Poem) => void;
  onStats: (poem: Poem) => void;
  onDelete: (poem: Poem) => void;
}

export default function PoemsPage({ state, onAdd, onStudy, onRead, onStats, onDelete }: Props) {
  const { poems, stats } = state;
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 lg:gap-10 pb-20">
      <div className="flex items-center justify-between px-1 gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--text-0)] leading-tight">قصائدي</h1>
          <p className="text-xs text-[var(--text-3)] font-bold mt-1 uppercase tracking-tight">
            {poems.length} {poems.length === 1 ? 'قصيدة' : 'قصائد'} في مكتبتك
          </p>
        </div>
        <Button variant="primary" onClick={onAdd} className="shrink-0 shadow-lg shadow-[var(--accent)]/20 !px-[30px]">
          <Plus size={16} strokeWidth={3} />
          <span className="hidden sm:inline">إضافة قصيدة</span>
        </Button>
      </div>

      {poems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-[var(--text-1)] mb-1">لم تضيفي أي قصيدة بعد</p>
          <p className="text-xs text-[var(--text-3)] mb-6">أضيفي قصيدة وابدئي حفظها بالتكرار المتباعد</p>
          <Button variant="primary" onClick={onAdd} className="!px-[30px]">إضافة قصيدة</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {poems.map(poem => {
            const pStats = stats[poem.id];
            const progress = pStats ? getOverallProgress(pStats.verses, poem.verses.length) : null;
            const learnedPct = progress ? Math.round(((progress.mastered + progress.strong) / poem.verses.length) * 100) : 0;
            const currentVerse = Math.min(poem.currentVerseIndex + 1, poem.verses.length);
            const isDue = pStats && Object.values(pStats.verses).some(v => Date.now() >= v.nextReviewAt);

            return (
              <Card key={poem.id} className="p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                     <h3 className="text-lg font-bold text-[var(--text-0)] truncate leading-none translate-y-[8px]">
  {poem.title}
</h3>
                      {isDue && <Badge variant="warning">للمراجعة</Badge>}
                    </div>
                    <p className="text-sm text-[var(--text-3)] font-bold truncate leading-tight uppercase tracking-tight">{poem.poet} · {poem.verses.length} بيت</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="primary" size="sm" onClick={() => onStudy(poem)} className="h-9 px-4">
                      <Play size={14} strokeWidth={3} fill="currentColor" />
                      <span className="hidden sm:inline">ابدئي الحفظ</span>
                    </Button>
                    <button
                      onClick={() => setMenuOpen(menuOpen === poem.id ? null : poem.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-all border border-[var(--border-0)]"
                    >
                      <MoreHorizontal size={18} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Preview */}
                {poem.verses[0] && (
                  <div className="p-4 rounded-2xl bg-[var(--bg-2)] border border-[var(--border-0)]">
                    <p className="text-sm text-[var(--text-1)] font-bold truncate text-center leading-relaxed" style={{ fontFamily: 'var(--font-poem)' }}>
                      {poem.verses[0].sadr}
                      {poem.verses[0].ajar && <span className="text-[var(--text-3)] mx-3">◇</span>}
                      {poem.verses[0].ajar}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-6 px-1">
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <ProgressBar value={learnedPct} className="flex-1 h-2" />
                    <span className="text-sm font-extrabold text-[var(--text-2)] tabular-nums">{learnedPct}%</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {progress && progress.mastered > 0 && <Badge variant="success">{progress.mastered} متقن</Badge>}
                    <span className="text-[11px] text-[var(--text-3)] font-bold opacity-60 tabular-nums">البيت {currentVerse}</span>
                  </div>
                </div>

                {/* Dropdown menu */}
                {menuOpen === poem.id && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-0)] flex items-center gap-2 animate-fade-in">
                    <Button variant="ghost" size="sm" onClick={() => { onRead(poem); setMenuOpen(null); }}>
                      <BookOpen size={12} strokeWidth={1.5} />
                      قراءة
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { onStats(poem); setMenuOpen(null); }}>
                      <BarChart3 size={12} strokeWidth={1.5} />
                      إحصائيات
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { onDelete(poem); setMenuOpen(null); }} className="text-[var(--error)] hover:text-[var(--error)]">
                      <Trash2 size={12} strokeWidth={1.5} />
                      حذف
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
