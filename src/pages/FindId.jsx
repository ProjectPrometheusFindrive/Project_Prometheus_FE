import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function FindId() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    // Demo: look up from localStorage registeredUsers
    try {
      const raw = localStorage.getItem("registeredUsers");
      const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const found = arr.find((u) => u.email && email && u.email.toLowerCase() === email.toLowerCase());
      if (found) setResult(`가입된 아이디(이메일): ${found.email}`);
      else setResult("해당 이메일로 가입된 계정을 찾을 수 없습니다.");
    } catch {
      setResult("데모 환경: 조회 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">아이디 찾기</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="fi-email">가입 이메일</label>
          <input id="fi-email" type="email" className="login-input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="example@domain.com" required />
          <button type="submit" className="login-button">조회하기</button>
        </form>
        {result && <p className="login-help" style={{ color: "#333" }}>{result}</p>}
        <div className="login-help">
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}

