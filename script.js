/* ============================================================
   TaskFlow — app logic
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'taskflow_tasks';
  var THEME_KEY = 'taskflow_theme';

  /* ---------- State ---------- */
  var tasks = loadTasks();
  var editingId = null;       // task id being edited, if any
  var pendingDeleteId = null; // task id awaiting delete confirmation
  var viewMode = 'grid';      // 'grid' | 'board'
  var dragTaskId = null;
  var toastTimer = null;

  /* ---------- DOM refs ---------- */
  var $ = function (s) { return document.querySelector(s); };

  var el = {
    addTaskBtn: $('#add-task-btn'),
    themeToggle: $('#theme-toggle'),
    iconMoon: $('#theme-toggle .icon-moon'),
    iconSun: $('#theme-toggle .icon-sun'),

    messageBanner: $('#message-banner'),
    messageText: $('#message-text'),
    messageClose: $('#message-close'),

    totalTasks: $('#total-tasks'),
    todoTasks: $('#todo-tasks'),
    progressTasks: $('#progress-tasks'),
    completedTasks: $('#completed-tasks'),

    taskCountLabel: $('#task-count-label'),
    searchInput: $('#search-tasks'),
    statusFilter: $('#task-filter'),
    priorityFilter: $('#priority-filter'),
    tasksContainer: $('#tasks-container'),
    emptyState: $('#empty-state'),

    viewGridBtn: $('#view-grid'),
    viewBoardBtn: $('#view-board'),
    exportBtn: $('#export-btn'),
    importBtn: $('#import-btn'),
    importInput: $('#import-input'),

    toast: $('#toast'),
    toastText: $('#toast-text'),
    toastUndo: $('#toast-undo'),
    toastClose: $('#toast-close'),

    modal: $('#task-modal'),
    confirmModal: $('#confirm-modal'),
    modalTitle: $('#modal-title'),
    modalSubmit: $('#modal-submit'),
    modalClose: $('#modal-close'),
    confirmClose: $('#confirm-close'),
    cancelTaskBtn: $('#cancel-task-btn'),
    confirmCancel: $('#confirm-cancel'),
    confirmDelete: $('#confirm-delete'),

    form: $('#task-form'),
    fId: $('#task-id'),
    fTitle: $('#task-title'),
    fDesc: $('#task-description'),
    fDate: $('#task-date'),
    fPriority: $('#task-priority'),
    fStatus: $('#task-status')
  };

  /* ============================================================
     Storage
     ============================================================ */

  function loadTasks() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) { /* quota/private mode — ignore */ }
  }

  /* ============================================================
     Helpers
     ============================================================ */

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function formatDueDate(iso) {
    if (!iso) return null;
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return null;
    return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === 'completed') return false;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(task.dueDate + 'T00:00:00') < today;
  }

  function makeIconUse(iconId) {
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon-' + iconId);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.appendChild(use);
    return svg;
  }

  function showMessage(text) {
    el.messageText.textContent = text;
    el.messageBanner.hidden = false;
  }

  function hideMessage() {
    el.messageBanner.hidden = true;
  }

  /* ---------- Toast ---------- */

  function showToast(text, undoFn) {
    clearTimeout(toastTimer);
    el.toastText.textContent = text;
    el.toastUndo.hidden = !undoFn;
    if (undoFn) {
      el.toastUndo.onclick = function () {
        undoFn();
        hideToast();
      };
    }
    el.toast.hidden = false;
    toastTimer = setTimeout(hideToast, 6000);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    el.toast.hidden = true;
    el.toastUndo.onclick = null;
  }

  /* ============================================================
     Rendering
     ============================================================ */

  var STATUS_LABELS = {
    todo: 'To Do',
    progress: 'In Progress',
    completed: 'Completed'
  };

  function renderStats() {
    var total = tasks.length;
    var todo = tasks.filter(function (t) { return t.status === 'todo'; }).length;
    var progress = tasks.filter(function (t) { return t.status === 'progress'; }).length;
    var completed = tasks.filter(function (t) { return t.status === 'completed'; }).length;

    el.totalTasks.textContent = total;
    el.todoTasks.textContent = todo;
    el.progressTasks.textContent = progress;
    el.completedTasks.textContent = completed;
  }

  function currentFilters() {
    return {
      query: (el.searchInput.value || '').trim().toLowerCase(),
      status: el.statusFilter.value,
      priority: el.priorityFilter.value
    };
  }

  function matchesFilters(task, filters) {
    if (filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.query) {
      var hay = ((task.title || '') + ' ' + (task.description || '')).toLowerCase();
      if (hay.indexOf(filters.query) === -1) return false;
    }
    return true;
  }

  function priorityRank(p) {
    return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
  }

  function renderTasks() {
    var filters = currentFilters();
    var onlyStatus = filters.status !== 'all' ? filters.status : null;

    // Sort: priority (high first) then by due date (soonest first).
    var sorted = tasks.filter(function (t) { return matchesFilters(t, filters); })
      .sort(function (a, b) {
        var pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        var da = a.dueDate || '9999-12-31';
        var db = b.dueDate || '9999-12-31';
        return da < db ? -1 : da > db ? 1 : 0;
      });

    el.taskCountLabel.textContent = sorted.length + (sorted.length === 1 ? ' task' : ' tasks');

    if (viewMode === 'board') {
      renderBoard(filters, onlyStatus, sorted);
      return;
    }

    el.tasksContainer.classList.remove('board-layout');
    el.tasksContainer.innerHTML = '';

    if (!sorted.length) {
      el.emptyState.hidden = false;
      return;
    }
    el.emptyState.hidden = true;

    var fragment = document.createDocumentFragment();
    sorted.forEach(function (task) {
      fragment.appendChild(buildTaskCard(task));
    });
    el.tasksContainer.appendChild(fragment);
  }

  var STATUS_LABELS = {
    todo: 'To Do',
    progress: 'In Progress',
    completed: 'Completed'
  };

  function buildTaskCard(task) {
    var card = document.createElement('article');
    card.className = 'task-card' + (task.status === 'completed' ? ' completed' : '');
    card.dataset.id = task.id;

    /* Title + description */
    var head = document.createElement('div');
    var title = document.createElement('h3');
    title.className = 'task-title';
    title.textContent = task.title;
    head.appendChild(title);

    if (task.description) {
      var desc = document.createElement('p');
      desc.className = 'task-desc';
      desc.textContent = task.description;
      head.appendChild(desc);
    }
    card.appendChild(head);

    /* Meta badges */
    var meta = document.createElement('div');
    meta.className = 'task-meta';

    var prio = document.createElement('span');
    prio.className = 'badge badge-' + task.priority;
    prio.appendChild(makeIconUse('flag'));
    prio.appendChild(document.createTextNode(capitalize(task.priority)));
    meta.appendChild(prio);

    var status = document.createElement('span');
    status.className = 'badge badge-' + task.status;
    status.appendChild(makeIconUse(statusIcon(task.status)));
    status.appendChild(document.createTextNode(STATUS_LABELS[task.status]));
    meta.appendChild(status);
    card.appendChild(meta);

    /* Due date */
    if (task.dueDate) {
      var due = document.createElement('div');
      due.className = 'task-due' + (isOverdue(task) ? ' overdue' : '');
      due.appendChild(makeIconUse('calendar'));
      var dueTxt = document.createElement('span');
      dueTxt.textContent = (isOverdue(task) ? 'Overdue: ' : 'Due: ') + formatDueDate(task.dueDate);
      due.appendChild(dueTxt);
      card.appendChild(due);
    }

    /* Status switch */
    if (task.status !== 'completed') {
      var sw = document.createElement('div');
      sw.className = 'task-status-switch';
      var swBtn = document.createElement('button');
      swBtn.type = 'button';
      swBtn.className = 'status-switch';
      swBtn.setAttribute('aria-label', 'Mark "' + task.title + '" as completed');
      swBtn.appendChild(document.createTextNode('Mark as completed'));
      swBtn.appendChild(makeIconUse('check'));
      swBtn.addEventListener('click', function () {
        var was = task.status;
        task.status = 'completed';
        saveTasks();
        renderAll();
        showToast('Task "' + task.title + '" marked as completed.', function () {
          task.status = was;
          saveTasks();
          renderAll();
        });
      });
      sw.appendChild(swBtn);
      card.appendChild(sw);
    }

    /* Actions */
    var actions = document.createElement('div');
    actions.className = 'task-actions';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'task-action';
    editBtn.setAttribute('aria-label', 'Edit "' + task.title + '"');
    editBtn.appendChild(makeIconUse('pencil'));
    editBtn.appendChild(document.createTextNode('Edit'));
    editBtn.addEventListener('click', function () {
      openModal(task);
    });
    actions.appendChild(editBtn);

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'task-action danger';
    delBtn.setAttribute('aria-label', 'Delete "' + task.title + '"');
    delBtn.appendChild(makeIconUse('trash'));
    delBtn.appendChild(document.createTextNode('Delete'));
    delBtn.addEventListener('click', function () {
      pendingDeleteId = task.id;
      openConfirmModal();
    });
    actions.appendChild(delBtn);

    card.appendChild(actions);
    return card;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function statusIcon(status) {
    return status === 'completed' ? 'circle-check' : status === 'progress' ? 'flag' : 'grid';
  }

  function renderAll() {
    renderStats();
    renderTasks();
  }

  /* ============================================================
     Board (Kanban) view
     ============================================================ */

  var BOARD_COLUMNS = [
    { status: 'todo', label: 'To Do' },
    { status: 'progress', label: 'In Progress' },
    { status: 'completed', label: 'Completed' }
  ];

  function renderBoard(filters, onlyStatus, sorted) {
    el.tasksContainer.classList.add('board-layout');
    el.tasksContainer.innerHTML = '';
    el.emptyState.hidden = true;

    if (onlyStatus) {
      // When a single-status filter is active, still show the board but only one meaningful column.
      renderBoardColumn(onlyStatus, filters, sorted, el.tasksContainer);
      return;
    }

    BOARD_COLUMNS.forEach(function (col) {
      renderBoardColumn(col.status, filters, sorted, el.tasksContainer);
    });
  }

  function renderBoardColumn(status, filters, sorted, container) {
    var tasksInCol = sorted.filter(function (t) { return t.status === status; });

    var column = document.createElement('div');
    column.className = 'board-column';
    column.dataset.status = status;

    var header = document.createElement('div');
    header.className = 'board-column-header';
    header.appendChild(makeIconUse(statusIcon(status)));
    var hLabel = document.createElement('span');
    hLabel.textContent = STATUS_LABELS[status];
    header.appendChild(hLabel);
    var count = document.createElement('span');
    count.className = 'board-column-count';
    count.textContent = tasksInCol.length;
    header.appendChild(count);
    column.appendChild(header);

    var dropzone = document.createElement('div');
    dropzone.className = 'board-dropzone';
    dropzone.dataset.status = status;

    tasksInCol.forEach(function (task) {
      dropzone.appendChild(buildBoardCard(task));
    });

    column.appendChild(dropzone);
    container.appendChild(column);
  }

  function buildBoardCard(task) {
    var card = document.createElement('article');
    card.className = 'board-card' + (task.status === 'completed' ? ' completed' : '');
    card.dataset.id = task.id;
    card.setAttribute('draggable', 'true');

    var title = document.createElement('h4');
    title.className = 'board-title';
    title.textContent = task.title;
    card.appendChild(title);

    if (task.description) {
      var desc = document.createElement('p');
      desc.className = 'board-desc';
      desc.textContent = task.description;
      card.appendChild(desc);
    }

    var meta = document.createElement('div');
    meta.className = 'board-meta';

    var prio = document.createElement('span');
    prio.className = 'badge badge-' + task.priority;
    prio.appendChild(makeIconUse('flag'));
    prio.appendChild(document.createTextNode(capitalize(task.priority)));
    meta.appendChild(prio);

    if (task.dueDate) {
      var due = document.createElement('span');
      due.className = 'task-due' + (isOverdue(task) ? ' overdue' : '');
      due.appendChild(makeIconUse('calendar'));
      var dueTxt = document.createElement('span');
      dueTxt.textContent = (isOverdue(task) ? 'Overdue: ' : 'Due: ') + formatDueDate(task.dueDate);
      due.appendChild(dueTxt);
      meta.appendChild(due);
    }

    card.appendChild(meta);

    // Drag events
    card.addEventListener('dragstart', function (e) {
      dragTaskId = task.id;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', function () {
      dragTaskId = null;
      card.classList.remove('dragging');
      document.querySelectorAll('.board-column.drag-over').forEach(function (c) {
        c.classList.remove('drag-over');
      });
    });

    return card;
  }

  function setView(mode) {
    viewMode = mode;
    el.viewGridBtn.classList.toggle('active', mode === 'grid');
    el.viewGridBtn.setAttribute('aria-pressed', String(mode === 'grid'));
    el.viewBoardBtn.classList.toggle('active', mode === 'board');
    el.viewBoardBtn.setAttribute('aria-pressed', String(mode === 'board'));
    renderTasks();
  }

  /* ============================================================
     Export / Import
     ============================================================ */

  function exportTasks() {
    if (!tasks.length) {
      showToast('No tasks to export.');
      return;
    }
    var blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'taskflow-tasks-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported ' + tasks.length + ' task(s) to JSON.');
  }

  function importTasks(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('expected an array');
        if (!data.length) throw new Error('file contains no tasks');

        var clean = data.filter(function (t) {
          return t && typeof t.title === 'string' && t.title.trim();
        }).map(function (t) {
          return {
            id: typeof t.id === 'string' ? t.id : uid(),
            title: t.title.trim(),
            description: typeof t.description === 'string' ? t.description : '',
            dueDate: t.dueDate || null,
            priority: ['low', 'medium', 'high'].indexOf(t.priority) !== -1 ? t.priority : 'medium',
            status: ['todo', 'progress', 'completed'].indexOf(t.status) !== -1 ? t.status : 'todo',
            createdAt: t.createdAt || Date.now()
          };
        });

        if (!clean.length) {
          showToast('No valid tasks found in file.');
          return;
        }

        // Merge: existing ids are overwritten, new ids appended.
        var merged = tasks.slice();
        clean.forEach(function (incoming) {
          var idx = merged.findIndex(function (t) { return t.id === incoming.id; });
          if (idx !== -1) merged[idx] = incoming;
          else merged.push(incoming);
        });

        tasks = merged;
        saveTasks();
        renderAll();
        showToast('Imported ' + clean.length + ' task(s).');
      } catch (err) {
        showToast('Import failed: invalid JSON file.');
      }
    };
    reader.readAsText(file);
    el.importInput.value = '';
  }

  /* ============================================================
     Modal (add / edit)
     ============================================================ */

  function openModal(task) {
    editingId = task ? task.id : null;
    if (task) {
      el.modalTitle.textContent = 'Edit Task';
      el.fId.value = task.id;
      el.fTitle.value = task.title;
      el.fDesc.value = task.description || '';
      el.fDate.value = task.dueDate || '';
      el.fPriority.value = task.priority;
      el.fStatus.value = task.status;
      el.modalSubmit.innerHTML = '';
      el.modalSubmit.appendChild(makeIconUse('pencil'));
      el.modalSubmit.appendChild(document.createTextNode('Save Changes'));
    } else {
      el.modalTitle.textContent = 'Add New Task';
      el.fId.value = '';
      el.fTitle.value = '';
      el.fDesc.value = '';
      el.fDate.value = '';
      el.fPriority.value = 'medium';
      el.fStatus.value = 'todo';
      el.modalSubmit.innerHTML = '';
      el.modalSubmit.appendChild(makeIconUse('plus'));
      el.modalSubmit.appendChild(document.createTextNode('Create Task'));
    }
    el.modal.hidden = false;
    document.body.classList.add('modal-open');
    el.fTitle.focus();
  }

  function closeModal() {
    el.modal.hidden = true;
    if (!el.confirmModal.hidden) return;
    document.body.classList.remove('modal-open');
    editingId = null;
  }

  function openConfirmModal() {
    el.confirmModal.hidden = false;
    document.body.classList.add('modal-open');
    el.confirmDelete.focus();
  }

  function closeConfirmModal() {
    el.confirmModal.hidden = true;
    if (!el.modal.hidden) return;
    document.body.classList.remove('modal-open');
    pendingDeleteId = null;
  }

  function handleSubmit(ev) {
    ev.preventDefault();

    var title = el.fTitle.value.trim();
    if (!title) {
      showMessage('Task title is required.');
      return;
    }

    var data = {
      id: editingId || uid(),
      title: title,
      description: el.fDesc.value.trim(),
      dueDate: el.fDate.value || null,
      priority: el.fPriority.value,
      status: el.fStatus.value,
      createdAt: editingId
        ? (tasks.find(function (t) { return t.id === editingId; }) || {}).createdAt || Date.now()
        : Date.now()
    };

    if (editingId) {
      var idx = tasks.findIndex(function (t) { return t.id === editingId; });
      if (idx !== -1) tasks[idx] = data;
      showMessage('Task "' + data.title + '" updated.');
    } else {
      tasks.push(data);
      showMessage('Task "' + data.title + '" created.');
    }

    saveTasks();
    renderAll();
    closeModal();
  }

  function handleDelete() {
    if (!pendingDeleteId) return;
    var task = tasks.find(function (t) { return t.id === pendingDeleteId; });
    tasks = tasks.filter(function (t) { return t.id !== pendingDeleteId; });

    if (viewMode === 'board') {
      var dropzone = el.tasksContainer.querySelector('.board-dropzone[data-status="' + task.status + '"]');
      if (dropzone) dropzone.classList.add('drag-over');
    }
    saveTasks();
    renderAll();
    closeConfirmModal();
    if (task) {
      showToast('Task "' + task.title + '" deleted.', function () {
        tasks.push(task);
        saveTasks();
        renderAll();
      });
    }
  }

  /* ============================================================
     Theme
     ============================================================ */

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var isDark = theme === 'dark';
    el.themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    el.iconMoon.hidden = isDark;
    el.iconSun.hidden = !isDark;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) { /* ignore */ }
  }

  function toggleTheme() {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  }

  /* ============================================================
     Navigation helpers (used by inline onclick handlers)
     ============================================================ */

  window.scrollToSection = function (id, status) {
    if (status === 'completed') {
      el.statusFilter.value = 'completed';
      renderTasks();
    }
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ============================================================
     Events
     ============================================================ */

  function bindEvents() {
    el.addTaskBtn.addEventListener('click', function () { openModal(null); });
    el.modalClose.addEventListener('click', closeModal);
    el.cancelTaskBtn.addEventListener('click', closeModal);
    el.confirmClose.addEventListener('click', closeConfirmModal);
    el.confirmCancel.addEventListener('click', closeConfirmModal);
    el.messageClose.addEventListener('click', hideMessage);
    el.toastClose.addEventListener('click', hideToast);
    el.themeToggle.addEventListener('click', toggleTheme);

    // View toggle
    el.viewGridBtn.addEventListener('click', function () { setView('grid'); });
    el.viewBoardBtn.addEventListener('click', function () { setView('board'); });

    // Export / Import
    el.exportBtn.addEventListener('click', exportTasks);
    el.importBtn.addEventListener('click', function () { el.importInput.click(); });
    el.importInput.addEventListener('change', function () {
      if (el.importInput.files && el.importInput.files[0]) importTasks(el.importInput.files[0]);
    });

    // Board drag & drop (event delegation)
    el.tasksContainer.addEventListener('dragover', function (e) {
      var dz = e.target.closest('.board-dropzone');
      if (!dz || !dragTaskId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.board-column.drag-over').forEach(function (c) {
        c.classList.remove('drag-over');
      });
      var col = dz.closest('.board-column');
      if (col) col.classList.add('drag-over');
    });

    el.tasksContainer.addEventListener('dragleave', function (e) {
      var col = e.target.closest('.board-column');
      if (col) col.classList.remove('drag-over');
    });

    el.tasksContainer.addEventListener('drop', function (e) {
      var dz = e.target.closest('.board-dropzone');
      if (!dz || !dragTaskId) return;
      e.preventDefault();
      var newStatus = dz.dataset.status;
      var task = tasks.find(function (t) { return t.id === dragTaskId; });
      if (!task || task.status === newStatus) {
        renderTasks();
        return;
      }
      var was = task.status;
      task.status = newStatus;
      saveTasks();
      renderAll();
      showToast('Task "' + task.title + '" moved to ' + STATUS_LABELS[newStatus] + '.', function () {
        task.status = was;
        saveTasks();
        renderAll();
      });
    });

    el.form.addEventListener('submit', handleSubmit);
    el.confirmDelete.addEventListener('click', handleDelete);

    // Close on backdrop click.
    document.querySelectorAll('[data-close-modal]').forEach(function (bd) {
      bd.addEventListener('click', function () {
        closeModal();
        closeConfirmModal();
      });
    });

    // Close on Escape.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeModal();
      closeConfirmModal();
    });

    // Filters & search (debounced for input).
    el.searchInput.addEventListener('input', debounce(renderTasks, 150));
    el.statusFilter.addEventListener('change', renderTasks);
    el.priorityFilter.addEventListener('change', renderTasks);

    // Persist view preference.
    window.addEventListener('beforeunload', function () {
      try { localStorage.setItem('taskflow_view', viewMode); } catch (err) { /* ignore */ }
    });

    // Multi-tab sync.
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY || e.key === null) {
        tasks = loadTasks();
        renderAll();
      }
    });

    // Keyboard: 'n' opens new task, '/' focuses search.
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      var editing = el.fTitle === document.activeElement || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'n' && !editing && el.modal.hidden) {
        openModal(null);
      }
      if (e.key === '/' && !editing && el.searchInput !== document.activeElement) {
        e.preventDefault();
        el.searchInput.focus();
      }
    });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  /* ============================================================
     Init
     ============================================================ */

  function init() {
    bindEvents();
    applyTheme(currentTheme());
    try {
      var savedView = localStorage.getItem('taskflow_view');
      if (savedView === 'board') setView('board');
    } catch (e) { /* ignore */ }
    renderAll();
    hideMessage();
  }

  document.addEventListener('DOMContentLoaded', init);
})();