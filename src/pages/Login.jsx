import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { typedStorage } from "../utils/storage";

export default function Login() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  function goToLanding() {
    navigate("/dashboard", { replace: true });
  }

  useEffect(() => {
    if (typedStorage.auth.isLoggedIn()) {
      goToLanding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    typedStorage.auth.setLoggedIn(true);
    goToLanding();
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Login</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="login-id">ID</label>
          <input
            id="login-id"
            type="text"
            className="login-input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Enter ID"
            autoComplete="username"
            required
          />

          <label className="login-label" htmlFor="login-pw">Password</label>
          <input
            id="login-pw"
            type="password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />

          <button type="submit" className="login-button">Login</button>
        </form>
        <p className="login-help">Any input logs in for now.</p>
        <div className="login-help" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/signup">회원가입</Link>
          <span style={{ color: "#bbb" }}>|</span>
          <Link to="/find-id">아이디 찾기</Link>
          <span style={{ color: "#bbb" }}>|</span>
          <Link to="/forgot-password">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}
