import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanTask,
  normalizeTasks,
  parseBackup,
  mergeTasks,
  dayKey,
  addDays,
  validDate,
  filterTasks,
  summarize,
  groupTasks,
  undoChanges,
  sampleTasks,
  MAX_TASKS,
} from "../core.js";
const today = "2026-10-31";
const make = (id, more = {}) =>
  cleanTask({ id, title: `Task ${id}`, createdAt: 1, ...more });
test("legacy records preserve IDs, timestamps, status and due dates", () => {
  const old = {
    id: "old",
    title: "Original task",
    description: "Saved context",
    priority: "high",
    status: "progress",
    dueDate: "2026-11-01",
    createdAt: 100,
  };
  assert.deepEqual(normalizeTasks([old]).tasks, [{ ...old, updatedAt: 100 }]);
  assert.deepEqual(normalizeTasks([]).tasks, []);
});
test("invalid records are skipped and repeated IDs resolve deterministically", () => {
  const { tasks, skipped } = normalizeTasks([
    null,
    {},
    make("a"),
    make("a", { title: "Updated" }),
    make("b", {
      status: "__proto__",
      priority: "constructor",
      dueDate: "2026-02-30",
    }),
  ]);
  assert.equal(skipped, 2);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].title, "Updated");
  assert.equal(tasks[1].status, "todo");
  assert.equal(tasks[1].priority, "medium");
  assert.equal(tasks[1].dueDate, null);
});
test("backup validation bounds imports and accepts old arrays or task envelopes", () => {
  assert.equal(parseBackup(JSON.stringify([make("a")])).tasks.length, 1);
  assert.equal(
    parseBackup(JSON.stringify({ tasks: [make("a")] })).tasks.length,
    1,
  );
  for (const bad of [
    "{",
    "{}",
    "[]",
    "null",
    JSON.stringify([{}]),
    "x".repeat(1024 * 1024 + 1),
  ])
    assert.throws(() => parseBackup(bad));
  assert.throws(() => normalizeTasks(Array(MAX_TASKS + 1).fill(make("a"))));
});
test("merge preserves unrelated tasks, updates matching IDs and never mutates inputs", () => {
  const original = [make("a"), make("b")],
    incoming = [make("a", { title: "Changed" }), make("c")];
  const merged = mergeTasks(original, incoming);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].title, "Changed");
  assert.equal(original[0].title, "Task a");
  assert.equal(merged[1], original[1]);
  assert.throws(() =>
    mergeTasks(
      Array.from({ length: MAX_TASKS }, (_, i) => make(String(i))),
      [make("extra")],
    ),
  );
});
test("local calendar handles month, leap year and DST boundaries", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09");
  assert.equal(dayKey(new Date(2026, 9, 31, 23, 59)), "2026-10-31");
  for (const date of ["2026-02-29", "2026-13-01", "26-10-31", "0999-01-01"])
    assert.equal(validDate(date), false);
  assert.equal(validDate("2024-02-29"), true);
});
test("combined filters match title and description without changing workspace totals", () => {
  const tasks = sampleTasks(today),
    result = filterTasks(tasks, {
      today,
      query: "interaction",
      priority: "high",
      status: "todo",
    });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "sample-1");
  assert.deepEqual(summarize(tasks, today), {
    total: 10,
    todo: 6,
    progress: 2,
    completed: 2,
    overdue: 1,
    today: 1,
  });
  assert.equal(filterTasks(tasks, { today, route: "today" }).length, 2);
  assert.equal(filterTasks(tasks, { today, route: "upcoming" }).length, 5);
  assert.equal(filterTasks(tasks, { today, route: "completed" }).length, 2);
  assert.equal(filterTasks(tasks, { today, date: "2026-11-01" }).length, 1);
});
test("groups partition every task exactly once, including undated and past completed", () => {
  const tasks = sampleTasks(today),
    groups = groupTasks(tasks, today);
  assert.deepEqual(
    groups.map((g) => g.name),
    ["Overdue", "Due today", "Coming up", "Without a date", "Completed"],
  );
  assert.equal(
    new Set(groups.flatMap((g) => g.tasks.map((t) => t.id))).size,
    tasks.length,
  );
  assert.equal(groups.at(-1).tasks.length, 2);
});
test("undo restores its own changes while retaining unrelated or newer updates", () => {
  const before = make("a"),
    after = make("a", { status: "completed", updatedAt: 2 }),
    other = make("b");
  assert.deepEqual(
    undoChanges([after, other], [{ id: "a", before, after }]).tasks,
    [before, other],
  );
  const newer = make("a", { title: "Newer work", updatedAt: 3 });
  const result = undoChanges([newer, other], [{ id: "a", before, after }]);
  assert.equal(result.restored, 0);
  assert.equal(result.skipped, 1);
  assert.deepEqual(result.tasks, [newer, other]);
  assert.equal(
    undoChanges([other], [{ id: "a", before, after: null }]).tasks.length,
    2,
  );
  assert.equal(
    undoChanges([before, other], [{ id: "a", before: null, after: before }])
      .tasks.length,
    1,
  );
});
test("undo cannot exceed the workspace capacity", () => {
  const full = Array.from({ length: MAX_TASKS }, (_, i) => make(String(i)));
  const result = undoChanges(full, [
    { id: "extra", before: make("extra"), after: null },
  ]);
  assert.equal(result.tasks.length, MAX_TASKS);
  assert.equal(result.skipped, 1);
});
