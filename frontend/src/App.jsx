import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Clusters from "./pages/Clusters";
import ClusterDetails from "./pages/ClusterDetails";
import Investigation from "./pages/Investigation";
import History from "./pages/History";
import Assistant from "./pages/Assistant";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clusters" element={<Clusters />} />
        <Route path="/clusters/:id" element={<ClusterDetails />} />
        <Route
          path="/clusters/:id/investigate"
          element={<Investigation />}
        />
        <Route
          path="/clusters/:id/history"
          element={<History />}
        />
        <Route
          path="/assistant"
          element={<Assistant />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;