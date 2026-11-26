import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Kanban,
  CheckCircle,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTask } from '../../context/TaskContext';
import { taskflowIcon } from '../../assets/branding';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser, logout, activeRole, setActiveRole } = useAuth();
  const { unreadNotificationCount, tasks } = useTask();

  const taskCount = tasks.filter((t) => t.status !== 'Completed').length;

  const navGroups: NavGroup[] = [
    {
      title: 'HOME',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'APPS',
      items: [
        { id: 'tasks', label: 'My Tasks', icon: CheckSquare, badge: taskCount },
        { id: 'calendar', label: 'Calendar Schedule', icon: Calendar },
        { id: 'kanban', label: 'Kanban Board', icon: Kanban },
        { id: 'completed', label: 'Completed Archive', icon: CheckCircle },
      ],
    },
    {
      title: 'ANALYTICS & ALERTS',
      items: [
        { id: 'analytics', label: 'Productivity Analytics', icon: BarChart3 },
        { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
        {
          id: 'notifications',
          label: 'Notification Centre',
          icon: Bell,
          badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          badgeColor: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
        },
      ],
    },
    {
      title: 'PREFERENCES',
      items: [
        { id: 'settings', label: 'Profile & Settings', icon: Settings },
      ],
    },
  ];

  const handleItemClick = (pageId: string) => {
    onNavigate(pageId);
    if (isOpenMobile) onCloseMobile();
  };

  const handleSwitchToAdmin = () => {
    setActiveRole('admin');
    onNavigate('admin-overview');
    if (isOpenMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 h-screen bg-white dark:bg-[#1E2530] border-r border-[#EEF2F6] dark:border-slate-800 flex flex-col justify-between transition-transform md:transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${isOpenMobile ? 'w-64 translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="overflow-y-auto overflow-x-hidden flex-1">
          {/* Top Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#EEF2F6] dark:border-slate-800">
            <div
              onClick={() => handleItemClick('overview')}
              className={`flex items-center gap-3 cursor-pointer select-none min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}
            >
              <img
                src={taskflowIcon}
                alt="TaskFlow"
                className="w-8 h-8 rounded-lg object-contain shrink-0"
              />
              {!isCollapsed && (
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white truncate">
                  TaskFlow
                </span>
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
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors absolute bottom-auto right-0 translate-x-1/2 top-5 bg-white dark:bg-[#1E2530] border border-[#EEF2F6] dark:border-slate-700 shadow-sm z-10"
                title="Expand sidebar"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Navigation Groups */}
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
                        className={`w-full flex items-center gap-3 py-2.5 text-sm font-medium transition-all duration-150 relative rounded-lg ${
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
                        {!isCollapsed && (
                          <span className="truncate text-[13px]">{item.label}</span>
                        )}

                        {/* Badge — expanded */}
                        {item.badge !== undefined && item.badge > 0 && !isCollapsed && (
                          <span
                            className={`ml-auto px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.badgeColor ||
                              'bg-[#ECF2FF] text-[#5D87FF] dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Badge dot — collapsed */}
                        {item.badge !== undefined && item.badge > 0 && isCollapsed && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                        )}
                      </button>

                      {/* Tooltip on collapsed */}
                      {isCollapsed && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                          {item.label}
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-1.5 text-rose-400">({item.badge})</span>
                          )}
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
          {/* Admin Console (Strictly accessible to confirmed admins only) */}
          {(currentUser?.role === 'admin' || currentUser?.isSuperAdmin) && (
            <div className="relative group/admin">
              <button
                type="button"
                onClick={handleSwitchToAdmin}
                className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-[13px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors ${
                  isCollapsed ? 'justify-center px-2.5' : 'px-3'
                }`}
                title={isCollapsed ? 'Admin Console' : undefined}
              >
                <ShieldCheck className="w-[18px] h-[18px] shrink-0 text-purple-600 dark:text-purple-400" />
                {!isCollapsed && <span>Admin Console</span>}
              </button>
              {isCollapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/admin:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                  Admin Console
                </div>
              )}
            </div>
          )}

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
