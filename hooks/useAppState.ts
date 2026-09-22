"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppState, Poem, VerseStats, AppSettings, ErrorLogEntry, SuccessLogEntry } from '../lib/types';
import { loadState, saveState, defaultPoemStats } from '../lib/storage';

export function useAppState() {
  const [state, setStateInternal] = useState<AppState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loaded = loadState();
    setStateInternal(loaded);
  }, []);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateInternal(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveState(next);
      }, 300);
      return next;
    });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  }, [setState]);

  const addPoem = useCallback((poem: Poem) => {
    setState(prev => ({
      ...prev,
      poems: [...prev.poems, poem],
      stats: { ...prev.stats, [poem.id]: defaultPoemStats(poem.id) },
    }));
  }, [setState]);

  const updatePoem = useCallback((poem: Poem) => {
    setState(prev => ({
      ...prev,
      poems: prev.poems.map(p => p.id === poem.id ? poem : p),
    }));
  }, [setState]);

  const deletePoem = useCallback((poemId: string) => {
    setState(prev => {
      const stats = { ...prev.stats };
      delete stats[poemId];
      return {
        ...prev,
        poems: prev.poems.filter(p => p.id !== poemId),
        stats,
        activeSessionPoemId: prev.activeSessionPoemId === poemId ? null : prev.activeSessionPoemId,
        errorLog: prev.errorLog.filter(e => e.poemId !== poemId),
        successLog: prev.successLog.filter(s => s.poemId !== poemId),
      };
    });
  }, [setState]);

  const updateVerseStats = useCallback((poemId: string, verseStats: VerseStats) => {
    setState(prev => {
      const poemStats = prev.stats[poemId] || defaultPoemStats(poemId);
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [poemId]: {
            ...poemStats,
            verses: { ...poemStats.verses, [verseStats.verseIndex]: verseStats },
          },
        },
      };
    });
  }, [setState]);

  const updateSessionStats = useCallback((poemId: string, correct: number, errors: number) => {
    setState(prev => {
      const poemStats = prev.stats[poemId] || defaultPoemStats(poemId);
      const today = new Date().toISOString().split('T')[0];
      const poem = prev.poems.find(p => p.id === poemId);
      const updatedPoem = poem ? {
        ...poem,
        lastSession: Date.now(),
        studyDays: poem.studyDays.includes(today) ? poem.studyDays : [...poem.studyDays, today],
      } : poem;

      return {
        ...prev,
        poems: updatedPoem ? prev.poems.map(p => p.id === poemId ? updatedPoem : p) : prev.poems,
        stats: {
          ...prev.stats,
          [poemId]: {
            ...poemStats,
            totalSessions: poemStats.totalSessions + 1,
            totalCorrect: poemStats.totalCorrect + correct,
            totalErrors: poemStats.totalErrors + errors,
            lastSession: Date.now(),
          },
        },
      };
    });
  }, [setState]);

  const updateCurrentVerse = useCallback((poemId: string, verseIndex: number, markCompleted = false) => {
    setState(prev => ({
      ...prev,
      poems: prev.poems.map(p => {
        if (p.id !== poemId) return p;
        const prevCompleted = p.lastCompletedVerseIndex ?? -1;
        return {
          ...p,
          currentVerseIndex: Math.max(p.currentVerseIndex, verseIndex),
          lastCompletedVerseIndex: markCompleted ? Math.max(prevCompleted, verseIndex) : p.lastCompletedVerseIndex,
        };
      }),
    }));
  }, [setState]);

  const setActiveSession = useCallback((poemId: string | null) => {
    setState(prev => ({ ...prev, activeSessionPoemId: poemId }));
  }, [setState]);

  // ===== سجل الأخطاء =====
  const addErrorLogEntry = useCallback((entry: ErrorLogEntry) => {
    setState(prev => ({
      ...prev,
      errorLog: [...prev.errorLog, entry],
    }));
  }, [setState]);

  const addSuccessLogEntry = useCallback((entry: SuccessLogEntry) => {
    setState(prev => ({
      ...prev,
      successLog: [...prev.successLog, entry],
    }));
  }, [setState]);

  const forceSave = useCallback(() => {
    if (state) saveState(state);
  }, [state]);

  return {
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
    forceSave,
  };
}
