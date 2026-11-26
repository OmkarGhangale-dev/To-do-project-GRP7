/**
 * AIAssistantPage.tsx
 *
 * Dedicated page for all three AI features:
 *  1. AI Priority Analysis — priority recommendations for all pending tasks
 *  2. What Should I Do Next? — single best-next-task recommendation
 *  3. AI Task Breakdown — split a large task into subtasks
 *
 * Visual style: standard Spike dashboard page layout.
 * No redesign, no AI-generated template aesthetics.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { AIPrioritizePanel } from '../../components/ai/AIPrioritizePanel';
import { AINextTaskPanel } from '../../components/ai/AINextTaskPanel';
import { AIBreakdownPanel } from '../../components/ai/AIBreakdownPanel';

export const AIAssistantPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#5D87FF]" />
            AI Assistant
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Groq-powered insights to help you work smarter — all analysis runs server-side.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Powered by Groq LLM API
        </div>
      </div>

      {/* How it works — minimal inline notice, not a banner */}
      <p className="text-xs text-slate-400 border-l-2 border-slate-200 dark:border-slate-700 pl-3 leading-relaxed">
        Your task titles, descriptions, deadlines and priorities are sent to the backend for
        analysis. The Groq API key is stored securely in the server environment and is never
        exposed to the browser. AI suggestions require your approval before modifying any task.
      </p>

      {/* Two-column on large screens, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AINextTaskPanel />
        <AIPrioritizePanel />
      </div>

      {/* Full width breakdown */}
      <AIBreakdownPanel />
    </div>
  );
};
