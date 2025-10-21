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
    <div className="login-container min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="login-card w-full max-w-md bg-white border border-gray-100 rounded-xl shadow-lg p-5">
        <h1 className="login-title text-2xl font-semibold mb-4 text-gray-800">비밀번호 찾기</h1>
        <form onSubmit={handleSubmit} className="login-form grid gap-3">
          <label className="login-label text-sm text-gray-700" htmlFor="fp-email">아이디 (이메일)</label>
          <input
            id="fp-email"
            type="email"
            className="login-input block w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none py-2 px-3 bg-white"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="example@domain.com"
            required
          />

          <button type="submit" className="login-button w-full h-11 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors" disabled={loading}>
            {loading ? "처리 중..." : "재설정 링크 보내기"}
          </button>
        </form>
        {msg && <p className="login-help text-emerald-700 mt-2 text-sm">{msg}</p>}
        {error && <p className="login-help text-red-700 mt-2 text-sm">{error}</p>}
        <div className="login-help mt-3">
          <Link to="/" className="text-blue-700 hover:underline">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
