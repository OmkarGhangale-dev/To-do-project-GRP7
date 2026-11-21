import React from 'react';
import { Plus, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CalendarView } from '../../components/calendar/CalendarView';
import { Task } from '../../types';
import { useTask } from '../../context/TaskContext';

interface CalendarPageProps {
  onViewTask: (task: Task) => void;
  onAddTaskWithDate: (date: string) => void;
  onOpenAddTask: () => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  onViewTask,
  onAddTaskWithDate,
  onOpenAddTask,
}) => {
  const { tasks, upcomingTasks, overdueTasks } = useTask();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#5D87FF]" />
            Calendar & Deadlines
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            View scheduled tasks, track upcoming deadlines, and plan workloads by date
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddTask}
          className="px-4 py-2 bg-[#5D87FF] hover:bg-[#4570EA] active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-[#5D87FF]/25 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Interactive Calendar Component */}
      <CalendarView
        onViewTask={onViewTask}
        onAddTaskWithDate={onAddTaskWithDate}
      />

      {/* Deadlines Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Upcoming Deadlines */}
        <div className="spike-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5D87FF]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Upcoming Deadlines
              </h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              {upcomingTasks.length} {upcomingTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <div className="space-y-2.5">
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No upcoming deadlines scheduled
              </p>
            ) : (
              upcomingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onViewTask(task)}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {task.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Due: {task.dueDate} {task.dueTime ? `at ${task.dueTime}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#ECF2FF] text-[#5D87FF] dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue / High Priority Tasks */}
        <div className="spike-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FA896B]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Overdue Tasks
              </h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              {overdueTasks.length} {overdueTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <div className="space-y-2.5">
            {overdueTasks.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 flex flex-col items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-[#13DEB9]" />
                All deadlines are on track!
              </div>
            ) : (
              overdueTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onViewTask(task)}
                  className="p-3 rounded-xl border border-rose-100 dark:border-rose-950/50 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-rose-900 dark:text-rose-200 truncate">
                      {task.title}
                    </p>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-400 mt-0.5">
                      Was due: {task.dueDate}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 shrink-0">
                    Past Due
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
