import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./layouts/DashboardLayout";
import LoadingSpinner from "./components/LoadingSpinner";
import { ClusterProvider } from "./context/ClusterContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { runInvestigation } from "./services/investigationService";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clusters = lazy(() => import("./pages/Clusters"));
const ClusterDetails = lazy(() => import("./pages/ClusterDetails"));
const Investigations = lazy(() => import("./pages/Investigations"));
const Investigation = lazy(() => import("./pages/Investigation"));
const AIReport = lazy(() => import("./pages/AIReport"));
const Settings = lazy(() => import("./pages/Settings"));
const InvestigationChat = lazy(() => import("./pages/InvestigationChat"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));


function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

/**
 * Launched from /clusters/:id/investigate (old links on ClusterCard / ClusterDetails).
 * Immediately runs the investigation against clusterId, then redirects to
 * /investigations/:investigationId — the canonical, unique URL.
 */
function RunInvestigationLauncher() {
  const { id: clusterId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clusterId) return;
    runInvestigation(clusterId)
      .then((result) => {
        navigate(`/investigations/${result.id}`, { replace: true });
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || "Investigation failed.";
        setError(msg);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <p className="text-sm font-bold text-[var(--color-danger)]">{error}</p>
        <button
          type="button"
          className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          onClick={() => navigate(-1)}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-xs font-semibold text-[var(--color-secondary)]">Running investigation...</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <ClusterProvider>
                  <DashboardLayout />
                </ClusterProvider>
              </ProtectedRoute>
            }
          >
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="/clusters"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Clusters />
                </Suspense>
              }
            />
            <Route
              path="/clusters/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ClusterDetails />
                </Suspense>
              }
            />
            <Route
              path="/clusters/:id/investigate"
              element={<RunInvestigationLauncher />}
            />
            {/* Canonical investigation route — uses investigationId, not clusterId */}
            <Route
              path="/investigations/:investigationId"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Investigation />
                </Suspense>
              }
            />
            <Route
              path="/investigations/:investigationId/ai"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AIReport />
                </Suspense>
              }
            />
            <Route
              path="/investigations/:id/chat"
              element={
                <Suspense fallback={<PageLoader />}>
                  <InvestigationChat />
                </Suspense>
              }
            />
            <Route
              path="/investigations"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Investigations />
                </Suspense>
              }
            />

            <Route
              path="/history"
              element={<Navigate to="/investigations" replace />}
            />
            <Route
              path="/clusters/:id/history"
              element={<Navigate to="/investigations" replace />}
            />

            <Route
              path="/settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Settings />
                </Suspense>
              }
            />
            <Route
              path="/assistant"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AIAssistant />
                </Suspense>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
