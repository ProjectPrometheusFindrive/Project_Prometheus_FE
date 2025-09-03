import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    try {
      const isLoggedIn = localStorage.getItem("isLoggedIn");
      if (isLoggedIn === "true") {
        navigate("/dashboard", { replace: true });
      }
    } catch {}
  }, [navigate]);

  function handleSubmit(e) {
    e.preventDefault();
    try {
      localStorage.setItem("isLoggedIn", "true");
    } catch {}
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">로그인</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="login-id">아이디</label>
          <input
            id="login-id"
            type="text"
            className="login-input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="아이디를 입력하세요"
            autoComplete="username"
            required
          />

          <label className="login-label" htmlFor="login-pw">비밀번호</label>
          <input
            id="login-pw"
            type="password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            required
          />

          <button type="submit" className="login-button">로그인</button>
        </form>
        <p className="login-help">지금은 어떤 값이든 로그인됩니다.</p>
      </div>
    </div>
  );
}
