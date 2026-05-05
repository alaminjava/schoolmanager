import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api";

export default function Register({ onRegister }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await api.post("/api/auth/register", form);
      onRegister({ token: data.token, user: data.user });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page single">
      <section className="auth-card-wrap">
        <form className="auth-card register-card" onSubmit={handleSubmit}>
          <p className="eyebrow">School Manager</p>
          <h2>Create account</h2>
          <p>Create role-based access for admins, teachers, staff, accountants, and students.</p>
          {error && <p className="alert error">{error}</p>}
          <div className="auth-grid two-col">
            <label className="auth-field">
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label className="auth-field">
              Email
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label className="auth-field">
              Password
              <input minLength={6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            </label>
            <label className="auth-field">
              Role
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="employee">Employee</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="accounts">Accounts</option>
                <option value="accountant">Accountant</option>
                <option value="audit">Audit</option>
              </select>
            </label>
          </div>
          <button className="btn primary wide" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
          <p className="auth-switch">Already have an account? <Link to="/">Login</Link></p>
        </form>
      </section>
    </main>
  );
}
