import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getClusters } from "../services/clusterService";
import { getApiErrorMessage } from "../utils/errors";
import { useAuth } from "./AuthContext";

const ClusterContext = createContext(null);

export function ClusterProvider({ children }) {
  const { user } = useAuth();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  const refreshClusters = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getClusters();
      setClusters(data);
      setVersion((prev) => prev + 1);
      return data;
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to load clusters.");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshClusters().catch(() => {});
    } else {
      setClusters([]);
      setError("");
    }
  }, [user, refreshClusters]);

  const getClusterById = useCallback(
    (id) => clusters.find((cluster) => cluster.id === Number(id)),
    [clusters]
  );

  const stats = useMemo(() => {
    const connected = clusters.filter((c) => c.status === "connected").length;
    const warning = clusters.filter(
      (c) => c.status === "failed" || !c.status || c.status === "pending"
    ).length;

    return {
      total: clusters.length,
      connected,
      warning,
    };
  }, [clusters]);

  return (
    <ClusterContext.Provider
      value={{
        clusters,
        loading,
        error,
        version,
        stats,
        refreshClusters,
        getClusterById,
        setClusters,
      }}
    >
      {children}
    </ClusterContext.Provider>
  );
}

export function useClusters() {
  const context = useContext(ClusterContext);
  if (!context) {
    throw new Error("useClusters must be used within ClusterProvider");
  }
  return context;
}
