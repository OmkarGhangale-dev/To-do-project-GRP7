/**
 * TaskFlow Application Controller — Group 7 Official Frontend
 * Pure Vanilla JavaScript (ES6+) Implementation
 * 
 * Features:
 *  - Collapsible Sidebar Navigation & Mobile Drawer
 *  - Reactive SVG Analytics Charts (User & Admin Dashboards)
 *  - Complete Task CRUD & Quick Completion Toggles
 *  - Real-time KPI Calculation (Total, In Progress, Completed, Overdue)
 *  - Instant Multi-Field Search, Priority Filter & Sorting
 *  - Role-guarded Admin Console (Users Table & System Tasks)
 *  - Pluggable Mock/Live API Client Integration
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
// Utilities
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
  due.setHours(23, 59, 59, 999);
  return due < now;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <span>${icons[type] || 'ℹ️'}</span>
    <span class="toast-item-text">${escapeHtml(message)}</span>
    <button type="button" class="toast-item-close" aria-label="Dismiss">✕</button>
  `;

  toast.querySelector('.toast-item-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }
  }, 4000);
}

// ============================================================================
// SVG Chart Rendering Engine (Zero External Dependencies)
// ============================================================================
function renderDonutChart(containerId, legendId, data) {
  const container = document.getElementById(containerId);
  const legend = document.getElementById(legendId);
  if (!container) return;

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        <span>No task data available</span>
      </div>
    `;
    if (legend) legend.innerHTML = '';
    return;
  }

  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = -90; // Start at top

  let pathsSvg = '';
  data.forEach((item) => {
    if (item.value === 0) return;
    const ratio = item.value / total;
    const strokeDasharray = `${ratio * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedAngle + 90) / 360) * circumference;

    pathsSvg += `
      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${radius}"
        fill="transparent"
        stroke="${item.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        style="transition: stroke-dasharray 0.5s ease;"
      />
    `;
    accumulatedAngle += ratio * 360;
  });

  const completedItem = data.find((d) => d.label === 'Completed');
  const percentComplete = completedItem ? Math.round((completedItem.value / total) * 100) : 0;

  container.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="transparent" stroke="#f1f5f9" stroke-width="${strokeWidth}" />
      ${pathsSvg}
      <text x="${size / 2}" y="${size / 2 - 2}" text-anchor="middle" dominant-baseline="central" font-size="24" font-weight="800" fill="#2a3547">
        ${percentComplete}%
      </text>
      <text x="${size / 2}" y="${size / 2 + 20}" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="600" fill="#7c8fac">
        Done
      </text>
    </svg>
  `;

  if (legend) {
    legend.innerHTML = data
      .map(
        (item) => `
        <span class="legend-item">
          <span class="legend-dot" style="background:${item.color};"></span>
          ${escapeHtml(item.label)}: <strong>${item.value}</strong>
        </span>
      `
      )
      .join('');
  }
}

function renderPriorityBarChart(containerId, priorityCounts) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const items = [
    { label: 'High', count: priorityCounts.High || 0, color: '#fa896b' },
    { label: 'Medium', count: priorityCounts.Medium || 0, color: '#5d87ff' },
    { label: 'Low', count: priorityCounts.Low || 0, color: '#13deb9' },
  ];

  const maxVal = Math.max(...items.map((i) => i.count), 4);
  const chartHeight = 160;
  const barWidth = 44;

  const barsSvg = items
    .map((item, index) => {
      const height = (item.count / maxVal) * chartHeight;
      const y = chartHeight - height + 20;
      const x = 45 + index * 105;

      return `
      <g>
        <!-- Background guide bar -->
        <rect x="${x}" y="20" width="${barWidth}" height="${chartHeight}" rx="8" fill="#f8fafc" />
        <!-- Actual colored bar -->
        <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="${item.color}" style="transition: height 0.5s ease;">
          <title>${item.label}: ${item.count} tasks</title>
        </rect>
        <!-- Value text above bar -->
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="13" font-weight="800" fill="#2a3547">
          ${item.count}
        </text>
        <!-- Category label below bar -->
        <text x="${x + barWidth / 2}" y="${chartHeight + 40}" text-anchor="middle" font-size="12" font-weight="700" fill="#7c8fac">
          ${item.label}
        </text>
      </g>
    `;
    })
    .join('');

  container.innerHTML = `
    <svg width="100%" height="220" viewBox="0 0 350 220" style="overflow: visible;">
      ${barsSvg}
    </svg>
  `;
}

function renderAdminUserWorkloadChart(containerId, users) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!users || users.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No user workload data.</p>';
    return;
  }

  const displayUsers = users.slice(0, 5); // top 5 users
  const maxTasks = Math.max(...displayUsers.map((u) => u.tasksCount || 0), 4);
  const chartHeight = 150;
  const colWidth = 26;

  const groupsSvg = displayUsers
    .map((u, index) => {
      const totalH = ((u.tasksCount || 0) / maxTasks) * chartHeight;
      const compH = ((u.completedCount || 0) / maxTasks) * chartHeight;
      const baseX = 30 + index * 65;
      const yTotal = chartHeight - totalH + 20;
      const yComp = chartHeight - compH + 20;
      const firstName = u.name.split(' ')[0];

      return `
      <g>
        <!-- Total Tasks Bar -->
        <rect x="${baseX}" y="${yTotal}" width="${colWidth / 2}" height="${totalH}" rx="3" fill="#5d87ff">
          <title>${u.name} (Total: ${u.tasksCount})</title>
        </rect>
        <!-- Completed Tasks Bar -->
        <rect x="${baseX + colWidth / 2 + 2}" y="${yComp}" width="${colWidth / 2}" height="${compH}" rx="3" fill="#13deb9">
          <title>${u.name} (Completed: ${u.completedCount})</title>
        </rect>
        <!-- Name label below -->
        <text x="${baseX + colWidth / 2}" y="${chartHeight + 36}" text-anchor="middle" font-size="10" font-weight="700" fill="#7c8fac">
          ${escapeHtml(firstName)}
        </text>
      </g>
    `;
    })
    .join('');

  container.innerHTML = `
    <svg width="100%" height="210" viewBox="0 0 360 210">
      ${groupsSvg}
    </svg>
  `;
}

// ============================================================================
// View Navigation & App State Sync
// ============================================================================
function updateModeBadge() {
  const btn = document.getElementById('mode-toggle-btn');
  const label = document.getElementById('mode-pill-label');
  if (!btn || !label) return;

  if (api.isMockMode()) {
    btn.className = 'mode-pill';
    label.textContent = '⚡ Demo Mock Mode';
    btn.title = 'Running on LocalStorage Mock Adapter. Click to switch to Krishna\'s Live Express Backend.';
  } else {
    btn.className = 'mode-pill api-mode';
    label.textContent = '🔗 Backend API Mode';
    btn.title = 'Targeting Live API (localhost:5000). Click to switch to Demo Mock Mode.';
  }
}

function updateNavigation(user) {
  const sidebar = document.getElementById('app-sidebar');
  const userFooter = document.getElementById('sidebar-user-footer');
  const adminSection = document.getElementById('sidebar-admin-section');
  const logoutBtn = document.getElementById('header-logout-btn');

  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarCharEl = document.getElementById('sidebar-avatar-char');

  if (user) {
    sidebar.style.display = 'flex';
    userFooter.style.display = 'flex';
    logoutBtn.style.display = 'inline-flex';

    nameEl.textContent = user.name;
    roleEl.textContent = (user.role || 'USER').toUpperCase();
    avatarCharEl.textContent = (user.name || 'U').charAt(0).toUpperCase();

    if (user.role === 'admin') {
      adminSection.style.display = 'block';
    } else {
      adminSection.style.display = 'none';
    }
  } else {
    sidebar.style.display = 'none';
    userFooter.style.display = 'none';
    adminSection.style.display = 'none';
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

  // Update sidebar active buttons
  const navBtns = document.querySelectorAll('.nav-item-btn');
  navBtns.forEach((btn) => {
    const target = btn.getAttribute('data-target');
    if (target === viewId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Close mobile sidebar if open
  document.getElementById('app-sidebar').classList.remove('mobile-open');
}

// ============================================================================
// Auth Controllers (Login & Registration)
// ============================================================================
function initAuth() {
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginContainer = document.getElementById('login-form-container');
  const registerContainer = document.getElementById('register-form-container');

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  const quickUserBtn = document.getElementById('quick-demo-user-btn');
  const quickAdminBtn = document.getElementById('quick-demo-admin-btn');
  const logoutBtn = document.getElementById('header-logout-btn');

  // Tabs
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginContainer.style.display = 'block';
    registerContainer.style.display = 'none';
  });

  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerContainer.style.display = 'block';
    loginContainer.style.display = 'none';
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
      errorEl.textContent = 'Please enter both your email address and password.';
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
      errorEl.textContent = err.message || 'Login failed. Please verify credentials.';
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
      errorEl.textContent = 'Please provide your full name.';
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
  document.getElementById('hero-greeting-text').textContent = getGreeting();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  document.getElementById('hero-date-text').textContent = `📅 Today is ${today}`;

  await fetchAndRenderTasks();
}

async function fetchAndRenderTasks() {
  const container = document.getElementById('task-items-container');
  container.innerHTML = `
    <div class="empty-state-card">
      <div class="spinner-ring"></div>
      <p class="empty-state-desc">Loading your milestones...</p>
    </div>
  `;

  try {
    const tasks = await api.getTasks();
    state.tasks = tasks;
    updateTaskStatisticsAndCharts();
    renderFilteredTasks();
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Error Loading Tasks</div>
        <div class="empty-state-desc">${escapeHtml(err.message)}</div>
        <button class="btn btn-primary btn-sm" onclick="fetchAndRenderTasks()">Retry</button>
      </div>
    `;
    showToast('Failed to load tasks.', 'error');
  }
}

function updateTaskStatisticsAndCharts() {
  const tasks = state.tasks;
  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress' || t.status === 'Pending').length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;

  // Update KPI counters
  document.getElementById('kpi-total-tasks').textContent = total;
  document.getElementById('kpi-pending-tasks').textContent = inProgress;
  document.getElementById('kpi-completed-tasks').textContent = completed;
  document.getElementById('kpi-overdue-tasks').textContent = overdue;

  // Update sidebar pending badge
  const pendingCount = tasks.filter((t) => t.status !== 'Completed').length;
  document.getElementById('sidebar-task-count').textContent = pendingCount;

  // Render Chart 1: Status Donut
  const pendingOnly = tasks.filter((t) => t.status === 'Pending').length;
  const progressOnly = tasks.filter((t) => t.status === 'In Progress').length;

  renderDonutChart('user-status-donut-chart', 'user-status-donut-legend', [
    { label: 'Completed', value: completed, color: '#13deb9' },
    { label: 'In Progress', value: progressOnly, color: '#5d87ff' },
    { label: 'Pending', value: pendingOnly, color: '#ffae1f' },
  ]);

  // Render Chart 2: Priority Bar Chart
  const priorityCounts = {
    High: tasks.filter((t) => t.priority === 'High').length,
    Medium: tasks.filter((t) => t.priority === 'Medium').length,
    Low: tasks.filter((t) => t.priority === 'Low').length,
  };
  renderPriorityBarChart('user-priority-bar-chart', priorityCounts);
}

function getPriorityWeight(p) {
  if (p === 'High') return 3;
  if (p === 'Medium') return 2;
  return 1;
}

function renderFilteredTasks() {
  const container = document.getElementById('task-items-container');
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

  // 4. Sort
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
      <div class="empty-state-card">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No tasks found</div>
        <div class="empty-state-desc">
          ${
            state.tasks.length === 0
              ? 'You have not created any tasks yet. Click "+ Create New Task" above to kick off your sprint!'
              : 'No tasks match your active filter criteria. Try clearing search or selecting "All".'
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
        <article class="task-card-item ${isDone ? 'is-completed' : ''} prio-${escapeHtml(task.priority)}" data-task-id="${task.id}">
          <div class="task-left-section">
            <button type="button" class="task-checkbox-btn" onclick="toggleTaskStatus(${task.id})" title="${isDone ? 'Reopen task' : 'Mark as Completed'}" aria-label="Toggle task completion">
              ${isDone ? '✓' : ''}
            </button>

            <div class="task-content-section">
              <div class="task-heading-row">
                <span class="task-title-text">${escapeHtml(task.title)}</span>
                <span class="badge-pill badge-prio-${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span>
                <span class="badge-pill badge-status-${escapeHtml(task.status.replace(/\s+/g, ''))}">${escapeHtml(task.status)}</span>
                ${task.category ? `<span class="badge-pill badge-tag-category">🏷️ ${escapeHtml(task.category)}</span>` : ''}
              </div>

              ${task.description ? `<p class="task-desc-text">${escapeHtml(task.description)}</p>` : ''}

              <div class="task-meta-row">
                <span class="meta-chip ${overdue ? 'overdue-alert' : ''}">
                  📅 ${escapeHtml(formatDate(task.due_date))} ${overdue ? '(Overdue!)' : ''}
                </span>
                <span class="meta-chip">🕒 Created ${formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>

          <div class="task-right-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="openEditTaskModal(${task.id})" title="Edit Task Details">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="openDeleteModal(${task.id})" title="Delete Task" aria-label="Delete Task">
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
    updateTaskStatisticsAndCharts();
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

  // Open Create Modal
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

  const closeTaskModal = () => taskModal.classList.remove('active');
  taskModalCloseBtn.addEventListener('click', closeTaskModal);
  taskModalCancelBtn.addEventListener('click', closeTaskModal);

  const closeDeleteModal = () => {
    deleteModal.classList.remove('active');
    state.pendingDeleteTaskId = null;
  };
  deleteCloseBtn.addEventListener('click', closeDeleteModal);
  deleteCancelBtn.addEventListener('click', closeDeleteModal);

  // Submit Task Form
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
        const updated = await api.updateTask(id, payload);
        const idx = state.tasks.findIndex((t) => t.id === Number(id));
        if (idx !== -1) state.tasks[idx] = updated;
        showToast('Task updated successfully!', 'success');
      } else {
        const created = await api.createTask(payload);
        state.tasks.unshift(created);
        showToast('Task created successfully!', 'success');
      }

      closeTaskModal();
      updateTaskStatisticsAndCharts();
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
      updateTaskStatisticsAndCharts();
      renderFilteredTasks();
    } catch (err) {
      showToast(err.message || 'Failed to delete task.', 'error');
    } finally {
      deleteConfirmBtn.disabled = false;
      deleteConfirmBtn.textContent = 'Delete Task';
    }
  });
}

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

    renderAdminStatsAndCharts(stats, users, tasks);
    renderAdminUsersTable(users);
    renderAdminTasksTable(tasks);
  } catch (err) {
    showToast(err.message || 'Failed to fetch admin platform data.', 'error');
  } finally {
    refreshBtn.disabled = false;
  }
}

function renderAdminStatsAndCharts(stats, users, tasks) {
  document.getElementById('admin-stat-users').textContent = stats.totalUsers || 0;
  document.getElementById('admin-stat-tasks').textContent = stats.totalTasks || 0;
  document.getElementById('admin-stat-pending').textContent = stats.pendingTasks || 0;
  document.getElementById('admin-stat-completed').textContent = stats.completedTasks || 0;

  // Admin Chart 1: Status Donut
  renderDonutChart('admin-status-donut-chart', 'admin-status-donut-legend', [
    { label: 'Completed', value: stats.completedTasks || 0, color: '#13deb9' },
    { label: 'Pending', value: stats.pendingTasks || 0, color: '#ffae1f' },
  ]);

  // Admin Chart 2: User Workload
  renderAdminUserWorkloadChart('admin-user-bar-chart', users);
}

function renderAdminUsersTable(users) {
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
        <td>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="user-avatar-circle" style="width:28px;height:28px;font-size:0.75rem;">
              ${escapeHtml(u.name.charAt(0).toUpperCase())}
            </span>
            <span>${escapeHtml(u.name)}</span>
          </div>
        </td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge-pill ${u.role === 'admin' ? 'badge-prio-High' : 'badge-tag-category'}">${escapeHtml(u.role.toUpperCase())}</span></td>
        <td><strong>${u.tasksCount || 0}</strong></td>
        <td><span style="color:var(--color-success);font-weight:700;">${u.completedCount || 0}</span></td>
        <td>${formatDate(u.created_at)}</td>
      </tr>
    `
    )
    .join('');
}

function renderAdminTasksTable(tasks) {
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
        <td><strong>${escapeHtml(t.title)}</strong></td>
        <td>👤 ${escapeHtml(t.owner_name || 'User ' + t.user_id)}</td>
        <td>${t.category ? `<span class="badge-pill badge-tag-category">${escapeHtml(t.category)}</span>` : '—'}</td>
        <td><span class="badge-pill badge-prio-${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span></td>
        <td><span class="badge-pill badge-status-${escapeHtml(t.status.replace(/\s+/g, ''))}">${escapeHtml(t.status)}</span></td>
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
    showToast('Platform data refreshed.', 'info');
  });
}

// ============================================================================
// Sidebar, Mobile Drawer & Toolbar Filters
// ============================================================================
function initSidebarAndToolbars() {
  const sidebar = document.getElementById('app-sidebar');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

  mobileToggle.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  sidebarCloseBtn.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
  });

  // Sidebar navigation buttons
  document.getElementById('nav-btn-dashboard').addEventListener('click', () => {
    navigateTo('user-dashboard-view');
    loadUserDashboard();
  });

  document.getElementById('nav-btn-tasks').addEventListener('click', () => {
    navigateTo('user-dashboard-view');
    const listSection = document.getElementById('task-list-section');
    if (listSection) listSection.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('scroll-to-tasks-btn').addEventListener('click', () => {
    const listSection = document.getElementById('task-list-section');
    if (listSection) listSection.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('nav-btn-admin-overview').addEventListener('click', () => {
    navigateTo('admin-dashboard-view');
    loadAdminDashboard();
  });

  document.getElementById('nav-btn-admin-users').addEventListener('click', () => {
    navigateTo('admin-dashboard-view');
    document.getElementById('admin-tab-users-btn').click();
    loadAdminDashboard();
  });

  document.getElementById('nav-btn-admin-tasks').addEventListener('click', () => {
    navigateTo('admin-dashboard-view');
    document.getElementById('admin-tab-tasks-btn').click();
    loadAdminDashboard();
  });

  document.getElementById('brand-home-link').addEventListener('click', (e) => {
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

  // Status pills
  const pills = document.querySelectorAll('.filter-pill-btn');
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

  // Search inputs (both toolbar and top header search)
  const taskSearchInput = document.getElementById('task-search-input');
  taskSearchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderFilteredTasks();
  });

  const topSearchInput = document.getElementById('top-search-input');
  topSearchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    taskSearchInput.value = e.target.value;
    if (!document.getElementById('user-dashboard-view').classList.contains('active')) {
      navigateTo('user-dashboard-view');
    }
    renderFilteredTasks();
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
  initSidebarAndToolbars();

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
