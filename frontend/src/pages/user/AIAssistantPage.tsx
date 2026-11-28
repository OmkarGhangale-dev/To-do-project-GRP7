/**
 * AIAssistantPage.tsx
 *
 * Dedicated page for Dual-Engine AI Comparison (Google Gemini vs Groq):
 *  1. What Should I Do Next? — side-by-side single best-next-task recommendation
 *  2. AI Priority Analysis — side-by-side priority recommendations & ordering
 *
 * Visual style: standard Spike dashboard page layout.
 * No redesign, no AI-generated template aesthetics.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { AIPrioritizePanel } from '../../components/ai/AIPrioritizePanel';
import { AINextTaskPanel } from '../../components/ai/AINextTaskPanel';

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
            Dual-engine AI insights (Google Gemini &amp; Groq) — compare speed, accuracy, and clarity side by side.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Gemini &amp; Groq Dual Engine
        </div>
      </div>

      {/* How it works — minimal inline notice */}
      <p className="text-xs text-slate-400 border-l-2 border-slate-200 dark:border-slate-700 pl-3 leading-relaxed">
        Your task titles, descriptions, deadlines and priorities are sent to the backend for
        simultaneous analysis by Google Gemini and Groq. API keys stay securely on the server, and
        recommendations require your approval before modifying any task.
      </p>

      {/* Full-width side-by-side comparison panels */}
      <AINextTaskPanel />
      <AIPrioritizePanel />
    </div>
  );
};
