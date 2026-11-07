import { Link } from "react-router-dom";
import {
  Check,
  LockKeyhole,
  Pencil,
  CalendarDays,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { service } from "../application";
import { blocked } from "../domain/logic";
import { priorityLabels, type Snapshot, type Task } from "../domain/models";
import { useUI } from "../stores/ui";
import { errorMessage } from "./forms";
export function TaskRow({
  task,
  snapshot,
  onEdit,
  reorder = false,
}: {
  task: Task;
  snapshot: Snapshot;
  onEdit?: (task: Task) => void;
  reorder?: boolean;
}) {
  const locked = blocked(task, snapshot.tasks);
  const p = snapshot.problems.find((p) => p.id === task.problemId);
  const notify = useUI((s) => s.notify);
  const readOnly = p?.archived || p?.status === "resolved";
  const overdue =
    task.dueDate &&
    task.status !== "done" &&
    isBefore(new Date(task.dueDate + "T00:00:00"), startOfDay(new Date()));
  return (
    <div className={`task-row ${task.status === "done" ? "task-done" : ""}`}>
      <button
        className={`task-check ${task.status === "done" ? "checked" : ""}`}
        aria-label={`${task.status === "done" ? "Mở lại" : "Hoàn thành"} ${task.title}`}
        title={locked ? "Cần hoàn thành công việc tiền đề" : undefined}
        disabled={locked || readOnly}
        onClick={() => {
          void service
            .setTaskStatus(task.id, task.status === "done" ? "todo" : "done")
            .catch((e) => notify(errorMessage(e)));
        }}
      >
        {task.status === "done" ? (
          <Check size={14} />
        ) : locked ? (
          <LockKeyhole size={12} />
        ) : null}
      </button>
      <div className="task-copy">
        <span className="task-title">{task.title}</span>
        <Link to={`/problems/${task.problemId}/plan`} className="task-context">
          {p?.title}{" "}
          <span>
            {" "}
            / {snapshot.plans.find((p) => p.id === task.planId)?.title}
          </span>
        </Link>
        {locked && (
          <small className="muted">
            Chờ:{" "}
            {task.dependencies
              .filter(
                (id) =>
                  snapshot.tasks.find((t) => t.id === id)?.status !== "done",
              )
              .map((id) => snapshot.tasks.find((t) => t.id === id)?.title)
              .join(", ")}
          </small>
        )}
      </div>
      <span
        className={`priority-dot ${task.priority}`}
        title={`Ưu tiên ${priorityLabels[task.priority]}`}
      />
      {task.dueDate && (
        <span className={`task-date ${overdue ? "error" : ""}`}>
          <CalendarDays size={13} />
          {format(new Date(task.dueDate + "T00:00:00"), "dd/MM")}
        </span>
      )}
      <select
        className="task-status"
        aria-label={`Trạng thái ${task.title}`}
        value={task.status}
        disabled={readOnly}
        onChange={(e) => {
          void service
            .setTaskStatus(task.id, e.target.value as Task["status"])
            .catch((e) => notify(errorMessage(e)));
        }}
      >
        <option value="todo">Cần làm</option>
        <option value="doing">Đang làm</option>
        <option value="done">Hoàn thành</option>
      </select>
      {reorder && !readOnly && (
        <div className="task-reorder">
          {([-1, 1] as const).map((direction) => {
            const siblings = snapshot.tasks
              .filter((t) => t.planId === task.planId)
              .sort((a, b) => a.order - b.order);
            const index = siblings.findIndex((t) => t.id === task.id);
            return (
              <button
                key={direction}
                className="icon-button"
                disabled={
                  direction === -1 ? index === 0 : index === siblings.length - 1
                }
                aria-label={`${direction === -1 ? "Đưa lên" : "Đưa xuống"} ${task.title}`}
                onClick={() =>
                  void service
                    .moveTask(task.id, direction)
                    .catch((e) => notify(errorMessage(e)))
                }
              >
                {direction === -1 ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
            );
          })}
        </div>
      )}
      {onEdit && !readOnly && (
        <button
          className="icon-button"
          aria-label={`Sửa ${task.title}`}
          onClick={() => onEdit(task)}
        >
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}
