import { z } from "zod";
const timestamp = z.iso.datetime();
const base = { id: z.uuid(), createdAt: timestamp, updatedAt: timestamp };
export const problemSchema = z.object({
  ...base,
  title: z.string().trim().min(3, "Nhập ít nhất 3 ký tự").max(160),
  description: z.string().max(10000),
  category: z.enum(["Công việc", "Học tập", "Cá nhân", "Dự án"]),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "in_progress", "resolved"]),
  archived: z.boolean(),
  causes: z.string().max(10000),
  impact: z.string().max(10000),
  outcome: z.string().max(10000),
  review: z.string().max(10000),
  lessons: z.string().max(10000),
});
export const planSchema = z.object({
  ...base,
  problemId: z.uuid(),
  title: z.string().trim().min(3).max(160),
  description: z.string().max(10000),
});
export const taskSchema = z.object({
  ...base,
  problemId: z.uuid(),
  planId: z.uuid(),
  title: z.string().trim().min(3, "Nhập ít nhất 3 ký tự").max(160),
  status: z.enum(["todo", "doing", "done"]),
  dueDate: z.union([z.literal(""), z.iso.date()]),
  priority: z.enum(["low", "medium", "high"]),
  dependencies: z.array(z.uuid()).max(100),
  order: z.number().int().nonnegative(),
});
export const activitySchema = z.object({
  id: z.uuid(),
  problemId: z.uuid(),
  createdAt: timestamp,
  message: z.string().max(500),
});
export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: timestamp,
  problems: z.array(problemSchema).max(10000),
  plans: z.array(planSchema).max(20000),
  tasks: z.array(taskSchema).max(50000),
  activities: z.array(activitySchema).max(100000),
});
export type Problem = z.infer<typeof problemSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Snapshot = Pick<
  z.infer<typeof backupSchema>,
  "problems" | "plans" | "tasks" | "activities"
>;
export const emptySnapshot: Snapshot = {
  problems: [],
  plans: [],
  tasks: [],
  activities: [],
};
export const priorityLabels = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};
export const statusLabels = {
  open: "Chưa bắt đầu",
  in_progress: "Đang giải quyết",
  resolved: "Đã giải quyết",
};
