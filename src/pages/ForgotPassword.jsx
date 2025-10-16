import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      await forgotPassword({ userId: email });

      setMsg("임시 비밀번호를 이메일로 발송했습니다. 로그인 후 즉시 변경하세요.");
      setEmail("");
    } catch (err) {
      setError(err.message || "잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">비밀번호 찾기</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="fp-email">아이디 (이메일)</label>
          <input
            id="fp-email"
            type="email"
            className="login-input"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="example@domain.com"
            required
          />

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "처리 중..." : "재설정 링크 보내기"}
          </button>
        </form>
        {msg && <p className="login-help" style={{ color: "#177245" }}>{msg}</p>}
        {error && <p className="login-help" style={{ color: "#d32f2f" }}>{error}</p>}
        <div className="login-help">
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
