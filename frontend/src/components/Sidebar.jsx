import { NavLink, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiServer,
  FiSearch,
  FiClock,
  FiMessageSquare,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: FiGrid },
  { to: "/clusters", label: "Clusters", icon: FiServer },
  { to: "/investigations", label: "Investigations", icon: FiSearch },
  { to: "/history", label: "History", icon: FiClock },
  { to: "/assistant", label: "AI Assistant", icon: FiMessageSquare },
  { to: "/settings", label: "Settings", icon: FiSettings },
];

function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "text-[var(--color-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10"
        >
          <FiLogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
