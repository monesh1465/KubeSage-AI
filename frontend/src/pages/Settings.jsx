import { useNavigate } from "react-router-dom";
import { FiLogOut, FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import ThemeToggle from "../components/ThemeToggle";
import PageHeader from "../components/PageHeader";

function Settings() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("You have been signed out.");
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and display settings"
      />

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
            <FiUser className="h-4 w-4 text-[var(--color-primary)]" />
            User Profile
          </h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
              Name
            </label>
            <p className="mt-1 text-xs font-semibold text-[var(--color-text)]">{user?.name}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
              Email Address
            </label>
            <p className="mt-1 break-all text-xs font-semibold text-[var(--color-text)]">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Theme Preferences</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-bold text-[var(--color-text)]">Appearance Mode</p>
            <p className="mt-1 text-[11px] text-[var(--color-secondary)]">
              Current active theme: {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </p>
          </div>
          <ThemeToggle showLabel />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Active Session</h2>
        </div>
        <div className="p-5">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-danger)]/35 px-3 py-2 text-xs font-semibold text-[var(--color-danger)] transition-all duration-150 hover:bg-[var(--color-danger)]/8"
          >
            <FiLogOut className="h-3.5 w-3.5" />
            Logout from session
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
