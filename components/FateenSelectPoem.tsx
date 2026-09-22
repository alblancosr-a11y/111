"use client";

import { useState } from 'react';
import { BookOpen, ChevronLeft, Plus } from 'lucide-react';
import type { Poem, AppState } from '../lib/types';
import { getOverallProgress, calcMemorizationRate } from '../lib/algorithm';
import { Card, ProgressBar, Badge, Button } from '../ui';
import GazelleIcon from './GazelleIcon';

interface Props {
  state: AppState;
  onSelectPoem: (poem: Poem) => void;
  onAddPoem: () => void;
}

/**
 * شاشة اختيار القصيدة لتحدي فطين
 *
 * تعرض:
 * 1. عنوان «تحدي فطين»
 * 2. وصف قصير جدًا لفكرة التحدي
 * 3. قائمة القصائد الموجودة في التطبيق
 *
 * لا تبدأ الجولة هنا — عند اختيار قصيدة تُفتح شاشة فطين
 * التي تبدأ برسالتها الافتتاحية قبل أي سؤال.
 */
export default function FateenSelectPoem({ state, onSelectPoem, onAddPoem }: Props) {
  const { poems, stats } = state;
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? poems.filter(
        p =>
          p.title.includes(search.trim()) ||
          p.poet.includes(search.trim())
      )
    : poems;

  // القصائد الصالحة للتحدي = التي لها بيت واحد على الأقل
  const eligible = filtered.filter(p => p.verses.length > 0);

  return (
    <div className="max-w-3xl mx-auto py-8 lg:py-12">
      {/* ═══ العنوان ═══ */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
            <GazelleIcon size={24} className="text-[var(--accent)]" />
          </div>
          <div>
            <h2
              className="text-xl font-bold text-[var(--text-0)] mb-1.5"
            >
              تحدي 
            </h2>
            <p className="textفطين-sm text-[var(--text-2)] leading-6" >
              كلمةٌ واحدة من كل بيت... فهل تستحضرين البيت كاملًا؟
            </p>
          </div>
        </div>
      </div>

      {/* ═══ شرح الفكرة (مختصر جدًا) ═══ */}
      <Card className="p-4 mb-6">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[var(--bg-3)] text-[var(--text-2)] text-[10px] font-semibold shrink-0 mt-0.5">
              ١
            </span>
            <p className="text-[12px] text-[var(--text-1)] leading-6">
              يختار <span className="font-bold text-[var(--text-0)]">فطين</span> أبيات قصيدتك على غير ترتيب
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[var(--bg-3)] text-[var(--text-2)] text-[10px] font-semibold shrink-0 mt-0.5">
              ٢
            </span>
            <p className="text-[12px] text-[var(--text-1)] leading-6">
              يعطيكِ من كل بيت كلمةً واحدة فقط
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[var(--bg-3)] text-[var(--text-2)] text-[10px] font-semibold shrink-0 mt-0.5">
              ٣
            </span>
            <p className="text-[12px] text-[var(--text-1)] leading-6">
              عليكِ أن تستحضري البيت كاملًا من الذاكرة
            </p>
          </div>
        </div>
      </Card>

      {/* ═══ حالة: لا توجد قصائد ═══ */}
      {poems.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-2)] flex items-center justify-center mx-auto mb-4">
            <BookOpen size={20} className="text-[var(--text-3)]" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-[var(--text-1)] mb-1">لا توجد قصائد بعد</p>
          <p className="text-xs text-[var(--text-3)] mb-6">
            أضيفي قصيدة أولًا ليبدأ <span className="font-bold text-[var(--text-1)]">فطين</span> تحديه
          </p>
          <Button variant="primary" onClick={onAddPoem} className="!px-[30px]">
            <Plus size={16} strokeWidth={3} />
            إضافة قصيدة
          </Button>
        </div>
      ) : (
        <>
          {/* ═══ عنوان القائمة + بحث ═══ */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-medium text-[var(--text-1)]">
              اختاري قصيدة للتحدي
              <span className="text-[var(--text-3)] font-normal mr-1.5">({eligible.length})</span>
            </h3>
          </div>

          {poems.length > 4 && (
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحثي بالعنوان أو اسم الشاعر..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-1)] bg-[var(--glass-bg)] backdrop-blur-[8px] text-[var(--text-0)] text-sm placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors duration-150 outline-none "
              />
            </div>
          )}

          {/* ═══ قائمة القصائد ═══ */}
          {eligible.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-[var(--text-2)]">لا توجد قصيدة مطابقة</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {eligible.map(poem => {
                const pStats = stats[poem.id];
                const progress = pStats
                  ? getOverallProgress(pStats.verses, poem.verses.length)
                  : null;
                const memorizationRate = pStats
                  ? calcMemorizationRate(pStats.verses, poem.verses.length)
                  : 0;
                const hasMemorized = progress
                  ? progress.medium + progress.strong + progress.mastered > 0
                  : false;

                return (
                  <Card
                    key={poem.id}
                    hover
                    className="p-4"
                    onClick={() => onSelectPoem(poem)}
                  >
                    <div className="flex items-center gap-4">
                      {/* أيقونة الغزال الصغيرة */}
                      <div className="w-9 h-9 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
                        <GazelleIcon size={18} className="text-[var(--accent)]" />
                      </div>

                      {/* المعلومات */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h4 className="text-sm font-medium text-[var(--text-0)] truncate">
                            {poem.title}
                          </h4>
                          {hasMemorized ? (
                            <Badge variant="success">حفظتِ {memorizationRate}%</Badge>
                          ) : (
                            <Badge variant="default">لم تبدئي حفظها</Badge>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-2)] mb-2">
                          {poem.poet} · {poem.verses.length} بيت ·{' '}
                          {poem.verses.length} سؤال
                        </p>

                        {/* معاينة أول بيت */}
                        {poem.verses[0] && (
                          <p
                            className="text-[11px] text-[var(--text-3)] truncate leading-loose"
                            style={{ fontFamily: 'var(--font-poem)' }}
                          >
                            {poem.verses[0].sadr}
                          </p>
                        )}
                      </div>

                      {/* الزر */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline text-xs text-[var(--accent-text)] font-medium">
                          ابدئي التحدي
                        </span>
                        <ChevronLeft size={15} className="text-[var(--text-3)]" strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* شريط التقدم */}
                    {progress && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-0)]">
                        <ProgressBar value={memorizationRate} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ═══ إضافة قصيدة جديدة ═══ */}
          <div className="mt-6 pt-6 border-t border-[var(--border-0)] flex items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--text-3)]">
              لا تجدين قصيدتكِ؟ أضيفيها أولًا
            </p>
            <Button variant="ghost" onClick={onAddPoem} className="!px-[30px]">
              <Plus size={16} strokeWidth={3} />
              إضافة قصيدة
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
