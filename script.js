import {
  STATUS,
  PRIORITY,
  MAX_TASKS,
  dayKey,
  addDays,
  validDate,
  dateLabel,
  dueLabel,
  overdue,
  normalizeTasks,
  parseBackup,
  mergeTasks,
  filterTasks,
  summarize,
  groupTasks,
  equalTask,
  undoChanges,
  sampleTasks,
} from "./core.js";
const $ = (id) => document.getElementById(id);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name) =>
  `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#icon-${name}"/></svg>`;
const KEY = "taskflow_tasks";
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};
const routes = {
  all: ["Task inbox", "A clear place for your next step."],
  today: ["Today", "Due today and anything still waiting."],
  upcoming: ["Upcoming", "Make room for what is next."],
  completed: ["Completed", "A little more space for what matters."],
  settings: ["Workspace settings", "Your preferences, data and shortcuts."],
};
const state = {
  tasks: [],
  route: "all",
  query: "",
  status: "all",
  priority: "all",
  date: "",
  sort: "priority",
  view: ["list", "grid", "board"].includes(store.get("taskflow_view"))
    ? store.get("taskflow_view")
    : "list",
  lane: "todo",
  editingId: null,
  editingSnapshot: null,
  returnFocus: null,
  confirmAction: null,
  undo: null,
  timer: null,
  dragId: null,
  sample: store.get("taskflow_sample") === "true",
  storageOK: true,
};
function announce(message) {
  $("live-status").textContent = message;
}
function notice(message) {
  $("notice-text").textContent = message;
  $("notice").hidden = false;
}
function persist() {
  state.storageOK = store.set(KEY, JSON.stringify(state.tasks));
  store.set("taskflow_sample", String(state.sample));
  if (!state.storageOK)
    notice(
      "Browser storage is unavailable or full. Changes work for this visit; export a backup before leaving.",
    );
  $("storage-state").textContent = state.storageOK
    ? "Saved on this device"
    : "Visit only · Export to keep";
}
function initData() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
    if (raw === null) {
      state.tasks = sampleTasks();
      state.sample = true;
      persist();
    } else {
      const result = normalizeTasks(JSON.parse(raw));
      state.tasks = result.tasks;
      if (result.skipped)
        notice(
          `${result.skipped} invalid saved task(s) could not be read. Valid tasks are kept.`,
        );
    }
  } catch {
    state.tasks = [];
    state.storageOK = false;
    notice(
      "Saved tasks could not be read, or storage is unavailable. Import a backup or create tasks for this visit.",
    );
  }
}
function toast(message, changes = null) {
  clearTimeout(state.timer);
  state.undo = changes;
  $("toast-message").textContent = message;
  $("undo").hidden = !changes?.length;
  $("toast").hidden = false;
  state.timer = setTimeout(() => {
    $("toast").hidden = true;
    state.undo = null;
  }, 15000);
  announce(message);
}
function changed(changes, message) {
  persist();
  render();
  toast(message, changes);
}
function statusChange(id, status) {
  const before = state.tasks.find((t) => t.id === id);
  if (!before || before.status === status || !Object.hasOwn(STATUS, status))
    return;
  const after = { ...before, status, updatedAt: Date.now() };
  state.tasks = state.tasks.map((t) => (t.id === id ? after : t));
  changed([{ id, before, after }], `Moved to ${STATUS[status].toLowerCase()}.`);
  restoreTaskFocus(id);
}
function restoreTaskFocus(id) {
  document
    .querySelector(`[data-task-id="${CSS.escape(id)}"] .task-identity`)
    ?.focus({ preventScroll: true });
}
function safeClose(dialog) {
  dialog.close();
}
function openTask(id = null) {
  if (!id && state.tasks.length >= MAX_TASKS) {
    notice(
      "This workspace has 1,000 tasks. Export and remove tasks before adding more.",
    );
    return;
  }
  const task = id ? state.tasks.find((t) => t.id === id) : null;
  if (id && !task) {
    notice("This task is no longer in the workspace.");
    return;
  }
  state.returnFocus = document.activeElement;
  state.editingId = id;
  state.editingSnapshot = task ? { ...task } : null;
  $("form-title").textContent = task ? "Task details" : "New task";
  $("form-description").textContent = task
    ? "A clear next step, with room for the details."
    : "Give your next step a clear home.";
  $("task-title").value = task?.title || "";
  $("task-description").value = task?.description || "";
  $("task-priority").value = task?.priority || "medium";
  $("task-status").value = task?.status || "todo";
  $("task-date").value = task?.dueDate || "";
  $("title-error").hidden = true;
  $("task-title").removeAttribute("aria-invalid");
  $("form-error").hidden = true;
  $("save-task").textContent = task ? "Save changes" : "Create task";
  $("delete-task").hidden = !task;
  $("task-dialog").showModal();
  $("task-title").focus();
}
function confirmAction(title, description, label, action) {
  state.confirmAction = action;
  $("confirm-dialog").returnValue = "";
  $("confirm-title").textContent = title;
  $("confirm-description").textContent = description;
  $("confirm-accept").textContent = label;
  $("confirm-cancel").textContent =
    label === "Delete task" ? "Keep task" : "Cancel";
  $("confirm-dialog").showModal();
  $("confirm-cancel").focus();
}
function deleteTask() {
  const id = state.editingId,
    task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  confirmAction(
    "Delete this task?",
    `“${task.title}” will be removed from this workspace. You can undo this action immediately afterwards.`,
    "Delete task",
    () => {
      const before = state.tasks.find((t) => t.id === id);
      if (!before) return;
      state.tasks = state.tasks.filter((t) => t.id !== id);
      safeClose($("task-dialog"));
      changed([{ id, before, after: null }], "Task deleted.");
      $("page-title").focus({ preventScroll: true });
    },
  );
}
function submitTask(event) {
  event.preventDefault();
  const title = $("task-title").value.trim();
  if (!title || title.length > 120) {
    $("title-error").textContent =
      "Enter a task name between 1 and 120 characters.";
    $("title-error").hidden = false;
    $("task-title").setAttribute("aria-invalid", "true");
    $("task-title").focus();
    return;
  }
  if ($("task-date").value && !validDate($("task-date").value)) {
    $("form-error").textContent = "Choose a valid due date.";
    $("form-error").hidden = false;
    return;
  }
  const current = state.editingId
    ? state.tasks.find((t) => t.id === state.editingId)
    : null;
  if (state.editingId && !equalTask(current, state.editingSnapshot)) {
    $("form-error").textContent =
      "This task changed in another tab. Close and reopen it before saving.";
    $("form-error").hidden = false;
    return;
  }
  if (!current && state.tasks.length >= MAX_TASKS) {
    $("form-error").textContent =
      "This workspace has reached 1,000 tasks. Export and remove tasks first.";
    $("form-error").hidden = false;
    return;
  }
  const task = {
    id: current?.id || crypto.randomUUID(),
    title,
    description: $("task-description").value.trim().slice(0, 2000),
    priority: $("task-priority").value,
    status: $("task-status").value,
    dueDate: $("task-date").value || null,
    createdAt: current?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  state.tasks = current
    ? state.tasks.map((t) => (t.id === task.id ? task : t))
    : [task, ...state.tasks];
  persist();
  safeClose($("task-dialog"));
  render();
  toast(current ? "Task updated." : "Task created.");
  restoreTaskFocus(task.id);
}
function completeButton(task) {
  const done = task.status === "completed";
  return `<button class="complete-button ${done ? "is-done" : ""}" data-action="complete" data-id="${esc(task.id)}" aria-label="${done ? "Reopen" : "Complete"} ${esc(task.title)}">${done ? icon("circle-check") : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="unchecked" cx="12" cy="12" r="8"/></svg>'}</button>`;
}
function identity(task) {
  return `<button class="task-identity" data-action="edit" data-id="${esc(task.id)}"><strong>${esc(task.title)}</strong><span>${esc(task.description || "Add a little context")}</span></button>`;
}
function priority(task) {
  return `<span class="priority-label ${task.priority}">${task.priority === "high" ? icon("flag") : ""}${PRIORITY[task.priority]}</span>`;
}
function due(task) {
  return `<span class="due-label ${overdue(task) ? "is-overdue" : ""}" title="${esc(task.dueDate ? dateLabel(task.dueDate, { day: "numeric", month: "long", year: "numeric" }) : "No due date")}">${overdue(task) ? "Overdue · " : ""}${dueLabel(task)}</span>`;
}
function statusSelect(task) {
  return `<select class="task-status" data-status-id="${esc(task.id)}" aria-label="Status for ${esc(task.title)}">${Object.entries(
    STATUS,
  )
    .map(
      ([key, label]) =>
        `<option value="${key}" ${key === task.status ? "selected" : ""}>${label}</option>`,
    )
    .join("")}</select>`;
}
function editButton(task) {
  return `<button class="edit-button" data-action="edit" data-id="${esc(task.id)}" aria-label="Edit ${esc(task.title)}">${icon("pencil")}</button>`;
}
function taskRow(task) {
  return `<article class="task-row ${task.status === "completed" ? "is-complete" : ""}" data-task-id="${esc(task.id)}">${completeButton(task)}${identity(task)}<div class="task-meta">${priority(task)}${due(task)}</div>${statusSelect(task)}${editButton(task)}</article>`;
}
function taskCard(task, draggable = false) {
  return `<article class="task-card ${task.status === "completed" ? "is-complete" : ""}" data-task-id="${esc(task.id)}" ${draggable ? 'draggable="true"' : ""}><div class="card-top">${priority(task)}${completeButton(task)}</div>${identity(task)}<div class="card-bottom">${due(task)}${editButton(task)}${statusSelect(task)}</div></article>`;
}
function currentTasks() {
  return filterTasks(state.tasks, state);
}
function renderTasks() {
  const tasks = currentTasks();
  $("result-count").textContent =
    `${tasks.length} of ${state.tasks.length} tasks`;
  $("clear-filters").hidden = !(
    state.query ||
    state.status !== "all" ||
    state.priority !== "all" ||
    state.date
  );
  $("date-filter").hidden = !state.date;
  $("date-filter").textContent = state.date
    ? `${dateLabel(state.date)} · Clear`
    : "";
  document
    .querySelectorAll("[data-view]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.view === state.view),
    );
  if (!tasks.length) {
    $("tasks").innerHTML =
      `<div class="empty-state">${icon("inbox")}<h2>${state.tasks.length ? "No tasks in this view" : "Room for your next step"}</h2><p>${state.tasks.length ? "Try another view, clear your filters, or add a task with a different deadline." : "Capture something you want to move forward. Your tasks will stay on this device."}</p>${state.tasks.length ? '<button data-action="clear-filters" class="button secondary">Reset this view</button>' : ""}<button data-action="new" class="button primary">New task</button></div>`;
    return;
  }
  if (state.view === "board") {
    const counts = summarize(tasks);
    $("tasks").innerHTML =
      `<div class="board-tabs" role="group" aria-label="Board column">${Object.entries(
        STATUS,
      )
        .map(
          ([s, label]) =>
            `<button data-lane="${s}" aria-pressed="${state.lane === s}">${label} <span>${counts[s]}</span></button>`,
        )
        .join("")}</div><div class="board">${Object.entries(STATUS)
        .map(
          ([s, label]) =>
            `<section class="board-lane ${state.lane !== s ? "is-mobile-hidden" : ""}" data-drop-status="${s}" aria-label="${label}"><h2 class="lane-heading">${label}<span>${counts[s]}</span></h2>${
              tasks
                .filter((t) => t.status === s)
                .map((t) => taskCard(t, true))
                .join("") ||
              '<p class="lane-empty">Nothing in this stage. Move a task here or create one.</p>'
            }</section>`,
        )
        .join("")}</div>`;
    return;
  }
  if (state.view === "grid") {
    $("tasks").innerHTML =
      `<div class="task-grid">${tasks.map((t) => taskCard(t)).join("")}</div>`;
    return;
  }
  $("tasks").innerHTML = groupTasks(tasks)
    .map(
      (group) =>
        `<section class="task-group ${group.name === "Overdue" ? "overdue-group" : ""}"><h2 class="group-heading">${group.name}<span>${group.tasks.length}</span></h2><div class="task-list">${group.tasks.map(taskRow).join("")}</div></section>`,
    )
    .join("");
}
function renderSummary() {
  const sums = summarize(state.tasks);
  $("status-counts").innerHTML = [
    ["all", "All tasks", sums.total],
    ["todo", "To do", sums.todo],
    ["progress", "In progress", sums.progress],
    ["completed", "Done", sums.completed],
  ]
    .map(
      ([key, label, count]) =>
        `<button data-status="${key}" aria-pressed="${state.status === key}">${label}<strong>${count}</strong></button>`,
    )
    .join("");
  $("storage-state").textContent = state.storageOK
    ? "Saved on this device"
    : "Visit only · Export to keep";
  $("sample-note").hidden = !state.sample;
  const ratio = sums.total
    ? Math.round((sums.completed / sums.total) * 100)
    : 0;
  $("progress-ratio").textContent = ratio + "%";
  $("progress-bar").setAttribute("aria-valuenow", ratio);
  $("progress-bar").style.setProperty("--progress", ratio + "%");
  $("progress-caption").textContent =
    `${sums.completed} of ${sums.total} tasks complete`;
  const next = filterTasks(state.tasks, { sort: "priority" }).find(
    (t) => t.status !== "completed",
  );
  $("next-step").innerHTML = next
    ? `<span>Next in your queue</span><button data-action="edit" data-id="${esc(next.id)}">${esc(next.title)}</button>${due(next)}`
    : '<span>No open tasks</span><p class="small">A clear inbox. Enjoy the room.</p>';
  $("backup-count").textContent =
    `${sums.total} task${sums.total === 1 ? "" : "s"} in this workspace.`;
  $("clear-workspace").disabled = !sums.total;
}
function renderWeek() {
  const today = dayKey();
  $("week-strip").innerHTML = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i),
      count = state.tasks.filter(
        (t) => t.status !== "completed" && t.dueDate === key,
      ).length;
    return `<button class="day-button ${i === 0 ? "is-today" : ""}" data-date="${key}" aria-pressed="${state.date === key}" aria-label="${dateLabel(key, { weekday: "long", day: "numeric", month: "long" })}, ${count} open tasks"><span>${dateLabel(key, { weekday: "short" })}</span><b>${Number(key.slice(-2))}</b><span class="day-count ${count ? "has-due" : ""}">${count}</span></button>`;
  }).join("");
  $("week-reset").hidden = !state.date;
}
function render() {
  const [title, description] = routes[state.route];
  $("page-title").textContent = title;
  const sums = summarize(state.tasks);
  $("page-description").textContent =
    state.route === "all" && sums.overdue
      ? `${sums.overdue} overdue task${sums.overdue === 1 ? " needs" : "s need"} a next step.`
      : description;
  $("task-screen").hidden = state.route === "settings";
  $("settings-screen").hidden = state.route !== "settings";
  $("new-task").hidden = state.route === "settings";
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.hash === "#" + state.route) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document
    .querySelector(".top-tools a")
    .setAttribute(
      "aria-current",
      state.route === "settings" ? "page" : "false",
    );
  renderSummary();
  renderWeek();
  renderTasks();
}
function resetFilters() {
  Object.assign(state, { query: "", priority: "all", status: "all", date: "" });
  $("search").value = "";
  $("priority").value = "all";
}
function navigate() {
  const route = location.hash.slice(1);
  state.route = Object.hasOwn(routes, route) ? route : "all";
  resetFilters();
  render();
  if ($("task-dialog").open) $("task-dialog").close();
  $("page-title").focus({ preventScroll: true });
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  store.set("taskflow_theme", theme);
  syncTheme();
}
function syncTheme() {
  const theme = document.documentElement.dataset.theme;
  $("theme-toggle").innerHTML = icon(theme === "dark" ? "sun" : "moon");
  $("theme-toggle").setAttribute(
    "aria-label",
    `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
  );
  document
    .querySelectorAll("[data-theme-choice]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.themeChoice === theme),
    );
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(
    document.documentElement,
  )
    .getPropertyValue("--ground")
    .trim();
}
function exportTasks() {
  const blob = new Blob([JSON.stringify(state.tasks, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taskflow-tasks-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${state.tasks.length} tasks.`);
}
async function importTasks(file) {
  if (!file) return;
  if (file.size > 1024 * 1024) {
    notice("Choose a JSON backup smaller than 1 MB.");
    return;
  }
  try {
    const result = parseBackup(await file.text());
    const before = state.tasks;
    const merged = mergeTasks(before, result.tasks);
    const changes = result.tasks.map((after) => ({
      id: after.id,
      before: before.find((t) => t.id === after.id) || null,
      after,
    }));
    state.tasks = merged;
    changed(
      changes,
      `Imported ${result.tasks.length} tasks${result.skipped ? `; skipped ${result.skipped} invalid records` : ""}.`,
    );
  } catch (error) {
    notice(
      error.message ||
        "The backup could not be read. Choose a valid JSON file.",
    );
  } finally {
    $("import-file").value = "";
  }
}
function bind() {
  $("new-task").onclick = () => openTask();
  $("close-task").onclick = () => safeClose($("task-dialog"));
  $("cancel-task").onclick = () => safeClose($("task-dialog"));
  $("task-form").onsubmit = submitTask;
  $("delete-task").onclick = deleteTask;
  $("task-dialog").addEventListener("close", () => {
    const previous = state.returnFocus;
    if (previous?.isConnected) previous.focus({ preventScroll: true });
    else $("new-task").focus({ preventScroll: true });
  });
  $("confirm-dialog").addEventListener("close", () => {
    const action = state.confirmAction;
    state.confirmAction = null;
    if ($("confirm-dialog").returnValue === "confirm") action?.();
  });
  $("notice-close").onclick = () => {
    $("notice").hidden = true;
  };
  $("theme-toggle").onclick = () =>
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    );
  document
    .querySelectorAll("[data-theme-choice]")
    .forEach((b) => (b.onclick = () => setTheme(b.dataset.themeChoice)));
  $("search").addEventListener("input", () => {
    state.query = $("search").value;
    renderTasks();
  });
  $("priority").onchange = () => {
    state.priority = $("priority").value;
    renderTasks();
  };
  $("sort").onchange = () => {
    state.sort = $("sort").value;
    renderTasks();
  };
  $("clear-filters").onclick = () => {
    resetFilters();
    render();
  };
  $("date-filter").onclick = () => {
    state.date = "";
    render();
  };
  document.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        state.view = b.dataset.view;
        store.set("taskflow_view", state.view);
        renderTasks();
        announce(`${state.view} view selected.`);
      }),
  );
  $("status-counts").onclick = (event) => {
    const b = event.target.closest("[data-status]");
    if (b) {
      state.status = b.dataset.status;
      renderSummary();
      renderTasks();
    }
  };
  $("tasks").onclick = (event) => {
    const b = event.target.closest("[data-action]");
    if (b) {
      if (b.dataset.action === "edit") openTask(b.dataset.id);
      if (b.dataset.action === "complete") {
        const task = state.tasks.find((t) => t.id === b.dataset.id);
        if (task)
          statusChange(
            task.id,
            task.status === "completed" ? "todo" : "completed",
          );
      }
      if (b.dataset.action === "new") openTask();
      if (b.dataset.action === "clear-filters") {
        resetFilters();
        if (state.route !== "all") location.hash = "all";
        else render();
      }
    }
    const lane = event.target.closest("[data-lane]");
    if (lane) {
      state.lane = lane.dataset.lane;
      renderTasks();
      document
        .querySelector(`[data-lane="${state.lane}"]`)
        ?.focus({ preventScroll: true });
    }
  };
  $("tasks").onchange = (event) => {
    if (event.target.matches("[data-status-id]"))
      statusChange(event.target.dataset.statusId, event.target.value);
  };
  $("next-step").onclick = (event) => {
    const b = event.target.closest("[data-id]");
    if (b) openTask(b.dataset.id);
  };
  $("week-strip").onclick = (event) => {
    const b = event.target.closest("[data-date]");
    if (!b) return;
    if (state.route !== "all") {
      state.route = "all";
      history.replaceState(null, "", "#all");
      resetFilters();
    }
    state.date = state.date === b.dataset.date ? "" : b.dataset.date;
    render();
    document
      .querySelector(`[data-date="${b.dataset.date}"]`)
      ?.focus({ preventScroll: true });
    announce(
      state.date
        ? `Tasks due ${dateLabel(state.date)}.`
        : "All dates selected.",
    );
  };
  $("week-reset").onclick = () => {
    state.date = "";
    render();
  };
  $("rail-export").onclick = exportTasks;
  $("export-tasks").onclick = exportTasks;
  $("import-tasks").onclick = () => $("import-file").click();
  $("import-file").onchange = () => importTasks($("import-file").files[0]);
  $("clear-workspace").onclick = () =>
    confirmAction(
      "Clear this workspace?",
      `${state.tasks.length} tasks will be removed from this browser. Export a backup first if you want a lasting copy.`,
      "Clear tasks",
      () => {
        const changes = state.tasks.map((before) => ({
          id: before.id,
          before,
          after: null,
        }));
        state.tasks = [];
        state.sample = false;
        changed(changes, "Workspace cleared.");
      },
    );
  $("load-samples").onclick = () =>
    confirmAction(
      "Load sample tasks?",
      `This will replace the ${state.tasks.length} tasks currently in this workspace. Export your work first.`,
      "Load samples",
      () => {
        const before = state.tasks;
        const after = sampleTasks();
        state.tasks = after;
        state.sample = true;
        const ids = new Set([...before, ...after].map((t) => t.id));
        changed(
          [...ids].map((id) => ({
            id,
            before: before.find((t) => t.id === id) || null,
            after: after.find((t) => t.id === id) || null,
          })),
          "Sample tasks loaded.",
        );
      },
    );
  $("undo").onclick = () => {
    if (!state.undo) return;
    const result = undoChanges(state.tasks, state.undo);
    state.tasks = result.tasks;
    persist();
    render();
    toast(
      `Restored ${result.restored} change${result.restored === 1 ? "" : "s"}${result.skipped ? `; ${result.skipped} newer changes kept` : ""}.`,
    );
  };
  $("close-toast").onclick = () => {
    $("toast").hidden = true;
    state.undo = null;
    clearTimeout(state.timer);
  };
  $("tasks").addEventListener("dragstart", (event) => {
    const card = event.target.closest("[draggable=true]");
    if (!card) return;
    state.dragId = card.dataset.taskId;
    event.dataTransfer.setData("text/plain", state.dragId);
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("dragging");
  });
  $("tasks").addEventListener("dragend", () => {
    state.dragId = null;
    document
      .querySelectorAll(".dragging,.drag-over")
      .forEach((el) => el.classList.remove("dragging", "drag-over"));
  });
  $("tasks").addEventListener("dragover", (event) => {
    const lane = event.target.closest("[data-drop-status]");
    if (lane && state.dragId) {
      event.preventDefault();
      lane.classList.add("drag-over");
      event.dataTransfer.dropEffect = "move";
    }
  });
  $("tasks").addEventListener("dragleave", (event) => {
    const lane = event.target.closest("[data-drop-status]");
    if (lane && !lane.contains(event.relatedTarget))
      lane.classList.remove("drag-over");
  });
  $("tasks").addEventListener("drop", (event) => {
    const lane = event.target.closest("[data-drop-status]");
    if (lane && state.dragId) {
      event.preventDefault();
      statusChange(state.dragId, lane.dataset.dropStatus);
    }
    state.dragId = null;
  });
  document.addEventListener("keydown", (event) => {
    const modal = [...document.querySelectorAll("dialog[open]")].at(-1);
    if (modal && event.key === "Tab") {
      const controls = [
        ...modal.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex="0"]',
        ),
      ].filter((el) => !el.disabled && el.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat ||
      document.querySelector("dialog[open]") ||
      event.target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
    )
      return;
    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      openTask();
    }
    if (event.key === "/") {
      event.preventDefault();
      if (state.route === "settings") {
        location.hash = "all";
        requestAnimationFrame(() => $("search").focus());
      } else $("search").focus();
    }
  });
  window.addEventListener("hashchange", navigate);
  window.addEventListener("storage", (event) => {
    if (event.key === KEY || event.key === null) {
      try {
        state.tasks = normalizeTasks(JSON.parse(event.newValue ?? "[]")).tasks;
        render();
        announce("Workspace updated from another tab.");
      } catch {
        notice(
          "Another tab sent unreadable task data. Your current view has been kept.",
        );
      }
    }
    if (
      event.key === "taskflow_theme" &&
      ["light", "dark"].includes(event.newValue)
    ) {
      document.documentElement.dataset.theme = event.newValue;
      syncTheme();
    }
  });
}
initData();
bind();
syncTheme();
state.route = Object.hasOwn(routes, location.hash.slice(1))
  ? location.hash.slice(1)
  : "all";
render();
