import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { service } from "../application";
import type { Problem, Snapshot, Task } from "../domain/models";
import { problemSchema, taskSchema } from "../domain/models";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { useUI } from "../stores/ui";
export function errorMessage(error: unknown) {
  return error instanceof z.ZodError
    ? (error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    : error instanceof Error
      ? error.message
      : "Có lỗi xảy ra. Vui lòng thử lại.";
}
const problemInput = problemSchema.pick({
  title: true,
  description: true,
  category: true,
  priority: true,
});
export function ProblemForm({
  open,
  close,
  problem,
}: {
  open: boolean;
  close: () => void;
  problem?: Problem;
}) {
  const navigate = useNavigate();
  const notify = useUI((s) => s.notify);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof problemInput>>({
    resolver: zodResolver(problemInput),
    defaultValues: problem ?? {
      title: "",
      description: "",
      category: "Công việc",
      priority: "medium",
    },
  });
  const submit = handleSubmit(async (data) => {
    try {
      if (problem) await service.updateProblem(problem.id, data);
      else {
        const id = await service.createProblem(data);
        navigate(`/problems/${id}`);
      }
      notify(problem ? "Đã cập nhật vấn đề" : "Đã ghi nhận vấn đề mới");
      close();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && close()}
      title={problem ? "Chỉnh sửa vấn đề" : "Bắt đầu từ một vấn đề"}
      description="Gọi tên điều bạn muốn thay đổi. Bạn có thể phân tích sâu hơn sau."
    >
      <form onSubmit={submit} className="form-stack">
        <label>
          Tên vấn đề
          <input
            aria-label="Tên vấn đề"
            autoFocus
            placeholder="Điều gì đang cản trở bạn?"
            {...register("title")}
          />
          {errors.title && (
            <small className="error">{errors.title.message}</small>
          )}
        </label>
        <label>
          Mô tả
          <textarea
            rows={3}
            placeholder="Bối cảnh, dấu hiệu và những điều bạn đã biết…"
            {...register("description")}
          />
        </label>
        <div className="form-grid">
          <label>
            Lĩnh vực
            <select {...register("category")}>
              {["Công việc", "Học tập", "Cá nhân", "Dự án"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Mức ưu tiên
            <select {...register("priority")}>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={close}>
            Hủy
          </Button>
          <Button disabled={isSubmitting}>
            {isSubmitting
              ? "Đang lưu…"
              : problem
                ? "Lưu thay đổi"
                : "Tạo vấn đề"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
const taskInput = taskSchema.pick({
  title: true,
  planId: true,
  dueDate: true,
  priority: true,
  dependencies: true,
});
export function TaskForm({
  problemId,
  snapshot,
  task,
  defaultPlanId,
  close,
}: {
  problemId: string;
  snapshot: Snapshot;
  task?: Task;
  defaultPlanId?: string;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const notify = useUI((s) => s.notify);
  const plans = snapshot.plans.filter((p) => p.problemId === problemId);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof taskInput>>({
    resolver: zodResolver(taskInput),
    defaultValues: task ?? {
      title: "",
      planId: defaultPlanId ?? plans[0]?.id ?? "",
      dueDate: "",
      priority: "medium",
      dependencies: [],
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && close()}
      title={task ? "Chỉnh sửa công việc" : "Thêm hành động tiếp theo"}
      description="Mỗi công việc gắn với một phương án và vấn đề cụ thể."
    >
      <form
        className="form-stack"
        onSubmit={handleSubmit(async (data) => {
          try {
            await service.saveTask({ ...data, problemId }, task?.id);
            notify("Đã lưu công việc");
            close();
          } catch (e) {
            setError(errorMessage(e));
          }
        })}
      >
        <label>
          Tên công việc
          <input
            aria-label="Tên công việc"
            autoFocus
            {...register("title")}
            placeholder="Một hành động cụ thể, có thể hoàn thành"
          />
          {errors.title && (
            <small className="error">{errors.title.message}</small>
          )}
        </label>
        <label>
          Phương án
          <select {...register("planId")}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Hạn hoàn thành
            <input type="date" {...register("dueDate")} />
          </label>
          <label>
            Ưu tiên
            <select {...register("priority")}>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Hoàn thành các việc này trước</legend>
          <div className="dependency-list">
            {snapshot.tasks
              .filter((t) => t.problemId === problemId && t.id !== task?.id)
              .map((t) => (
                <label className="check-label" key={t.id}>
                  <input
                    type="checkbox"
                    value={t.id}
                    {...register("dependencies")}
                  />
                  {t.title}
                </label>
              ))}
            {!snapshot.tasks.some(
              (t) => t.problemId === problemId && t.id !== task?.id,
            ) && <p className="muted">Chưa có công việc tiền đề.</p>}
          </div>
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button variant="outline" type="button" onClick={close}>
            Hủy
          </Button>
          <Button disabled={isSubmitting}>Lưu công việc</Button>
        </div>
      </form>
    </Dialog>
  );
}
