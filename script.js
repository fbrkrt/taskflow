/* =============================================
   TaskFlow – Main Application Script
   Vanilla JavaScript | No frameworks
   ============================================= */

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let tasks = [];           // master task array
let currentPage = 'dashboard';
let calendarDate = new Date();   // tracks displayed month
let selectedCalDay = null;

// Chart.js instances (stored to allow re-render)
let chartCategory = null;
let chartStatus   = null;
let chartPriority = null;

// ─────────────────────────────────────────────
// INIT – load data then bootstrap the UI
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadPreferences();   // username + dark mode before render
  await loadTasks();   // fetch JSON or LocalStorage
  setHeaderDate();
  renderAll();         // render current page
});

/**
 * Load tasks: prefer LocalStorage, fall back to tasks.json fetch.
 */
async function loadTasks() {
  const stored = localStorage.getItem('taskflow_tasks');
  if (stored) {
    tasks = JSON.parse(stored);
  } else {
    try {
      const res = await fetch('tasks.json');
      tasks = await res.json();
      saveTasks();  // persist initial data
    } catch (e) {
      tasks = [];
      console.warn('Could not load tasks.json', e);
    }
  }
}

/** Persist tasks array to LocalStorage. */
function saveTasks() {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

/** Load username and theme from LocalStorage. */
function loadPreferences() {
  const username = localStorage.getItem('taskflow_username') || 'User';
  applyUsername(username);

  const dark = localStorage.getItem('taskflow_dark') === 'true';
  if (dark) {
    document.documentElement.classList.add('dark');
    updateThemeIcons(true);
  }
}

// ─────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────
function setHeaderDate() {
  const d = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('header-date').textContent = d.toLocaleDateString('en-US', opts);
}

// ─────────────────────────────────────────────
// NAVIGATION (SPA-style page switching)
// ─────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard : 'Dashboard',
  mytasks   : 'My Tasks',
  calendar  : 'Calendar',
  analytics : 'Analytics',
  settings  : 'Settings',
};

function navigate(page) {
  currentPage = page;

  // Show/hide sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  document.getElementById('page-' + page).classList.remove('hidden');

  // Active nav item
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  // Page title
  document.getElementById('page-title').textContent = PAGE_TITLES[page];

  // Per-page init
  if (page === 'dashboard')  renderDashboard();
  if (page === 'mytasks')    { resetFilters(); applyFilters(); }
  if (page === 'calendar')   renderCalendar();
  if (page === 'analytics')  renderAnalytics();
  if (page === 'settings')   renderSettings();

  // Close mobile sidebar
  closeMobileSidebar();
}

// ─────────────────────────────────────────────
// MOBILE SIDEBAR
// ─────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('sidebar-hidden');
  overlay.classList.toggle('hidden');
}
function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (window.innerWidth < 768) {
    sidebar.classList.add('sidebar-hidden');
    overlay.classList.add('hidden');
  }
}

// ─────────────────────────────────────────────
// RENDER ALL (called after any data change)
// ─────────────────────────────────────────────
function renderAll() {
  navigate(currentPage);
}

// ─────────────────────────────────────────────
// KPI & PROGRESS HELPERS
// ─────────────────────────────────────────────
function getStats() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending   = total - completed;
  const rate      = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending, rate };
}

function updateKPIs() {
  const s = getStats();
  document.getElementById('kpi-total').textContent     = s.total;
  document.getElementById('kpi-completed').textContent = s.completed;
  document.getElementById('kpi-pending').textContent   = s.pending;
  document.getElementById('kpi-rate').textContent      = s.rate + '%';

  const bar = document.getElementById('progress-bar');
  bar.style.width = s.rate + '%';
  document.getElementById('progress-text').textContent = s.rate + '%';
  document.getElementById('progress-done').textContent  = s.completed;
  document.getElementById('progress-total').textContent = s.total;
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────
function renderDashboard() {
  updateKPIs();

  // Show last 5 tasks (most recently added first)
  const recent = [...tasks].reverse().slice(0, 5);
  const container = document.getElementById('dashboard-task-list');

  if (recent.length === 0) {
    container.innerHTML = `<div class="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No tasks yet. <button onclick="navigate('mytasks')" class="text-primary hover:underline">Add one!</button></div>`;
    return;
  }

  container.innerHTML = recent.map(t => `
    <div class="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
      <button onclick="toggleComplete(${t.id})" class="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition
        ${t.completed ? 'bg-success border-success' : 'border-gray-300 dark:border-gray-500 hover:border-success'}">
        ${t.completed ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
      </button>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate ${t.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}">${escHtml(t.title)}</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">${t.deadline} · ${t.category}</p>
      </div>
      <span class="text-xs px-2 py-0.5 rounded-full font-semibold badge-${t.priority.toLowerCase()}">${t.priority}</span>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// MY TASKS PAGE
// ─────────────────────────────────────────────

/** Reset all filter/search controls. */
function resetFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-status').value   = 'all';
  document.getElementById('filter-priority').value = 'all';
  document.getElementById('filter-category').value = 'all';
}

/** Filter tasks and re-render the task list. */
function applyFilters() {
  const search   = document.getElementById('search-input').value.toLowerCase();
  const status   = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  const category = document.getElementById('filter-category').value;

  const filtered = tasks.filter(t => {
    const matchSearch   = t.title.toLowerCase().includes(search);
    const matchStatus   = status   === 'all' || (status === 'completed' ? t.completed : !t.completed);
    const matchPriority = priority === 'all' || t.priority === priority;
    const matchCategory = category === 'all' || t.category === category;
    return matchSearch && matchStatus && matchPriority && matchCategory;
  });

  renderTaskList(filtered);
}

/** Render the task card list for My Tasks page. */
function renderTaskList(list) {
  const container  = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');

  if (list.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  container.innerHTML = list.map(t => buildTaskCard(t)).join('');
}

/** Build HTML for a single task card. */
function buildTaskCard(t) {
  const isOverdue = !t.completed && t.deadline && new Date(t.deadline) < new Date(new Date().toDateString());

  return `
  <div class="task-card task-border-${t.priority.toLowerCase()} bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 px-5 py-4 flex items-start gap-4 ${t.completed ? 'task-completed' : ''}">
    <!-- Checkbox -->
    <button onclick="toggleComplete(${t.id})"
      class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition
        ${t.completed ? 'bg-success border-success' : 'border-gray-300 dark:border-gray-500 hover:border-success'}">
      ${t.completed ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
    </button>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2 mb-1">
        <p class="task-title text-sm font-semibold text-gray-800 dark:text-white truncate">${escHtml(t.title)}</p>
        ${isOverdue ? '<span class="text-xs bg-red-100 dark:bg-red-900/30 text-danger px-1.5 py-0.5 rounded-md font-semibold">Overdue</span>' : ''}
      </div>
      ${t.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">${escHtml(t.description)}</p>` : ''}
      <div class="flex flex-wrap gap-2 mt-1">
        <span class="text-xs px-2 py-0.5 rounded-full font-medium badge-${t.category.toLowerCase()}">${t.category}</span>
        <span class="text-xs px-2 py-0.5 rounded-full font-semibold badge-${t.priority.toLowerCase()}">${t.priority}</span>
        <span class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          ${t.deadline}
        </span>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${t.completed ? 'bg-green-50 dark:bg-green-900/20 text-success' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}">
          ${t.completed ? 'Completed' : 'Pending'}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 flex-shrink-0">
      <button onclick="openModal(${t.id})" class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition" title="Edit">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
      </button>
      <button onclick="deleteTask(${t.id})" class="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Delete">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// MODAL – ADD / EDIT TASK
// ─────────────────────────────────────────────

/** Open modal. Pass taskId to edit, or no argument to add. */
function openModal(taskId) {
  const modal    = document.getElementById('task-modal');
  const modalBox = document.getElementById('modal-box');

  clearFormErrors();

  if (taskId !== undefined) {
    // Edit mode
    const t = tasks.find(t => t.id === taskId);
    if (!t) return;
    document.getElementById('modal-title').textContent     = 'Edit Task';
    document.getElementById('edit-task-id').value          = t.id;
    document.getElementById('form-title').value            = t.title;
    document.getElementById('form-description').value      = t.description || '';
    document.getElementById('form-category').value         = t.category;
    document.getElementById('form-priority').value         = t.priority;
    document.getElementById('form-deadline').value         = t.deadline;
  } else {
    // Add mode
    document.getElementById('modal-title').textContent = 'Add New Task';
    document.getElementById('edit-task-id').value      = '';
    document.getElementById('task-form').reset();
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  // Trigger animation
  requestAnimationFrame(() => {
    modalBox.style.transform = 'scale(1)';
    modalBox.style.opacity   = '1';
  });
}

function closeModal() {
  const modal    = document.getElementById('task-modal');
  const modalBox = document.getElementById('modal-box');
  modalBox.style.transform = 'scale(0.95)';
  modalBox.style.opacity   = '0';
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 200);
}

/** Form submission: add or update a task. */
function submitTask(e) {
  e.preventDefault();

  const title    = document.getElementById('form-title').value.trim();
  const deadline = document.getElementById('form-deadline').value;

  // Validation
  let valid = true;
  if (!title) {
    document.getElementById('err-title').classList.remove('hidden');
    valid = false;
  } else {
    document.getElementById('err-title').classList.add('hidden');
  }
  if (!deadline) {
    document.getElementById('err-deadline').classList.remove('hidden');
    valid = false;
  } else {
    document.getElementById('err-deadline').classList.add('hidden');
  }
  if (!valid) return;

  const editId = document.getElementById('edit-task-id').value;

  const taskData = {
    title,
    description : document.getElementById('form-description').value.trim(),
    category    : document.getElementById('form-category').value,
    priority    : document.getElementById('form-priority').value,
    deadline,
  };

  if (editId) {
    // Update existing task
    const idx = tasks.findIndex(t => t.id === parseInt(editId));
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...taskData };
      showToast('Task updated successfully!', 'success');
    }
  } else {
    // New task
    const newId = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    tasks.push({ id: newId, completed: false, ...taskData });
    showToast('Task added successfully!', 'success');
  }

  saveTasks();
  closeModal();

  // Re-render relevant sections
  if (currentPage === 'mytasks') applyFilters();
  if (currentPage === 'dashboard') renderDashboard();
  updateKPIs();
}

function clearFormErrors() {
  document.getElementById('err-title').classList.add('hidden');
  document.getElementById('err-deadline').classList.add('hidden');
}

// ─────────────────────────────────────────────
// TASK ACTIONS – toggle, delete
// ─────────────────────────────────────────────

function toggleComplete(taskId) {
  const t = tasks.find(t => t.id === taskId);
  if (!t) return;
  t.completed = !t.completed;
  saveTasks();
  showToast(t.completed ? 'Task marked as completed!' : 'Task marked as pending.', 'success');
  renderAll();
}

function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  tasks = tasks.filter(t => t.id !== taskId);
  saveTasks();
  showToast('Task deleted.', 'info');
  renderAll();
}

// ─────────────────────────────────────────────
// CALENDAR PAGE
// ─────────────────────────────────────────────
function renderCalendar() {
  const year  = calendarDate.getFullYear();
  const month = calendarDate.getMonth();  // 0-based

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calendar-month-title').textContent = `${monthNames[month]} ${year}`;

  // First day of month and total days
  const firstDay  = new Date(year, month, 1).getDay();   // 0 = Sunday
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Build a map: dateStr -> [tasks]
  const taskMap = {};
  tasks.forEach(t => {
    if (!taskMap[t.deadline]) taskMap[t.deadline] = [];
    taskMap[t.deadline].push(t);
  });

  const today   = new Date().toISOString().split('T')[0];
  const grid    = document.getElementById('calendar-grid');
  let html      = '';

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-cell other-month"></div>`;
  }

  // Day cells
  for (let day = 1; day <= totalDays; day++) {
    const mm     = String(month + 1).padStart(2, '0');
    const dd     = String(day).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const dayTasks = taskMap[dateStr] || [];
    const isToday  = dateStr === today;
    const isSel    = dateStr === selectedCalDay;

    const dots = dayTasks.slice(0, 3).map(t =>
      `<span class="cal-dot" style="background:${priorityColor(t.priority)}"></span>`
    ).join('');

    html += `
      <div class="cal-cell ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}" onclick="selectCalDay('${dateStr}')">
        <div class="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">${day}</div>
        <div class="flex flex-wrap">${dots}</div>
        ${dayTasks.length > 3 ? `<div class="text-[10px] text-gray-400">+${dayTasks.length - 3}</div>` : ''}
      </div>`;
  }

  grid.innerHTML = html;

  // Render detail panel
  if (selectedCalDay) {
    showCalDayDetail(selectedCalDay);
  } else {
    document.getElementById('calendar-detail-title').textContent = 'Select a date to view tasks';
    document.getElementById('calendar-detail-list').innerHTML     = '';
  }
}

function selectCalDay(dateStr) {
  selectedCalDay = dateStr;
  renderCalendar();
}

function showCalDayDetail(dateStr) {
  const dayTasks = tasks.filter(t => t.deadline === dateStr);
  const title    = document.getElementById('calendar-detail-title');
  const list     = document.getElementById('calendar-detail-list');

  title.textContent = `Tasks on ${dateStr} (${dayTasks.length})`;

  if (dayTasks.length === 0) {
    list.innerHTML = `<p class="text-sm text-gray-400 dark:text-gray-500">No tasks for this date.</p>`;
    return;
  }

  list.innerHTML = dayTasks.map(t => `
    <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 task-border-${t.priority.toLowerCase()}">
      <button onclick="toggleComplete(${t.id})" class="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition
        ${t.completed ? 'bg-success border-success' : 'border-gray-300 dark:border-gray-500'}">
        ${t.completed ? '<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
      </button>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium ${t.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'} truncate">${escHtml(t.title)}</p>
        <p class="text-xs text-gray-400">${t.category} · ${t.priority}</p>
      </div>
    </div>
  `).join('');
}

function prevMonth() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  selectedCalDay = null;
  renderCalendar();
}
function nextMonth() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  selectedCalDay = null;
  renderCalendar();
}

function priorityColor(priority) {
  const map = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
  return map[priority] || '#9ca3af';
}

// ─────────────────────────────────────────────
// ANALYTICS PAGE (Chart.js)
// ─────────────────────────────────────────────
function renderAnalytics() {
  const s = getStats();
  document.getElementById('a-completed').textContent = s.completed;
  document.getElementById('a-pending').textContent   = s.pending;
  document.getElementById('a-rate').textContent      = s.rate + '%';

  // Destroy old charts before re-creating to prevent canvas reuse issues
  if (chartCategory) { chartCategory.destroy(); chartCategory = null; }
  if (chartStatus)   { chartStatus.destroy();   chartStatus   = null; }
  if (chartPriority) { chartPriority.destroy(); chartPriority = null; }

  const dark = document.documentElement.classList.contains('dark');
  const tickColor = dark ? '#9ca3af' : '#6b7280';

  // -- Category doughnut chart --
  const catCounts = { Academic: 0, Personal: 0, Work: 0 };
  tasks.forEach(t => { if (catCounts[t.category] !== undefined) catCounts[t.category]++; });

  chartCategory = new Chart(document.getElementById('chart-category'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(catCounts),
      datasets: [{
        data: Object.values(catCounts),
        backgroundColor: ['#3b82f6', '#a855f7', '#22c55e'],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tickColor, padding: 16, font: { size: 12 } } } }
    }
  });

  // -- Status doughnut chart --
  chartStatus = new Chart(document.getElementById('chart-status'), {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [s.completed, s.pending],
        backgroundColor: ['#22c55e', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tickColor, padding: 16, font: { size: 12 } } } }
    }
  });

  // -- Priority bar chart --
  const prCounts = { High: 0, Medium: 0, Low: 0 };
  tasks.forEach(t => { if (prCounts[t.priority] !== undefined) prCounts[t.priority]++; });

  chartPriority = new Chart(document.getElementById('chart-priority'), {
    type: 'bar',
    data: {
      labels: Object.keys(prCounts),
      datasets: [{
        label: 'Tasks',
        data: Object.values(prCounts),
        backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
        borderRadius: 8,
        barPercentage: 0.5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tickColor }, grid: { display: false } },
        y: {
          ticks: { color: tickColor, stepSize: 1 },
          grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
          beginAtZero: true,
        }
      }
    }
  });
}

// ─────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────
function renderSettings() {
  const username = localStorage.getItem('taskflow_username') || 'User';
  document.getElementById('settings-username-input').value = username;
  document.getElementById('settings-name-display').textContent = username;
  document.getElementById('settings-avatar').textContent = username.charAt(0).toUpperCase();
}

function saveUsername() {
  const val = document.getElementById('settings-username-input').value.trim();
  if (!val) { showToast('Please enter a valid username.', 'error'); return; }
  localStorage.setItem('taskflow_username', val);
  applyUsername(val);
  showToast('Username saved!', 'success');
  renderSettings();
}

function applyUsername(name) {
  const safe = escHtml(name);
  document.getElementById('sidebar-username').textContent = safe;
  document.getElementById('header-avatar').textContent    = safe.charAt(0).toUpperCase();
}

function clearAllTasks() {
  if (!confirm('This will permanently delete ALL tasks. Continue?')) return;
  tasks = [];
  saveTasks();
  showToast('All tasks cleared.', 'info');
  renderAll();
}

// ─────────────────────────────────────────────
// DARK MODE
// ─────────────────────────────────────────────
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('taskflow_dark', isDark);
  updateThemeIcons(isDark);

  // Re-render analytics charts with correct tick colors
  if (currentPage === 'analytics') renderAnalytics();
}

function updateThemeIcons(isDark) {
  document.getElementById('theme-icon-light').classList.toggle('hidden', isDark);
  document.getElementById('theme-icon-dark').classList.toggle('hidden', !isDark);
}

// ─────────────────────────────────────────────
// TOAST NOTIFICATION
// ─────────────────────────────────────────────
let toastTimer = null;

function showToast(message, type = 'success') {
  const toast   = document.getElementById('toast');
  const msgEl   = document.getElementById('toast-message');
  const iconEl  = document.getElementById('toast-icon');

  msgEl.textContent = message;

  const icons = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    error  : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    info   : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  };
  iconEl.innerHTML = icons[type] || icons.info;

  toast.classList.remove('hidden');
  toast.classList.add('flex');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('flex');
  }, 3000);
}

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────
/** Escape HTML to prevent XSS from user input. */
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
