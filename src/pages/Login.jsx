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
  const [showPassword, setShowPassword] = useState(false);

  function goToLanding() {
    navigate("/dashboard", { replace: true });
  }

  useEffect(() => {
    // Redirect only when authenticated according to AuthContext
    if (auth && auth.isAuthenticated) {
      goToLanding();
    }
  }, [auth?.isAuthenticated]);

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
    <div className="auth-page">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="auth-page__branding">
        <div className="auth-page__branding-content">
          <h1 className="auth-page__brand-title">Pangea</h1>
          <p className="auth-page__brand-tagline">차량 관리의 새로운 기준</p>
        </div>
        {/* Car illustration */}
        <div className="auth-page__car-visual">
          <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Road */}
            <path d="M0 180 Q200 160 400 180" stroke="rgba(255,255,255,0.2)" strokeWidth="40" strokeLinecap="round"/>
            <path d="M0 180 Q200 160 400 180" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="20 15"/>

            {/* Car body */}
            <g className="auth-page__car">
              <path d="M80 140 L90 110 Q95 100 110 100 L180 100 Q195 100 200 110 L210 140 Z" fill="rgba(255,255,255,0.9)"/>
              <rect x="75" y="140" width="140" height="35" rx="8" fill="rgba(255,255,255,0.95)"/>
              <rect x="95" y="105" width="35" height="25" rx="4" fill="rgba(59,130,246,0.5)"/>
              <rect x="140" y="105" width="50" height="25" rx="4" fill="rgba(59,130,246,0.5)"/>
              {/* Wheels */}
              <circle cx="105" cy="175" r="18" fill="#1e3a5f"/>
              <circle cx="105" cy="175" r="10" fill="#2d4a6f"/>
              <circle cx="105" cy="175" r="4" fill="#fff" fillOpacity="0.5"/>
              <circle cx="185" cy="175" r="18" fill="#1e3a5f"/>
              <circle cx="185" cy="175" r="10" fill="#2d4a6f"/>
              <circle cx="185" cy="175" r="4" fill="#fff" fillOpacity="0.5"/>
              {/* Headlights */}
              <rect x="205" y="148" width="8" height="6" rx="2" fill="#fbbf24"/>
              <rect x="77" y="148" width="8" height="6" rx="2" fill="#ef4444"/>
            </g>

            {/* Location pins */}
            <g className="auth-page__pins">
              <g className="auth-page__pin auth-page__pin--1">
                <circle cx="280" cy="90" r="12" fill="rgba(255,255,255,0.9)"/>
                <circle cx="280" cy="90" r="5" fill="#3b82f6"/>
                <path d="M280 102 L280 120" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="4 3"/>
              </g>
              <g className="auth-page__pin auth-page__pin--2">
                <circle cx="330" cy="110" r="10" fill="rgba(255,255,255,0.7)"/>
                <circle cx="330" cy="110" r="4" fill="#10b981"/>
                <path d="M330 120 L330 135" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4 3"/>
              </g>
              <g className="auth-page__pin auth-page__pin--3">
                <circle cx="50" cy="100" r="8" fill="rgba(255,255,255,0.6)"/>
                <circle cx="50" cy="100" r="3" fill="#f59e0b"/>
                <path d="M50 108 L50 125" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="4 3"/>
              </g>
            </g>
          </svg>
        </div>
        <div className="auth-page__branding-decoration">
          <div className="auth-page__circle auth-page__circle--1"></div>
          <div className="auth-page__circle auth-page__circle--2"></div>
          <div className="auth-page__circle auth-page__circle--3"></div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="auth-page__form-section">
        <div className="auth-card">
          <div className="auth-card__header">
            <h2 className="auth-card__title">로그인</h2>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
            <div className="auth-form__group">
              <label className="auth-form__label auth-form__label--desktop" htmlFor="login-id">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                아이디
              </label>
              <input
                id="login-id"
                name="username"
                type="text"
                className="auth-form__input"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="아이디"
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-form__group">
              <label className="auth-form__label auth-form__label--desktop" htmlFor="login-pw">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                비밀번호
              </label>
              <div className="auth-form__input-wrapper">
                <input
                  id="login-pw"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="auth-form__input auth-form__input--with-icon"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-form__toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-form__error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Mobile divider line */}
            <div className="auth-form__mobile-divider"></div>

            <button type="submit" className="auth-form__submit" disabled={loading}>
              {loading ? (
                <>
                  <svg className="auth-form__spinner" width="20" height="20" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round"/>
                  </svg>
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </button>
          </form>

          {/* Desktop divider */}
          <div className="auth-card__divider auth-card__divider--desktop">
            <span>또는</span>
          </div>

          {/* Desktop links */}
          <div className="auth-card__links auth-card__links--desktop">
            <Link to="/terms" className="auth-card__link auth-card__link--primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              회원가입
            </Link>
            <Link to="/forgot-password" className="auth-card__link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              비밀번호 찾기
            </Link>
          </div>

          {/* Mobile links */}
          <div className="auth-card__links auth-card__links--mobile">
            <Link to="/terms" className="auth-card__link-text">회원가입</Link>
            <span className="auth-card__link-separator">|</span>
            <Link to="/forgot-password" className="auth-card__link-text">비밀번호찾기</Link>
          </div>
        </div>

        {/* Mobile bottom logo */}
        <div className="auth-page__mobile-logo">Pangea</div>
      </div>
    </div>
  );
}
