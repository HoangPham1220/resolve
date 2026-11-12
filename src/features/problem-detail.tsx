import { lazy, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Archive,
  CheckCircle2,
  Plus,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import type { Snapshot, Task } from "../domain/models";
import { statusLabels } from "../domain/models";
import { progress } from "../domain/logic";
import { service } from "../application";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { errorMessage, ProblemForm, TaskForm } from "../components/forms";
import { TaskRow } from "../components/task-row";
import { useUI } from "../stores/ui";
const Diagram = lazy(() =>
  import("./diagram").then((module) => ({ default: module.Diagram })),
);
import { PlanForm } from "../components/plan-form";
export function ProblemDetail({ snapshot }: { snapshot: Snapshot }) {
  const { id, tab = "overview" } = useParams();
  const p = snapshot.problems.find((p) => p.id === id);
  const [editing, setEditing] = useState(false);
  const [addingPlan, setAddingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>();
  const [editingPlan, setEditingPlan] = useState<string>();
  const [task, setTask] = useState<Task | "new" | null>(null);
  const [pending, setPending] = useState(false);
  const notify = useUI((s) => s.notify);
  async function run(action: () => Promise<void>) {
    setPending(true);
    try {
      await action();
      notify("Đã lưu thay đổi");
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  if (!p)
    return (
      <div className="empty-state">
        <h2>Không tìm thấy vấn đề</h2>
        <Link to="/problems">Quay về danh sách</Link>
      </div>
    );
  const tasks = snapshot.tasks.filter((t) => t.problemId === p.id);
  const plans = snapshot.plans.filter((t) => t.problemId === p.id);
  const readOnly = p.archived;
  return (
    <>
      <Link to="/problems" className="back-link">
        <ArrowLeft size={15} /> Tất cả vấn đề
      </Link>
      <div className="page-heading detail-heading">
        <div>
          <h1>{p.title}</h1>
          <div className="inline-meta">
            <span>{p.category}</span>
            <span className={`badge ${p.status}`}>
              {statusLabels[p.status]}
            </span>
            <span>Tạo ngày {format(new Date(p.createdAt), "dd/MM/yyyy")}</span>
            {p.archived && <span className="badge">Đã lưu trữ</span>}
          </div>
        </div>
        <div className="heading-actions">
          {!readOnly && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={15} /> Chỉnh sửa
            </Button>
          )}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void run(() => service.archive(p.id, !p.archived))}
          >
            {readOnly ? <RotateCcw size={15} /> : <Archive size={15} />}{" "}
            {readOnly ? "Khôi phục" : "Lưu trữ"}
          </Button>
        </div>
      </div>
      <nav className="tabs" aria-label="Chi tiết vấn đề">
        {[
          ["overview", "Tổng quan"],
          ["analysis", "Phân tích"],
          ["plan", "Kế hoạch"],
          ["diagram", "Sơ đồ"],
          ["review", "Đánh giá"],
          ["activity", "Lịch sử"],
        ].map(([value, label]) => (
          <NavLink
            key={value}
            className={tab === value ? "active" : ""}
            to={`/problems/${p.id}/${value}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="detail-grid">
          <section className="panel">
            <h2>Mô tả</h2>
            <p className="prose">
              {p.description || "Chưa có mô tả."}
            </p>
            <div className="separator" />
            <h2>Kết quả mong muốn</h2>
            <p className="prose">
              {p.outcome || "Chưa xác định."}
            </p>
            <Button asChild variant="outline">
              <Link to={`/problems/${p.id}/analysis`}>
                Phân tích vấn đề <ArrowUpRight size={15} />
              </Link>
            </Button>
          </section>
          <section className="panel">
            <h2>Tiến độ</h2>
            <div className="big-progress">
              {progress(tasks)}
              <span>%</span>
            </div>
            <div className="progress-track">
              <i style={{ width: `${progress(tasks)}%` }} />
            </div>
            <p className="muted">
              {tasks.filter((t) => t.status === "done").length}/{tasks.length}{" "}
              công việc hoàn thành
            </p>
            <ol className="journey">
              {[
                ["Ghi nhận vấn đề", true],
                ["Phân tích nguyên nhân", !!p.causes.trim()],
                ["Xây dựng phương án", plans.length > 0],
                [
                  "Thực hiện công việc",
                  tasks.length > 0 && progress(tasks) === 100,
                ],
                ["Đánh giá kết quả", p.status === "resolved"],
              ].map(([label, done]) => (
                <li key={String(label)} className={done ? "done" : ""}>
                  <CheckCircle2 size={18} />
                  {label}
                </li>
              ))}
            </ol>
            {p.status === "resolved" && !readOnly && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  void run(() =>
                    service.updateProblem(p.id, { status: "in_progress" }),
                  )
                }
              >
                <RotateCcw size={15} /> Mở lại vấn đề
              </Button>
            )}
          </section>
        </div>
      )}
      {tab === "analysis" && (
        <section className="panel">
          <h2>Phân tích</h2>
          <form
            key={p.id + "analysis" + p.updatedAt}
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void run(() =>
                service.updateProblem(p.id, {
                  causes: String(data.get("causes")),
                  impact: String(data.get("impact")),
                  outcome: String(data.get("outcome")),
                }),
              );
            }}
          >
            <label>
              Nguyên nhân
              <textarea
                name="causes"
                rows={5}
                maxLength={10000}
                defaultValue={p.causes}
                disabled={readOnly}
                placeholder="Nguyên nhân gây ra vấn đề"
              />
            </label>
            <label>
              Tác động
              <textarea
                name="impact"
                rows={3}
                maxLength={10000}
                defaultValue={p.impact}
                disabled={readOnly}
                placeholder="Ảnh hưởng của vấn đề"
              />
            </label>
            <label>
              Kết quả mong muốn
              <textarea
                name="outcome"
                rows={3}
                maxLength={10000}
                defaultValue={p.outcome}
                disabled={readOnly}
                placeholder="Kết quả cần đạt"
              />
            </label>
            {!readOnly && (
              <div>
                <Button disabled={pending}>Lưu phân tích</Button>
              </div>
            )}
          </form>
        </section>
      )}
      {tab === "plan" && (
        <>
          <div className="section-heading">
            <h2>Phương án</h2>
            {!readOnly && p.status !== "resolved" && (
              <Button onClick={() => setAddingPlan(true)}>
                <Plus size={16} /> Thêm phương án
              </Button>
            )}
          </div>
          {plans.length === 0 ? (
            <div className="empty-state panel">
              <p>Chưa có phương án.</p>
            </div>
          ) : (
            plans.map((plan) => (
              <section className="panel plan-panel" key={plan.id}>
                <div className="section-heading">
                  <div>
                    <h2>{plan.title}</h2>
                    <p className="prose muted">{plan.description}</p>
                  </div>
                  {!readOnly && p.status !== "resolved" && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => setEditingPlan(plan.id)}
                      >
                        <Pencil size={14} /> Sửa phương án
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedPlan(plan.id);
                          setTask("new");
                        }}
                      >
                        <Plus size={15} /> Công việc
                      </Button>
                    </>
                  )}
                </div>
                {tasks
                  .filter((t) => t.planId === plan.id)
                  .sort((a, b) => a.order - b.order)
                  .map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      snapshot={snapshot}
                      onEdit={setTask}
                      reorder
                    />
                  ))}
                {!tasks.some((t) => t.planId === plan.id) && (
                  <p className="muted">
                    Chưa có công việc.
                  </p>
                )}
              </section>
            ))
          )}
        </>
      )}
      {tab === "diagram" && (
        <section className="panel">
          <h2>Sơ đồ</h2>
          <Diagram id={p.id} snapshot={snapshot} />
        </section>
      )}
      {tab === "review" && (
        <section className="panel">
          <h2>Đánh giá</h2>
          <form
            key={p.id + "review" + p.updatedAt}
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const resolving =
                (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                  "value",
                ) === "resolve";
              void run(() =>
                service.updateProblem(p.id, {
                  review: String(data.get("review")),
                  lessons: String(data.get("lessons")),
                  ...(resolving ? { status: "resolved" as const } : {}),
                }),
              );
            }}
          >
            <div className="callout">
              Kết quả mong muốn:{" "}
              {p.outcome || "Chưa xác định."}
            </div>
            <label>
              Kết quả thực tế
              <textarea
                name="review"
                rows={5}
                maxLength={10000}
                defaultValue={p.review}
                disabled={readOnly}
                placeholder="Kết quả đạt được"
              />
            </label>
            <label>
              Bài học rút ra
              <textarea
                name="lessons"
                rows={4}
                maxLength={10000}
                defaultValue={p.lessons}
                disabled={readOnly}
                placeholder="Bài học cho lần sau"
              />
            </label>
            {!readOnly && (
              <div className="heading-actions">
                <Button variant="outline" disabled={pending}>
                  Lưu đánh giá
                </Button>
                {p.status !== "resolved" && (
                  <Button name="action" value="resolve" disabled={pending}>
                    <CheckCircle2 size={16} /> Đánh dấu đã giải quyết
                  </Button>
                )}
              </div>
            )}
          </form>
        </section>
      )}
      {tab === "activity" && (
        <section className="panel">
          <h2>Lịch sử</h2>
          <div className="activity-list">
            {snapshot.activities
              .filter((a) => a.problemId === p.id)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((a) => (
                <div key={a.id}>
                  <span className="activity-point" />
                  <div>
                    <p>{a.message}</p>
                    <time className="muted">
                      {format(new Date(a.createdAt), "dd/MM/yyyy · HH:mm")}
                    </time>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
      {![
        "overview",
        "analysis",
        "plan",
        "diagram",
        "review",
        "activity",
      ].includes(tab) && (
        <p>
          Tab không tồn tại. <Link to={`/problems/${p.id}`}>Về tổng quan</Link>
        </p>
      )}
      {editingPlan && (
        <PlanForm
          plan={plans.find((plan) => plan.id === editingPlan)!}
          close={() => setEditingPlan(undefined)}
        />
      )}
      {editing && (
        <ProblemForm open close={() => setEditing(false)} problem={p} />
      )}
      {task && (
        <TaskForm
          problemId={p.id}
          defaultPlanId={selectedPlan}
          task={task === "new" ? undefined : task}
          snapshot={snapshot}
          close={() => setTask(null)}
        />
      )}
      {addingPlan && (
        <Dialog
          open
          onOpenChange={(v) => !v && setAddingPlan(false)}
          title="Thêm phương án"
          description="Nhập tên và cách thực hiện."
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void run(async () => {
                await service.createPlan(p.id, {
                  title: String(data.get("title")),
                  description: String(data.get("description")),
                });
                setAddingPlan(false);
              });
            }}
          >
            <label>
              Tên phương án
              <input
                autoFocus
                name="title"
                required
                minLength={3}
                maxLength={160}
                placeholder="Tên phương án"
              />
            </label>
            <label>
              Cách thực hiện
              <textarea name="description" maxLength={10000} rows={4} />
            </label>
            <div className="form-actions">
              <Button disabled={pending}>Thêm phương án</Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
