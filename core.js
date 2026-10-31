export const STATUS = {
  todo: "To do",
  progress: "In progress",
  completed: "Completed",
};
export const PRIORITY = { high: "High", medium: "Medium", low: "Low" };
export const MAX_TASKS = 1000;
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(key, count) {
  const date = new Date(key + "T12:00:00");
  date.setDate(date.getDate() + count);
  return dayKey(date);
}
export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T12:00:00");
  return (
    !isNaN(date) && dayKey(date) === value && Number(value.slice(0, 4)) >= 1000
  );
}
export function dateLabel(key, options = { day: "numeric", month: "short" }) {
  return validDate(key)
    ? new Intl.DateTimeFormat("en-GB", options).format(
        new Date(key + "T12:00:00"),
      )
    : "No date";
}
export function dueLabel(task, today = dayKey()) {
  if (!task.dueDate) return "No date";
  return task.dueDate === today
    ? "Today"
    : task.dueDate === addDays(today, 1)
      ? "Tomorrow"
      : dateLabel(task.dueDate);
}
export const overdue = (task, today = dayKey()) =>
  task.status !== "completed" && !!task.dueDate && task.dueDate < today;
export function cleanTask(value, now = Date.now()) {
  if (
    !value ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    value.title.length > 120
  )
    return null;
  return {
    id:
      typeof value.id === "string" && value.id.length && value.id.length <= 100
        ? value.id
        : crypto.randomUUID(),
    title: value.title.trim(),
    description:
      typeof value.description === "string"
        ? value.description.slice(0, 2000)
        : "",
    priority: Object.hasOwn(PRIORITY, value.priority)
      ? value.priority
      : "medium",
    status: Object.hasOwn(STATUS, value.status) ? value.status : "todo",
    dueDate: validDate(value.dueDate) ? value.dueDate : null,
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : now,
    updatedAt: Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : Number.isFinite(value.createdAt)
        ? value.createdAt
        : now,
  };
}
export function normalizeTasks(values) {
  if (!Array.isArray(values))
    throw new Error("Expected a JSON array of tasks.");
  if (values.length > MAX_TASKS)
    throw new Error(`A workspace can contain up to ${MAX_TASKS} tasks.`);
  const tasks = [],
    indices = new Map();
  let skipped = 0;
  for (const value of values) {
    const task = cleanTask(value);
    if (!task) {
      skipped++;
      continue;
    }
    if (indices.has(task.id)) {
      tasks[indices.get(task.id)] = task;
    } else {
      indices.set(task.id, tasks.length);
      tasks.push(task);
    }
  }
  return { tasks, skipped };
}
export function parseBackup(text) {
  if (text.length > 1024 * 1024)
    throw new Error("Choose a JSON backup smaller than 1 MB.");
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON. Choose a TaskFlow backup.");
  }
  const result = normalizeTasks(Array.isArray(raw) ? raw : raw?.tasks);
  if (!result.tasks.length)
    throw new Error("The backup contains no valid tasks.");
  return result;
}
export function mergeTasks(existing, incoming) {
  const map = new Map(existing.map((t) => [t.id, t]));
  for (const task of incoming) map.set(task.id, task);
  if (map.size > MAX_TASKS)
    throw new Error(`The merged workspace exceeds ${MAX_TASKS} tasks.`);
  return [...map.values()];
}
export function filterTasks(
  tasks,
  {
    route = "all",
    query = "",
    status = "all",
    priority = "all",
    date = "",
    sort = "priority",
    today = dayKey(),
  } = {},
) {
  const q = query.trim().toLocaleLowerCase();
  const ranks = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter(
      (t) =>
        (route === "today"
          ? t.status !== "completed" && !!t.dueDate && t.dueDate <= today
          : route === "upcoming"
            ? t.status !== "completed" && !!t.dueDate && t.dueDate > today
            : route === "completed"
              ? t.status === "completed"
              : true) &&
        (status === "all" || t.status === status) &&
        (priority === "all" || t.priority === priority) &&
        (!date || t.dueDate === date) &&
        (!q || (t.title + " " + t.description).toLocaleLowerCase().includes(q)),
    )
    .sort((a, b) =>
      sort === "newest"
        ? b.createdAt - a.createdAt || a.title.localeCompare(b.title)
        : sort === "due"
          ? (a.dueDate || "9999-12-31").localeCompare(
              b.dueDate || "9999-12-31",
            ) || ranks[a.priority] - ranks[b.priority]
          : ranks[a.priority] - ranks[b.priority] ||
            (a.dueDate || "9999-12-31").localeCompare(
              b.dueDate || "9999-12-31",
            ) ||
            a.createdAt - b.createdAt,
    );
}
export function summarize(tasks, today = dayKey()) {
  return {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    progress: tasks.filter((t) => t.status === "progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => overdue(t, today)).length,
    today: tasks.filter((t) => t.status !== "completed" && t.dueDate === today)
      .length,
  };
}
export function groupTasks(tasks, today = dayKey()) {
  const groups = [
    ["Overdue", (t) => overdue(t, today)],
    ["Due today", (t) => t.status !== "completed" && t.dueDate === today],
    [
      "Coming up",
      (t) => t.status !== "completed" && !!t.dueDate && t.dueDate > today,
    ],
    ["Without a date", (t) => t.status !== "completed" && !t.dueDate],
    ["Completed", (t) => t.status === "completed"],
  ];
  return groups
    .map(([name, test]) => ({ name, tasks: tasks.filter(test) }))
    .filter((g) => g.tasks.length);
}
export const equalTask = (a, b) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export function undoChanges(tasks, changes) {
  const map = new Map(tasks.map((t) => [t.id, t]));
  let restored = 0;
  for (const change of changes) {
    if (!equalTask(map.get(change.id), change.after)) continue;
    if (change.before && !map.has(change.id) && map.size >= MAX_TASKS) continue;
    if (change.before) map.set(change.id, change.before);
    else map.delete(change.id);
    restored++;
  }
  return {
    tasks: [...map.values()],
    restored,
    skipped: changes.length - restored,
  };
}
export function sampleTasks(today = dayKey()) {
  const rows = [
    [
      "Review the dashboard handoff",
      "Check the interaction notes and confirm the final states.",
      "high",
      "todo",
      -1,
    ],
    [
      "Map the onboarding flow",
      "Keep the first three steps focused on the main job.",
      "high",
      "progress",
      0,
    ],
    [
      "Prepare the client walkthrough",
      "Choose a short path through the new experience.",
      "medium",
      "todo",
      1,
    ],
    [
      "Audit the mobile navigation",
      "Verify touch targets, focus order and the return path.",
      "high",
      "todo",
      2,
    ],
    [
      "Write the release notes",
      "Summarize the changes people will notice.",
      "medium",
      "todo",
      4,
    ],
    [
      "Update the component guidelines",
      "Document the new field and empty states.",
      "low",
      "progress",
      3,
    ],
    [
      "Collect accessibility feedback",
      "Review the keyboard and contrast observations.",
      "medium",
      "todo",
      6,
    ],
    [
      "Archive last sprint explorations",
      "Keep the useful decisions with the final files.",
      "low",
      "completed",
      -2,
    ],
    [
      "Sketch the empty states",
      "Create a clear next action for each empty view.",
      "medium",
      "completed",
      -1,
    ],
    [
      "Plan next week priorities",
      "Leave enough room for unexpected work.",
      "low",
      "todo",
      null,
    ],
  ];
  return rows.map(([title, description, priority, status, offset], i) => ({
    id: "sample-" + (i + 1),
    title,
    description,
    priority,
    status,
    dueDate: offset === null ? null : addDays(today, offset),
    createdAt: Date.now() - (10 - i) * 3600000,
    updatedAt: Date.now() - (10 - i) * 3600000,
  }));
}
