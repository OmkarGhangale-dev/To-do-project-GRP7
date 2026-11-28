/**
 * AIPrioritizePanel.tsx
 *
 * Side-by-side AI Priority Analysis comparing Google Gemini and Groq.
 * Displays each model's time taken (speed), accuracy, clarity, summary,
 * and recommended priority ordering with independent Apply controls.
 */

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { useTask } from '../../context/TaskContext';
import { TaskPriority } from '../../types';

interface Recommendation {
  id: string;
  suggestedPriority: 'High' | 'Medium' | 'Low';
  suggestedOrder: number;
  reason: string;
}

interface ProviderPrioritizeResult {
  status: 'success' | 'error';
  model: string;
  responseTimeMs: number | null;
  recommendations: Recommendation[];
  summary: string;
  metrics: {
    speedMs: number;
    accuracy: number;
    clarity: number;
  } | null;
  error: string | null;
}

const priorityColors: Record<string, { bg: string; text: string }> = {
  High: { bg: 'bg-[#FEF5E5] dark:bg-amber-950/50', text: 'text-[#FFAE1F] dark:text-amber-300' },
  Medium: { bg: 'bg-[#ECF2FF] dark:bg-blue-950/50', text: 'text-[#5D87FF] dark:text-blue-300' },
  Low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' },
};

export const AIPrioritizePanel: React.FC = () => {
  const { tasks, updateTask } = useTask();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiResult, setGeminiResult] = useState<ProviderPrioritizeResult | null>(null);
  const [groqResult, setGroqResult] = useState<ProviderPrioritizeResult | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [appliedGemini, setAppliedGemini] = useState<Set<string>>(new Set());
  const [appliedGroq, setAppliedGroq] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [hasRun, setHasRun] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status !== 'Completed');

  const runAnalysis = useCallback(async () => {
    if (pendingTasks.length === 0) {
      setError('No pending tasks to analyse.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeminiResult(null);
    setGroqResult(null);
    setEmptyMessage('');
    setAppliedGemini(new Set());
    setAppliedGroq(new Set());

    try {
      const payload = pendingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate || null,
        priority: t.priority,
        status: t.status,
        category: t.category,
      }));

      const res = await api.aiComparePrioritizeTasks(payload);

      if (res.success && res.data) {
        if (res.data.empty) {
          setEmptyMessage(res.data.message || 'All tasks are completed.');
        } else {
          setGeminiResult(res.data.gemini);
          setGroqResult(res.data.groq);
        }
        setHasRun(true);
        setExpanded(true);
      } else {
        setError('AI analysis returned no data. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run AI analysis. Check your connection and API keys.');
    } finally {
      setLoading(false);
    }
  }, [pendingTasks]);

  const applyRecommendation = async (
    provider: 'gemini' | 'groq',
    rec: Recommendation
  ) => {
    const appliedSet = provider === 'gemini' ? appliedGemini : appliedGroq;
    const setApplied = provider === 'gemini' ? setAppliedGemini : setAppliedGroq;

    if (appliedSet.has(rec.id)) return;
    const task = tasks.find((t) => t.id === rec.id);
    if (!task) return;

    if (task.priority !== rec.suggestedPriority) {
      await updateTask(rec.id, { priority: rec.suggestedPriority as TaskPriority });
    }
    setApplied((prev) => new Set(prev).add(rec.id));
  };

  const applyAll = async (provider: 'gemini' | 'groq', recs: Recommendation[]) => {
    for (const rec of recs) {
      await applyRecommendation(provider, rec);
    }
  };

  const getTaskTitle = (id: string) => {
    return tasks.find((t) => t.id === id)?.title || id;
  };

  const renderProviderColumn = (
    label: string,
    provider: 'gemini' | 'groq',
    result: ProviderPrioritizeResult
  ) => {
    const isGemini = provider === 'gemini';
    const appliedSet = isGemini ? appliedGemini : appliedGroq;
    const headerBg = isGemini
      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800/50'
      : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800/50';
    const modelBadge = isGemini
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300';

    return (
      <div className="rounded-xl border border-[#EEF2F6] dark:border-slate-700/70 bg-white dark:bg-slate-900/40 overflow-hidden flex flex-col">
        {/* Column Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${headerBg}`}>
          <div className="flex items-center gap-2 min-w-0">
            {isGemini ? (
              <Sparkles className="w-3.5 h-3.5 text-[#5D87FF] shrink-0" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-[#FFAE1F] shrink-0" />
            )}
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {label}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono truncate ${modelBadge}`}>
              {result.model}
            </span>
          </div>

          {result.status === 'success' && result.responseTimeMs !== null ? (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
              {(result.responseTimeMs / 1000).toFixed(2)}s
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-rose-500 shrink-0">Failed</span>
          )}
        </div>

        {/* Column Body */}
        <div className="p-4 flex-1 flex flex-col">
          {result.status === 'error' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
              <AlertCircle className="w-5 h-5 text-rose-500 mb-1.5" />
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                {label} Error
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 leading-relaxed">
                {result.error}
              </p>
            </div>
          ) : (
            <>
              {/* Metrics strip */}
              {result.metrics && (
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/50 mb-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      Speed
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {(result.metrics.speedMs / 1000).toFixed(2)}s ({result.metrics.speedMs}ms)
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      Accuracy
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {result.metrics.accuracy.toFixed(1)} / 10
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      Clarity
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {result.metrics.clarity.toFixed(1)} / 10
                    </span>
                  </div>
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed border-l-2 border-[#5D87FF] pl-3">
                  {result.summary}
                </p>
              )}

              {/* Recommendations list */}
              <div className="space-y-2 mb-3 flex-1">
                {result.recommendations.map((rec, idx) => {
                  const pc = priorityColors[rec.suggestedPriority] || priorityColors.Medium;
                  const isApplied = appliedSet.has(rec.id);
                  const currentTask = tasks.find((t) => t.id === rec.id);
                  const priorityChanged =
                    currentTask && currentTask.priority !== rec.suggestedPriority;

                  return (
                    <div
                      key={rec.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[#EEF2F6] dark:border-slate-700/60 bg-[#FBFBFE] dark:bg-slate-800/40"
                    >
                      <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {getTaskTitle(rec.id)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pc.bg} ${pc.text}`}>
                            {rec.suggestedPriority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>

                      {priorityChanged ? (
                        <button
                          onClick={() => applyRecommendation(provider, rec)}
                          disabled={isApplied}
                          className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            isApplied
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 cursor-default'
                              : 'bg-[#ECF2FF] dark:bg-blue-950/60 text-[#5D87FF] hover:bg-blue-100 dark:hover:bg-blue-900/40'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          {isApplied ? 'Applied' : 'Apply'}
                        </button>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-400 mt-0.5">
                          Same
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Apply All button */}
              {result.recommendations.some(
                (rec) =>
                  !appliedSet.has(rec.id) &&
                  tasks.find((t) => t.id === rec.id)?.priority !== rec.suggestedPriority
              ) && (
                <button
                  onClick={() => applyAll(provider, result.recommendations)}
                  className="w-full py-2 text-xs font-semibold text-[#5D87FF] border border-[#5D87FF]/30 rounded-xl hover:bg-[#ECF2FF] dark:hover:bg-blue-950/40 transition-colors"
                >
                  Apply All {label} Suggestions
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="spike-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-[#EEF2F6] dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#ECF2FF] dark:bg-blue-950/60 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#5D87FF]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              AI Priority Analysis — Gemini vs Groq
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Compare priority rankings side by side with speed, accuracy, and clarity scores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasRun && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading || pendingTasks.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5D87FF] hover:bg-[#4570EA] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Comparing…' : hasRun ? 'Re-analyse Side-by-Side' : 'Analyse Side-by-Side'}
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-5">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[0, 1].map((col) => (
                <div key={col} className="p-4 rounded-xl border border-[#EEF2F6] dark:border-slate-800 space-y-2.5">
                  <div className="h-6 w-1/2 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-12 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-12 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-12 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && !hasRun && (
            <div className="py-6 text-center text-xs text-slate-400">
              {pendingTasks.length === 0
                ? 'All tasks are completed — nothing to analyse.'
                : 'Click "Analyse Side-by-Side" to compare Google Gemini and Groq priority recommendations.'}
            </div>
          )}

          {!loading && hasRun && emptyMessage && (
            <div className="py-4 text-center text-xs text-slate-400">
              {emptyMessage}
            </div>
          )}

          {!loading && hasRun && geminiResult && groqResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderProviderColumn('Google Gemini', 'gemini', geminiResult)}
              {renderProviderColumn('Groq', 'groq', groqResult)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
