import type { Snapshot, Task } from "./models";
export function progress(tasks: Task[]) {
  return tasks.length
    ? Math.round(
        (tasks.filter((t) => t.status === "done").length / tasks.length) * 100,
      )
    : 0;
}
export function blocked(task: Task, tasks: Task[]) {
  return task.dependencies.some(
    (id) => tasks.find((t) => t.id === id)?.status !== "done",
  );
}
export function validateGraph(tasks: Task[]) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw new Error("Quan hệ phụ thuộc tạo thành vòng lặp.");
    if (visited.has(id)) return;
    const task = byId.get(id);
    if (!task) throw new Error("Công việc phụ thuộc không tồn tại.");
    visiting.add(id);
    for (const dep of task.dependencies) {
      if (byId.get(dep)?.problemId !== task.problemId)
        throw new Error("Phụ thuộc phải thuộc cùng vấn đề.");
      visit(dep);
    }
    visiting.delete(id);
    visited.add(id);
  }
  tasks.forEach((t) => visit(t.id));
  for (const task of tasks)
    if (task.status !== "todo" && blocked(task, tasks))
      throw new Error("Hoàn thành công việc phụ thuộc trước khi bắt đầu.");
}
export function validateSnapshot(s: Snapshot) {
  for (const rows of [s.problems, s.plans, s.tasks, s.activities])
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error("Dữ liệu có ID trùng lặp.");
  const problems = new Map(s.problems.map((p) => [p.id, p]));
  const plans = new Map(s.plans.map((p) => [p.id, p]));
  for (const p of s.plans)
    if (!problems.has(p.problemId))
      throw new Error("Phương án thiếu vấn đề liên kết.");
  for (const t of s.tasks)
    if (
      !problems.has(t.problemId) ||
      plans.get(t.planId)?.problemId !== t.problemId
    )
      throw new Error("Công việc thiếu phương án hoặc vấn đề liên kết.");
  for (const a of s.activities)
    if (!problems.has(a.problemId))
      throw new Error("Lịch sử thiếu vấn đề liên kết.");
  validateGraph(s.tasks);
  for (const p of s.problems)
    if (
      p.status === "resolved" &&
      (!p.review.trim() ||
        s.tasks.some((t) => t.problemId === p.id && t.status !== "done"))
    )
      throw new Error(
        "Vấn đề đã giải quyết cần có đánh giá và hoàn thành công việc.",
      );
}
