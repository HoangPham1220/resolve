import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Compass,
  CheckCircle2,
  Layers3,
  ListTodo,
  Search,
  SlidersHorizontal,
  Leaf,
  Target,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
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
        <span className={`category-icon cat-${p.category}`}>
          <Target size={18} />
        </span>
        <span className={`badge ${p.status}`}>{statusLabels[p.status]}</span>
        <ArrowUpRight size={17} className="card-arrow" />
      </div>
      <span className="card-category">{p.category}</span>
      <h3>{p.title}</h3>
      <p>{p.description || "Bắt đầu phân tích để tìm hướng giải quyết."}</p>
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
    .slice(0, 3);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {format(new Date(), "EEEE, dd MMMM yyyy", { locale: vi })}
          </div>
          <h1>
            Mỗi vấn đề, một bước tiến<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            Làm rõ điều quan trọng. Tập trung vào bước tiếp theo.
          </p>
        </div>
        <Button onClick={create}>
          <Plus size={17} /> Vấn đề mới
        </Button>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="banner-kicker">
            <span className="tiny-spark">✦</span> KHÔNG CHỈ LÀ MỘT DANH SÁCH
            CÔNG VIỆC
          </span>
          <h2>
            Đừng chỉ bận rộn.
            <br />
            Hãy giải quyết đúng vấn đề.
          </h2>
          <p>
            Một không gian để hiểu rõ, hành động có chủ đích
            <br className="desktop-only" /> và tạo ra thay đổi thực sự.
          </p>
          <button className="banner-link" onClick={create}>
            Bắt đầu một hành trình <ArrowRight size={16} />
          </button>
        </div>
        <div className="orbit-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="orbit-label label-problem">
            <span className="orbit-dot" />
            Vấn đề
          </span>
          <span className="orbit-label label-action">
            <CheckCircle2 size={15} />
            Hành động
          </span>
          <span className="orbit-label label-result">
            <Leaf size={15} />
            Thay đổi
          </span>
          <div className="art-center">
            <Compass size={46} strokeWidth={1.2} />
          </div>
          <span className="star star-one">✦</span>
          <span className="star star-two">✧</span>
        </div>
      </section>
      <div className="stats-grid">
        {[
          {
            label: "Đang giải quyết",
            value: active.filter((p) => p.status !== "resolved").length,
            icon: Layers3,
            note: "Vấn đề cần sự chú ý",
            color: "green",
          },
          {
            label: "Công việc cần làm",
            value: tasks.filter((t) => t.status !== "done").length,
            icon: ListTodo,
            note: `${ready.length} việc có thể bắt đầu`,
            color: "orange",
          },
          {
            label: "Đã giải quyết",
            value: active.filter((p) => p.status === "resolved").length,
            icon: CheckCircle2,
            note: "Những thay đổi đã tạo ra",
            color: "blue",
          },
        ].map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div>
              <span className="stat-label">{stat.label}</span>
              <strong>{stat.value.toString().padStart(2, "0")}</strong>
              <small>{stat.note}</small>
            </div>
            <span className={`stat-icon ${stat.color}`}>
              <stat.icon size={20} />
            </span>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <h2>
            Vấn đề gần đây <span className="count">{active.length}</span>
          </h2>
          <p className="muted">Bức tranh lớn phía sau những việc bạn làm.</p>
        </div>
        <Link className="text-link" to="/problems">
          Xem tất cả <ArrowRight size={15} />
        </Link>
      </div>
      {recent.length ? (
        <div className="problem-grid">
          {recent.map((p) => (
            <ProblemCard key={p.id} problem={p} snapshot={snapshot} />
          ))}
        </div>
      ) : (
        <div className="first-problem">
          <span className="empty-icon">
            <Layers3 size={26} />
          </span>
          <div>
            <h3>Thay đổi bắt đầu từ việc gọi tên vấn đề</h3>
            <p>Ghi lại điều đang cản trở bạn. Không cần có ngay câu trả lời.</p>
          </div>
          <Button variant="outline" onClick={create}>
            <Plus size={16} /> Ghi nhận vấn đề đầu tiên
          </Button>
        </div>
      )}
      <div className="dashboard-bottom">
        <section className="panel next-panel">
          <div className="section-heading">
            <div>
              <h2>Bước tiếp theo</h2>
              <p className="muted">Những hành động sẵn sàng để bắt đầu.</p>
            </div>
            <Link to="/tasks" className="text-link">
              Tất cả <ArrowUpRight size={15} />
            </Link>
          </div>
          {next.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              snapshot={snapshot}
              onEdit={setEditing}
            />
          ))}
          {!next.length && (
            <div className="quiet-empty">
              <CheckCircle2 size={25} />
              <p>
                {tasks.some((t) => t.status !== "done")
                  ? "Các việc còn lại đang chờ hoàn thành tiền đề."
                  : "Một chút rõ ràng, một bước nhẹ nhàng."}
              </p>
              <small>
                Thêm phương án và công việc trong mỗi vấn đề để bắt đầu.
              </small>
            </div>
          )}
        </section>
        <aside className="reflection-card">
          <span className="section-label">MỘT CHÚT SUY NGẪM</span>
          <span className="quote-mark">“</span>
          <blockquote>
            Nếu có một giờ để giải quyết vấn đề, hãy dành thời gian để hiểu nó
            trước.
          </blockquote>
          <div className="reflection-line" />
          <p>
            Chậm lại để nhìn rõ.
            <br />
            Rõ ràng để tiến xa.
          </p>
          <Leaf size={24} className="reflection-leaf" />
        </aside>
      </div>
      {editing && (
        <TaskForm
          problemId={editing.problemId}
          task={editing}
          snapshot={snapshot}
          close={() => setEditing(null)}
        />
      )}
    </>
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
        <div>
          <div className="eyebrow">KHÔNG GIAN CỦA BẠN</div>
          <h1>
            {archive ? "Kho lưu trữ" : "Tất cả vấn đề"}
            <span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            {archive
              ? "Những hành trình và bài học đáng giữ lại."
              : "Nhìn rõ vấn đề để chọn đúng hành động."}
          </p>
        </div>
        {!archive && (
          <Button onClick={create}>
            <Plus size={17} /> Vấn đề mới
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
          <Search size={32} />
          <h2>
            {archive ? "Chưa có vấn đề được lưu trữ" : "Chưa tìm thấy vấn đề"}
          </h2>
          <p>
            {search || status !== "all" || category !== "all"
              ? "Thử thay đổi từ khóa hoặc bộ lọc."
              : "Mỗi vấn đề là một cơ hội để làm mọi thứ tốt hơn."}
          </p>
          {!archive && (
            <Button onClick={create}>
              <Plus size={16} /> Ghi nhận vấn đề
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
        <div>
          <div className="eyebrow">TẬP TRUNG VÀO HÀNH ĐỘNG</div>
          <h1>
            Công việc của tôi<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            Biết cần làm gì tiếp theo và vì sao điều đó quan trọng.
          </p>
        </div>
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
            <ListTodo size={32} />
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
