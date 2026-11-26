import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  User,
  NotificationItem,
  ActivityLog,
} from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface TaskContextType {
  tasks: Task[];
  users: User[];
  categories: { id: string; name: string }[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  unreadNotificationCount: number;
  isLoadingTasks: boolean;

  // Filter & Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedPriority: string;
  setSelectedPriority: (prio: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  sortBy: 'dueDate' | 'priority' | 'createdAt' | 'title';
  setSortBy: (sort: 'dueDate' | 'priority' | 'createdAt' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Task Operations
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'ownerId' | 'ownerName'>) => Promise<Task | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  duplicateTask: (taskId: string) => Promise<void>;
  toggleTaskComplete: (taskId: string) => Promise<void>;
  moveTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  refreshTasks: () => Promise<void>;

  // Category Operations
  addCategory: (name: string) => Promise<void>;

  // Admin User Operations
  addUser: (userData: Omit<User, 'id' | 'registeredDate' | 'totalTasks' | 'completedTasks'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;

  // Notification Operations
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // Real Computed Statistics (strictly derived from live tasks)
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  todayTasks: Task[];
  upcomingTasks: Task[];
  overdueTasks: Task[];
  filteredTasks: Task[];
  isTaskOverdue: (task: { status: string; dueDate?: any; dueTime?: string | null }) => boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Helper to convert Firestore Timestamp / Date to YYYY-MM-DD
function formatDueDate(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    if (raw.includes('T')) return raw.split('T')[0];
    return raw;
  }
  if (raw._seconds) {
    const d = new Date(raw._seconds * 1000);
    return d.toISOString().split('T')[0];
  }
  if (raw.seconds) {
    const d = new Date(raw.seconds * 1000);
    return d.toISOString().split('T')[0];
  }
  if (raw instanceof Date) {
    return raw.toISOString().split('T')[0];
  }
  return '';
}

/**
 * parseTaskDeadline — extracts a JavaScript Date and determines whether it's date-only
 *
 * Handles:
 *  • Firebase Firestore Timestamp objects ({ _seconds, _nanoseconds } or { seconds } or .toDate())
 *  • JavaScript Date instances
 *  • Full ISO date/time strings ("2026-11-26T16:00:00Z" or "2026-11-26T16:00")
 *  • Date-only strings ("YYYY-MM-DD")
 *  • Optional dueTime ("HH:mm")
 *  • Timezone-safe local parsing
 */
export function parseTaskDeadline(task: {
  dueDate?: any;
  dueTime?: string | null;
}): { deadline: Date | null; isDateOnly: boolean } {
  if (!task || !task.dueDate) return { deadline: null, isDateOnly: true };

  const raw = task.dueDate;
  let dateObj: Date | null = null;
  let isDateOnly = false;

  if (raw instanceof Date) {
    dateObj = new Date(raw.getTime());
  } else if (raw && typeof raw.toDate === 'function') {
    dateObj = raw.toDate();
  } else if (raw && typeof raw._seconds === 'number') {
    dateObj = new Date(raw._seconds * 1000 + (raw._nanoseconds ? raw._nanoseconds / 1e6 : 0));
  } else if (raw && typeof raw.seconds === 'number') {
    dateObj = new Date(raw.seconds * 1000);
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      isDateOnly = true;
      const [year, month, day] = trimmed.split('-').map(Number);
      dateObj = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return { deadline: null, isDateOnly: true };
  }

  // If a specific dueTime ("HH:mm") is provided, attach it in local time
  if (task.dueTime && /^\d{2}:\d{2}/.test(task.dueTime.trim())) {
    const [hours, minutes] = task.dueTime.trim().split(':').map(Number);
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = dateObj.getDate();
    dateObj = new Date(y, m, d, hours, minutes, 0, 0);
    isDateOnly = false;
  }

  return { deadline: dateObj, isDateOnly };
}

/**
 * isTaskOverdue — robust overdue detection
 *
 * Fixes the bug where a task created at 5 PM with a deadline of 4 PM
 * did not appear as overdue immediately.
 *
 * Rules:
 *  • Completed tasks  → never overdue
 *  • No valid deadline → never overdue
 *  • Date-only deadline → overdue only after end-of-day (23:59:59.999 local)
 *  • Time-specific deadline → overdue as soon as deadline < current time
 */
export function isTaskOverdue(task: {
  status: string;
  dueDate?: any;
  dueTime?: string | null;
}): boolean {
  if (!task) return false;
  if (task.status === 'Completed' || task.status === 'Done') return false;
  if (!task.dueDate) return false;

  const { deadline } = parseTaskDeadline(task);
  if (!deadline || isNaN(deadline.getTime())) return false;

  return deadline.getTime() < Date.now();
}

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load live tasks and categories from backend
  const refreshTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setTasks([]);
      setCategories([]);
      return;
    }

    setIsLoadingTasks(true);
    try {
      const [taskRes, catRes] = await Promise.allSettled([
        api.getTasks(),
        api.getCategories(),
      ]);

      if (catRes.status === 'fulfilled' && catRes.value.success) {
        const loadedCats = (catRes.value.data || []).map((c: any) => ({
          id: c.id,
          name: c.categoryName || c.name || 'General',
        }));
        setCategories(loadedCats);
      }

      if (taskRes.status === 'fulfilled' && taskRes.value.success) {
        const rawTasks = taskRes.value.data || [];
        const mappedTasks: Task[] = rawTasks.map((t: any) => {
          let status: TaskStatus = 'To Do';
          if (t.status === 'Completed') status = 'Completed';
          else if (t.status === 'In Progress') status = 'In Progress';
          else if (t.status === 'In Review') status = 'In Review';
          else if (t.status === 'To Do' || t.status === 'Pending') status = 'To Do';

          let priority: TaskPriority = 'Medium';
          if (['Low', 'Medium', 'High', 'Urgent'].includes(t.priority)) {
            priority = t.priority;
          }

          const dueDateStr = formatDueDate(t.dueDate);

          return {
            id: t.id,
            title: t.title || 'Untitled Task',
            description: t.description || '',
            category: (t.category || (t.categoryId ? 'Development' : 'Productivity')) as TaskCategory,
            priority,
            status,
            dueDate: dueDateStr,
            dueTime: t.dueTime || (t.dueDate && typeof t.dueDate === 'string' && t.dueDate.includes('T') && !t.dueDate.includes('T00:00') && !t.dueDate.includes('T23:59') ? t.dueDate.split('T')[1].slice(0, 5) : (t.dueTime || '')),
            tags: Array.isArray(t.tags) ? t.tags : [],
            createdAt: t.createdAt ? new Date(t.createdAt._seconds ? t.createdAt._seconds * 1000 : t.createdAt).toISOString() : new Date().toISOString(),
            ownerId: t.userId || currentUser?.id || '',
            ownerName: currentUser?.name || 'Me',
            assignedTo: t.assignedTo || currentUser?.name || 'Me',
            estimatedHours: t.estimatedHours || 2,
          };
        });
        setTasks(mappedTasks);
      }

      // If user has admin rights, load all registered workspace users
      if (currentUser?.role === 'admin' || currentUser?.isSuperAdmin) {
        try {
          const userRes = await api.getAdminUsers();
          if (userRes.success && Array.isArray(userRes.data)) {
            const mappedUsers: User[] = userRes.data.map((u: any) => ({
              id: u.id,
              name: u.name || 'User',
              email: u.email || '',
              role: u.role || 'user',
              isSuperAdmin: Boolean(u.isSuperAdmin) || (u.email?.toLowerCase().trim() === 'omkarghangale36@gmail.com'),
              status: u.status || 'Active',
              avatar: u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name || 'User')}`,
              department: u.department || 'Workspace',
              registeredDate: u.createdAt
                ? new Date(u.createdAt._seconds ? u.createdAt._seconds * 1000 : u.createdAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              totalTasks: 0,
              completedTasks: 0,
            }));
            setUsers(mappedUsers);
          }
        } catch {
          // Ignore if non-admin or failed
        }
      }
    } catch (err) {
      console.error('Failed to load tasks from backend:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  // ── Overdue recalculation: re-render every minute + on tab focus ──────────
  // This ensures overdue status updates after the user leaves and returns.
  const [, setTick] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => setTick((n) => n + 1), 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Log activity helper
  const addLog = useCallback(
    (action: string, target: string, type: 'task' | 'user' | 'auth' | 'system' = 'task') => {
      const newLog: ActivityLog = {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        actor: currentUser?.name || 'Current User',
        actorAvatar: currentUser?.avatar,
        action,
        target,
        type,
      };
      setActivityLogs((prev) => [newLog, ...prev.slice(0, 19)]);
    },
    [currentUser]
  );

  // Add Task
  const addTask = async (
    data: Omit<Task, 'id' | 'createdAt' | 'ownerId' | 'ownerName'>
  ): Promise<Task | null> => {
    try {
      // Build a time-aware ISO string so overdue detection works immediately.
      // If dueTime is provided (HH:mm), use it; otherwise default to end-of-day (23:59).
      let dueDateISO: string | null = null;
      if (data.dueDate) {
        const time = data.dueTime && /^\d{2}:\d{2}$/.test(data.dueTime) ? data.dueTime : '23:59';
        dueDateISO = `${data.dueDate}T${time}:00`;
      }
      const payload = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status === 'To Do' ? 'Pending' : data.status,
        dueDate: dueDateISO,
        dueTime: data.dueTime || null,
        category: data.category,
        tags: data.tags,
        assignedTo: data.assignedTo,
        estimatedHours: data.estimatedHours,
      };

      const res = await api.createTask(payload);
      if (res.success && res.data) {
        const newTask: Task = {
          ...data,
          id: res.data.id,
          createdAt: new Date().toISOString(),
          ownerId: currentUser?.id || '',
          ownerName: currentUser?.name || 'Me',
        };
        setTasks((prev) => [newTask, ...prev]);
        addLog('created task', newTask.title);
        showToast('Task Created', `"${newTask.title}" has been saved.`, 'success');
        return newTask;
      }
      return null;
    } catch (err: any) {
      console.error('Add task error:', err);
      showToast('Error', err.message || 'Failed to create task.', 'error');
      return null;
    }
  };

  // Update Task
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.status !== undefined) {
        payload.status = updates.status === 'To Do' ? 'Pending' : updates.status;
      }
      if (updates.dueDate !== undefined) {
        let dueDateISO: string | null = null;
        if (updates.dueDate) {
          const time =
            updates.dueTime && /^\d{2}:\d{2}$/.test(updates.dueTime)
              ? updates.dueTime
              : '23:59';
          dueDateISO = `${updates.dueDate}T${time}:00`;
        }
        payload.dueDate = dueDateISO;
      }
      if (updates.dueTime !== undefined) payload.dueTime = updates.dueTime || null;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.assignedTo !== undefined) payload.assignedTo = updates.assignedTo;
      if (updates.estimatedHours !== undefined) payload.estimatedHours = updates.estimatedHours;

      await api.updateTask(taskId, payload);

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );

      const updated = tasks.find((t) => t.id === taskId);
      if (updated) {
        addLog('updated task', updated.title);
      }
      showToast('Task Updated', 'Changes saved successfully.', 'info');
    } catch (err: any) {
      console.error('Update task error:', err);
      showToast('Error', err.message || 'Failed to update task.', 'error');
    }
  };

  // Delete Task
  const deleteTask = async (taskId: string) => {
    try {
      const target = tasks.find((t) => t.id === taskId);
      await api.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (target) {
        addLog('deleted task', target.title);
      }
      showToast('Task Deleted', 'The task has been permanently removed.', 'info');
    } catch (err: any) {
      console.error('Delete task error:', err);
      showToast('Error', err.message || 'Failed to delete task.', 'error');
    }
  };

  // Duplicate Task
  const duplicateTask = async (taskId: string) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return;
    await addTask({
      title: `${existing.title} (Copy)`,
      description: existing.description,
      category: existing.category,
      priority: existing.priority,
      status: 'To Do',
      dueDate: existing.dueDate,
      dueTime: existing.dueTime,
      tags: [...existing.tags],
      assignedTo: existing.assignedTo,
      estimatedHours: existing.estimatedHours,
    });
  };

  // Toggle Task Complete
  const toggleTaskComplete = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isNowCompleted = task.status !== 'Completed';
    const newStatus: TaskStatus = isNowCompleted ? 'Completed' : 'To Do';

    await updateTask(taskId, {
      status: newStatus,
      completedAt: isNowCompleted ? new Date().toISOString() : undefined,
    });

    if (isNowCompleted) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {}
      showToast('Task Completed', `Great work on "${task.title}"!`, 'success');
    }
  };

  // Move Task Status (e.g. Kanban drag/drop)
  const moveTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await updateTask(taskId, {
      status: newStatus,
      completedAt: newStatus === 'Completed' ? new Date().toISOString() : undefined,
    });
  };

  // Add Category
  const addCategory = async (name: string) => {
    try {
      const res = await api.createCategory(name);
      if (res.success && res.data) {
        setCategories((prev) => [...prev, { id: res.data.id, name: res.data.categoryName || name }]);
        showToast('Category Created', `"${name}" added.`, 'success');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Could not create category.', 'error');
    }
  };

  // Admin user stubs (maintained for admin view consistency)
  const addUser = (userData: Omit<User, 'id' | 'registeredDate' | 'totalTasks' | 'completedTasks'>) => {
    const newUser: User = {
      ...userData,
      id: 'usr-' + Date.now(),
      registeredDate: new Date().toISOString().split('T')[0],
      totalTasks: 0,
      completedTasks: 0,
    };
    setUsers((prev) => [newUser, ...prev]);
    showToast('Member Added', `${newUser.name} added.`, 'success');
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    showToast('Member Updated', 'User details saved.', 'info');
  };

  const deleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast('Member Removed', 'User removed from workspace.', 'info');
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  // Real Computed Statistics (strictly derived from live tasks)
  // Uses isTaskOverdue() for consistent, time-aware overdue detection.
  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const pending = total - completed;
    const overdue = tasks.filter((t) => isTaskOverdue(t)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, completionRate };
  }, [tasks]);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === todayStr);
  }, [tasks, todayStr]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      if (t.status === 'Completed' || !t.dueDate) return false;
      const deadline = new Date(`${t.dueDate}T23:59:59`);
      return deadline > now;
    });
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter((t) => isTaskOverdue(t));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (selectedPriority !== 'All' && t.priority !== selectedPriority) return false;
      if (selectedStatus !== 'All' && t.status !== selectedStatus) return false;
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'dueDate') {
        comparison = (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      } else if (sortBy === 'priority') {
        const order: Record<TaskPriority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        comparison = (order[b.priority] || 0) - (order[a.priority] || 0);
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else {
        comparison = (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [tasks, searchQuery, selectedCategory, selectedPriority, selectedStatus, sortBy, sortOrder]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        users,
        categories,
        notifications,
        activityLogs,
        unreadNotificationCount,
        isLoadingTasks,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedPriority,
        setSelectedPriority,
        selectedStatus,
        setSelectedStatus,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        addTask,
        updateTask,
        deleteTask,
        duplicateTask,
        toggleTaskComplete,
        moveTaskStatus,
        refreshTasks,
        addCategory,
        addUser,
        updateUser,
        deleteUser,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        stats,
        todayTasks,
        upcomingTasks,
        overdueTasks,
        filteredTasks,
        isTaskOverdue,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};
