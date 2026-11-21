import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'positive',
  icon: Icon,
  iconBgColor = 'bg-[#ECF2FF] dark:bg-blue-950/50',
  iconColor = 'text-[#5D87FF]',
  subtext,
}) => {
  const trendIcon = {
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: Minus,
  }[changeType];

  const TrendIcon = trendIcon;

  const trendClasses = {
    positive: 'text-[#13DEB9] bg-emerald-50 dark:bg-emerald-950/40',
    negative: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40',
    neutral: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
  }[changeType];

  return (
    <div className="spike-card p-5 flex flex-col gap-4">
      {/* Header: title + icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-snug">
          {title}
        </span>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor}`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>

      {/* Value + trend badge */}
      <div className="flex items-end justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
          {value}
        </div>

        {change && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${trendClasses}`}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            {change}
          </span>
        )}
      </div>

      {/* Subtext */}
      {subtext && (
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-snug -mt-1">
          {subtext}
        </p>
      )}
    </div>
  );
};
