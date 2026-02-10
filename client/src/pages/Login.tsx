import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

function nameToEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, ".");
  const domain = slug === "zack.burgess" ? "hey.com" : "company.com";

  return `${slug}@${domain}`;
}

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return;

    const email = nameToEmail(name);

    try {
      const check = await api.auth.checkEmail(email);

      if (!check.exists) {
        navigate("/signup", { state: { name: name.trim(), email } });
        return;
      }

      if (check.requiresPassword && !needsPassword) {
        setNeedsPassword(true);
        return;
      }

      const result = await api.auth.login(email, needsPassword ? password : undefined);
      login(result.token, result.user);
      navigate("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Groups Manager</h1>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNeedsPassword(false);
            setError("");
          }}
          required
          autoFocus
        />
        {needsPassword && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit">Log In</button>
      </form>
    </div>
  );
}
