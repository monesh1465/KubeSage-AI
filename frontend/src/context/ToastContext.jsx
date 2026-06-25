import { createContext, useCallback, useContext, useState } from "react";
import ToastContainer from "../components/ToastContainer";

const ToastContext = createContext(null);

let toastId = 0;
const MAX_TOASTS = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => {
      const duplicateExists = prev.some(
        (toast) => toast.type === type && toast.message === message
      );

      if (duplicateExists) {
        return prev;
      }

      const next = [...prev, { id, message, type }];
      return next.slice(-MAX_TOASTS);
    });

    if (duration > 0) {
      window.setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, [removeToast]);

  const toast = {
    success: (message, duration) => addToast(message, "success", duration),
    error: (message, duration) => addToast(message, "error", duration),
    warning: (message, duration) => addToast(message, "warning", duration),
    info: (message, duration) => addToast(message, "info", duration),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context.toast;
}
