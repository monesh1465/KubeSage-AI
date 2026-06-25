import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./layouts/DashboardLayout";
import LoadingSpinner from "./components/LoadingSpinner";
import { ClusterProvider } from "./context/ClusterContext";
import Login from "./pages/Login";
import Register from "./pages/Register";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clusters = lazy(() => import("./pages/Clusters"));
const ClusterDetails = lazy(() => import("./pages/ClusterDetails"));
const Investigations = lazy(() => import("./pages/Investigations"));
const Investigation = lazy(() => import("./pages/Investigation"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner size="lg" />
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
              element={
                <Suspense fallback={<PageLoader />}>
                  <Investigation />
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
              element={
                <Suspense fallback={<PageLoader />}>
                  <History />
                </Suspense>
              }
            />
            <Route
              path="/clusters/:id/history"
              element={
                <Suspense fallback={<PageLoader />}>
                  <History />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Settings />
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
