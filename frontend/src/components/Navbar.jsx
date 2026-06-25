import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { FiActivity, FiMenu } from "react-icons/fi";

function Navbar({ onToggleSidebar }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-sidebar)]/85 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)] lg:hidden"
          aria-label="Open menu"
        >
          <FiMenu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-sm">
            <FiActivity className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <span className="text-sm font-bold tracking-tight text-[var(--color-text)] lg:text-base">
            KubeSage<span className="font-black text-[var(--color-primary)]">.AI</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        {user && (
          <div className="hidden items-center gap-2.5 border-l border-[var(--color-border)] pl-4 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-primary)]/20">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold leading-none text-[var(--color-text)]">
                {user.name}
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-[var(--color-secondary)]">
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
