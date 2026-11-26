import { getFreshIdToken } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'taskflow_auth_token_v3';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Always get a fresh ID token using auth.currentUser.getIdToken()
  let token = await getFreshIdToken(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, attempt a forced token refresh and retry once
  if (response.status === 401) {
    try {
      const freshToken = await getFreshIdToken(true);
      if (freshToken && freshToken !== token) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      }
    } catch (refreshErr) {
      console.warn('Auto token refresh retry failed:', refreshErr);
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  async googleAuth(token: string) {
    return request<{ success: boolean; token: string; data: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: token }),
    });
  },

  async login(payload: { idToken?: string; email?: string; password?: string }) {
    return request<{ success: boolean; token: string; data: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async register(payload: { name: string; email: string; password?: string }) {
    return request<{ success: boolean; token: string; data: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getProfile() {
    return request<{ success: boolean; data: any }>('/auth/profile', {
      method: 'GET',
    });
  },

  async updateProfile(payload: { name: string }) {
    return request<{ success: boolean; data: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Tasks
  async getTasks() {
    return request<{ success: boolean; count: number; data: any[] }>('/tasks', {
      method: 'GET',
    });
  },

  async createTask(taskData: {
    title: string;
    description?: string;
    categoryId?: string | null;
    priority?: string;
    status?: string;
    dueDate?: string | null;
    dueTime?: string | null;
    category?: string | null;
    tags?: string[];
    assignedTo?: string | null;
    estimatedHours?: number | null;
  }) {
    return request<{ success: boolean; data: any }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  async updateTask(
    taskId: string,
    updateData: {
      title?: string;
      description?: string;
      categoryId?: string | null;
      priority?: string;
      status?: string;
      dueDate?: string | null;
      dueTime?: string | null;
      category?: string | null;
      tags?: string[];
      assignedTo?: string | null;
      estimatedHours?: number | null;
    }
  ) {
    return request<{ success: boolean; data: any }>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  async deleteTask(taskId: string) {
    return request<{ success: boolean; message: string }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Categories
  async getCategories() {
    return request<{ success: boolean; count: number; data: any[] }>('/categories', {
      method: 'GET',
    });
  },

  async createCategory(categoryName: string) {
    return request<{ success: boolean; data: any }>('/categories', {
      method: 'POST',
      body: JSON.stringify({ categoryName }),
    });
  },

  async deleteCategory(categoryId: string) {
    return request<{ success: boolean; message: string }>(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },

  // Admin APIs
  async getAdminUsers() {
    return request<{ success: boolean; count: number; data: any[] }>('/admin/users', {
      method: 'GET',
    });
  },

  async updateUserRole(uid: string, role: 'admin' | 'user') {
    return request<{ success: boolean; message: string; data: any }>(`/admin/users/${uid}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async getAdminStats() {
    return request<{ success: boolean; data: any }>('/admin/stats', {
      method: 'GET',
    });
  },

  // ── AI endpoints ──────────────────────────────────────────────────────────

  /**
   * Analyses an array of tasks and returns AI-suggested priorities and ordering.
   * The API key is kept server-side; the frontend only sends task metadata.
   */
  async aiPrioritizeTasks(tasks: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate?: string | null;
    priority?: string;
    status?: string;
    category?: string;
  }>) {
    return request<{
      success: boolean;
      data: {
        recommendations: Array<{
          id: string;
          suggestedPriority: 'High' | 'Medium' | 'Low';
          suggestedOrder: number;
          reason: string;
        }>;
        summary: string;
      };
    }>('/ai/prioritize', {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    });
  },

  /**
   * Returns the single best next task to focus on.
   */
  async aiGetNextTask(tasks: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate?: string | null;
    priority?: string;
    status?: string;
    category?: string;
  }>) {
    return request<{
      success: boolean;
      data: {
        recommendation: {
          id: string;
          title: string;
          reason: string;
          urgencyScore: number;
        } | null;
        message?: string;
      };
    }>('/ai/next-task', {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    });
  },

  /**
   * Breaks a large task into 3–5 actionable subtasks.
   */
  async aiBreakdownTask(task: {
    id?: string;
    title: string;
    description?: string;
    dueDate?: string | null;
    priority?: string;
    status?: string;
    category?: string;
  }) {
    return request<{
      success: boolean;
      data: {
        subtasks: Array<{
          title: string;
          description: string;
          estimatedHours: number;
        }>;
      };
    }>('/ai/breakdown', {
      method: 'POST',
      body: JSON.stringify({ task }),
    });
  },
};
