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

  // Computed metrics
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
            dueTime: t.dueTime || '17:00',
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
      const payload = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status === 'To Do' ? 'Pending' : data.status,
        dueDate: data.dueDate ? `${data.dueDate}T12:00:00Z` : null,
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
        payload.dueDate = updates.dueDate ? `${updates.dueDate}T12:00:00Z` : null;
      }

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
  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const pending = total - completed;
    const overdue = tasks.filter(
      (t) => t.status !== 'Completed' && t.dueDate && t.dueDate < todayStr
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, completionRate };
  }, [tasks, todayStr]);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === todayStr);
  }, [tasks, todayStr]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate && t.dueDate > todayStr && t.status !== 'Completed');
  }, [tasks, todayStr]);

  const overdueTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate && t.dueDate < todayStr && t.status !== 'Completed');
  }, [tasks, todayStr]);

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
