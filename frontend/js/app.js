/**
 * TASKFLOW PRO — Group 7 Official Application Controller
 * Pure Vanilla JavaScript (ES6+) Implementation
 * 
 * Faithfully ports every visual detail, SVG chart, and interaction
 * from the original downloaded TaskFlow project.
 */

// ============================================================================
// State Management
// ============================================================================
const state = {
  currentUser: null,
  activeRole: 'user', // 'user' or 'admin'
  currentPage: 'overview', // 'overview', 'tasks', 'admin-overview', 'admin-users', 'admin-tasks'
  isSidebarCollapsed: false,
  tasks: [],
  filters: {
    search: '',
    status: 'All',
    priority: 'All',
    category: 'All',
  },
  admin: {
    activeTab: 'users',
    stats: null,
    users: [],
    tasks: [],
  },
  pendingDeleteTaskId: null,
};

// ============================================================================
// Utilities & Formatting
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

function formatDate(dateStr) {
  if (!dateStr) return 'No deadline';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dateStr, status) {
  if (!dateStr || status === 'Completed') return false;
  const due = new Date(dateStr);
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

  const toast = document.createElement('div');
  toast.className = `toast-bubble ${type}`;
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#13DEB9' : type === 'error' ? '#FA896B' : '#5D87FF'}" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0;">
      ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
    </svg>
    <span style="flex:1;">${escapeHtml(message)}</span>
    <button type="button" style="background:none;border:none;color:#94A3B8;cursor:pointer;padding:2px;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s';
      setTimeout(() => toast.remove(), 250);
    }
  }, 3500);
}

// ============================================================================
// SVG Chart Rendering (Exact Visual Replica from TaskFlow Reference)
// ============================================================================
function renderWeeklyVelocityBars(containerId, tasks) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 7-day velocity data from reference
  const weeklyData = [
    { day: 'Mon', created: 4, completed: 3 },
    { day: 'Tue', created: 3, completed: 5 },
    { day: 'Wed', created: 6, completed: 4 },
    { day: 'Thu', created: 5, completed: 7 },
    { day: 'Fri', created: 4, completed: 6 },
    { day: 'Sat', created: 1, completed: 2 },
    { day: 'Sun', created: 2, completed: 1 },
  ];

  // Dynamically adjust Wednesday based on actual completed count
  const compCount = tasks.filter((t) => t.status === 'Completed').length;
  weeklyData[2].completed = Math.max(compCount, 2);

  const maxVal = Math.max(...weeklyData.map((d) => Math.max(d.created, d.completed)), 8);

  const barsHtml = weeklyData
    .map((d) => {
      const createdHeight = (d.created / maxVal) * 100;
      const completedHeight = (d.completed / maxVal) * 100;

      return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px;">
        <div style="width:100%; height:160px; display:flex; align-items:flex-end; justify-content:center; gap:6px;">
          <!-- Created Bar -->
          <div style="height:${createdHeight}%; width:14px; background:rgba(93,135,255,0.85); border-radius:4px 4px 0 0; transition:height 0.4s ease;" title="${d.day} Created: ${d.created}"></div>
          <!-- Completed Bar -->
          <div style="height:${completedHeight}%; width:14px; background:rgba(19,222,185,0.85); border-radius:4px 4px 0 0; transition:height 0.4s ease;" title="${d.day} Completed: ${d.completed}"></div>
        </div>
        <span style="font-size:11px; font-weight:700; color:#94A3B8;">${d.day}</span>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <div style="width:100%; display:flex; align-items:flex-end; justify-content:space-between; gap:12px; padding:0 10px;">
      ${barsHtml}
    </div>
  `;
}

function renderStatusDonutChart(containerId, legendId, completed, inProgress, pending) {
  const container = document.getElementById(containerId);
  const legend = document.getElementById(legendId);
  if (!container) return;

  const total = completed + inProgress + pending;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const compRatio = total > 0 ? completed / total : 0;
  const progRatio = total > 0 ? inProgress / total : 0;
  const pendRatio = total > 0 ? pending / total : 0;

  const compDash = `${compRatio * circumference} ${circumference}`;
  const progDash = `${progRatio * circumference} ${circumference}`;
  const pendDash = `${pendRatio * circumference} ${circumference}`;

  const progOffset = -(compRatio * circumference);
  const pendOffset = -((compRatio + progRatio) * circumference);

  container.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#F1F5F9" stroke-width="${strokeWidth}" />
      ${completed > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#13DEB9" stroke-width="${strokeWidth}" stroke-dasharray="${compDash}" stroke-dashoffset="0" style="transition: stroke-dasharray 0.5s ease;" />` : ''}
      ${inProgress > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#5D87FF" stroke-width="${strokeWidth}" stroke-dasharray="${progDash}" stroke-dashoffset="${progOffset}" style="transition: stroke-dasharray 0.5s ease;" />` : ''}
      ${pending > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#FFAE1F" stroke-width="${strokeWidth}" stroke-dasharray="${pendDash}" stroke-dashoffset="${pendOffset}" style="transition: stroke-dasharray 0.5s ease;" />` : ''}
    </svg>
    <div style="position:absolute; display:flex; flex-direction:column; align-items:center; justify-content:center;">
      <span style="font-size:22px; font-weight:800; color:#0F172A; line-height:1;">${rate}%</span>
      <span style="font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; margin-top:2px;">Complete</span>
    </div>
  `;

  if (legend) {
    legend.innerHTML = `
      <span class="legend-chip-item"><span class="legend-dot-circle" style="background:#13DEB9;"></span> Completed: <strong>${completed}</strong></span>
      <span class="legend-chip-item"><span class="legend-dot-circle" style="background:#5D87FF;"></span> In Progress: <strong>${inProgress}</strong></span>
      <span class="legend-chip-item"><span class="legend-dot-circle" style="background:#FFAE1F;"></span> Pending: <strong>${pending}</strong></span>
    `;
  }
}

function renderAdminWorkloadChart(containerId, users) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!users || users.length === 0) {
    container.innerHTML = '<span style="color:#94A3B8;font-size:11px;">No registered accounts</span>';
    return;
  }

  const list = users.slice(0, 6);
  const maxTasks = Math.max(...list.map((u) => u.tasksCount || 0), 4);

  const bars = list
    .map((u) => {
      const h = ((u.tasksCount || 0) / maxTasks) * 100;
      const ch = ((u.completedCount || 0) / maxTasks) * 100;
      const name = u.name.split(' ')[0];

      return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px;">
        <div style="height:150px; display:flex; align-items:flex-end; justify-content:center; gap:4px; width:100%;">
          <div style="height:${h}%; width:12px; background:#5D87FF; border-radius:3px 3px 0 0;" title="${u.name} (Total: ${u.tasksCount})"></div>
          <div style="height:${ch}%; width:12px; background:#13DEB9; border-radius:3px 3px 0 0;" title="${u.name} (Done: ${u.completedCount})"></div>
        </div>
        <span style="font-size:10px; font-weight:700; color:#94A3B8;">${escapeHtml(name)}</span>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <div style="width:100%; display:flex; align-items:flex-end; justify-content:space-between; gap:8px; padding:0 8px;">
      ${bars}
    </div>
  `;
}

// ============================================================================
// Navigation, Roles & View Switching
// ============================================================================
function navigateTo(pageId) {
  state.currentPage = pageId;

  // View Panels
  const viewAuth = document.getElementById('view-auth');
  const viewUserDash = document.getElementById('view-dashboard-overview');
  const viewAdminDash = document.getElementById('view-admin-overview');
  const sidebar = document.getElementById('app-sidebar');
  const header = document.getElementById('top-header-bar');
  const headerTitle = document.getElementById('header-page-title');
  const headerPortalTag = document.getElementById('header-portal-tag');

  [viewAuth, viewUserDash, viewAdminDash].forEach((el) => el.classList.remove('active'));

  if (!state.currentUser) {
    viewAuth.classList.add('active');
    sidebar.style.display = 'none';
    header.style.display = 'none';
    return;
  }

  sidebar.style.display = 'flex';
  header.style.display = 'flex';

  // Toggle active view panel
  if (pageId.startsWith('admin')) {
    viewAdminDash.classList.add('active');
    headerTitle.textContent = pageId === 'admin-users' ? 'User Management' : pageId === 'admin-tasks' ? 'All System Tasks' : 'Admin Portal Overview';
    headerPortalTag.textContent = 'Admin Portal';
    headerPortalTag.style.backgroundColor = '#111C2D';
    headerPortalTag.style.color = '#ffffff';
    loadAdminDashboard();
  } else {
    viewUserDash.classList.add('active');
    headerTitle.textContent = pageId === 'tasks' ? 'My Tasks' : 'Dashboard Overview';
    headerPortalTag.textContent = 'G7 Workspace';
    headerPortalTag.style.backgroundColor = '#ECF2FF';
    headerPortalTag.style.color = '#5D87FF';
    loadUserDashboard();

    if (pageId === 'tasks') {
      const catalog = document.getElementById('catalog-section-anchor');
      if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Update active sidebar buttons
  const btns = document.querySelectorAll('.sidebar-menu-item-btn');
  btns.forEach((b) => {
    if (b.getAttribute('data-page') === pageId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

function updateSidebarForRole(role) {
  const sidebar = document.getElementById('app-sidebar');
  const userNav = document.getElementById('user-sidebar-nav');
  const adminNav = document.getElementById('admin-sidebar-nav');
  const brandTag = document.getElementById('brand-role-tag');
  const brandSub = document.getElementById('brand-sub-title');
  const roleToggleText = document.getElementById('role-toggle-text');
  const roleToggleBtn = document.getElementById('btn-role-toggle');

  if (role === 'admin') {
    sidebar.classList.add('admin-mode');
    userNav.style.display = 'none';
    adminNav.style.display = 'block';
    brandTag.className = 'brand-tag-admin';
    brandTag.textContent = 'ADMIN';
    brandSub.textContent = 'Enterprise Console';
    roleToggleText.textContent = 'User Workspace';
    roleToggleBtn.classList.add('admin-active');
  } else {
    sidebar.classList.remove('admin-mode');
    userNav.style.display = 'block';
    adminNav.style.display = 'none';
    brandTag.className = 'brand-tag-pro';
    brandTag.textContent = 'PRO';
    brandSub.textContent = 'Team G7 SaaS';
    roleToggleText.textContent = 'Admin Portal';
    roleToggleBtn.classList.remove('admin-active');
  }
}

// ============================================================================
// User Dashboard Controller
// ============================================================================
async function loadUserDashboard() {
  const user = state.currentUser;
  if (!user) return;

  const firstName = (user.name || 'Alex').split(' ')[0];
  document.getElementById('dash-user-firstname').textContent = firstName;
  document.getElementById('dash-greeting-phrase').textContent = getGreeting();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const dateEl = document.getElementById('dash-date-str');
  if (dateEl) {
    dateEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
      <span>${today}</span>
    `;
  }

  await fetchAndRenderUserTasks();
}

async function fetchAndRenderUserTasks() {
  try {
    const tasks = await api.getTasks();
    state.tasks = tasks;
    updateDashboardMetricsAndCharts();
    renderTaskTable();
  } catch (err) {
    showToast(err.message || 'Error fetching tasks.', 'error');
  }
}

function updateDashboardMetricsAndCharts() {
  const tasks = state.tasks;
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const pending = tasks.filter((t) => t.status === 'Pending').length;
  const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;

  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Hero Card Velocity Widget
  document.getElementById('hero-completion-pct').textContent = `${rate}%`;
  document.getElementById('hero-done-ratio').textContent = `${completed} of ${total} Done`;
  document.getElementById('hero-svg-donut-fill').setAttribute('stroke-dasharray', `${rate}, 100`);
  document.getElementById('hero-scheduled-count').textContent = `${tasks.filter((t) => t.status !== 'Completed').length} tasks scheduled`;
  document.getElementById('hero-overdue-count').textContent = `${overdue} overdue milestone${overdue === 1 ? '' : 's'}`;

  // 4 StatCards
  document.getElementById('kpi-total-val').textContent = total;
  document.getElementById('kpi-completed-val').textContent = completed;
  document.getElementById('kpi-completion-rate-chip').textContent = `${rate}% rate`;
  document.getElementById('kpi-pending-val').textContent = inProgress + pending;
  document.getElementById('kpi-overdue-val').textContent = overdue;

  // Sidebar badge
  const pendingOnly = tasks.filter((t) => t.status !== 'Completed').length;
  document.getElementById('sidebar-task-badge').textContent = pendingOnly;

  // SVG Charts
  renderWeeklyVelocityBars('chart-user-velocity-bars', tasks);
  renderStatusDonutChart('chart-user-status-donut', 'legend-user-status', completed, inProgress, pending);
}

function renderTaskTable() {
  const tbody = document.getElementById('task-table-tbody');
  const totalBadge = document.getElementById('catalog-total-badge');
  const showingText = document.getElementById('catalog-showing-text');
  if (!tbody) return;

  let filtered = [...state.tasks];

  // Search filter
  if (state.filters.search.trim()) {
    const q = state.filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }

  // Status filter
  if (state.filters.status !== 'All') {
    filtered = filtered.filter((t) => t.status.toLowerCase() === state.filters.status.toLowerCase());
  }

  // Priority filter
  if (state.filters.priority !== 'All') {
    filtered = filtered.filter((t) => t.priority.toLowerCase() === state.filters.priority.toLowerCase());
  }

  // Category filter
  if (state.filters.category !== 'All') {
    filtered = filtered.filter((t) => t.category.toLowerCase() === state.filters.category.toLowerCase());
  }

  totalBadge.textContent = `${filtered.length} ${filtered.length === 1 ? 'task' : 'tasks'}`;
  showingText.textContent = `Showing ${filtered.length} of ${state.tasks.length} items`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:3rem 1.5rem; color:#94A3B8;">
          <div style="font-size:24px; margin-bottom:0.5rem;">📋</div>
          <div style="font-weight:700; color:#334155; font-size:1rem;">No tasks match your filter criteria</div>
          <div style="font-size:0.85rem; margin-top:0.25rem;">Try clearing the search query or selecting "All Statuses".</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((task) => {
      const isDone = task.status === 'Completed';
      const overdue = isOverdue(task.due_date, task.status);

      return `
      <tr data-task-id="${task.id}">
        <!-- Checkbox -->
        <td style="width:40px;">
          <button type="button" class="task-check-circle-btn ${isDone ? 'done' : ''}" onclick="toggleTaskStatus(${task.id})" title="${isDone ? 'Mark as Pending' : 'Mark as Completed'}">
            ${isDone ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </button>
        </td>

        <!-- Title & Notes -->
        <td>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-weight:700; color:#0F172A; font-size:0.92rem; ${isDone ? 'text-decoration:line-through;color:#94A3B8;' : ''}">
              ${escapeHtml(task.title)}
            </span>
            ${task.description ? `<span style="font-size:11px; color:#64748B;">${escapeHtml(task.description)}</span>` : ''}
          </div>
        </td>

        <!-- Category -->
        <td>
          <span class="badge-task-category">${escapeHtml(task.category || 'General')}</span>
        </td>

        <!-- Priority -->
        <td>
          <span class="badge-task-priority ${escapeHtml(task.priority)}">
            <span style="width:6px;height:6px;border-radius:50%;background:currentColor;"></span>
            ${escapeHtml(task.priority)}
          </span>
        </td>

        <!-- Status -->
        <td>
          <span class="badge-task-status ${escapeHtml(task.status.replace(/\s+/g, ''))}">
            <span style="width:6px;height:6px;border-radius:50%;background:currentColor;"></span>
            ${escapeHtml(task.status)}
          </span>
        </td>

        <!-- Due Date -->
        <td>
          <div style="display:inline-flex; align-items:center; gap:0.35rem; font-size:12px; font-weight:600; color:${overdue ? '#FA896B' : '#64748B'};">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <span>${formatDate(task.due_date)}</span>
            ${overdue ? '<span style="font-size:10px; font-weight:800; text-transform:uppercase;">(Overdue)</span>' : ''}
          </div>
        </td>

        <!-- Actions -->
        <td style="text-align:right;">
          <div style="display:inline-flex; align-items:center; gap:0.35rem;">
            <button type="button" class="row-action-btn" onclick="openEditTaskModal(${task.id})" title="Edit Task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button type="button" class="row-action-btn" onclick="openDeleteModal(${task.id})" title="Delete Task" style="color:#FA896B;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');
}

// Quick status toggle
window.toggleTaskStatus = async function (taskId) {
  const task = state.tasks.find((t) => t.id === Number(taskId));
  if (!task) return;

  const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';

  try {
    await api.updateTask(taskId, { status: nextStatus });
    task.status = nextStatus;
    updateDashboardMetricsAndCharts();
    renderTaskTable();
    showToast(`Task marked as ${nextStatus}!`, 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update task status.', 'error');
  }
};

// ============================================================================
// Modals & Task Form
// ============================================================================
function initModals() {
  const taskModal = document.getElementById('modal-task-form');
  const taskForm = document.getElementById('form-save-task');
  const btnCloseTaskModal = document.getElementById('btn-close-task-modal');
  const btnCancelTaskModal = document.getElementById('btn-cancel-task-modal');

  const deleteModal = document.getElementById('modal-delete-confirm');
  const btnCloseDelete = document.getElementById('btn-close-delete-modal');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

  const openCreateModal = () => {
    document.getElementById('task-modal-heading').textContent = 'Create New Task';
    document.getElementById('input-task-id').value = '';
    taskForm.reset();
    document.getElementById('select-task-priority').value = 'Medium';
    document.getElementById('select-task-status').value = 'Pending';
    taskModal.classList.add('active');
  };

  document.getElementById('btn-quick-add-task').addEventListener('click', openCreateModal);
  document.getElementById('hero-quick-add-btn').addEventListener('click', openCreateModal);

  const closeTaskModal = () => taskModal.classList.remove('active');
  btnCloseTaskModal.addEventListener('click', closeTaskModal);
  btnCancelTaskModal.addEventListener('click', closeTaskModal);

  const closeDeleteModal = () => {
    deleteModal.classList.remove('active');
    state.pendingDeleteTaskId = null;
  };
  btnCloseDelete.addEventListener('click', closeDeleteModal);
  btnCancelDelete.addEventListener('click', closeDeleteModal);

  // Save Task (Create / Edit)
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('input-task-id').value;
    const title = document.getElementById('input-task-title').value.trim();
    const description = document.getElementById('input-task-desc').value.trim();
    const category = document.getElementById('input-task-category').value.trim() || 'Development';
    const priority = document.getElementById('select-task-priority').value;
    const status = document.getElementById('select-task-status').value;
    const due_date = document.getElementById('input-task-due-date').value || null;

    if (!title) {
      showToast('Task title is required.', 'error');
      return;
    }

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
      updateDashboardMetricsAndCharts();
      renderTaskTable();
    } catch (err) {
      showToast(err.message || 'Error saving task.', 'error');
    }
  });

  // Delete Task Confirm
  btnConfirmDelete.addEventListener('click', async () => {
    if (!state.pendingDeleteTaskId) return;

    try {
      await api.deleteTask(state.pendingDeleteTaskId);
      state.tasks = state.tasks.filter((t) => t.id !== Number(state.pendingDeleteTaskId));
      showToast('Task deleted successfully.', 'info');
      closeDeleteModal();
      updateDashboardMetricsAndCharts();
      renderTaskTable();
    } catch (err) {
      showToast(err.message || 'Failed to delete task.', 'error');
    }
  });
}

window.openEditTaskModal = function (taskId) {
  const task = state.tasks.find((t) => t.id === Number(taskId));
  if (!task) return;

  document.getElementById('task-modal-heading').textContent = 'Edit Task';
  document.getElementById('input-task-id').value = task.id;
  document.getElementById('input-task-title').value = task.title;
  document.getElementById('input-task-desc').value = task.description || '';
  document.getElementById('input-task-category').value = task.category || '';
  document.getElementById('select-task-priority').value = task.priority || 'Medium';
  document.getElementById('select-task-status').value = task.status || 'Pending';
  document.getElementById('input-task-due-date').value = task.due_date ? task.due_date.split('T')[0] : '';

  document.getElementById('modal-task-form').classList.add('active');
};

window.openDeleteModal = function (taskId) {
  const task = state.tasks.find((t) => t.id === Number(taskId));
  if (!task) return;

  state.pendingDeleteTaskId = taskId;
  document.getElementById('delete-target-title').textContent = `"${task.title}"`;
  document.getElementById('modal-delete-confirm').classList.add('active');
};

// ============================================================================
// Admin Dashboard Controller
// ============================================================================
async function loadAdminDashboard() {
  try {
    const [stats, users, tasks] = await Promise.all([
      api.getAdminStats(),
      api.getAdminUsers(),
      api.getAdminTasks(),
    ]);

    state.admin.stats = stats;
    state.admin.users = users;
    state.admin.tasks = tasks;

    document.getElementById('admin-kpi-users').textContent = stats.totalUsers || 0;
    document.getElementById('admin-kpi-tasks').textContent = stats.totalTasks || 0;
    document.getElementById('admin-kpi-completed').textContent = stats.completedTasks || 0;
    document.getElementById('admin-kpi-pending').textContent = stats.pendingTasks || 0;

    // Charts
    renderStatusDonutChart('chart-admin-status-donut', 'legend-admin-status', stats.completedTasks || 0, 0, stats.pendingTasks || 0);
    renderAdminWorkloadChart('chart-admin-workload-bars', users);

    renderAdminUsersTable(users);
    renderAdminTasksTable(tasks);
  } catch (err) {
    showToast(err.message || 'Error fetching admin data.', 'error');
  }
}

function renderAdminUsersTable(users) {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  tbody.innerHTML = (users || [])
    .map(
      (u) => `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <div class="user-avatar-circle" style="width:30px;height:30px;font-size:12px;">
              ${escapeHtml(u.name.charAt(0).toUpperCase())}
            </div>
            <span style="font-weight:700; color:#0F172A;">${escapeHtml(u.name)}</span>
          </div>
        </td>
        <td>${escapeHtml(u.email)}</td>
        <td>
          <span class="brand-tag-${u.role === 'admin' ? 'admin' : 'pro'}">
            ${escapeHtml(u.role.toUpperCase())}
          </span>
        </td>
        <td><span style="font-size:12px; color:#64748B;">${escapeHtml(u.department || 'Engineering')}</span></td>
        <td><strong>${u.tasksCount || 0}</strong></td>
        <td><span style="color:#13DEB9; font-weight:700;">${u.completedCount || 0}</span></td>
      </tr>
    `
    )
    .join('');
}

function renderAdminTasksTable(tasks) {
  const tbody = document.getElementById('admin-tasks-tbody');
  if (!tbody) return;

  tbody.innerHTML = (tasks || [])
    .map(
      (t) => `
      <tr>
        <td><strong>#${t.id}</strong></td>
        <td><strong style="color:#0F172A;">${escapeHtml(t.title)}</strong></td>
        <td><span style="font-weight:600; color:#475569;">👤 ${escapeHtml(t.owner_name || 'User ' + t.user_id)}</span></td>
        <td><span class="badge-task-category">${escapeHtml(t.category || 'General')}</span></td>
        <td><span class="badge-task-priority ${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span></td>
        <td><span class="badge-task-status ${escapeHtml(t.status.replace(/\s+/g, ''))}">${escapeHtml(t.status)}</span></td>
        <td><span style="font-size:12px; color:#64748B;">${formatDate(t.due_date)}</span></td>
      </tr>
    `
    )
    .join('');
}

// ============================================================================
// Event Listeners & Bootstrapper
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Mode toggle pill
  const modeBtn = document.getElementById('btn-mode-toggle');
  const modeLabel = document.getElementById('mode-text-label');

  const syncModeUI = () => {
    if (api.isMockMode()) {
      modeBtn.className = 'btn-mode-indicator';
      modeLabel.textContent = 'Demo Mode';
    } else {
      modeBtn.className = 'btn-mode-indicator api-mode';
      modeLabel.textContent = 'API Mode';
    }
  };
  syncModeUI();

  modeBtn.addEventListener('click', () => {
    const next = !api.isMockMode();
    api.setMockMode(next);
    syncModeUI();
    showToast(`Switched to ${next ? 'Demo Mock Mode' : 'Live Express Backend API Mode'}.`, 'info');
    if (state.currentUser) {
      if (state.activeRole === 'admin') loadAdminDashboard();
      else loadUserDashboard();
    }
  });

  // Role toggle button in header
  document.getElementById('btn-role-toggle').addEventListener('click', () => {
    const nextRole = state.activeRole === 'admin' ? 'user' : 'admin';
    state.activeRole = nextRole;
    updateSidebarForRole(nextRole);
    navigateTo(nextRole === 'admin' ? 'admin-overview' : 'overview');
  });

  // Sidebar collapse toggle
  document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
    state.isSidebarCollapsed = !state.isSidebarCollapsed;
    const sidebar = document.getElementById('app-sidebar');
    const brandCol = document.getElementById('brand-text-col');
    if (state.isSidebarCollapsed) {
      sidebar.classList.add('collapsed');
      if (brandCol) brandCol.style.display = 'none';
    } else {
      sidebar.classList.remove('collapsed');
      if (brandCol) brandCol.style.display = 'flex';
    }
  });

  // Sidebar menu navigation clicks
  document.querySelectorAll('.sidebar-menu-item-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      navigateTo(page);
    });
  });

  document.getElementById('brand-home-btn').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(state.activeRole === 'admin' ? 'admin-overview' : 'overview');
  });

  document.getElementById('hero-view-tasks-btn').addEventListener('click', () => {
    navigateTo('tasks');
  });

  // Admin tabs switcher
  const tabUsersBtn = document.getElementById('admin-tab-users-btn');
  const tabTasksBtn = document.getElementById('admin-tab-tasks-btn');
  const panelUsers = document.getElementById('panel-admin-users');
  const panelTasks = document.getElementById('panel-admin-tasks');

  tabUsersBtn.addEventListener('click', () => {
    tabUsersBtn.classList.add('admin-active');
    tabTasksBtn.classList.remove('admin-active');
    panelUsers.style.display = 'block';
    panelTasks.style.display = 'none';
  });

  tabTasksBtn.addEventListener('click', () => {
    tabTasksBtn.classList.add('admin-active');
    tabUsersBtn.classList.remove('admin-active');
    panelTasks.style.display = 'block';
    panelUsers.style.display = 'none';
  });

  document.getElementById('btn-admin-refresh').addEventListener('click', () => {
    loadAdminDashboard();
    showToast('Platform data refreshed.', 'info');
  });

  // Task Filter Inputs
  const searchInput = document.getElementById('task-filter-search');
  searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderTaskTable();
  });

  document.getElementById('task-filter-status').addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    renderTaskTable();
  });

  document.getElementById('task-filter-priority').addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    renderTaskTable();
  });

  document.getElementById('task-filter-category').addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    renderTaskTable();
  });

  // Auth Form Handlers
  const authForm = document.getElementById('auth-main-form');
  const authError = document.getElementById('auth-error-alert');

  const executeLogin = async (email, password) => {
    authError.style.display = 'none';
    try {
      const res = await api.login(email, password);
      state.currentUser = res.user;
      state.activeRole = res.user.role === 'admin' ? 'admin' : 'user';

      // Update sidebar user badge
      document.getElementById('sidebar-user-name').textContent = res.user.name;
      document.getElementById('sidebar-user-role').textContent = res.user.department || (res.user.role === 'admin' ? 'System Administrator' : 'Product & Engineering');
      document.getElementById('sidebar-user-avatar').textContent = res.user.name.charAt(0).toUpperCase();

      updateSidebarForRole(state.activeRole);
      navigateTo(state.activeRole === 'admin' ? 'admin-overview' : 'overview');
      showToast(`Welcome back, ${res.user.name}!`, 'success');
    } catch (err) {
      authError.textContent = err.message || 'Login failed.';
      authError.style.display = 'block';
    }
  };

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('input-auth-email').value;
    const password = document.getElementById('input-auth-password').value;
    executeLogin(email, password);
  });

  // Quick Demo Buttons
  document.getElementById('btn-quick-admin-login').addEventListener('click', () => {
    executeLogin('admin@taskflow.com', 'admin123');
  });

  document.getElementById('btn-quick-user-login').addEventListener('click', () => {
    executeLogin('user@taskflow.com', 'user123');
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    api.logout();
    state.currentUser = null;
    state.tasks = [];
    navigateTo('auth');
    showToast('Signed out successfully.', 'info');
  });

  // Modals
  initModals();

  // Restore session if available
  const stored = api.getCurrentUser();
  if (stored) {
    state.currentUser = stored;
    state.activeRole = stored.role === 'admin' ? 'admin' : 'user';
    document.getElementById('sidebar-user-name').textContent = stored.name;
    document.getElementById('sidebar-user-role').textContent = stored.department || (stored.role === 'admin' ? 'System Administrator' : 'Product & Engineering');
    document.getElementById('sidebar-user-avatar').textContent = stored.name.charAt(0).toUpperCase();

    updateSidebarForRole(state.activeRole);
    navigateTo(state.activeRole === 'admin' ? 'admin-overview' : 'overview');
  } else {
    navigateTo('auth');
  }
});
