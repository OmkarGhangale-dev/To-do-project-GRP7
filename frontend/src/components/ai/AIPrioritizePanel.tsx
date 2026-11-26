/**
 * AIPrioritizePanel.tsx
 *
 * Displays AI-generated task priority recommendations and suggested ordering.
 * Follows the existing Spike dashboard visual identity — no glassmorphism,
 * gradients, or decorative AI badges. Looks like a native section of the app.
 *
 * Usage: drop into DashboardOverview or MyTasksPage.
 */

import React, { useState, useCallback } from 'react';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useTask } from '../../context/TaskContext';
import { Task, TaskPriority } from '../../types';

interface Recommendation {
  id: string;
  suggestedPriority: 'High' | 'Medium' | 'Low';
  suggestedOrder: number;
  reason: string;
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState('');
  const [applied, setApplied] = useState<Set<string>>(new Set());
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
    setApplied(new Set());

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

      const res = await api.aiPrioritizeTasks(payload);

      if (res.success && res.data) {
        setRecommendations(res.data.recommendations);
        setSummary(res.data.summary);
        setHasRun(true);
        setExpanded(true);
      } else {
        setError('AI analysis returned no data. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run AI analysis. Check your connection and API key.');
    } finally {
      setLoading(false);
    }
  }, [pendingTasks]);

  const applyRecommendation = async (rec: Recommendation) => {
    if (applied.has(rec.id)) return;
    const task = tasks.find((t) => t.id === rec.id);
    if (!task) return;

    // Only update if the AI suggests a different priority
    if (task.priority !== rec.suggestedPriority) {
      await updateTask(rec.id, { priority: rec.suggestedPriority as TaskPriority });
    }
    setApplied((prev) => new Set(prev).add(rec.id));
  };

  const applyAll = async () => {
    for (const rec of recommendations) {
      await applyRecommendation(rec);
    }
  };

  const getTaskTitle = (id: string) => {
    return tasks.find((t) => t.id === id)?.title || id;
  };

  return (
    <div className="spike-card">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#EEF2F6] dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#ECF2FF] dark:bg-blue-950/60 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#5D87FF]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              AI Priority Analysis
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Groq analyses your tasks and suggests priorities
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5D87FF] hover:bg-[#4570EA] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analysing…' : hasRun ? 'Re-analyse' : 'Analyse Tasks'}
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-5">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && !hasRun && (
            <div className="py-6 text-center text-xs text-slate-400">
              {pendingTasks.length === 0
                ? 'All tasks are completed — nothing to analyse.'
                : 'Click "Analyse Tasks" to get AI-powered priority suggestions.'}
            </div>
          )}

          {/* Results */}
          {!loading && hasRun && recommendations.length > 0 && (
            <>
              {summary && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed border-l-2 border-[#5D87FF] pl-3">
                  {summary}
                </p>
              )}

              <div className="space-y-2 mb-4">
                {recommendations.map((rec, idx) => {
                  const pc = priorityColors[rec.suggestedPriority] || priorityColors.Medium;
                  const isApplied = applied.has(rec.id);
                  const currentTask = tasks.find((t) => t.id === rec.id);
                  const priorityChanged =
                    currentTask && currentTask.priority !== rec.suggestedPriority;

                  return (
                    <div
                      key={rec.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#EEF2F6] dark:border-slate-700/60 bg-[#FBFBFE] dark:bg-slate-800/40"
                    >
                      {/* Order badge */}
                      <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {getTaskTitle(rec.id)}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pc.bg} ${pc.text}`}
                          >
                            {rec.suggestedPriority}
                          </span>
                          {priorityChanged && !isApplied && (
                            <span className="text-[10px] text-slate-400">
                              (currently {currentTask?.priority})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>

                      {/* Apply button */}
                      {priorityChanged ? (
                        <button
                          onClick={() => applyRecommendation(rec)}
                          disabled={isApplied}
                          className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
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
                          No change
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Apply all */}
              {recommendations.some(
                (rec) =>
                  !applied.has(rec.id) &&
                  tasks.find((t) => t.id === rec.id)?.priority !== rec.suggestedPriority
              ) && (
                <button
                  onClick={applyAll}
                  className="w-full py-2 text-xs font-semibold text-[#5D87FF] border border-[#5D87FF]/30 rounded-xl hover:bg-[#ECF2FF] dark:hover:bg-blue-950/40 transition-colors"
                >
                  Apply All Suggestions
                </button>
              )}
            </>
          )}

          {!loading && hasRun && recommendations.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-400">
              All tasks are completed or have optimal priorities already.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
