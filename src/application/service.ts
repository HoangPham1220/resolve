import {
  backupSchema,
  problemSchema,
  planSchema,
  taskSchema,
  type Problem,
  type Plan,
  type Task,
  type Snapshot,
} from "../domain/models";
import type { ResolveRepository } from "../domain/repository";
import { validateSnapshot } from "../domain/logic";
const now = () => new Date().toISOString();
const stamp = () => ({
  id: crypto.randomUUID(),
  createdAt: now(),
  updatedAt: now(),
});
const problemInputSchema = problemSchema.pick({
  title: true,
  description: true,
  category: true,
  priority: true,
});
const problemUpdateSchema = problemSchema
  .pick({
    title: true,
    description: true,
    category: true,
    priority: true,
    status: true,
    causes: true,
    impact: true,
    outcome: true,
    review: true,
    lessons: true,
  })
  .partial();
const planInputSchema = planSchema.pick({ title: true, description: true });
const taskInputSchema = taskSchema.pick({
  problemId: true,
  planId: true,
  title: true,
  dueDate: true,
  priority: true,
  dependencies: true,
});
function log(s: Snapshot, problemId: string, message: string) {
  const timestamp = now();
  const problem = s.problems.find((problem) => problem.id === problemId);
  if (problem) problem.updatedAt = timestamp;
  s.activities.push({
    id: crypto.randomUUID(),
    problemId,
    message,
    createdAt: timestamp,
  });
}
function editable(s: Snapshot, id: string) {
  const p = s.problems.find((p) => p.id === id);
  if (!p) throw new Error("Không tìm thấy vấn đề.");
  if (p.archived) throw new Error("Khôi phục vấn đề trước khi chỉnh sửa.");
  return p;
}
export class ResolveService {
  constructor(private repository: ResolveRepository) {}
  async createProblem(
    input: Pick<Problem, "title" | "description" | "category" | "priority">,
  ) {
    const data = problemInputSchema.parse(input);
    const p = problemSchema.parse({
      ...stamp(),
      ...data,
      status: "open",
      archived: false,
      causes: "",
      impact: "",
      outcome: "",
      review: "",
      lessons: "",
    });
    await this.repository.mutate((s) => {
      s.problems.push(p);
      log(s, p.id, "Đã ghi nhận vấn đề");
    });
    return p.id;
  }
  async updateProblem(
    id: string,
    input: Partial<
      Pick<
        Problem,
        | "title"
        | "description"
        | "category"
        | "priority"
        | "status"
        | "causes"
        | "impact"
        | "outcome"
        | "review"
        | "lessons"
      >
    >,
  ) {
    const data = problemUpdateSchema.parse(input);
    await this.repository.mutate((s) => {
      const p = editable(s, id);
      Object.assign(
        p,
        problemSchema.parse({ ...p, ...data, updatedAt: now() }),
      );
      log(
        s,
        id,
        data.status === "resolved"
          ? "Đã đánh giá và giải quyết vấn đề"
          : "Đã cập nhật vấn đề",
      );
    });
  }
  async archive(id: string, archived: boolean) {
    await this.repository.mutate((s) => {
      const p = s.problems.find((p) => p.id === id);
      if (!p) throw new Error("Không tìm thấy vấn đề.");
      p.archived = archived;
      p.updatedAt = now();
      log(s, id, archived ? "Đã lưu trữ vấn đề" : "Đã khôi phục vấn đề");
    });
  }
  async createPlan(
    problemId: string,
    input: Pick<Plan, "title" | "description">,
  ) {
    const data = planInputSchema.parse(input);
    const p = planSchema.parse({ ...stamp(), problemId, ...data });
    await this.repository.mutate((s) => {
      const problem = editable(s, problemId);
      if (problem.status === "resolved")
        throw new Error("Mở lại vấn đề trước khi thêm phương án.");
      s.plans.push(p);
      log(s, problemId, `Đã thêm phương án: ${p.title}`);
    });
  }
  async updatePlan(id: string, input: Pick<Plan, "title" | "description">) {
    const data = planInputSchema.parse(input);
    await this.repository.mutate((s) => {
      const plan = s.plans.find((plan) => plan.id === id);
      if (!plan) throw new Error("Không tìm thấy phương án.");
      const problem = editable(s, plan.problemId);
      if (problem.status === "resolved")
        throw new Error("Mở lại vấn đề trước khi chỉnh sửa phương án.");
      Object.assign(
        plan,
        planSchema.parse({ ...plan, ...data, updatedAt: now() }),
      );
      log(s, plan.problemId, `Đã cập nhật phương án: ${plan.title}`);
    });
  }
  async saveTask(
    input: Pick<
      Task,
      "problemId" | "planId" | "title" | "dueDate" | "priority" | "dependencies"
    >,
    id?: string,
  ) {
    const data = taskInputSchema.parse(input);
    await this.repository.mutate((s) => {
      const existing = id ? s.tasks.find((t) => t.id === id) : undefined;
      if (id && !existing) throw new Error("Không tìm thấy công việc.");
      if (existing && existing.problemId !== data.problemId)
        throw new Error("Không thể chuyển công việc sang vấn đề khác.");
      const p = editable(s, existing?.problemId ?? data.problemId);
      if (p.status === "resolved")
        throw new Error("Mở lại vấn đề trước khi chỉnh sửa công việc.");
      const task = taskSchema.parse({
        ...stamp(),
        order: s.tasks.length,
        status: "todo",
        ...existing,
        ...data,
        updatedAt: now(),
      });
      if (existing) Object.assign(existing, task);
      else s.tasks.push(task);
      log(
        s,
        p.id,
        `${existing ? "Đã sửa" : "Đã thêm"} công việc: ${task.title}`,
      );
    });
  }
  async moveTask(id: string, direction: -1 | 1) {
    if (direction !== -1 && direction !== 1)
      throw new Error("Hướng sắp xếp không hợp lệ.");
    await this.repository.mutate((s) => {
      const task = s.tasks.find((t) => t.id === id);
      if (!task) throw new Error("Không tìm thấy công việc.");
      const problem = editable(s, task.problemId);
      if (problem.status === "resolved")
        throw new Error("Mở lại vấn đề trước khi sắp xếp công việc.");
      const ordered = s.tasks
        .filter((t) => t.planId === task.planId)
        .sort(
          (a, b) =>
            a.order - b.order ||
            a.createdAt.localeCompare(b.createdAt) ||
            a.id.localeCompare(b.id),
        );
      const index = ordered.findIndex((t) => t.id === id);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= ordered.length) return;
      [ordered[index], ordered[nextIndex]] = [
        ordered[nextIndex],
        ordered[index],
      ];
      const timestamp = now();
      ordered.forEach((t, order) => {
        if (t.order !== order) {
          t.order = order;
          t.updatedAt = timestamp;
        }
      });
      log(s, task.problemId, `Đã sắp xếp công việc: ${task.title}`);
    });
  }
  async setTaskStatus(id: string, status: Task["status"]) {
    await this.repository.mutate((s) => {
      const t = s.tasks.find((t) => t.id === id);
      if (!t) throw new Error("Không tìm thấy công việc.");
      const p = editable(s, t.problemId);
      if (p.status === "resolved")
        throw new Error("Mở lại vấn đề trước khi thay đổi công việc.");
      t.status = taskSchema.shape.status.parse(status);
      t.updatedAt = now();
      if (status !== "todo" && p.status === "open") {
        p.status = "in_progress";
        p.updatedAt = now();
      }
      log(
        s,
        p.id,
        `${status === "done" ? "Đã hoàn thành" : status === "doing" ? "Đang thực hiện" : "Chưa bắt đầu"}: ${t.title}`,
      );
    });
  }
  async exportBackup() {
    return JSON.stringify(
      { version: 1, exportedAt: now(), ...(await this.repository.read()) },
      null,
      2,
    );
  }
  async importBackup(raw: string) {
    if (raw.length > 20_000_000) throw new Error("Tệp sao lưu vượt quá 20 MB.");
    const incoming = backupSchema.parse(JSON.parse(raw));
    validateSnapshot(incoming);
    await this.repository.mutate((s) => {
      for (const key of ["problems", "plans", "tasks", "activities"] as const) {
        const ids = new Set(s[key].map((r) => r.id));
        if (incoming[key].some((r) => ids.has(r.id)))
          throw new Error(
            "Bản sao lưu có dữ liệu trùng với thiết bị này. Không có dữ liệu nào bị ghi đè.",
          );
      }
      s.problems.push(...incoming.problems);
      s.plans.push(...incoming.plans);
      s.tasks.push(...incoming.tasks);
      s.activities.push(...incoming.activities);
    });
  }
}
