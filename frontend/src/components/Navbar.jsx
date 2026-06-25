import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { FiActivity, FiMenu } from "react-icons/fi";

function Navbar({ onToggleSidebar }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-sidebar)]/90 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] lg:hidden"
          aria-label="Open menu"
        >
          <FiMenu className="h-4 w-4" />
        </button>
        <FiActivity className="h-5 w-5 text-[var(--color-primary)]" />
        <span className="text-sm font-semibold tracking-wide text-[var(--color-text)] lg:text-base">
          KubeSage
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user && (
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-medium text-[var(--color-primary)]">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {user.name}
              </p>
              <p className="text-xs text-[var(--color-secondary)]">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
