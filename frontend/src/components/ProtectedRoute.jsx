import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const token = localStorage.getItem("token");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
