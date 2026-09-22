import { BookOpen, Clock, Shield, CheckCircle2, Play, ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Poem, AppState } from '../lib/types';
import { getOverallProgress } from '../lib/algorithm';
import { Card, ProgressBar, Button, Badge } from '../ui';
import GazelleIcon from './GazelleIcon';

interface Props {
  state: AppState;
  onStudy: (poem: Poem) => void;
  onNavigate: (page: string) => void;
  todaySection?: ReactNode;
}

export default function Dashboard({ state, onStudy, onNavigate, todaySection }: Props) {
  const { poems, stats } = state;
  const now = Date.now();

  let totalVerses = 0;
  let masteredVerses = 0;
  let dueForReview = 0;
  for (const poem of poems) {
    totalVerses += poem.verses.length;
    const pStats = stats[poem.id];
    if (pStats) {
      const p = getOverallProgress(pStats.verses, poem.verses.length);
      masteredVerses += p.mastered + p.strong;
      if (Object.values(pStats.verses).some(v => now >= v.nextReviewAt)) dueForReview++;
    }
  }
  const masteryRate = totalVerses > 0 ? Math.round((masteredVerses / totalVerses) * 100) : 0;

  const lastStudied = [...poems].sort((a, b) => (b.lastSession || 0) - (a.lastSession || 0))[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير';
    if (h < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  return (
   <div className="flex flex-col gap-3 lg:gap-5 pb-20 pt-2 lg:pt-0">
      {/* Greeting */}
      <div className="flex flex-col gap-0 px-1">
        <h2 className="text-xl lg:text-2xl font-bold text-[var(--text-0)] leading-tight">{greeting()}</h2>
        <p className="text-sm text-[var(--text-2)] leading-tight -mt-0.5">
          {poems.length === 0 ? 'أضيفي قصيدة وابدئي رحلة الحفظ' : 'واصلي رحلة حفظ القصائد العربية'}
        </p>
      </div>

      {/* جلسة اليوم */}
{todaySection && <div className="w-full">{todaySection}</div>}
   {/* Stats cards */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
    {[
      { icon: BookOpen, label: 'القصائد', value: poems.length },
      { icon: CheckCircle2, label: 'أبيات متقنة', value: masteredVerses },
      { icon: Shield, label: 'للمراجعة', value: dueForReview },
      { icon: null, label: 'معدل الإتقان', value: `${masteryRate}%` }
    ].map((stat, i) => (
      <Card key={i} className="py-5 px-5 flex flex-col items-center justify-center gap-2.5 min-w-0 shadow-sm text-center">
        <div className="flex items-center justify-center gap-2 min-w-0 w-full pt-1 relative top-1">
          {stat.icon && (
            <stat.icon
              size={16}
              className="text-[var(--text-3)] shrink-0"
              strokeWidth={2}
            />
          )}
          <span className="text-[11px] text-[var(--text-3)] font-bold uppercase tracking-tight truncate leading-normal">
            {stat.label}
          </span>
        </div>
       <p className="text-3xl font-extrabold text-[var(--text-0)] tabular-nums leading-[1.2] py-0.5 truncate">
  {stat.value}
</p>
      </Card>
    ))}
  </div>

      {/* تحدي فطين */}
      <Card hover className="px-8 h-[80px] overflow-hidden shadow-md flex items-center" onClick={() => onNavigate('fateen')}>
  <div className="flex items-center gap-5 w-full">
    <div className="w-12 h-12 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center shrink-0 shadow-sm border border-[var(--accent)]/10 relative right-[12px]">
      <GazelleIcon size={28} className="text-[var(--accent)] shrink-0" />
    </div>

    <div className="flex-1 min-w-0 flex flex-col gap-0">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-[var(--text-0)] leading-none">تحدي فطين</h3>
        <Badge variant="accent">جديد</Badge>
      </div>
      <p className="text-sm text-[var(--text-2)] font-medium leading-tight -mt-0.5">
        كلمةٌ واحدة من كل بيت... فهل تستحضرين البيت كاملًا؟
      </p>
    </div>

    <div className="shrink-0 mr-auto">
      <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 relative left-[12px]">
        <ChevronLeft size={20} strokeWidth={3} />
      </div>
    </div>
  </div>
</Card>

      {/* Continue studying */}
      {lastStudied && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider px-1">متابعة الحفظ</h3>
          <Card hover className="p-5 flex flex-col gap-4" onClick={() => onStudy(lastStudied)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
               <p className="font-bold text-[var(--text-0)] text-base truncate leading-tight relative !right-[10px] top-[8px]">{lastStudied.title}</p>
<p className="text-sm text-[var(--text-2)] truncate leading-tight relative !right-[10px] top-[3px]">{lastStudied.poet}</p>
              </div>
              <Button variant="primary" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onStudy(lastStudied); }} className="shrink-0 rounded-full w-10 h-10 p-0 min-h-0">
                <Play size={16} strokeWidth={2.5} fill="currentColor" />
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <ProgressBar value={(() => {
                  const pStats = stats[lastStudied.id];
                  if (!pStats) return 0;
                  const p = getOverallProgress(pStats.verses, lastStudied.verses.length);
                  return Math.round(((p.mastered + p.strong) / lastStudied.verses.length) * 100);
                })()} className="flex-1 h-2" />
              </div>
              <p className="text-[11px] text-[var(--text-3)] font-medium tabular-nums text-left">
                {Math.min(lastStudied.currentVerseIndex + 1, lastStudied.verses.length)} من {lastStudied.verses.length} بيت
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Poems list */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-1 gap-4">
          <h3 className="text-xs font-extrabold text-[var(--text-3)] uppercase tracking-[0.1em]">قصائدك</h3>
          <button onClick={() => onNavigate('poems')} className="text-xs font-extrabold text-[var(--accent)] hover:underline underline-offset-4">عرض الكل ←</button>
        </div>

        {poems.length === 0 ? (
          <Card className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col gap-0.5 relative top-[4px]">
              <p className="text-base font-bold text-[var(--text-1)]">لم تضيفي أي قصيدة بعد</p>
              <p className="text-sm text-[var(--text-3)] leading-tight">أضيفي أول قصيدة وابدئي رحلة حفظها</p>
            </div>
            <Button variant="primary" onClick={() => onNavigate('poems')} className="!px-[30px] relative -top-[6px]">إضافة قصيدة</Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {poems.slice(0, 5).map(poem => {
              const pStats = stats[poem.id];
              const progress = pStats ? getOverallProgress(pStats.verses, poem.verses.length) : null;
              const learnedPct = progress ? Math.round(((progress.mastered + progress.strong) / poem.verses.length) * 100) : 0;
              return (
                <Card hover key={poem.id} className="p-4" onClick={() => onStudy(poem)}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <p className="font-bold text-[var(--text-0)] text-sm truncate leading-tight">{poem.title}</p>
                      <p className="text-xs text-[var(--text-3)] truncate leading-tight">{poem.poet}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-2">
                        {progress && progress.mastered > 0 && <Badge variant="success">متقن</Badge>}
                        <span className="text-xs font-bold text-[var(--text-2)] tabular-nums">{learnedPct}%</span>
                      </div>
                      <ProgressBar value={learnedPct} className="w-24 h-1.5" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
