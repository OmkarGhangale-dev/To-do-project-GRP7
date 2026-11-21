import React from 'react';
import {
  ShieldAlert,
  Users,
  Layers,
  TrendingUp,
  FileSpreadsheet,
  FileClock,
  SlidersHorizontal,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { taskflowIcon } from '../../assets/branding';

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { logout, setActiveRole } = useAuth();

  const navGroups = [
    {
      title: 'ORGANIZATION DASHBOARD',
      items: [
        { id: 'admin-overview', label: 'Admin Overview', icon: ShieldAlert },
        { id: 'admin-users', label: 'User Management', icon: Users },
      ],
    },
    {
      title: 'TASKS & WORKLOAD',
      items: [
        { id: 'admin-tasks', label: 'All Tasks Registry', icon: Layers },
        { id: 'admin-analytics', label: 'Task Velocity Analytics', icon: TrendingUp },
        { id: 'admin-reports', label: 'Reports & Data Exports', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'GOVERNANCE & AUDIT',
      items: [
        { id: 'admin-logs', label: 'Activity Audit Trail', icon: FileClock },
        { id: 'admin-categories', label: 'Categories & SLA Rules', icon: SlidersHorizontal },
        { id: 'admin-settings', label: 'Enterprise Security', icon: ShieldCheck },
      ],
    },
  ];

  const handleItemClick = (pageId: string) => {
    onNavigate(pageId);
    if (isOpenMobile) onCloseMobile();
  };

  const handleSwitchToUser = () => {
    setActiveRole('user');
    onNavigate('overview');
    if (isOpenMobile) onCloseMobile();
  };

  return (
    <>
      {/* Admin Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Admin Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 h-screen bg-white dark:bg-[#111C2D] text-slate-800 dark:text-slate-100 border-r border-[#EEF2F6] dark:border-slate-800 flex flex-col justify-between transition-transform md:transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${isOpenMobile ? 'w-64 translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="overflow-y-auto overflow-x-hidden flex-1">
          {/* Top Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#EEF2F6] dark:border-slate-800">
            <div
              onClick={() => handleItemClick('admin-overview')}
              className={`flex items-center gap-3 cursor-pointer select-none min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}
            >
              <img
                src={taskflowIcon}
                alt="TaskFlow"
                className="w-8 h-8 rounded-lg object-contain shrink-0"
              />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white truncate leading-tight">
                    TaskFlow
                  </span>
                  <span className="text-[10px] font-semibold text-[#5D87FF] uppercase tracking-wider leading-tight">
                    Admin Console
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Button */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors absolute right-0 translate-x-1/2 top-5 bg-white dark:bg-[#111C2D] border border-[#EEF2F6] dark:border-slate-700 shadow-sm z-10"
                title="Expand sidebar"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-5 mt-1">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-0.5">
                {!isCollapsed && (
                  <div className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                    {group.title}
                  </div>
                )}

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;

                  return (
                    <div key={item.id} className="relative group/item">
                      <button
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        className={`w-full flex items-center gap-3 py-2.5 text-[13px] font-medium transition-all duration-150 rounded-lg ${
                          isCollapsed ? 'justify-center px-2.5' : 'px-3'
                        } ${
                          isActive
                            ? 'bg-[#ECF2FF] dark:bg-blue-950/40 text-[#5D87FF] border-l-2 border-[#5D87FF]'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'
                        }`}
                      >
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 ${
                            isActive ? 'text-[#5D87FF]' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </button>

                      {/* Tooltip on collapsed */}
                      {isCollapsed && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                          {item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-[#EEF2F6] dark:border-slate-800 space-y-1">
          {/* Switch to User Workspace */}
          <div className="relative group/user">
            <button
              type="button"
              onClick={handleSwitchToUser}
              className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors ${
                isCollapsed ? 'justify-center px-2.5' : 'px-3'
              }`}
              title={isCollapsed ? 'User Workspace' : undefined}
            >
              <ArrowLeft className="w-[18px] h-[18px] shrink-0 text-[#5D87FF]" />
              {!isCollapsed && <span>User Workspace</span>}
            </button>
            {isCollapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/user:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                User Workspace
              </div>
            )}
          </div>

          {/* Sign Out */}
          <div className="relative group/logout">
            <button
              type="button"
              onClick={logout}
              className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-[13px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${
                isCollapsed ? 'justify-center px-2.5' : 'px-3'
              }`}
              title={isCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
            {isCollapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/logout:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                Sign Out
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
