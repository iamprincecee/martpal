// src/pages/Login.js
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import '../styles/custom.css';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      setError("All fields are required.");
      return;
    }

    try {
      // Authenticate user with Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // Redirect to Dashboard
      navigate("/");
    } catch (err) {
      setError("Failed to login. Please check your credentials.");
    }
  };

  return (
    <div className="auth-container d-flex justify-content-center align-items-center">
      <div className="auth-card shadow-sm p-4 rounded">
        <h2 className="text-center mb-4">Log In</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">Log In</button>
        </form>
        <div className="mt-3 text-center">
          <p>
            New here? <Link to="/signup" className="text-primary">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
