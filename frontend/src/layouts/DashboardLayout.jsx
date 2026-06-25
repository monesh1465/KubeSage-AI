import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useClusters } from "../context/ClusterContext";

function DashboardLayout() {
  const location = useLocation();
  const { refreshClusters } = useClusters();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === "/dashboard") {
      refreshClusters().catch(() => {});
    }
    setSidebarOpen(false);
  }, [location.pathname, refreshClusters]);

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}
    </div>
  );
}

export default DashboardLayout;
