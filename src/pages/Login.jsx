import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // Temporary login until we connect the backend
    if (email && password) {
      navigate("/");
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p>Sign in to your TicketHub account</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Sign In</button>
        </form>

        <p>
          Don't have an account?{" "}
          <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </main>
  );
}
