import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

const TITLES = [
  "Hiring Manager",
  "Product Manager",
  "Engineer",
  "Designer",
  "Engineering Manager",
  "Recruiter",
  "Marketing Manager",
  "Account Executive",
  "Analyst",
];

const ORGANIZATIONS = [
  "Human Resources",
  "Research & Development",
  "Marketing",
  "Sales",
  "Finance",
  "Operations",
];

export default function Signup() {
  const location = useLocation();
  const { name, email } = (location.state as { name?: string; email?: string }) || {};
  const [title, setTitle] = useState("Hiring Manager");
  const [organization, setOrganization] = useState("Human Resources");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  if (!name || !email) {
    navigate("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const result = await api.auth.signup({ email, name, title, organization });
      login(result.token, result.user);
      navigate("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Welcome, {name}!</h1>
        <select value={title} onChange={(e) => setTitle(e.target.value)}>
          {TITLES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={organization} onChange={(e) => setOrganization(e.target.value)}>
          {ORGANIZATIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Back
          </button>
          <button type="submit" className="btn-primary">Create</button>
        </div>
      </form>
    </div>
  );
}
