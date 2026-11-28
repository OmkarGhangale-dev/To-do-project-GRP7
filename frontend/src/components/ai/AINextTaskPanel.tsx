/**
 * AINextTaskPanel.tsx
 *
 * "What Should I Do Next?" — Side-by-side comparison between Google Gemini and Groq.
 * Displays each model's recommendation, time taken (speed), accuracy, and clarity.
 */

import React, { useState, useCallback } from 'react';
import { Target, RefreshCw, AlertCircle, Zap, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useTask } from '../../context/TaskContext';

interface NextTaskRec {
  id: string;
  title: string;
  reason: string;
  urgencyScore: number;
}

interface ProviderNextTaskResult {
  status: 'success' | 'error';
  model: string;
  responseTimeMs: number | null;
  recommendation: NextTaskRec | null;
  metrics: {
    speedMs: number;
    accuracy: number;
    clarity: number;
  } | null;
  error: string | null;
}

function UrgencyBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? '#FA896B' : score >= 5 ? '#FFAE1F' : '#13DEB9';

  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-[10px] font-semibold text-slate-400 w-16 shrink-0">
        Urgency {score}/10
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MetricsStrip({
  metrics,
}: {
  metrics: { speedMs: number; accuracy: number; clarity: number };
}) {
  return (
    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/50 mb-3">
      <div>
        <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
          Speed
        </span>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {(metrics.speedMs / 1000).toFixed(2)}s ({metrics.speedMs}ms)
        </span>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
          Accuracy
        </span>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
          {metrics.accuracy.toFixed(1)} / 10
        </span>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
          Clarity
        </span>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
          {metrics.clarity.toFixed(1)} / 10
        </span>
      </div>
    </div>
  );
}

export const AINextTaskPanel: React.FC = () => {
  const { tasks } = useTask();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiResult, setGeminiResult] = useState<ProviderNextTaskResult | null>(null);
  const [groqResult, setGroqResult] = useState<ProviderNextTaskResult | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status !== 'Completed');

  const runComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGeminiResult(null);
    setGroqResult(null);
    setEmptyMessage('');

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

      const res = await api.aiCompareNextTask(payload);

      if (res.success && res.data) {
        if (res.data.empty) {
          setEmptyMessage(res.data.message || 'All tasks are completed!');
        } else {
          setGeminiResult(res.data.gemini);
          setGroqResult(res.data.groq);
        }
        setHasRun(true);
      } else {
        setError('AI comparison returned no data. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendations. Check your backend and API keys.');
    } finally {
      setLoading(false);
    }
  }, [pendingTasks]);

  const renderProviderCard = (
    label: string,
    provider: 'gemini' | 'groq',
    result: ProviderNextTaskResult
  ) => {
    const isGemini = provider === 'gemini';
    const headerBg = isGemini
      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800/50'
      : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800/50';
    const modelBadge = isGemini
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300';

    const rec = result.recommendation;
    const matchedTask = rec ? tasks.find((t) => t.id === rec.id) : null;

    return (
      <div className="rounded-xl border border-[#EEF2F6] dark:border-slate-700/70 bg-white dark:bg-slate-900/40 overflow-hidden flex flex-col">
        {/* Provider header */}
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

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col">
          {result.status === 'error' || !rec ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
              <AlertCircle className="w-5 h-5 text-rose-500 mb-1.5" />
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                {label} Error
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 leading-relaxed">
                {result.error || 'No recommendation returned.'}
              </p>
            </div>
          ) : (
            <>
              {result.metrics && <MetricsStrip metrics={result.metrics} />}

              <div className="p-3.5 rounded-xl border border-[#EEF2F6] dark:border-slate-700/60 bg-[#FBFBFE] dark:bg-slate-800/40 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {rec.title || matchedTask?.title}
                    </h4>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  </div>

                  {matchedTask && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {matchedTask.category}
                      </span>
                      {matchedTask.dueDate && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Due {matchedTask.dueDate}
                          </span>
                        </>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          matchedTask.priority === 'High' || matchedTask.priority === 'Urgent'
                            ? 'bg-[#FEF5E5] dark:bg-amber-950/50 text-[#FFAE1F] dark:text-amber-300'
                            : matchedTask.priority === 'Medium'
                            ? 'bg-[#ECF2FF] dark:bg-blue-950/50 text-[#5D87FF] dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {matchedTask.priority}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                    {rec.reason}
                  </p>
                </div>

                <UrgencyBar score={rec.urgencyScore} />
              </div>
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
          <div className="w-7 h-7 rounded-lg bg-[#E6FFFA] dark:bg-emerald-950/60 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-[#13DEB9]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              What Should I Do Next? — Gemini vs Groq
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Compare side-by-side recommendations with speed, accuracy, and clarity scores
            </p>
          </div>
        </div>

        <button
          onClick={runComparison}
          disabled={loading || pendingTasks.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#13DEB9] hover:bg-[#0bc5a3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Comparing…' : hasRun ? 'Refresh Comparison' : 'Compare Next Task'}
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1].map((col) => (
              <div key={col} className="p-4 rounded-xl border border-[#EEF2F6] dark:border-slate-800 space-y-2.5">
                <div className="h-6 w-1/2 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-10 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-20 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && !hasRun && (
          <div className="py-6 text-center text-xs text-slate-400">
            {pendingTasks.length === 0
              ? 'All tasks are complete — nothing pending.'
              : 'Click "Compare Next Task" to see Google Gemini and Groq recommendations side by side.'}
          </div>
        )}

        {!loading && hasRun && emptyMessage && (
          <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </div>
        )}

        {!loading && hasRun && geminiResult && groqResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderProviderCard('Google Gemini', 'gemini', geminiResult)}
            {renderProviderCard('Groq', 'groq', groqResult)}
          </div>
        )}
      </div>
    </div>
  );
};
