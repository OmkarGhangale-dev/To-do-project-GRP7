/**
 * TaskFlow API Service & Adapter Layer
 * Group 7 - Frontend Development (Rashika Jagdev Prajapati)
 *
 * Provides a clean interface for all authentication, task, and admin operations.
 * Features:
 *  1. Live Backend API integration targeting Krishna's Node/Express endpoints.
 *  2. Isolated Mock Adapter storing data in localStorage for reliable local UI development
 *     and QA testing before backend deployment.
 *  3. Seamless toggle between Mock and Live API modes.
 */

// Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api', // Krishna's Express API default port
  USE_MOCK_STORAGE_KEY: 'taskflow_use_mock_v2',
  TOKEN_STORAGE_KEY: 'taskflow_auth_token_v2',
  USER_STORAGE_KEY: 'taskflow_current_user_v2',
  MOCK_DATA_INITIALIZED_KEY: 'taskflow_mock_data_initialized_v2',
};

// ============================================================================
// Initial Mock Seed Data (Group 7 & TaskFlow Roster)
// ============================================================================
const INITIAL_MOCK_USERS = [
  {
    id: 1,
    name: 'Rashika Prajapati',
    email: 'user@taskflow.com',
    password: 'user123',
    role: 'user',
    department: 'Frontend Engineering',
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 2,
    name: 'System Administrator',
    email: 'admin@taskflow.com',
    password: 'admin123',
    role: 'admin',
    department: 'Platform Architecture',
    created_at: '2026-10-15T08:30:00Z',
  },
  {
    id: 3,
    name: 'Vedika Sharma',
    email: 'vedika@taskflow.com',
    password: 'password123',
    role: 'user',
    department: 'UI/UX Design',
    created_at: '2026-11-05T14:20:00Z',
  },
  {
    id: 4,
    name: 'Krishna Rao',
    email: 'krishna@taskflow.com',
    password: 'password123',
    role: 'user',
    department: 'Backend API Development',
    created_at: '2026-11-06T09:15:00Z',
  },
  {
    id: 5,
    name: 'Omkar Ghangale',
    email: 'omkar@taskflow.com',
    password: 'password123',
    role: 'user',
    department: 'Database & Cloud Firestore',
    created_at: '2026-11-04T11:00:00Z',
  },
  {
    id: 6,
    name: 'Arya Nair',
    email: 'arya@taskflow.com',
    password: 'password123',
    role: 'user',
    department: 'Quality Assurance & Testing',
    created_at: '2026-11-08T16:45:00Z',
  },
];

// Helper to format ISO date offset
function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const INITIAL_MOCK_TASKS = [
  {
    id: 101,
    user_id: 1,
    title: 'Port TaskFlow UI and Sidebar Architecture to Vanilla JS',
    description: 'Ensure clean HTML5/CSS3 layout with collapsible navigation and design tokens.',
    priority: 'High',
    status: 'Completed',
    category: 'Development',
    due_date: getDateOffset(-2), // Overdue/Completed
    created_at: '2026-11-10T09:00:00Z',
    updated_at: '2026-11-18T12:00:00Z',
  },
  {
    id: 102,
    user_id: 1,
    title: 'Implement Interactive SVG Analytics Charts for Dashboards',
    description: 'Create responsive status doughnut chart and priority breakdown charts without external dependencies.',
    priority: 'High',
    status: 'In Progress',
    category: 'Development',
    due_date: getDateOffset(1),
    created_at: '2026-11-12T10:30:00Z',
    updated_at: '2026-11-19T14:00:00Z',
  },
  {
    id: 103,
    user_id: 1,
    title: 'Review TaskFlow color tokens and accessible contrast ratios',
    description: 'Adopt primary #5D87FF and success #13DEB9 for Vedika UI review.',
    priority: 'Medium',
    status: 'Completed',
    category: 'Design',
    due_date: getDateOffset(-1),
    created_at: '2026-11-15T11:00:00Z',
    updated_at: '2026-11-19T16:00:00Z',
  },
  {
    id: 104,
    user_id: 1,
    title: 'Coordinate Express Bearer Token Header with Krishna',
    description: 'Verify Authorization header contract for /api/tasks and /api/auth/me endpoints.',
    priority: 'Medium',
    status: 'Pending',
    category: 'Development',
    due_date: getDateOffset(4),
    created_at: '2026-11-18T08:00:00Z',
    updated_at: '2026-11-18T08:00:00Z',
  },
  {
    id: 105,
    user_id: 1,
    title: 'Prepare final PR documentation & cross-browser testing summary',
    description: 'Verify responsive behavior on mobile viewports and edge cases with Arya.',
    priority: 'Low',
    status: 'Pending',
    category: 'QA',
    due_date: getDateOffset(-3), // Intentionally overdue
    created_at: '2026-11-17T15:30:00Z',
    updated_at: '2026-11-17T15:30:00Z',
  },
  {
    id: 106,
    user_id: 3,
    title: 'Harmonize semantic color tokens in Figma wireframes',
    description: 'Align design system components with official internship roadmap.',
    priority: 'High',
    status: 'Completed',
    category: 'Design',
    due_date: getDateOffset(3),
    created_at: '2026-11-14T09:00:00Z',
    updated_at: '2026-11-18T10:00:00Z',
  },
  {
    id: 107,
    user_id: 4,
    title: 'Build Express router endpoints for User and Admin stats',
    description: 'Implement JWT token verification middleware and task controllers.',
    priority: 'High',
    status: 'In Progress',
    category: 'Development',
    due_date: getDateOffset(2),
    created_at: '2026-11-16T14:00:00Z',
    updated_at: '2026-11-19T11:00:00Z',
  },
  {
    id: 108,
    user_id: 5,
    title: 'Index optimizations on tasks table user_id and due_date',
    description: 'Verify sub-millisecond query performance in database/schema.sql.',
    priority: 'Medium',
    status: 'Completed',
    category: 'Research',
    due_date: getDateOffset(-5),
    created_at: '2026-11-11T12:00:00Z',
    updated_at: '2026-11-15T15:00:00Z',
  },
  {
    id: 109,
    user_id: 6,
    title: 'Perform exploratory QA testing on responsive navigation drawer',
    description: 'Verify focus traps and keyboard navigation on tablet resolutions.',
    priority: 'Low',
    status: 'Pending',
    category: 'QA',
    due_date: getDateOffset(5),
    created_at: '2026-11-18T16:00:00Z',
    updated_at: '2026-11-18T16:00:00Z',
  },
];

// ============================================================================
// Mock Data Adapter (LocalStorage implementation)
// ============================================================================
class MockStorageAdapter {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(API_CONFIG.MOCK_DATA_INITIALIZED_KEY)) {
      localStorage.setItem('taskflow_mock_users_v2', JSON.stringify(INITIAL_MOCK_USERS));
      localStorage.setItem('taskflow_mock_tasks_v2', JSON.stringify(INITIAL_MOCK_TASKS));
      localStorage.setItem(API_CONFIG.MOCK_DATA_INITIALIZED_KEY, 'true');
    }
  }

  getUsers() {
    return JSON.parse(localStorage.getItem('taskflow_mock_users_v2') || '[]');
  }

  saveUsers(users) {
    localStorage.setItem('taskflow_mock_users_v2', JSON.stringify(users));
  }

  getTasks() {
    return JSON.parse(localStorage.getItem('taskflow_mock_tasks_v2') || '[]');
  }

  saveTasks(tasks) {
    localStorage.setItem('taskflow_mock_tasks_v2', JSON.stringify(tasks));
  }

  async delay(ms = 200) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async login(email, password) {
    await this.delay();
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password. Use user@taskflow.com / user123 or admin@taskflow.com / admin123.');
    }
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department };
    const fakeToken = `mock-jwt-token-${user.id}-${Date.now()}`;
    return { token: fakeToken, user: safeUser };
  }

  async register(name, email, password, role = 'user') {
    await this.delay();
    const users = this.getUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase().trim())) {
      throw new Error('An account with this email address already exists.');
    }
    const newUser = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role === 'admin' ? 'admin' : 'user',
      department: 'Group 7 Member',
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    this.saveUsers(users);
    const safeUser = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, department: newUser.department };
    const fakeToken = `mock-jwt-token-${newUser.id}-${Date.now()}`;
    return { token: fakeToken, user: safeUser };
  }

  async getTasksForUser(userId) {
    await this.delay();
    const tasks = this.getTasks();
    return tasks.filter((t) => t.user_id === userId);
  }

  async createTask(userId, taskData) {
    await this.delay();
    const tasks = this.getTasks();
    const newTask = {
      id: Date.now(),
      user_id: userId,
      title: taskData.title.trim(),
      description: (taskData.description || '').trim(),
      priority: taskData.priority || 'Medium',
      status: taskData.status || 'Pending',
      category: taskData.category || 'General',
      due_date: taskData.due_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  async updateTask(taskId, updateData) {
    await this.delay();
    const tasks = this.getTasks();
    const idx = tasks.findIndex((t) => t.id === Number(taskId));
    if (idx === -1) {
      throw new Error('Task not found.');
    }
    tasks[idx] = {
      ...tasks[idx],
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    this.saveTasks(tasks);
    return tasks[idx];
  }

  async deleteTask(taskId) {
    await this.delay();
    let tasks = this.getTasks();
    const initialLen = tasks.length;
    tasks = tasks.filter((t) => t.id !== Number(taskId));
    if (tasks.length === initialLen) {
      throw new Error('Task not found.');
    }
    this.saveTasks(tasks);
    return { success: true, message: 'Task deleted successfully.' };
  }

  async getAdminStats() {
    await this.delay();
    const users = this.getUsers();
    const tasks = this.getTasks();
    const pendingTasks = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
    return {
      totalUsers: users.length,
      totalTasks: tasks.length,
      pendingTasks,
      completedTasks,
    };
  }

  async getAdminUsers() {
    await this.delay();
    const users = this.getUsers();
    const tasks = this.getTasks();
    return users.map((u) => {
      const userTasks = tasks.filter((t) => t.user_id === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || 'Team Member',
        created_at: u.created_at,
        tasksCount: userTasks.length,
        completedCount: userTasks.filter((t) => t.status === 'Completed').length,
      };
    });
  }

  async getAdminAllTasks() {
    await this.delay();
    const tasks = this.getTasks();
    const users = this.getUsers();
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    return tasks.map((t) => ({
      ...t,
      owner_name: userMap.get(t.user_id) || 'User ' + t.user_id,
    }));
  }
}

// ============================================================================
// Main API Service Class
// ============================================================================
class ApiService {
  constructor() {
    this.mockAdapter = new MockStorageAdapter();
    const savedMode = localStorage.getItem(API_CONFIG.USE_MOCK_STORAGE_KEY);
    this.useMock = savedMode !== null ? savedMode === 'true' : true;
  }

  isMockMode() {
    return this.useMock;
  }

  setMockMode(enableMock) {
    this.useMock = Boolean(enableMock);
    localStorage.setItem(API_CONFIG.USE_MOCK_STORAGE_KEY, String(this.useMock));
  }

  getToken() {
    return localStorage.getItem(API_CONFIG.TOKEN_STORAGE_KEY);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(API_CONFIG.TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(API_CONFIG.TOKEN_STORAGE_KEY);
    }
  }

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(API_CONFIG.USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(API_CONFIG.USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(API_CONFIG.USER_STORAGE_KEY);
    }
  }

  logout() {
    this.setToken(null);
    this.setCurrentUser(null);
  }

  async http(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.status} ${response.statusText}`);
      }
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error(`Unable to reach backend server at ${API_CONFIG.BASE_URL}. Ensure Krishna's Express server is running, or toggle to Demo Mock Mode.`);
      }
      throw err;
    }
  }

  // --- Auth APIs ---
  async login(email, password) {
    if (this.useMock) {
      const res = await this.mockAdapter.login(email, password);
      this.setToken(res.token);
      this.setCurrentUser(res.user);
      return res;
    }
    const res = await this.http('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    this.setCurrentUser(res.user);
    return res;
  }

  async register(name, email, password, role = 'user') {
    if (this.useMock) {
      const res = await this.mockAdapter.register(name, email, password, role);
      this.setToken(res.token);
      this.setCurrentUser(res.user);
      return res;
    }
    const res = await this.http('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    this.setToken(res.token);
    this.setCurrentUser(res.user);
    return res;
  }

  async getMe() {
    if (this.useMock) return this.getCurrentUser();
    const res = await this.http('/auth/me');
    this.setCurrentUser(res.user);
    return res.user;
  }

  // --- Task APIs ---
  async getTasks() {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated.');
    if (this.useMock) return await this.mockAdapter.getTasksForUser(user.id);
    const res = await this.http('/tasks');
    return res.tasks || res;
  }

  async createTask(taskData) {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated.');
    if (this.useMock) return await this.mockAdapter.createTask(user.id, taskData);
    const res = await this.http('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return res.task || res;
  }

  async updateTask(taskId, updateData) {
    if (this.useMock) return await this.mockAdapter.updateTask(taskId, updateData);
    const res = await this.http(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return res.task || res;
  }

  async deleteTask(taskId) {
    if (this.useMock) return await this.mockAdapter.deleteTask(taskId);
    return await this.http(`/tasks/${taskId}`, { method: 'DELETE' });
  }

  // --- Admin APIs ---
  async getAdminStats() {
    if (this.useMock) return await this.mockAdapter.getAdminStats();
    return await this.http('/admin/stats');
  }

  async getAdminUsers() {
    if (this.useMock) return await this.mockAdapter.getAdminUsers();
    const res = await this.http('/admin/users');
    return res.users || res;
  }

  async getAdminTasks() {
    if (this.useMock) return await this.mockAdapter.getAdminAllTasks();
    const res = await this.http('/admin/tasks');
    return res.tasks || res;
  }
}

// Global API instance
const api = new ApiService();
