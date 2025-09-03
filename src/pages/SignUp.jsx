import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const POSITIONS = [
  "대표이사",
  "사장",
  "부사장",
  "전무",
  "상무",
  "이사",
  "부장",
  "차장",
  "과장",
  "대리",
  "사원",
];

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userId: "",
    password: "",
    confirm: "",
    position: "",
    company: "",
    email: "",
    phone: "",
  });
  const [bizCert, setBizCert] = useState(null); // File object (not persisted)
  const [message, setMessage] = useState("");

  const isCeo = form.position === "대표이사";

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function onFileChange(e) {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setBizCert(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    // Basic validations
    if (!form.userId) {
      setMessage("아이디를 입력해주세요.");
      return;
    }
    if (!form.password || !form.confirm) {
      setMessage("비밀번호를 입력하고 확인해주세요.");
      return;
    }
    if (form.password !== form.confirm) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!form.position) {
      setMessage("직위를 선택해주세요.");
      return;
    }
    if (isCeo) {
      if (!bizCert) {
        setMessage("대표이사 선택 시 사업자등록증 업로드가 필요합니다.");
        return;
      }
    } else {
      if (!form.company.trim()) {
        setMessage("소속회사를 입력해주세요.");
        return;
      }
    }

    try {
      const raw = localStorage.getItem("registeredUsers");
      const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      // Save basic profile (demo). Do not persist file; store filename only.
      arr.push({
        userId: form.userId,
        position: form.position,
        company: isCeo ? null : form.company,
        email: form.email || null,
        phone: form.phone || null,
        bizCertName: isCeo && bizCert ? bizCert.name : null,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("registeredUsers", JSON.stringify(arr));
      setMessage("회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.");
      setTimeout(() => navigate("/"), 900);
    } catch {
      setMessage("데모 환경: 저장에 실패했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">회원가입</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="su-id">아이디</label>
          <input id="su-id" name="userId" type="text" className="login-input" value={form.userId} onChange={onChange} placeholder="아이디" required />

          <label className="login-label" htmlFor="su-pw">비밀번호</label>
          <input id="su-pw" name="password" type="password" className="login-input" value={form.password} onChange={onChange} placeholder="비밀번호" required />

          <label className="login-label" htmlFor="su-pw2">비밀번호 확인</label>
          <input id="su-pw2" name="confirm" type="password" className="login-input" value={form.confirm} onChange={onChange} placeholder="비밀번호 확인" required />

          <label className="login-label" htmlFor="su-pos">직위</label>
          <select id="su-pos" name="position" className="login-input" value={form.position} onChange={onChange} required>
            <option value="" disabled>선택하세요</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {isCeo ? (
            <>
              <label className="login-label" htmlFor="su-biz">사업자등록증 업로드 (PDF/JPG/PNG)</label>
              <input id="su-biz" name="bizCert" type="file" accept="application/pdf,image/*" className="login-input" onChange={onFileChange} required={isCeo} />
            </>
          ) : (
            <>
              <label className="login-label" htmlFor="su-company">소속회사</label>
              <input id="su-company" name="company" type="text" className="login-input" value={form.company} onChange={onChange} placeholder="회사명" required />
            </>
          )}

          <label className="login-label" htmlFor="su-email">이메일 (선택)</label>
          <input id="su-email" name="email" type="email" className="login-input" value={form.email} onChange={onChange} placeholder="example@domain.com" />

          <label className="login-label" htmlFor="su-phone">전화번호 (선택)</label>
          <input id="su-phone" name="phone" type="tel" className="login-input" value={form.phone} onChange={onChange} placeholder="010-0000-0000" />

          <button type="submit" className="login-button">가입하기</button>
        </form>
        {message && <p className="login-help" style={{ color: message.includes("완료") ? "#177245" : "#b71c1c" }}>{message}</p>}
        <div className="login-help">
          <Link to="/">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}

