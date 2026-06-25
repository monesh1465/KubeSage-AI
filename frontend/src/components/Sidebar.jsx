import { NavLink, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiServer,
  FiSearch,
  FiClock,
  FiSettings,
  FiLogOut,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: FiGrid },
  { to: "/clusters", label: "Clusters", icon: FiServer },
  { to: "/investigations", label: "Investigations", icon: FiSearch },
  { to: "/history", label: "History", icon: FiClock },
  { to: "/settings", label: "Settings", icon: FiSettings },
];

function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
    onClose?.();
  };

  return (
    <aside
      className={`fixed inset-y-14 left-0 z-30 flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] transition-transform duration-200 lg:static lg:inset-auto lg:z-0 lg:w-56 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 lg:hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
          Navigation
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-bg)]"
          aria-label="Close menu"
        >
          <FiX className="h-3.5 w-3.5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-[var(--color-primary)]/8 text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-[var(--color-primary)]" : "text-[var(--color-secondary)]/80 group-hover:text-[var(--color-text)]"
                  }`}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-danger)] transition-all duration-150 hover:bg-[var(--color-danger)]/8"
        >
          <FiLogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
