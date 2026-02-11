import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  "UX Researcher",
];

const ORGANIZATIONS = [
  "Human Resources",
  "Research and Development",
  "Marketing",
  "Sales",
  "Finance",
  "Operations",
];

function nameToEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, ".");
  const domain = slug === "zack.burgess" ? "hey.com" : "company.com";
  return `${slug}@${domain}`;
}

type Step = "name" | "new-employee";

export default function Login() {
  const [name, setName] = useState("me");
  const [step, setStep] = useState<Step>("name");
  const [employeeStatus, setEmployeeStatus] = useState<"existing" | "new" | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState(TITLES[0]);
  const [organization, setOrganization] = useState(ORGANIZATIONS[0]);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const trimmedName = name.trim();
  const email = nameToEmail(name);

  // Live check as user types
  useEffect(() => {
    if (!trimmedName) {
      setEmployeeStatus(null);
      setNeedsPassword(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const check = await api.auth.checkEmail(nameToEmail(trimmedName));
        setEmployeeStatus(check.exists ? "existing" : "new");
        setNeedsPassword(check.exists && check.requiresPassword);
      } catch {
        setEmployeeStatus(null);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [trimmedName]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!trimmedName) return;

    try {
      const check = await api.auth.checkEmail(email);
      if (check.exists) {
        if (check.requiresPassword && !password) {
          setNeedsPassword(true);
          setEmployeeStatus("existing");
          return;
        }
        const result = await api.auth.login(email, check.requiresPassword ? password : undefined);
        login(result.token, result.user);
        navigate("/profile");
      } else {
        setStep("new-employee");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const result = await api.auth.signup({ email, name: trimmedName, title, organization });
      login(result.token, result.user);
      navigate("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  }

  if (step === "new-employee") {
    return (
      <div className="auth-page">
        <form className="auth-form" onSubmit={handleCreateAccount}>
          <h1>Welcome to the company, {trimmedName}!</h1>
          <p className="auth-subtitle">Please select your Title and Organization.</p>
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
            <button type="button" className="btn-secondary" onClick={() => { setStep("name"); setError(""); }}>
              Back
            </button>
            <button type="submit" className="btn-primary">Create Account</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleLogin}>
        <h1>Groups Manager<br /><span className="auth-subtitle-heading">with Automated Membership</span></h1>
        <input
          type="text"
          placeholder="Please enter your name..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setPassword("");
            setError("");
          }}
          required
          autoFocus
          autoComplete="off"
          name="login-name"
        />
        {employeeStatus === "existing" && (
          <p className="employee-status status-existing">welcome back!</p>
        )}
        {needsPassword && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={!trimmedName}>
          Log In
        </button>
      </form>
    </div>
  );
}
