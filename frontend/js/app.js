/**
 * TaskFlow Application Controller
 * Group 7 - Frontend Development (Rashika Jagdev Prajapati)
 *
 * Implements Vanilla JavaScript (ES6+) state management, DOM manipulation,
 * role-based routing (User vs Admin), and task CRUD operations.
 */

// ============================================================================
// State Management
// ============================================================================
const state = {
  currentUser: null,
  tasks: [],
  filters: {
    status: 'all',
    priority: 'all',
    search: '',
    sort: 'due_date_asc',
  },
  admin: {
    activeTab: 'users', // 'users' or 'tasks'
    stats: null,
    users: [],
    tasks: [],
  },
  pendingDeleteTaskId: null,
};

// ============================================================================
// Utility Functions
// ============================================================================
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return 'No deadline';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dateString, status) {
  if (!dateString || status === 'Completed') return false;
  const due = new Date(dateString);
  const now = new Date();
  // Clear times to compare dates accurately
  due.setHours(23, 59, 59, 999);
  return due < now;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button type="button" class="toast-close" aria-label="Dismiss">✕</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// ============================================================================
// View Navigation & Router
// ============================================================================
function updateModeBadge() {
  const badge = document.getElementById('mode-toggle-btn');
  const label = document.getElementById('mode-label');
  if (!badge || !label) return;

  if (api.isMockMode()) {
    badge.className = 'mode-badge';
    label.textContent = '⚡ Demo Mock Mode';
    badge.title = 'Running on Mock Adapter. Click to switch to Krishna\'s Live Express Backend.';
  } else {
    badge.className = 'mode-badge api-mode';
    label.textContent = '🔗 Backend API Mode';
    badge.title = 'Targeting Live API (localhost:5000). Click to switch to Demo Mock Mode.';
  }
}

function updateNavigation(user) {
  const navCenter = document.getElementById('nav-center');
  const navAdminLink = document.getElementById('nav-admin-link');
  const userProfileBadge = document.getElementById('user-profile-badge');
  const userDisplayName = document.getElementById('user-display-name');
  const userDisplayRole = document.getElementById('user-display-role');
  const userAvatar = document.getElementById('user-avatar');
  const logoutBtn = document.getElementById('logout-btn');

  if (user) {
    navCenter.style.display = 'flex';
    userProfileBadge.style.display = 'flex';
    logoutBtn.style.display = 'inline-flex';

    userDisplayName.textContent = user.name;
    userDisplayRole.textContent = user.role.toUpperCase();
    userAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();

    if (user.role === 'admin') {
      navAdminLink.style.display = 'inline-flex';
    } else {
      navAdminLink.style.display = 'none';
    }
  } else {
    navCenter.style.display = 'none';
    userProfileBadge.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
}

function navigateTo(viewId) {
  const views = ['auth-view', 'user-dashboard-view', 'admin-dashboard-view'];
  views.forEach((v) => {
    const el = document.getElementById(v);
    if (el) el.classList.remove('active');
  });

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add('active');

  // Update nav active link styles
  const navTasksLink = document.getElementById('nav-tasks-link');
  const navAdminLink = document.getElementById('nav-admin-link');
  if (navTasksLink && navAdminLink) {
    if (viewId === 'admin-dashboard-view') {
      navTasksLink.classList.remove('active');
      navAdminLink.classList.add('active');
    } else if (viewId === 'user-dashboard-view') {
      navTasksLink.classList.add('active');
      navAdminLink.classList.remove('active');
    }
  }
}

// ============================================================================
// Auth Controllers (Login & Registration)
// ============================================================================
function initAuth() {
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginFormContainer = document.getElementById('login-form-container');
  const registerFormContainer = document.getElementById('register-form-container');

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  const quickUserBtn = document.getElementById('quick-demo-user-btn');
  const quickAdminBtn = document.getElementById('quick-demo-admin-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // Tab switching
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginFormContainer.style.display = 'block';
    registerFormContainer.style.display = 'none';
  });

  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerFormContainer.style.display = 'block';
    loginFormContainer.style.display = 'none';
  });

  // Quick Demo Buttons
  quickUserBtn.addEventListener('click', () => {
    document.getElementById('login-email').value = 'user@taskflow.com';
    document.getElementById('login-password').value = 'user123';
    loginForm.dispatchEvent(new Event('submit'));
  });

  quickAdminBtn.addEventListener('click', () => {
    document.getElementById('login-email').value = 'admin@taskflow.com';
    document.getElementById('login-password').value = 'admin123';
    loginForm.dispatchEvent(new Event('submit'));
  });

  // Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-general-error');
    const submitBtn = document.getElementById('login-submit-btn');

    errorEl.textContent = '';

    if (!email || !password) {
      errorEl.textContent = 'Please enter both email and password.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Signing In...</span>';

    try {
      const res = await api.login(email, password);
      state.currentUser = res.user;
      updateNavigation(state.currentUser);
      showToast(`Welcome back, ${res.user.name}!`, 'success');

      if (res.user.role === 'admin') {
        navigateTo('admin-dashboard-view');
        loadAdminDashboard();
      } else {
        navigateTo('user-dashboard-view');
        loadUserDashboard();
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed. Please check credentials.';
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In</span>';
    }
  });

  // Register Submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const errorEl = document.getElementById('reg-general-error');
    const submitBtn = document.getElementById('register-submit-btn');

    errorEl.textContent = '';

    if (!name) {
      errorEl.textContent = 'Please enter your full name.';
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = 'Please enter a valid email address.';
      return;
    }
    if (!password || password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating Account...</span>';

    try {
      const res = await api.register(name, email, password, role);
      state.currentUser = res.user;
      updateNavigation(state.currentUser);
      showToast('Account registered successfully!', 'success');

      if (res.user.role === 'admin') {
        navigateTo('admin-dashboard-view');
        loadAdminDashboard();
      } else {
        navigateTo('user-dashboard-view');
        loadUserDashboard();
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Registration failed.';
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create Account</span>';
    }
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    api.logout();
    state.currentUser = null;
    state.tasks = [];
    updateNavigation(null);
    navigateTo('auth-view');
    showToast('You have been logged out.', 'info');
  });
}

// ============================================================================
// User Dashboard & Task CRUD
// ============================================================================
async function loadUserDashboard() {
  const user = state.currentUser;
  if (!user) return;

  document.getElementById('dash-user-name').textContent = user.name;
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  document.getElementById('dash-date-str').textContent = `Today is ${today} • Group 7 TaskFlow Dashboard`;

  await fetchAndRenderTasks();
}

async function fetchAndRenderTasks() {
  const container = document.getElementById('task-list-container');
  container.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p class="state-desc">Loading your tasks...</p>
    </div>
  `;

  try {
    const tasks = await api.getTasks();
    state.tasks = tasks;
    updateTaskStatistics();
    renderFilteredTasks();
  } catch (err) {
    container.innerHTML = `
      <div class="state-box">
        <div class="state-icon">⚠️</div>
        <div class="state-title">Error Loading Tasks</div>
        <div class="state-desc">${escapeHtml(err.message)}</div>
        <button class="btn btn-primary btn-sm" onclick="fetchAndRenderTasks()">Retry</button>
      </div>
    `;
    showToast('Failed to fetch tasks.', 'error');
  }
}

function updateTaskStatistics() {
  const total = state.tasks.length;
  const pending = state.tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
  const completed = state.tasks.filter((t) => t.status === 'Completed').length;

  document.getElementById('stat-total-tasks').textContent = total;
  document.getElementById('stat-pending-tasks').textContent = pending;
  document.getElementById('stat-completed-tasks').textContent = completed;
}

function getPriorityWeight(p) {
  if (p === 'High') return 3;
  if (p === 'Medium') return 2;
  return 1;
}

function renderFilteredTasks() {
  const container = document.getElementById('task-list-container');
  const countBadge = document.getElementById('task-count-badge');

  let filtered = [...state.tasks];

  // 1. Status Filter
  if (state.filters.status !== 'all') {
    filtered = filtered.filter((t) => t.status.toLowerCase() === state.filters.status.toLowerCase());
  }

  // 2. Priority Filter
  if (state.filters.priority !== 'all') {
    filtered = filtered.filter((t) => t.priority.toLowerCase() === state.filters.priority.toLowerCase());
  }

  // 3. Search Filter
  if (state.filters.search.trim()) {
    const q = state.filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }

  // 4. Sorting
  if (state.filters.sort === 'due_date_asc') {
    filtered.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  } else if (state.filters.sort === 'priority_desc') {
    filtered.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
  } else if (state.filters.sort === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  countBadge.textContent = `${filtered.length} of ${state.tasks.length} items`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="state-box">
        <div class="state-icon">📋</div>
        <div class="state-title">No tasks found</div>
        <div class="state-desc">
          ${
            state.tasks.length === 0
              ? 'You have not created any tasks yet. Click "+ New Task" above to get started!'
              : 'No tasks match your active filters or search keyword. Try adjusting them.'
          }
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((task) => {
      const isDone = task.status === 'Completed';
      const overdue = isOverdue(task.due_date, task.status);

      return `
        <article class="task-card ${isDone ? 'is-completed' : ''} priority-${escapeHtml(task.priority)}" data-task-id="${task.id}">
          <div class="task-main">
            <!-- Quick Complete Toggle -->
            <button type="button" class="task-check-btn" onclick="toggleTaskStatus(${task.id})" title="${isDone ? 'Mark as Pending' : 'Mark as Completed'}" aria-label="Toggle task status">
              ${isDone ? '✓' : ''}
            </button>

            <div class="task-content">
              <div class="task-title-row">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <span class="badge badge-priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span>
                <span class="badge badge-status-${escapeHtml(task.status.replace(/\s+/g, ''))}">${escapeHtml(task.status)}</span>
                ${task.category ? `<span class="badge badge-category">🏷️ ${escapeHtml(task.category)}</span>` : ''}
              </div>

              ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}

              <div class="task-meta">
                <span class="meta-item ${overdue ? 'overdue' : ''}">
                  📅 ${escapeHtml(formatDate(task.due_date))} ${overdue ? '(Overdue!)' : ''}
                </span>
                <span class="meta-item">🕒 Created ${formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="task-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="openEditTaskModal(${task.id})" title="Edit Task">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-icon-only" onclick="openDeleteModal(${task.id})" title="Delete Task" aria-label="Delete Task">
              🗑️
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

// Quick status toggle
window.toggleTaskStatus = async function (taskId) {
  const task = state.tasks.find((t) => t.id === Number(taskId));
  if (!task) return;

  const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';

  try {
    await api.updateTask(taskId, { status: newStatus });
    task.status = newStatus;
    updateTaskStatistics();
    renderFilteredTasks();
    showToast(`Task marked as ${newStatus}!`, 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update task status.', 'error');
  }
};

// ============================================================================
// Modals & Task Form Handling
// ============================================================================
function initModals() {
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  const openCreateBtn = document.getElementById('open-create-task-btn');
  const taskModalCloseBtn = document.getElementById('task-modal-close-btn');
  const taskModalCancelBtn = document.getElementById('task-modal-cancel-btn');

  const deleteModal = document.getElementById('delete-modal');
  const deleteCloseBtn = document.getElementById('delete-modal-close-btn');
  const deleteCancelBtn = document.getElementById('delete-modal-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-modal-confirm-btn');

  // Open Create
  openCreateBtn.addEventListener('click', () => {
    document.getElementById('task-modal-title').textContent = 'Create New Task';
    document.getElementById('task-id-input').value = '';
    taskForm.reset();
    document.getElementById('task-priority-select').value = 'Medium';
    document.getElementById('task-status-select').value = 'Pending';
    document.getElementById('task-title-error').textContent = '';
    document.getElementById('task-form-general-error').textContent = '';
    taskModal.classList.add('active');
  });

  // Close task modal
  const closeTaskModal = () => taskModal.classList.remove('active');
  taskModalCloseBtn.addEventListener('click', closeTaskModal);
  taskModalCancelBtn.addEventListener('click', closeTaskModal);

  // Close delete modal
  const closeDeleteModal = () => {
    deleteModal.classList.remove('active');
    state.pendingDeleteTaskId = null;
  };
  deleteCloseBtn.addEventListener('click', closeDeleteModal);
  deleteCancelBtn.addEventListener('click', closeDeleteModal);

  // Submit Task Form (Create or Edit)
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id-input').value;
    const title = document.getElementById('task-title-input').value.trim();
    const description = document.getElementById('task-desc-input').value.trim();
    const category = document.getElementById('task-category-input').value.trim();
    const priority = document.getElementById('task-priority-select').value;
    const status = document.getElementById('task-status-select').value;
    const due_date = document.getElementById('task-due-date-input').value || null;

    const titleError = document.getElementById('task-title-error');
    const generalError = document.getElementById('task-form-general-error');
    const submitBtn = document.getElementById('task-modal-submit-btn');

    titleError.textContent = '';
    generalError.textContent = '';

    if (!title) {
      titleError.textContent = 'Task title is required.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const payload = { title, description, category, priority, status, due_date };

      if (id) {
        // Edit existing
        const updated = await api.updateTask(id, payload);
        const idx = state.tasks.findIndex((t) => t.id === Number(id));
        if (idx !== -1) state.tasks[idx] = updated;
        showToast('Task updated successfully!', 'success');
      } else {
        // Create new
        const created = await api.createTask(payload);
        state.tasks.unshift(created);
        showToast('Task created successfully!', 'success');
      }

      closeTaskModal();
      updateTaskStatistics();
      renderFilteredTasks();
    } catch (err) {
      generalError.textContent = err.message || 'Failed to save task.';
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Task';
    }
  });

  // Delete Confirm
  deleteConfirmBtn.addEventListener('click', async () => {
    if (!state.pendingDeleteTaskId) return;

    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.textContent = 'Deleting...';

    try {
      await api.deleteTask(state.pendingDeleteTaskId);
      state.tasks = state.tasks.filter((t) => t.id !== Number(state.pendingDeleteTaskId));
      showToast('Task deleted successfully.', 'info');
      closeDeleteModal();
      updateTaskStatistics();
      renderFilteredTasks();
    } catch (err) {
      showToast(err.message || 'Failed to delete task.', 'error');
    } finally {
      deleteConfirmBtn.disabled = false;
      deleteConfirmBtn.textContent = 'Delete Task';
    }
  });
}

// Global modal helpers
window.openEditTaskModal = function (taskId) {
  const task = state.tasks.find((t) => t.id === Number(taskId));
  if (!task) return;

  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-id-input').value = task.id;
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-desc-input').value = task.description || '';
  document.getElementById('task-category-input').value = task.category || '';
  document.getElementById('task-priority-select').value = task.priority || 'Medium';
  document.getElementById('task-status-select').value = task.status || 'Pending';
  document.getElementById('task-due-date-input').value = task.due_date ? task.due_date.split('T')[0] : '';

  document.getElementById('task-title-error').textContent = '';
  document.getElementById('task-form-general-error').textContent = '';

  document.getElementById('task-modal').classList.add('active');
};

window.openDeleteModal = function (taskId) {
  const task = state.tasks.find((t) => t.id === Number(taskId));
  if (!task) return;

  state.pendingDeleteTaskId = taskId;
  document.getElementById('delete-task-name').textContent = `"${task.title}"`;
  document.getElementById('delete-modal').classList.add('active');
};

// ============================================================================
// Admin Dashboard Controller
// ============================================================================
async function loadAdminDashboard() {
  const refreshBtn = document.getElementById('admin-refresh-btn');
  refreshBtn.disabled = true;

  try {
    const [stats, users, tasks] = await Promise.all([
      api.getAdminStats(),
      api.getAdminUsers(),
      api.getAdminTasks(),
    ]);

    state.admin.stats = stats;
    state.admin.users = users;
    state.admin.tasks = tasks;

    renderAdminStats(stats);
    renderAdminUsers(users);
    renderAdminTasks(tasks);
  } catch (err) {
    showToast(err.message || 'Failed to fetch admin data.', 'error');
  } finally {
    refreshBtn.disabled = false;
  }
}

function renderAdminStats(stats) {
  document.getElementById('admin-stat-users').textContent = stats.totalUsers || 0;
  document.getElementById('admin-stat-tasks').textContent = stats.totalTasks || 0;
  document.getElementById('admin-stat-pending').textContent = stats.pendingTasks || 0;
  document.getElementById('admin-stat-completed').textContent = stats.completedTasks || 0;
}

function renderAdminUsers(users) {
  const tbody = document.getElementById('admin-users-tbody');
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users registered yet.</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (u) => `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-priority-High' : 'badge-category'}">${escapeHtml(u.role.toUpperCase())}</span></td>
        <td>${u.tasksCount || 0}</td>
        <td>${u.completedCount || 0}</td>
        <td>${formatDate(u.created_at)}</td>
      </tr>
    `
    )
    .join('');
}

function renderAdminTasks(tasks) {
  const tbody = document.getElementById('admin-tasks-tbody');
  if (!tasks || tasks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No system tasks created yet.</td></tr>';
    return;
  }

  tbody.innerHTML = tasks
    .map(
      (t) => `
      <tr>
        <td><strong>#${t.id}</strong></td>
        <td>${escapeHtml(t.title)}</td>
        <td>👤 ${escapeHtml(t.owner_name || 'User ' + t.user_id)}</td>
        <td>${t.category ? `<span class="badge badge-category">${escapeHtml(t.category)}</span>` : '—'}</td>
        <td><span class="badge badge-priority-${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span></td>
        <td><span class="badge badge-status-${escapeHtml(t.status.replace(/\s+/g, ''))}">${escapeHtml(t.status)}</span></td>
        <td>${formatDate(t.due_date)}</td>
      </tr>
    `
    )
    .join('');
}

function initAdminControls() {
  const adminTabUsersBtn = document.getElementById('admin-tab-users-btn');
  const adminTabTasksBtn = document.getElementById('admin-tab-tasks-btn');
  const adminUsersPanel = document.getElementById('admin-users-panel');
  const adminTasksPanel = document.getElementById('admin-tasks-panel');
  const adminRefreshBtn = document.getElementById('admin-refresh-btn');

  adminTabUsersBtn.addEventListener('click', () => {
    adminTabUsersBtn.classList.add('active');
    adminTabTasksBtn.classList.remove('active');
    adminUsersPanel.style.display = 'block';
    adminTasksPanel.style.display = 'none';
  });

  adminTabTasksBtn.addEventListener('click', () => {
    adminTabTasksBtn.classList.add('active');
    adminTabUsersBtn.classList.remove('active');
    adminTasksPanel.style.display = 'block';
    adminUsersPanel.style.display = 'none';
  });

  adminRefreshBtn.addEventListener('click', () => {
    loadAdminDashboard();
    showToast('Admin data refreshed.', 'info');
  });
}

// ============================================================================
// Filter & Search Toolbar Event Listeners
// ============================================================================
function initToolbarFilters() {
  // Status pills
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.filters.status = pill.getAttribute('data-status');
      renderFilteredTasks();
    });
  });

  // Priority select
  const prioritySelect = document.getElementById('priority-filter-select');
  prioritySelect.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    renderFilteredTasks();
  });

  // Sort select
  const sortSelect = document.getElementById('task-sort-select');
  sortSelect.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    renderFilteredTasks();
  });

  // Search input
  const searchInput = document.getElementById('task-search-input');
  searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderFilteredTasks();
  });

  // Navigation Links
  document.getElementById('nav-tasks-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('user-dashboard-view');
    loadUserDashboard();
  });

  document.getElementById('nav-admin-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('admin-dashboard-view');
    loadAdminDashboard();
  });

  document.getElementById('brand-link').addEventListener('click', (e) => {
    e.preventDefault();
    if (state.currentUser) {
      if (state.currentUser.role === 'admin') {
        navigateTo('admin-dashboard-view');
        loadAdminDashboard();
      } else {
        navigateTo('user-dashboard-view');
        loadUserDashboard();
      }
    } else {
      navigateTo('auth-view');
    }
  });

  // Mode Switcher Button
  document.getElementById('mode-toggle-btn').addEventListener('click', () => {
    const currentMode = api.isMockMode();
    api.setMockMode(!currentMode);
    updateModeBadge();
    showToast(`Switched to ${!currentMode ? 'Demo Mock Mode' : 'Live Backend API Mode'}.`, 'info');

    if (state.currentUser) {
      if (state.currentUser.role === 'admin') {
        loadAdminDashboard();
      } else {
        fetchAndRenderTasks();
      }
    }
  });
}

// ============================================================================
// Application Bootstrapper
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  updateModeBadge();
  initAuth();
  initModals();
  initAdminControls();
  initToolbarFilters();

  // Check persisted session
  const storedUser = api.getCurrentUser();
  if (storedUser) {
    state.currentUser = storedUser;
    updateNavigation(storedUser);

    if (storedUser.role === 'admin') {
      navigateTo('admin-dashboard-view');
      await loadAdminDashboard();
    } else {
      navigateTo('user-dashboard-view');
      await loadUserDashboard();
    }
  } else {
    updateNavigation(null);
    navigateTo('auth-view');
  }
});
