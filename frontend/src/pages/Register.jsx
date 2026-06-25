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
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-premium">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-sm">
            <FiActivity className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Create Account
          </h1>
          <p className="mt-1.5 text-xs text-[var(--color-secondary)]">
            Get started with KubeSage AI platform
          </p>
        </div>

        <ErrorAlert message={error} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text)]">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] outline-none transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-[var(--color-primary)] focus:bg-[var(--color-card)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text)]">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] outline-none transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-[var(--color-primary)] focus:bg-[var(--color-card)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text)]">
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
              placeholder="••••••••"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] outline-none transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-[var(--color-primary)] focus:bg-[var(--color-card)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-secondary)]">
          Already have an account?{" "}
          <Link to="/" className="font-semibold text-[var(--color-primary)] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
