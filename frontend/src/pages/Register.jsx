import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiActivity } from "react-icons/fi";
import { registerUser } from "../services/authService";
import { useToast } from "../context/ToastContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import { getApiErrorMessage } from "../utils/errors";

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
            <FiActivity className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Create Account</h1>
          <p className="mt-2 text-sm text-[var(--color-secondary)]">
            Register to start managing your Kubernetes clusters
          </p>
        </div>

        <ErrorAlert message={error} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Name
            </label>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-secondary)]">
          Already have an account?{" "}
          <Link to="/" className="font-medium text-[var(--color-primary)] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
