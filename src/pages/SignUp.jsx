import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [message, setMessage] = useState("");

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.confirm) return;
    if (form.password !== form.confirm) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      const raw = localStorage.getItem("registeredUsers");
      const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      arr.push({ name: form.name, email: form.email, createdAt: new Date().toISOString() });
      localStorage.setItem("registeredUsers", JSON.stringify(arr));
      setMessage("회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.");
      setTimeout(() => navigate("/"), 800);
    } catch {
      setMessage("데모 환경: 저장에 실패했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">회원가입</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="su-name">이름</label>
          <input id="su-name" name="name" type="text" className="login-input" value={form.name} onChange={onChange} placeholder="이름" />

          <label className="login-label" htmlFor="su-email">이메일</label>
          <input id="su-email" name="email" type="email" className="login-input" value={form.email} onChange={onChange} placeholder="example@domain.com" required />

          <label className="login-label" htmlFor="su-pw">비밀번호</label>
          <input id="su-pw" name="password" type="password" className="login-input" value={form.password} onChange={onChange} placeholder="비밀번호" required />

          <label className="login-label" htmlFor="su-pw2">비밀번호 확인</label>
          <input id="su-pw2" name="confirm" type="password" className="login-input" value={form.confirm} onChange={onChange} placeholder="비밀번호 확인" required />

          <button type="submit" className="login-button">가입하기</button>
        </form>
        {message && <p className="login-help" style={{ color: "#177245" }}>{message}</p>}
        <div className="login-help">
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}

