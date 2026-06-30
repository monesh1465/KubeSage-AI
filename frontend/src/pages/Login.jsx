import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiMail,
  FiLock,
  FiServer,
  FiShield,
  FiAlertTriangle,
  FiZap,
  FiArrowRight,
  FiActivity,
  FiCheckCircle,
} from "react-icons/fi";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import { getApiErrorMessage } from "../utils/errors";

/* ─────────────── tiny static trust-badge list ─────────────── */
const TRUST_ITEMS = [
  { icon: FiCheckCircle, label: "Multi-Cluster Monitoring" },
  { icon: FiCheckCircle, label: "AI Root Cause Analysis" },
  { icon: FiCheckCircle, label: "Automated Incident Investigations" },
];

function Login() {
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await loginUser(formData);
      localStorage.setItem("token", data.access_token);
      await loadUser();
      toast.success("Signed in successfully.");
      navigate("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Please check your credentials."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* ═══════════════════════════════════════════
          LEFT — Brand Hero Panel
      ═══════════════════════════════════════════ */}
      <div className="login-hero">
        {/* ambient glow orbs */}
        <div className="hero-orb hero-orb--1" />
        <div className="hero-orb hero-orb--2" />
        <div className="hero-orb hero-orb--3" />

        {/* dot-grid overlay */}
        <div className="hero-grid" />

        <div className="hero-content">
          {/* wordmark */}
          <div className="hero-wordmark">
            <div className="hero-logo-badge">
              <FiActivity className="hero-logo-icon" />
            </div>
            <span className="hero-logo-text">
              KubeSage<span className="hero-logo-ai">.AI</span>
            </span>
          </div>

          {/* headline */}
          <h1 className="hero-headline">
            Kubernetes Intelligence,{" "}
            <span className="hero-headline--accent">Redefined.</span>
          </h1>

          <p className="hero-sub">
            Connect your clusters, detect incidents in real time, and let AI
            resolve production issues before they escalate.
          </p>

          <p className="hero-credibility">
            Built for Kubernetes Operators, DevOps Engineers and SRE Teams.
          </p>

          {/* trust badges */}
          <ul className="hero-trust-list">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <li key={label} className="hero-trust-item">
                <Icon className="hero-trust-icon" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          {/* simulated telemetry card */}
          <div className="telemetry-card">
            <div className="telemetry-header">
              <div className="telemetry-header-left">
                <FiServer className="telemetry-icon" />
                <span className="telemetry-cluster">eks-prod-us-east-1</span>
              </div>
              <div className="telemetry-live-badge">
                <span className="telemetry-live-dot" />
                <span>LIVE</span>
              </div>
            </div>

            <div className="telemetry-stats">
              {[
                { label: "Nodes", value: "4 / 4" },
                { label: "Pods", value: "128" },
                { label: "Namespaces", value: "8" },
              ].map(({ label, value }) => (
                <div key={label} className="telemetry-stat">
                  <p className="telemetry-stat-label">{label}</p>
                  <p className="telemetry-stat-value">{value}</p>
                </div>
              ))}
            </div>

            <div className="telemetry-alert">
              <div className="telemetry-alert-header">
                <FiAlertTriangle className="telemetry-alert-icon" />
                <span>CrashLoopBackOff · payment-gateway-c5b9</span>
              </div>
              <div className="telemetry-ai-box">
                <div className="telemetry-ai-label">
                  <FiZap className="telemetry-ai-zap" />
                  AI Recommendation
                </div>
                <p className="telemetry-ai-text">
                  Raise memory limit to{" "}
                  <code className="telemetry-code">512Mi</code> and restart
                  the deployment in <em>billing</em>.
                </p>
              </div>
            </div>

            <div className="telemetry-nodes">
              <span className="telemetry-nodes-label">Node Health</span>
              <div className="telemetry-nodes-bars">
                <div className="node-bar node-bar--ok" />
                <div className="node-bar node-bar--ok" />
                <div className="node-bar node-bar--ok" />
                <div className="node-bar node-bar--warn" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          RIGHT — Auth Form Panel
      ═══════════════════════════════════════════ */}
      <div className="login-form-panel">
        {/* mobile-only wordmark */}
        <div className="mobile-wordmark">
          <div className="hero-logo-badge hero-logo-badge--sm">
            <FiActivity className="hero-logo-icon" />
          </div>
          <span className="hero-logo-text">
            KubeSage<span className="hero-logo-ai">.AI</span>
          </span>
        </div>

        <div className="form-card">
          <div className="form-card-inner">
            {/* heading */}
            <div className="form-heading">
              <h2 className="form-title">Welcome back</h2>
              <p className="form-subtitle">
                Sign in to your account to continue.
              </p>
            </div>

            <ErrorAlert message={error} className="mb-4" />

            <form onSubmit={handleSubmit} className="auth-form">
              {/* email */}
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">
                  Email Address
                </label>
                <div className="field-wrapper">
                  <FiMail className="field-icon" />
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@company.com"
                    className="field-input"
                  />
                </div>
              </div>

              {/* password */}
              <div className="field-group">
                <label className="field-label" htmlFor="login-password">
                  Password
                </label>
                <div className="field-wrapper">
                  <FiLock className="field-icon" />
                  <input
                    id="login-password"
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="field-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary-full"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    Sign In
                    <FiArrowRight className="btn-arrow" />
                  </>
                )}
              </button>
            </form>

            <div className="form-divider">
              <span className="form-divider-line" />
              <span className="form-divider-text">or</span>
              <span className="form-divider-line" />
            </div>

            <p className="form-footer">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="form-footer-link">
                Create one for free
              </Link>
            </p>

            {/* security note */}
            <p className="form-security-note">
              <FiShield className="form-security-icon" />
              Encrypted &amp; Secure · No card required
            </p>
          </div>
        </div>

        {/* Page footer */}
        <p className="login-page-footer">
          <span>© 2026 KubeSage.AI</span>
        </p>
      </div>
    </div>
  );
}

export default Login;
