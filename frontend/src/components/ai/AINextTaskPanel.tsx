/**
 * AINextTaskPanel.tsx
 *
 * "What Should I Do Next?" — recommends the single best task to focus on
 * right now, based on the user's actual pending tasks.
 *
 * Visual style: matches the existing Spike dashboard cards.
 * No decorative robot illustrations, gradients or glow effects.
 */

import React, { useState, useCallback } from 'react';
import { Target, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useTask } from '../../context/TaskContext';

interface NextTaskRec {
  id: string;
  title: string;
  reason: string;
  urgencyScore: number;
}

function UrgencyBar({ score }: { score: number }) {
  // 1-10 → visual bar width, colour coded
  const pct = (score / 10) * 100;
  const color =
    score >= 8 ? '#FA896B' : score >= 5 ? '#FFAE1F' : '#13DEB9';

  return (
    <div className="flex items-center gap-2 mt-2">
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

export const AINextTaskPanel: React.FC = () => {
  const { tasks } = useTask();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<NextTaskRec | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status !== 'Completed');

  const runRecommendation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRec(null);
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

      const res = await api.aiGetNextTask(payload);

      if (res.success && res.data) {
        setRec(res.data.recommendation);
        setEmptyMessage(res.data.message || '');
        setHasRun(true);
      } else {
        setError('AI returned no recommendation. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendation. Check your backend and API key.');
    } finally {
      setLoading(false);
    }
  }, [pendingTasks]);

  const recommendedTask = rec ? tasks.find((t) => t.id === rec.id) : null;

  return (
    <div className="spike-card">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#EEF2F6] dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#E6FFFA] dark:bg-emerald-950/60 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-[#13DEB9]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              What Should I Do Next?
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              AI recommends the best task for right now
            </p>
          </div>
        </div>

        <button
          onClick={runRecommendation}
          disabled={loading || pendingTasks.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13DEB9] hover:bg-[#0bc5a3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Thinking…' : hasRun ? 'Refresh' : 'Get Suggestion'}
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2.5">
            <div className="h-5 w-2/3 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-3 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-3 w-4/5 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !hasRun && (
          <div className="py-6 text-center text-xs text-slate-400">
            {pendingTasks.length === 0
              ? 'All tasks are complete — nothing pending.'
              : 'Click "Get Suggestion" for a personalised recommendation.'}
          </div>
        )}

        {/* All done */}
        {!loading && hasRun && !rec && (
          <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
            {emptyMessage || 'All tasks are completed. Great work!'}
          </div>
        )}

        {/* Recommendation */}
        {!loading && rec && (
          <div className="p-4 rounded-xl border border-[#EEF2F6] dark:border-slate-700/60 bg-[#FBFBFE] dark:bg-slate-800/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {rec.title || recommendedTask?.title}
                </h4>

                {recommendedTask && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-400">
                      {recommendedTask.category}
                    </span>
                    {recommendedTask.dueDate && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          Due {recommendedTask.dueDate}
                        </span>
                      </>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        recommendedTask.priority === 'High' || recommendedTask.priority === 'Urgent'
                          ? 'bg-[#FEF5E5] dark:bg-amber-950/50 text-[#FFAE1F] dark:text-amber-300'
                          : recommendedTask.priority === 'Medium'
                          ? 'bg-[#ECF2FF] dark:bg-blue-950/50 text-[#5D87FF] dark:text-blue-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {recommendedTask.priority}
                    </span>
                  </div>
                )}
              </div>

              <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
              {rec.reason}
            </p>

            <UrgencyBar score={rec.urgencyScore} />
          </div>
        )}
      </div>
    </div>
  );
};
