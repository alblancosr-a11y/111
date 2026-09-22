"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Poem, VerseStats, ErrorLogEntry, SuccessLogEntry, SessionSource } from './lib/types';
import { useAppState } from './hooks/useAppState';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PoemsPage from './components/PoemsPage';
import AddPoemModal from './components/AddPoemModal';
import SessionStartModal from './components/SessionStartModal';
import SessionView from './components/SessionView';
import ReadingView from './components/ReadingView';
import StatsView from './components/StatsView';
import SettingsPanel from './components/SettingsPanel';
import TodaySessionView from './components/TodaySessionView';
import ErrorLogView from './components/ErrorLogView';
import FateenChallengeView from './components/FateenChallengeView';
import FateenSelectPoem from './components/FateenSelectPoem';
import { Button, Card } from './ui';
import { AlertCircle, ChevronLeft } from 'lucide-react';

type Page = 'home' | 'poems' | 'session' | 'stats' | 'settings' | 'fateen';
type Modal =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; poem: Poem }
  | { type: 'session_start'; poem: Poem }
  | {
      type: 'session';
      poem: Poem;
      mode: 'cumulative' | 'chain' | 'continue_from' | 'where_am_i' | 'review' | 'weak_verses';
      source?: SessionSource;
      startFromVerse?: number;
      newVerseIndex?: number;
      segmentIndex?: number;
      weakVerseIndex?: number;
    }
  | { type: 'reading'; poem: Poem }
  | { type: 'stats'; poem: Poem }
  | { type: 'settings' }
  | { type: 'delete_confirm'; poem: Poem }
  | { type: 'error_log' }
  | { type: 'fateen'; poem: Poem };

export default function App() {
  const {
    state,
    updateSettings,
    addPoem,
    updatePoem,
    deletePoem,
    updateVerseStats,
    updateSessionStats,
    updateCurrentVerse,
    setActiveSession,
    addErrorLogEntry,
    addSuccessLogEntry,
  } = useAppState();
  const [page, setPage] = useState<Page>('home');
  const [modal, setModal] = useState<Modal>({ type: 'none' });

  // Dark mode
  useEffect(() => {
    if (!state) return;
    document.body.classList.toggle('dark', state.settings.darkMode);
  }, [state?.settings.darkMode]);

  const handleAddPoem = useCallback((poem: Poem) => { addPoem(poem); }, [addPoem]);
  const handleEditPoem = useCallback((poem: Poem) => { updatePoem(poem); }, [updatePoem]);
  const handleDeletePoem = useCallback(
    (poemId: string) => {
      deletePoem(poemId);
      setModal({ type: 'none' });
    },
    [deletePoem]
  );

  const handleStartSession = useCallback(
    (
      poem: Poem,
      mode: 'cumulative' | 'chain' | 'continue_from' | 'where_am_i' | 'review' | 'weak_verses',
      opts?: { startFromVerse?: number; newVerseIndex?: number; segmentIndex?: number; weakVerseIndex?: number; source?: SessionSource }
    ) => {
      setActiveSession(poem.id);
      setModal({
        type: 'session',
        poem,
        mode,
        source: opts?.source,
        startFromVerse: opts?.startFromVerse,
        newVerseIndex: opts?.newVerseIndex,
        segmentIndex: opts?.segmentIndex,
        weakVerseIndex: opts?.weakVerseIndex,
      });
    },
    [setActiveSession]
  );

  const handleVerseUpdate = useCallback(
    (poemId: string, vs: VerseStats) => {
      updateVerseStats(poemId, vs);
    },
    [updateVerseStats]
  );

  const handleSessionComplete = useCallback(
    (poemId: string, correct: number, errors: number) => {
      updateSessionStats(poemId, correct, errors);
      setActiveSession(null);
      setModal({ type: 'none' });
    },
    [updateSessionStats, setActiveSession]
  );

  const handleCurrentVerseUpdate = useCallback(
    (poemId: string, idx: number, markCompleted = false) => {
      updateCurrentVerse(poemId, idx, markCompleted);
    },
    [updateCurrentVerse]
  );

  const handleErrorLog = useCallback(
    (entry: ErrorLogEntry) => { addErrorLogEntry(entry); },
    [addErrorLogEntry]
  );

  const handleSuccessLog = useCallback(
    (entry: SuccessLogEntry) => { addSuccessLogEntry(entry); },
    [addSuccessLogEntry]
  );

  const openStudy = useCallback((poem: Poem) => {
    setModal({ type: 'session_start', poem });
  }, []);

  // فتح بيت ضعيف من جلسة اليوم
  const handleStartWeakVerse = useCallback((poem: Poem, verseIndex: number) => {
    const latestPoem = state?.poems.find(p => p.id === poem.id) || poem;
    handleStartSession(latestPoem, 'weak_verses', {
      weakVerseIndex: verseIndex,
      source: 'today_session',
    });
  }, [state, handleStartSession]);

  // فتح بيت تراكمي من جلسة اليوم
  const handleStartCumulative = useCallback((poem: Poem, verseIndex: number) => {
    const latestPoem = state?.poems.find(p => p.id === poem.id) || poem;
    handleStartSession(latestPoem, 'cumulative', {
      startFromVerse: verseIndex,
      source: 'today_session',
    });
  }, [state, handleStartSession]);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-0)]">
        <p className="text-sm text-[var(--text-3)]">جارٍ التحميل...</p>
      </div>
    );
  }

  const { poems, stats, settings } = state;

  const getLatestPoem = (p: Poem) => poems.find(item => item.id === p.id) || p;

  const renderPage = () => {
    switch (page) {
      case 'home':
        return (
          <Dashboard
            state={state}
            onStudy={openStudy}
            onNavigate={p => setPage(p as Page)}
            todaySection={
              <TodaySessionView
                state={state}
                onStudy={openStudy}
                onStartWeakVerse={handleStartWeakVerse}
                onStartCumulative={handleStartCumulative}
              />
            }
          />
        );

      case 'poems':
        return (
          <PoemsPage
            state={state}
            onAdd={() => setModal({ type: 'add' })}
            onStudy={openStudy}
            onRead={poem => setModal({ type: 'reading', poem })}
            onStats={poem => setModal({ type: 'stats', poem })}
            onDelete={poem => setModal({ type: 'delete_confirm', poem })}
          />
        );
      case 'fateen':
        return (
          <FateenSelectPoem
            state={state}
            onSelectPoem={poem => setModal({ type: 'fateen', poem })}
            onAddPoem={() => setModal({ type: 'add' })}
          />
        );
      case 'stats':
        return (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-[var(--text-0)]">الإحصائيات</h2>
                <p className="text-xs text-[var(--text-3)] font-medium">
                  {poems.length} قصيدة · إجمالي الجلسات:{' '}
                  {Object.values(stats).reduce((s, p) => s + p.totalSessions, 0)}
                </p>
              </div>
              <button
                onClick={() => setModal({ type: 'error_log' })}
                className="flex items-center gap-1 !px-5 py-2 rounded-xl border border-[var(--border-0)] bg-[var(--bg-2)] text-xs font-bold text-[var(--text-2)] hover:text-[var(--text-0)] transition-all"
              >
                <AlertCircle size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">سجل الأخطاء</span>
                <span className="tabular-nums">({state.errorLog.length})</span>
              </button>
            </div>
            {poems.length === 0 ? (
              <Card className="p-10 text-center text-sm text-[var(--text-3)] font-medium">أضيفي قصيدة أولًا لرؤية الإحصائيات</Card>
            ) : (
              <div className="flex flex-col gap-3">
                {poems.map(poem => (
                  <Card
                    key={poem.id}
                    hover
                    className="p-4 flex items-center justify-between gap-4"
                    onClick={() => setModal({ type: 'stats', poem })}
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <p className="font-bold text-[var(--text-0)] text-sm truncate">{poem.title}</p>
                      <p className="text-xs text-[var(--text-3)] truncate">
                        {poem.poet} · {stats[poem.id]?.totalSessions || 0} جلسة
                      </p>
                    </div>
                    <ChevronLeft size={16} className="text-[var(--text-3)] opacity-40" />
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="flex flex-col gap-6">
            <div className="px-1 flex flex-col gap-1">
              <h2 className="text-lg font-bold text-[var(--text-0)]">الإعدادات</h2>
              <p className="text-xs text-[var(--text-3)] font-medium">تُحفظ تفضيلاتك تلقائيًا في المتصفح</p>
            </div>
            <div className="flex flex-col gap-0 divide-y divide-[var(--border-0)] glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-[var(--text-0)]">الوضع الليلي</p>
                  <p className="text-[11px] text-[var(--text-3)]">تصميم داكن مريح للعينين</p>
                </div>
                <button
                  onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                  className={`relative inline-flex w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${
                    settings.darkMode ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'
                  }`}
                >
                  <span
                    className={`absol
                      ute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                      settings.darkMode ? 'right-0.5' : 'right-auto left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-[var(--text-0)]">حجم الخط</p>
                  <p className="text-[11px] text-[var(--text-3)]">حجم نص الأبيات</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(s => (
                    <button
                      key={s}
                      onClick={() => updateSettings({ fontSize: s })}
                      className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                        settings.fontSize === s
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-2)] text-[var(--text-2)]'
                      }`}
                    >
                      {s === 1 ? 'ص' : s === 2 ? 'م' : 'ك'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-[var(--text-0)]">التشكيل إلزامي</p>
                  <p className="text-[11px] text-[var(--text-3)]">مطابقة التشكيل في الاختبارات</p>
                </div>
                <button
                  onClick={() => updateSettings({ requireTashkeel: !settings.requireTashkeel })}
                  className={`relative inline-flex w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${
                    settings.requireTashkeel ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                      settings.requireTashkeel ? 'right-0.5' : 'right-auto left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-[var(--text-0)]">أرقام الأبيات</p>
                  <p className="text-[11px] text-[var(--text-3)]">إظهار رقم البيت في وضع القراءة</p>
                </div>
                <button
                  onClick={() => updateSettings({ showVerseNumbers: !settings.showVerseNumbers })}
                  className={`relative inline-flex w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${
                    settings.showVerseNumbers ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                      settings.showVerseNumbers ? 'right-0.5' : 'right-auto left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-[var(--text-0)]">سرعة القراءة</p>
                  <p className="text-[11px] text-[var(--text-3)]">{settings.speechRate}x</p>
                </div>
                <input
                  type="range" min="0.5" max="1.5" step="0.1"
                  value={settings.speechRate}
                  onChange={e => updateSettings({ speechRate: Number(e.target.value) })}
                  className="w-20 accent-[var(--accent)]"
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-[var(--text-0)]">نبرة الصوت</p>
                  <p className="text-[11px] text-[var(--text-3)]">{settings.speechPitch}</p>
                </div>
                <input
                  type="range" min="0.5" max="2" step="0.1"
                  value={settings.speechPitch}
                  onChange={e => updateSettings({ speechPitch: Number(e.target.value) })}
                  className="w-20 accent-[var(--accent)]"
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      darkMode={settings.darkMode}
      onToggleDark={() => updateSettings({ darkMode: !settings.darkMode })}
    >
      {renderPage()}

      {/* ===== Modal: Add/Edit Poem ===== */}
      {(modal.type === 'add' || modal.type === 'edit') && (
        <AddPoemModal
          onClose={() => setModal({ type: 'none' })}
          onAdd={modal.type === 'add' ? handleAddPoem : handleEditPoem}
          editPoem={modal.type === 'edit' ? modal.poem : undefined}
        />
      )}

      {/* ===== Modal: Session Start ===== */}
      {modal.type === 'session_start' && (
        <SessionStartModal
          poem={getLatestPoem(modal.poem)}
          stats={stats[modal.poem.id]}
          onStart={(mode, opts) => {
            if (mode === 'fateen') {
              setModal({ type: 'fateen', poem: getLatestPoem(modal.poem) });
            } else {
              handleStartSession(getLatestPoem(modal.poem), mode, opts);
            }
          }}
          onFateen={() => setModal({ type: 'fateen', poem: getLatestPoem(modal.poem) })}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {/* ===== Modal: Session ===== */}
      {modal.type === 'session' && (
        <SessionView
          poem={getLatestPoem(modal.poem)}
          stats={stats[modal.poem.id]}
          settings={settings}
          mode={modal.mode}
          source={modal.source}
          startFromVerse={modal.startFromVerse}
          newVerseIndex={modal.newVerseIndex}
          segmentIndex={modal.segmentIndex}
          weakVerseIndex={modal.weakVerseIndex}
          onClose={() => {
            setActiveSession(null);
            setModal({ type: 'none' });
          }}
          onVerseUpdate={handleVerseUpdate}
          onSessionComplete={handleSessionComplete}
          onCurrentVerseUpdate={handleCurrentVerseUpdate}
          onErrorLog={handleErrorLog}
          onSuccessLog={handleSuccessLog}
        />
      )}

      {/* ===== Modal: Reading ===== */}
      {modal.type === 'reading' && (
        <ReadingView
          poem={getLatestPoem(modal.poem)}
          stats={stats[modal.poem.id]}
          settings={settings}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {/* ===== Modal: Stats ===== */}
      {modal.type === 'stats' && (
        <StatsView
          poem={getLatestPoem(modal.poem)}
          stats={stats[modal.poem.id]}
          errorLog={state.errorLog}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {/* ===== Modal: Settings ===== */}
      {modal.type === 'settings' && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {/* ===== Modal: Delete Confirm ===== */}
      {modal.type === 'delete_confirm' && (
        <div className="modal-overlay" onClick={() => setModal({ type: 'none' })}>
          <div
            className="w-full max-w-sm glass-modal rounded-xl p-6 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[var(--text-0)] mb-2">حذف القصيدة</h3>
            <p className="text-xs text-[var(--text-2)] mb-6">
              هل تريدين حذف «{modal.poem.title}»؟ لن يمكن التراجع.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setModal({ type: 'none' })}>إلغاء</Button>
              <Button variant="danger" size="sm" onClick={() => handleDeletePoem(modal.poem.id)}>حذف</Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: Error Log ===== */}
      {modal.type === 'error_log' && (
        <ErrorLogView
          errorLog={state.errorLog}
          successLog={state.successLog}
          poems={poems}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {/* ===== Modal: Fateen Challenge ===== */}
      {modal.type === 'fateen' && (
        <FateenChallengeView
          poem={getLatestPoem(modal.poem)}
          settings={settings}
          poemStats={stats[modal.poem.id]}
          onClose={() => setModal({ type: 'none' })}
          onVerseUpdate={handleVerseUpdate}
          onErrorLog={handleErrorLog}
          onSuccessLog={handleSuccessLog}
        />
      )}
    </Layout>
  );
}
