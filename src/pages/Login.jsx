import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { typedStorage } from "../utils/storage";
import { useAuth } from "../contexts/AuthContext";
import { login } from "../api";
import { getJwtPayload } from "../utils/jwt";

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function goToLanding() {
    navigate("/dashboard", { replace: true });
  }

  useEffect(() => {
    if (typedStorage.auth.isLoggedIn()) {
      goToLanding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Call login API
      const response = await login({ userId: id, password });

      // Merge JWT claims for companyId/role/company fallback
      const claims = getJwtPayload(response?.token) || {};
      const mergedUser = {
        ...(response?.user || {}),
        companyId: response?.user?.companyId || claims.companyId,
        role: response?.user?.role || claims.role,
        company: response?.user?.company || claims.company,
      };
      // Persist and update auth context
      auth.setAuthenticated(response.token, mergedUser);

      // Navigate to dashboard
      goToLanding();
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Login</h1>
        <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
          <label className="login-label" htmlFor="login-id">ID</label>
          <input
            id="login-id"
            name="username"
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
            name="password"
            type="password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "로그인 중..." : "Login"}
          </button>
        </form>
        {error && <p className="login-help" style={{ color: "#b71c1c" }}>{error}</p>}
        <div className="login-help" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/terms">회원가입</Link>
          <span style={{ color: "#bbb" }}>|</span>
          <Link to="/forgot-password">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}
