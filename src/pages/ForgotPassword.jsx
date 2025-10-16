import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [bizRegNo, setBizRegNo] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    if (!email || !bizRegNo) {
      setError("이메일과 사업자등록번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      await axios.post("/api/auth/forgot-password", {
        email,
        bizRegNo
      });

      setMsg("비밀번호 재설정 링크를 이메일로 전송했습니다.");
      setEmail("");
      setBizRegNo("");
    } catch (err) {
      setError(err.response?.data?.message || "비밀번호 찾기에 실패했습니다. 입력 정보를 확인해주세요.");
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

          <label className="login-label" htmlFor="fp-bizRegNo">사업자등록번호</label>
          <input
            id="fp-bizRegNo"
            type="text"
            className="login-input"
            value={bizRegNo}
            onChange={(e)=>setBizRegNo(e.target.value)}
            placeholder="000-00-00000"
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

