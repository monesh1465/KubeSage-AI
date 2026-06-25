import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo, FiX } from "react-icons/fi";

const styles = {
  success: {
    icon: FiCheckCircle,
    className:
      "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  },
  error: {
    icon: FiAlertCircle,
    className:
      "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  },
  warning: {
    icon: FiAlertTriangle,
    className:
      "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  },
  info: {
    icon: FiInfo,
    className:
      "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  },
};

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-3 z-[100] flex w-[min(92vw,360px)] flex-col gap-2 md:right-4">
      {toasts.map((toast) => {
        const config = styles[toast.type] || styles.info;
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${config.className}`}
            role="alert"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-[var(--color-text)]">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
