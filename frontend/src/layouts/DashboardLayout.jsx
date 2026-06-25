import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useClusters } from "../context/ClusterContext";

function DashboardLayout() {
  const location = useLocation();
  const { refreshClusters } = useClusters();

  useEffect(() => {
    if (location.pathname === "/dashboard") {
      refreshClusters().catch(() => {});
    }
  }, [location.pathname, refreshClusters]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
