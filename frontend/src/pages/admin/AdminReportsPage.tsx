import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useTask } from '../../context/TaskContext';

export const AdminReportsPage: React.FC = () => {
  const { users, tasks, stats } = useTask();
  const [reportType, setReportType] = useState<'productivity' | 'sla' | 'workload'>('productivity');

  const todayStr = new Date().toISOString().split('T')[0];

  // Departmental aggregations for Workload Balance tab
  const departments = [
    'Product & Engineering',
    'Product Design',
    'Backend Infrastructure',
    'Growth & Marketing',
    'Quality Assurance',
    'Data Analytics',
  ];

  const departmentData = departments.map((dept) => {
    const deptUsers = users.filter((u) => u.department === dept);
    const userNames = new Set(deptUsers.map((u) => u.name));
    const deptTasks = tasks.filter(
      (t) => (t.assignedTo && userNames.has(t.assignedTo)) || userNames.has(t.ownerName)
    );
    const completed = deptTasks.filter((t) => t.status === 'Completed').length;
    const open = deptTasks.length - completed;
    const activeMembers = deptUsers.filter((u) => u.status === 'Active').length || deptUsers.length;
    const capacityMax = Math.max(activeMembers * 4, 1);
    const utilization = Math.min(100, Math.round((open / capacityMax) * 100));

    let statusLabel = 'Optimal';
    let statusColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';
    if (utilization > 80) {
      statusLabel = 'Over Capacity';
      statusColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400';
    } else if (utilization < 35) {
      statusLabel = 'Under-Allocated';
      statusColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400';
    }

    return {
      department: dept,
      activeMembers: deptUsers.length,
      openTasks: open,
      completedTasks: completed,
      totalTasks: deptTasks.length,
      utilization,
      statusLabel,
      statusColor,
    };
  });

  const handleDownloadCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (reportType === 'productivity') {
      headers = ['User ID', 'Name', 'Department', 'Assigned Tasks', 'Completed', 'Efficiency Rate', 'SLA Status'];
      rows = users.map((u) => {
        const userTasks = tasks.filter((t) => t.assignedTo === u.name || t.ownerName === u.name);
        const userCompleted = userTasks.filter((t) => t.status === 'Completed').length;
        const rate = userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0;
        const slaStatus = rate >= 60 ? 'Compliant' : 'Needs Attention';
        return [u.id, `"${u.name}"`, `"${u.department}"`, userTasks.length, userCompleted, `${rate}%`, `"${slaStatus}"`];
      });
      filename = `taskflow_member_productivity_${todayStr}.csv`;
    } else if (reportType === 'sla') {
      headers = ['Task ID', 'Title', 'Priority', 'Assignee', 'Due Date', 'SLA Target', 'Status', 'SLA Compliance'];
      rows = tasks.map((t) => {
        const slaTarget = t.priority === 'Urgent' ? '12h' : t.priority === 'High' ? '24h' : t.priority === 'Medium' ? '48h' : '72h';
        const isOverdue = t.status !== 'Completed' && t.dueDate < todayStr;
        const isToday = t.dueDate === todayStr;
        const compliance = t.status === 'Completed' ? 'Compliant' : isOverdue ? 'Breached' : isToday ? 'At Risk' : 'On Track';
        return [t.id, `"${t.title.replace(/"/g, '""')}"`, t.priority, `"${t.assignedTo || t.ownerName}"`, t.dueDate, slaTarget, t.status, compliance];
      });
      filename = `taskflow_sla_delivery_${todayStr}.csv`;
    } else {
      headers = ['Department', 'Active Members', 'Open Tasks', 'Completed Tasks', 'Total Tasks', 'Capacity Utilization', 'Workload Status'];
      rows = departmentData.map((d) => [
        `"${d.department}"`,
        d.activeMembers,
        d.openTasks,
        d.completedTasks,
        d.totalTasks,
        `${d.utilization}%`,
        `"${d.statusLabel}"`,
      ]);
      filename = `taskflow_department_workload_${todayStr}.csv`;
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleDownloadJSON = () => {
    let reportPayload: any = {};

    if (reportType === 'productivity') {
      reportPayload = {
        reportName: 'Member Velocity & Productivity',
        members: users.map((u) => {
          const userTasks = tasks.filter((t) => t.assignedTo === u.name || t.ownerName === u.name);
          const userCompleted = userTasks.filter((t) => t.status === 'Completed').length;
          const rate = userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0;
          return {
            id: u.id,
            name: u.name,
            department: u.department,
            assignedTasks: userTasks.length,
            completedTasks: userCompleted,
            efficiencyRate: rate,
            slaStatus: rate >= 60 ? 'Compliant' : 'Needs Attention',
          };
        }),
      };
    } else if (reportType === 'sla') {
      reportPayload = {
        reportName: 'SLA Delivery & Deadlines',
        deadlines: tasks.map((t) => {
          const slaTarget = t.priority === 'Urgent' ? '12h' : t.priority === 'High' ? '24h' : t.priority === 'Medium' ? '48h' : '72h';
          const isOverdue = t.status !== 'Completed' && t.dueDate < todayStr;
          const isToday = t.dueDate === todayStr;
          const compliance = t.status === 'Completed' ? 'Compliant' : isOverdue ? 'Breached' : isToday ? 'At Risk' : 'On Track';
          return {
            id: t.id,
            title: t.title,
            priority: t.priority,
            assignedTo: t.assignedTo || t.ownerName,
            dueDate: t.dueDate,
            slaTarget,
            status: t.status,
            compliance,
          };
        }),
      };
    } else {
      reportPayload = {
        reportName: 'Departmental Workload Balance',
        departments: departmentData,
      };
    }

    const data = {
      generatedAt: new Date().toISOString(),
      reportType,
      organization: 'TASKFLOW Enterprise',
      team: 'Internship Team G7',
      kpis: stats,
      ...reportPayload,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskflow_${reportType}_export_${todayStr}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            Reports & Data Exports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Generate executive productivity dossiers, SLA compliance audits, and CSV/JSON datasets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            Download CSV Report
          </button>
          <button
            onClick={handleDownloadJSON}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs shadow-purple-600/30"
          >
            <Download className="w-3.5 h-3.5" />
            Export Raw JSON
          </button>
        </div>
      </div>

      {/* Report Type Selector Pills */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        {(
          [
            { id: 'productivity', label: 'Member Velocity & Productivity' },
            { id: 'sla', label: 'SLA Delivery & Deadlines' },
            { id: 'workload', label: 'Departmental Workload Balance' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id)}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              reportType === t.id
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Report Table Preview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {reportType === 'productivity' && 'Live Report Preview • Member Velocity & Productivity (Q4 2026)'}
              {reportType === 'sla' && 'Live Report Preview • SLA Delivery & Deadline Compliance Audit (Q4 2026)'}
              {reportType === 'workload' && 'Live Report Preview • Departmental Workload Balance & Capacity (Q4 2026)'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Last synced: Today, {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportType === 'productivity' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3 text-center">Assigned Tasks</th>
                  <th className="px-5 py-3 text-center">Completed</th>
                  <th className="px-5 py-3">Efficiency Rate</th>
                  <th className="px-5 py-3">SLA Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const userTasks = tasks.filter(
                    (t) => t.assignedTo === u.name || t.ownerName === u.name
                  );
                  const userCompleted = userTasks.filter((t) => t.status === 'Completed').length;
                  const rate =
                    userTasks.length > 0
                      ? Math.round((userCompleted / userTasks.length) * 100)
                      : 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors text-xs">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {u.name}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{u.department}</td>
                      <td className="px-5 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {userTasks.length}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {userCompleted}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${rate}%` }}
                              className="h-full bg-purple-600 rounded-full"
                            />
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rate >= 60
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          {rate >= 60 ? 'Compliant' : 'Needs Attention'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {reportType === 'sla' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Task Title</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Assignee</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">SLA Target</th>
                  <th className="px-5 py-3">Workflow Status</th>
                  <th className="px-5 py-3">SLA Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.map((task) => {
                  const isOverdue = task.status !== 'Completed' && task.dueDate < todayStr;
                  const isToday = task.dueDate === todayStr;
                  const isCompleted = task.status === 'Completed';

                  const slaHours =
                    task.priority === 'Urgent' ? '12h' : task.priority === 'High' ? '24h' : task.priority === 'Medium' ? '48h' : '72h';

                  let complianceBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                      Compliant
                    </span>
                  );

                  if (isOverdue) {
                    complianceBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                        Breached
                      </span>
                    );
                  } else if (isToday && !isCompleted) {
                    complianceBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                        At Risk (&lt;24h)
                      </span>
                    );
                  } else if (!isCompleted) {
                    complianceBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        On Track
                      </span>
                    );
                  }

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors text-xs">
                      <td className="px-5 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {task.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {task.id}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.priority === 'Urgent'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : task.priority === 'High'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : task.priority === 'Medium'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {task.assignedTo || task.ownerName}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {task.dueDate} {task.dueTime ? `• ${task.dueTime}` : ''}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        {slaHours} turnaround
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300">
                        {task.status}
                      </td>
                      <td className="px-5 py-3">
                        {complianceBadge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {reportType === 'workload' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3 text-center">Active Members</th>
                  <th className="px-5 py-3 text-center">Open Tasks</th>
                  <th className="px-5 py-3 text-center">Completed</th>
                  <th className="px-5 py-3 text-center">Total Volume</th>
                  <th className="px-5 py-3">Capacity Utilization</th>
                  <th className="px-5 py-3">Workload State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {departmentData.map((d) => (
                  <tr key={d.department} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors text-xs">
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {d.department}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {d.activeMembers}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-amber-600 dark:text-amber-400">
                      {d.openTasks}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {d.completedTasks}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                      {d.totalTasks}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 sm:w-28 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${d.utilization}%` }}
                            className={`h-full rounded-full ${
                              d.utilization > 80
                                ? 'bg-rose-500'
                                : d.utilization < 35
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{d.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.statusColor}`}>
                        {d.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
