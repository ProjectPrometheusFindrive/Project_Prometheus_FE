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
    <div className="login-container min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="login-card w-full max-w-md bg-white border border-gray-100 rounded-xl shadow-lg p-5">
        <h1 className="login-title text-2xl font-semibold mb-4 text-gray-800">로그인</h1>
        <form onSubmit={handleSubmit} className="login-form grid gap-3" autoComplete="on">
          <label className="login-label text-sm text-gray-700" htmlFor="login-id">ID</label>
          <input
            id="login-id"
            name="username"
            type="text"
            className="form-input block w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none py-2 px-3 bg-white"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="아이디를 입력하세요"
            autoComplete="username"
            required
          />

          <label className="login-label text-sm text-gray-700" htmlFor="login-pw">Password</label>
          <input
            id="login-pw"
            name="password"
            type="password"
            className="form-input block w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none py-2 px-3 bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            required
          />

          <button type="submit" className="form-button w-full h-11 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        {error && <p className="login-help text-red-700 mt-2 text-sm">{error}</p>}
        <div className="login-help flex gap-3 flex-wrap text-gray-600 text-sm mt-3">
          <Link to="/terms" className="text-blue-700 hover:underline">회원가입</Link>
          <span className="text-gray-300">|</span>
          <Link to="/forgot-password" className="text-blue-700 hover:underline">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}
