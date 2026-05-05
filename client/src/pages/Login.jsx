import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await api.post("/api/auth/login", form);
      onLogin({ token: data.token, user: data.user });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div>
          <p className="eyebrow">School Manager</p>
          <h1>Run academics, people, and finance from one colorful console.</h1>
          <p className="auth-description">Manage students, teachers, staff, accountants, routines, payments, marks, salary increments, and reports from one place.</p>
        </div>
        <div className="auth-pill-grid">
          <span>Students</span>
          <span>Teachers</span>
          <span>Staff</span>
          <span>Accounts</span>
          <span>Marks</span>
          <span>Routine</span>
        </div>
      </section>

      <section className="auth-card-wrap">
        <form className="auth-card" onSubmit={handleSubmit}>
          <p className="eyebrow">Secure Login</p>
          <h2>Welcome back</h2>
          <p>Use your admin, teacher, staff, accountant, or student credentials.</p>
          {error && <p className="alert error">{error}</p>}
          <div className="auth-grid">
            <label className="auth-field">
              Email
              <input autoComplete="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label className="auth-field">
              Password
              <input autoComplete="current-password" minLength={6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            </label>
            <button className="btn primary wide" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </div>
          <p className="auth-switch">Need an account? <Link to="/register">Register</Link></p>
        </form>
      </section>
    </main>
  );
}
