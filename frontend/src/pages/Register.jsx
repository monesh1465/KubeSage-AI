import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiUser,
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
import { registerUser } from "../services/authService";
import { useToast } from "../context/ToastContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import { getApiErrorMessage } from "../utils/errors";

const TRUST_ITEMS = [
  { icon: FiCheckCircle, label: "Multi-cluster Observability" },
  { icon: FiCheckCircle, label: "AI-Powered Root Cause Analysis" },
  { icon: FiCheckCircle, label: "Real-time Incident Detection" },
];

function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await registerUser(formData);
      toast.success("Account created. Please sign in.");
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed. Please try again."));
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
        <div className="hero-orb hero-orb--1" />
        <div className="hero-orb hero-orb--2" />
        <div className="hero-orb hero-orb--3" />
        <div className="hero-grid" />

        <div className="hero-content">
          <div className="hero-wordmark">
            <div className="hero-logo-badge">
              <FiActivity className="hero-logo-icon" />
            </div>
            <span className="hero-logo-text">
              KubeSage<span className="hero-logo-ai">.AI</span>
            </span>
          </div>

          <h1 className="hero-headline">
            Kubernetes Intelligence,{" "}
            <span className="hero-headline--accent">Redefined.</span>
          </h1>

          <p className="hero-sub">
            Connect your clusters, detect incidents in real time, and let AI
            resolve production issues before they escalate.
          </p>

          <ul className="hero-trust-list">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <li key={label} className="hero-trust-item">
                <Icon className="hero-trust-icon" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          {/* Simulated telemetry card */}
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
          RIGHT — Register Form Panel
      ═══════════════════════════════════════════ */}
      <div className="login-form-panel">
        {/* Mobile-only wordmark */}
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
            <div className="form-heading">
              <h2 className="form-title">Create your account</h2>
              <p className="form-subtitle">
                Start managing your clusters in minutes.
              </p>
            </div>

            <ErrorAlert message={error} className="mb-4" />

            <form onSubmit={handleSubmit} className="auth-form">
              {/* name */}
              <div className="field-group">
                <label className="field-label" htmlFor="reg-name">
                  Full Name
                </label>
                <div className="field-wrapper">
                  <FiUser className="field-icon" />
                  <input
                    id="reg-name"
                    type="text"
                    name="name"
                    required
                    minLength={2}
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="field-input"
                  />
                </div>
              </div>

              {/* email */}
              <div className="field-group">
                <label className="field-label" htmlFor="reg-email">
                  Email Address
                </label>
                <div className="field-wrapper">
                  <FiMail className="field-icon" />
                  <input
                    id="reg-email"
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
                <label className="field-label" htmlFor="reg-password">
                  Password
                </label>
                <div className="field-wrapper">
                  <FiLock className="field-icon" />
                  <input
                    id="reg-password"
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
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
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    Create Account
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
              Already have an account?{" "}
              <Link to="/" className="form-footer-link">
                Sign in
              </Link>
            </p>

            <p className="form-security-note">
              <FiShield className="form-security-icon" />
              Encrypted &amp; Secure · No card required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
