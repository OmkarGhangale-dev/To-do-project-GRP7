/**
 * AIBreakdownPanel.tsx
 *
 * AI Task Breakdown — lets users select one of their pending tasks and
 * generate 3–5 actionable subtasks via Groq. Users review and approve each
 * subtask before it's added. No task data is overwritten automatically.
 *
 * Style: consistent with Spike dashboard card design.
 */

import React, { useState, useCallback } from 'react';
import { Layers, RefreshCw, Plus, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';
import { useTask } from '../../context/TaskContext';

interface Subtask {
  title: string;
  description: string;
  estimatedHours: number;
}

export const AIBreakdownPanel: React.FC = () => {
  const { tasks, addTask } = useTask();

  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [hasRun, setHasRun] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status !== 'Completed');
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const runBreakdown = useCallback(async () => {
    if (!selectedTask) {
      setError('Please select a task to break down.');
      return;
    }

    setLoading(true);
    setError(null);
    setSubtasks([]);
    setApproved(new Set());
    setAdded(new Set());
    setAdding(new Set());

    try {
      const res = await api.aiBreakdownTask({
        id: selectedTask.id,
        title: selectedTask.title,
        description: selectedTask.description,
        dueDate: selectedTask.dueDate || null,
        priority: selectedTask.priority,
        status: selectedTask.status,
        category: selectedTask.category,
      });

      if (res.success && res.data?.subtasks?.length) {
        setSubtasks(res.data.subtasks);
        // Pre-select all as approved for convenience; user can deselect
        setApproved(new Set(res.data.subtasks.map((_, i) => i)));
        setHasRun(true);
      } else {
        setError('AI could not generate subtasks for this task. Try a more descriptive title.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to break down task. Check your backend connection and API key.');
    } finally {
      setLoading(false);
    }
  }, [selectedTask]);

  const toggleApprove = (idx: number) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const addSubtask = async (idx: number) => {
    if (!selectedTask || adding.has(idx) || added.has(idx)) return;
    setAdding((prev) => new Set(prev).add(idx));

    try {
      const sub = subtasks[idx];
      await addTask({
        title: sub.title,
        description: sub.description,
        category: selectedTask.category,
        priority: selectedTask.priority,
        status: 'To Do',
        dueDate: selectedTask.dueDate || '',
        dueTime: selectedTask.dueTime,
        tags: [],
        assignedTo: '',
        estimatedHours: sub.estimatedHours,
      });
      setAdded((prev) => new Set(prev).add(idx));
    } catch (err: any) {
      setError(`Failed to add subtask: ${err.message}`);
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  const addAllApproved = async () => {
    const toAdd = Array.from(approved).filter((i) => !added.has(i));
    for (const idx of toAdd) {
      await addSubtask(idx);
    }
  };

  return (
    <div className="spike-card">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#EEF2F6] dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#FEF5E5] dark:bg-amber-950/60 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-[#FFAE1F]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              AI Task Breakdown
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Split a large task into 3–5 actionable subtasks
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Task selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Select a task to break down
          </label>
          <div className="relative">
            <select
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                setHasRun(false);
                setSubtasks([]);
                setError(null);
              }}
              className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#EEF2F6] dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/40 transition-all"
            >
              <option value="">— Choose a pending task —</option>
              {pendingTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title.length > 60 ? `${t.title.slice(0, 60)}…` : t.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={runBreakdown}
          disabled={loading || !selectedTaskId}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FFAE1F] hover:bg-[#f0a01a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating subtasks…' : hasRun ? 'Regenerate' : 'Generate Subtasks'}
        </button>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Subtasks list */}
        {!loading && hasRun && subtasks.length > 0 && (
          <>
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">
                Review and approve the subtasks below before adding them to your task list.
              </p>

              {subtasks.map((sub, idx) => {
                const isApproved = approved.has(idx);
                const isAdded = added.has(idx);
                const isAdding = adding.has(idx);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isAdded
                        ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20'
                        : isApproved
                        ? 'border-[#5D87FF]/30 bg-[#ECF2FF]/40 dark:bg-blue-950/20'
                        : 'border-[#EEF2F6] dark:border-slate-700/60 bg-[#FBFBFE] dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Approve toggle */}
                      <button
                        onClick={() => !isAdded && toggleApprove(idx)}
                        disabled={isAdded}
                        className={`shrink-0 mt-0.5 w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                          isAdded
                            ? 'border-emerald-400 bg-emerald-400 cursor-default'
                            : isApproved
                            ? 'border-[#5D87FF] bg-[#5D87FF]'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                        style={{ width: 18, height: 18 }}
                      >
                        {(isApproved || isAdded) && (
                          <Check className="w-2.5 h-2.5 text-white" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {sub.title}
                        </p>
                        {sub.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {sub.description}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          ~{sub.estimatedHours}h estimated
                        </span>
                      </div>

                      {/* Add button */}
                      {!isAdded && isApproved && (
                        <button
                          onClick={() => addSubtask(idx)}
                          disabled={isAdding}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 bg-[#5D87FF] hover:bg-[#4570EA] disabled:opacity-60 text-white text-[10px] font-bold rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {isAdding ? '…' : 'Add'}
                        </button>
                      )}

                      {isAdded && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3" /> Added
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add all approved */}
            {approved.size > 0 && approved.size > added.size && (
              <button
                onClick={addAllApproved}
                className="w-full py-2 text-xs font-semibold text-[#5D87FF] border border-[#5D87FF]/30 rounded-xl hover:bg-[#ECF2FF] dark:hover:bg-blue-950/40 transition-colors"
              >
                Add {Array.from(approved).filter((i) => !added.has(i)).length} Approved Subtasks
              </button>
            )}
          </>
        )}

        {!loading && hasRun && subtasks.length === 0 && (
          <div className="py-4 text-center text-xs text-slate-400">
            No subtasks were generated. Try selecting a task with a more detailed description.
          </div>
        )}
      </div>
    </div>
  );
};
