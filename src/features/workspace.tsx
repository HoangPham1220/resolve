import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  ListTodo,
  SlidersHorizontal,
} from "lucide-react";
import { isBefore, startOfDay } from "date-fns";
import {
  type Snapshot,
  type Problem,
  type Task,
  statusLabels,
  priorityLabels,
} from "../domain/models";
import { blocked, progress } from "../domain/logic";
import { Button } from "../components/ui/button";
import { TaskRow } from "../components/task-row";
import { TaskForm } from "../components/forms";
import { useUI } from "../stores/ui";
function ProblemCard({
  problem: p,
  snapshot,
}: {
  problem: Problem;
  snapshot: Snapshot;
}) {
  const tasks = snapshot.tasks.filter((t) => t.problemId === p.id);
  return (
    <Link className="problem-card" to={`/problems/${p.id}`}>
      <div className="card-top">
        <span className="card-category">{p.category}</span>
        <span className={`badge ${p.status}`}>{statusLabels[p.status]}</span>
        <ArrowUpRight size={17} className="card-arrow" />
      </div>
      <h3>{p.title}</h3>

      <div className="card-progress-label">
        <span>Tiến độ thực hiện</span>
        <strong>{progress(tasks)}%</strong>
      </div>
      <div className="progress-track">
        <i style={{ width: `${progress(tasks)}%` }} />
      </div>
      <div className="card-bottom">
        <span>
          <ListTodo size={14} />
          {tasks.filter((t) => t.status === "done").length}/{tasks.length} công
          việc
        </span>
        <span className={`priority-text ${p.priority}`}>
          <i /> {priorityLabels[p.priority]}
        </span>
      </div>
    </Link>
  );
}
export function Dashboard({
  snapshot,
  create,
}: {
  snapshot: Snapshot;
  create: () => void;
}) {
  const active = snapshot.problems.filter((p) => !p.archived);
  const tasks = snapshot.tasks.filter((t) =>
    active.some((p) => p.id === t.problemId && p.status !== "resolved"),
  );
  const ready = tasks.filter(
    (t) => t.status !== "done" && !blocked(t, snapshot.tasks),
  );
  const next = [...ready]
    .sort(
      (a, b) =>
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        { high: 0, medium: 1, low: 2 }[a.priority] -
          { high: 0, medium: 1, low: 2 }[b.priority],
    )
    .slice(0, 4);
  const [editing, setEditing] = useState<Task | null>(null);
  const recent = [...active]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  return (
    <div className="dashboard">
      <div className="page-heading">
        <h1>Tổng quan</h1>
        {active.length > 0 && (
          <Button onClick={create}>
            <Plus size={16} /> Tạo vấn đề
          </Button>
        )}
      </div>
      {active.length > 0 && (
        <p className="muted" aria-label="Thống kê vấn đề">
          {active.length} vấn đề ·{" "}
          {active.filter((p) => p.status === "in_progress").length} đang xử lý ·{" "}
          {active.filter((p) => p.status === "resolved").length} đã giải quyết
        </p>
      )}
      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Vấn đề</h2>
          <Link className="text-link" to="/problems">
            Tất cả <ArrowRight size={15} />
          </Link>
        </div>
        {recent.length ? (
          <div className="problem-grid">
            {recent.map((p) => (
              <ProblemCard key={p.id} problem={p} snapshot={snapshot} />
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <span>Chưa có vấn đề nào</span>
            <Button onClick={create}>
              <Plus size={16} /> Tạo vấn đề
            </Button>
          </div>
        )}
      </section>
      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Công việc tiếp theo</h2>
          <Link to="/tasks" className="text-link">
            Tất cả <ArrowRight size={15} />
          </Link>
        </div>
        <div className="task-list">
          {next.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              snapshot={snapshot}
              onEdit={setEditing}
            />
          ))}
          {!next.length && (
            <div className="dashboard-empty">
              {tasks.some((t) => t.status !== "done")
                ? "Các công việc còn lại đang chờ việc tiền đề."
                : "Không có công việc cần làm."}
            </div>
          )}
        </div>
      </section>
      {editing && (
        <TaskForm
          problemId={editing.problemId}
          task={editing}
          snapshot={snapshot}
          close={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export function Problems({
  snapshot,
  create,
  archive = false,
}: {
  snapshot: Snapshot;
  create: () => void;
  archive?: boolean;
}) {
  const search = useUI((s) => s.search);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("recent");
  const problems = snapshot.problems
    .filter(
      (p) =>
        p.archived === archive &&
        (status === "all" || p.status === status) &&
        (category === "all" || p.category === category) &&
        `${p.title} ${p.description} ${p.causes}`
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")),
    )
    .sort((a, b) =>
      sort === "priority"
        ? { high: 0, medium: 1, low: 2 }[a.priority] -
          { high: 0, medium: 1, low: 2 }[b.priority]
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <>
      <div className="page-heading">
        <h1>{archive ? "Kho lưu trữ" : "Vấn đề"}</h1>
        {!archive && (
          <Button onClick={create}>
            <Plus size={17} /> Tạo vấn đề
          </Button>
        )}
      </div>
      <div className="filter-bar">
        <SlidersHorizontal size={17} />
        <select
          aria-label="Lọc trạng thái"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc lĩnh vực"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Tất cả lĩnh vực</option>
          {["Công việc", "Học tập", "Cá nhân", "Dự án"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span className="filter-count">{problems.length} vấn đề</span>
        <select
          aria-label="Sắp xếp"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="recent">Cập nhật gần nhất</option>
          <option value="priority">Ưu tiên cao trước</option>
        </select>
      </div>
      {problems.length ? (
        <div className="problem-grid">
          {problems.map((p) => (
            <ProblemCard key={p.id} problem={p} snapshot={snapshot} />
          ))}
        </div>
      ) : (
        <div className="panel empty-state">
          <h2>
            {archive ? "Chưa có vấn đề được lưu trữ" : "Chưa có vấn đề nào"}
          </h2>
          {(search || status !== "all" || category !== "all") && (
            <p>Thử thay đổi từ khóa hoặc bộ lọc.</p>
          )}
          {!archive && (
            <Button onClick={create}>
              <Plus size={16} /> Tạo vấn đề
            </Button>
          )}
        </div>
      )}
    </>
  );
}
export function Tasks({ snapshot }: { snapshot: Snapshot }) {
  const [filter, setFilter] = useState("ready");
  const [editing, setEditing] = useState<Task | null>(null);
  const search = useUI((s) => s.search);
  const active = snapshot.tasks.filter((t) =>
    snapshot.problems.some((p) => p.id === t.problemId && !p.archived),
  );
  const tasks = active
    .filter(
      (t) =>
        t.title
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")) &&
        (filter === "all" ||
          (filter === "done" && t.status === "done") ||
          (filter === "ready" &&
            t.status !== "done" &&
            !blocked(t, snapshot.tasks)) ||
          (filter === "blocked" &&
            t.status !== "done" &&
            blocked(t, snapshot.tasks)) ||
          (filter === "overdue" &&
            t.status !== "done" &&
            t.dueDate &&
            isBefore(
              new Date(t.dueDate + "T00:00:00"),
              startOfDay(new Date()),
            ))),
    )
    .sort(
      (a, b) =>
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        a.order - b.order,
    );
  return (
    <>
      <div className="page-heading">
        <h1>Công việc của tôi</h1>
      </div>
      <div className="tabs task-filters">
        {[
          ["ready", "Sẵn sàng"],
          ["all", "Tất cả"],
          ["blocked", "Đang chờ"],
          ["overdue", "Quá hạn"],
          ["done", "Hoàn thành"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>{tasks.length} công việc</h2>
          <span className="muted">Hạn gần nhất trước</span>
        </div>
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            snapshot={snapshot}
            onEdit={setEditing}
          />
        ))}
        {!tasks.length && (
          <div className="empty-state">
            <h2>Không có công việc trong mục này</h2>
            <p>Tạo công việc trong tab Kế hoạch của một vấn đề.</p>
            <Button asChild variant="outline">
              <Link to="/problems">
                Đến danh sách vấn đề <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        )}
      </section>
      {editing && (
        <TaskForm
          task={editing}
          snapshot={snapshot}
          problemId={editing.problemId}
          close={() => setEditing(null)}
        />
      )}
    </>
  );
}
