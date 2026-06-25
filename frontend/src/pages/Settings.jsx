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
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your account and application preferences"
      />

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
            <FiUser className="h-4 w-4" />
            User Profile
          </h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-secondary)]">
              Name
            </label>
            <p className="mt-1 text-sm text-[var(--color-text)]">{user?.name}</p>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-secondary)]">
              Email
            </label>
            <p className="mt-1 break-all text-sm text-[var(--color-text)]">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="font-semibold text-[var(--color-text)]">Theme Preferences</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Appearance</p>
            <p className="mt-1 text-sm text-[var(--color-secondary)]">
              Current theme: {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </p>
          </div>
          <ThemeToggle showLabel />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="font-semibold text-[var(--color-text)]">Session</h2>
        </div>
        <div className="p-5">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-danger)]/30 px-4 py-2.5 text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10"
          >
            <FiLogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
