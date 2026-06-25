import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { FiActivity } from "react-icons/fi";

function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-sidebar)] px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <FiActivity className="h-5 w-5 text-[var(--color-primary)]" />
        <span className="text-sm font-semibold text-[var(--color-text)] lg:text-base">
          KubeSage AI
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
