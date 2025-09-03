import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    // Demo only: just pretend to send reset link
    if (!email) return;
    setMsg("비밀번호 재설정 링크를 이메일로 전송했습니다. (데모)");
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">비밀번호 찾기</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="fp-id">아이디(선택)</label>
          <input id="fp-id" type="text" className="login-input" value={id} onChange={(e)=>setId(e.target.value)} placeholder="아이디 또는 이메일" />

          <label className="login-label" htmlFor="fp-email">가입 이메일</label>
          <input id="fp-email" type="email" className="login-input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="example@domain.com" required />

          <button type="submit" className="login-button">재설정 링크 보내기</button>
        </form>
        {msg && <p className="login-help" style={{ color: "#177245" }}>{msg}</p>}
        <div className="login-help">
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}

