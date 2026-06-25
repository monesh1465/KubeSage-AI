import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

function ThemeToggle({ showLabel = false }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)]"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <FiSun className="h-4 w-4 text-[var(--color-warning)]" />
      ) : (
        <FiMoon className="h-4 w-4 text-[var(--color-primary)]" />
      )}
      {showLabel && (
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      )}
    </button>
  );
}

export default ThemeToggle;
