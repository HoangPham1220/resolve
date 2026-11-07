import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  NavLink,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Archive,
  ArrowUpRight,
  Check,
  ChevronRight,
  Compass,
  LayoutDashboard,
  ListTodo,
  Layers3,
  Search,
  Settings as SettingsIcon,
  X,
  Plus,
  HardDrive,
} from "lucide-react";
import { repository } from "../application";
import { Dashboard, Problems, Tasks } from "../features/workspace";
import { Settings } from "../features/settings";
import { ProblemForm } from "../components/forms";
import { useUI } from "../stores/ui";
const Detail = lazy(() =>
  import("../features/problem-detail").then((m) => ({
    default: m.ProblemDetail,
  })),
);
const nav = [
  { path: "/", label: "Tổng quan", icon: LayoutDashboard },
  { path: "/problems", label: "Vấn đề", icon: Layers3 },
  { path: "/tasks", label: "Công việc", icon: ListTodo },
  { path: "/archive", label: "Lưu trữ", icon: Archive },
];
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="empty-state">
        <h1>Không thể mở ứng dụng</h1>
        <p>Hãy kiểm tra trình duyệt cho phép IndexedDB rồi tải lại trang.</p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Tải lại
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Workspace() {
  const snapshot = useLiveQuery(() => repository.read());
  const [creating, setCreating] = useState(false);
  const { search, setSearch, notice, notify } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 6500);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  const current = nav.find((n) =>
    n.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(n.path),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-symbol">
            <Compass size={25} strokeWidth={1.6} />
          </span>
          <span>
            resolve<span className="brand-dot">.</span>
          </span>
        </Link>
        <span className="workspace-label">KHÔNG GIAN CÁ NHÂN</span>
        <nav className="main-nav" aria-label="Điều hướng chính">
          {nav.map((n) => (
            <NavLink key={n.path} to={n.path} end={n.path === "/"}>
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.path === "/problems" && snapshot && (
                <span className="nav-count">
                  {
                    snapshot.problems.filter(
                      (p) => !p.archived && p.status !== "resolved",
                    ).length
                  }
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">✧</span>
          <strong>
            Rõ vấn đề.
            <br />
            Đúng hành động.
          </strong>
          <p>
            Những thay đổi lớn bắt đầu
            <br />
            từ một bước nhỏ.
          </p>
          <button onClick={() => setCreating(true)}>
            Ghi nhận điều cần thay đổi <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <NavLink to="/settings" className="settings-link">
            <SettingsIcon size={18} /> Cài đặt
          </NavLink>
          <div className="profile">
            <span className="avatar">B</span>
            <div>
              <strong>Không gian của bạn</strong>
              <small>Cá nhân · Local first</small>
            </div>
            <Check size={15} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Không gian cá nhân <ChevronRight size={13} />
            <span>
              {location.pathname === "/settings"
                ? "Cài đặt"
                : (current?.label ?? "Vấn đề")}
            </span>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !["/problems", "/archive", "/tasks"].includes(location.pathname)
              )
                navigate("/problems");
            }}
          >
            <Search size={16} />
            <input
              aria-label="Tìm kiếm"
              placeholder={
                location.pathname === "/tasks"
                  ? "Tìm kiếm công việc…"
                  : "Tìm kiếm vấn đề…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </form>
          <Link
            to="/settings"
            className="top-avatar"
            aria-label="Cài đặt cá nhân"
          >
            B
          </Link>
        </header>
        <main>
          {snapshot ? (
            <Suspense fallback={<p className="muted">Đang mở vấn đề…</p>}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard
                      snapshot={snapshot}
                      create={() => setCreating(true)}
                    />
                  }
                />
                <Route
                  path="/problems"
                  element={
                    <Problems
                      snapshot={snapshot}
                      create={() => setCreating(true)}
                    />
                  }
                />
                <Route path="/tasks" element={<Tasks snapshot={snapshot} />} />
                <Route
                  path="/archive"
                  element={
                    <Problems
                      snapshot={snapshot}
                      create={() => setCreating(true)}
                      archive
                    />
                  }
                />
                <Route
                  path="/problems/:id/:tab?"
                  element={<Detail snapshot={snapshot} />}
                />
                <Route path="/settings" element={<Settings />} />
                <Route
                  path="*"
                  element={
                    <div className="empty-state">
                      <h1>Trang không tồn tại</h1>
                      <Link to="/">Về tổng quan</Link>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          ) : (
            <div className="empty-state">Đang mở dữ liệu trên thiết bị…</div>
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-dot" /> Không gian riêng cho những bước
              tiến của bạn.
            </span>
            <Link to="/settings">
              <HardDrive size={12} /> Dữ liệu lưu trên thiết bị
            </Link>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Điều hướng mobile">
        {nav.map((n) => (
          <NavLink to={n.path} key={n.path} end={n.path === "/"}>
            <n.icon size={19} />
            <span>{n.label}</span>
          </NavLink>
        ))}
        <button onClick={() => setCreating(true)} aria-label="Tạo vấn đề mới">
          <Plus size={22} />
        </button>
      </nav>
      {creating && <ProblemForm open close={() => setCreating(false)} />}
      {notice && (
        <div role="status" className="toast">
          <span>{notice}</span>
          <button aria-label="Đóng thông báo" onClick={() => notify("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <Workspace />
    </ErrorBoundary>
  );
}
