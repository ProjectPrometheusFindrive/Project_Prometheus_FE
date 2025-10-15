import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPhone11 } from "../utils/formatters";
import { signup } from "../api";
import { typedStorage } from "../utils/storage";
import useFormState from "../hooks/useFormState";
import Modal from "../components/Modal";


export default function SignUp() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);


  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePhone(phone) {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  }

  function validatePassword(pw) {
    if (!pw) return false;
    if (pw.length < 8) return false;
    const hasLetter = /[A-Za-z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    return hasLetter && hasNumber;
  }

  // Form state + validation
  const {
    form,
    errors,
    touched,
    updateField,
    handleSubmit: handleValidatedSubmit,
    hasFieldError,
    isSubmitting,
    setForm,
    setErrors,
    setTouched,
  } = useFormState({
    userId: "",
    password: "",
    confirm: "",
    name: "",
    phone: "010-",
    email: "",
    position: "",
    company: "",
  }, {
    validateOnChange: true,
    validate: (values) => {
      const v = values || {};
      const out = {};
      if (!v.userId) out.userId = "아이디(이메일)를 입력해주세요.";
      else if (!validateEmail(v.userId)) out.userId = "올바른 이메일 형식을 입력해주세요.";

      if (!v.password) out.password = "비밀번호를 입력해주세요.";
      else if (!validatePassword(v.password)) out.password = "8자 이상, 영문/숫자를 포함해야 합니다.";

      if (!v.confirm) out.confirm = "비밀번호 확인을 입력해주세요.";
      else if (v.password !== v.confirm) out.confirm = "비밀번호가 일치하지 않습니다.";

      if (!String(v.name || "").trim()) out.name = "이름을 입력해주세요.";

      if (!v.phone || v.phone === "010-") out.phone = "전화번호를 입력해주세요.";
      else if (!validatePhone(v.phone)) out.phone = "전화번호는 010-xxxx-xxxx 형식으로 입력해주세요.";

      if (!v.email) out.email = "개인이메일을 입력해주세요.";
      else if (!validateEmail(v.email)) out.email = "올바른 개인이메일 형식을 입력해주세요.";

      if (!v.position) out.position = "직위를 입력해주세요.";
      if (!String(v.company || "").trim()) out.company = "소속회사를 입력해주세요.";
      return out;
    }
  });

  function onChange(e) {
    const { name, value } = e.target;
    updateField(name, value);
  }

  // (Reverted) No auto-insert for email fields; use plain onChange

  function handlePhoneChange(e) {
    const value = e.target.value;
    // Prevent deletion of "010-" prefix
    if (value.length < 4) {
      setForm((p) => ({ ...p, phone: "010-" }));
      return;
    }
    const formatted = formatPhone11(value);
    updateField("phone", formatted);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    // Run validation via hook
    const ok = await handleValidatedSubmit();
    if (!ok) {
      // Show criteria modal with details when invalid
      setShowCriteria(true);
      setMessage("입력하신 내용을 한 번만 더 확인해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const userData = {
        userId: form.userId,
        password: form.password,
        name: form.name,
        phone: form.phone,
        email: form.email,
        position: form.position,
        company: form.company
      };

      await signup(userData);
      try { typedStorage.flags.setNeedsCompanyDocs(true); } catch {}
      setMessage("success");
    } catch (error) {
      console.error("회원가입 오류:", error);
      setMessage(error.message || "회원가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  // Lightweight, real-time helper text per field
  const fieldHints = useMemo(() => ({
    userId: validateEmail(form.userId)
      ? { text: "이메일 형식이 맞아요.", color: "#177245" }
      : { text: "이메일 주소를 입력해 주세요.", color: touched.userId ? (errors.userId ? "#b71c1c" : "#999") : "#999" },
    password: validatePassword(form.password)
      ? { text: "안전한 비밀번호예요.", color: "#177245" }
      : { text: "8자 이상, 영문과 숫자를 함께 써 주세요.", color: touched.password ? (errors.password ? "#b71c1c" : "#999") : "#999" },
    confirm: form.confirm && form.password === form.confirm
      ? { text: "비밀번호가 일치합니다.", color: "#177245" }
      : { text: "위와 동일하게 입력해 주세요.", color: touched.confirm ? (errors.confirm ? "#b71c1c" : "#999") : "#999" },
    name: (form.name || "").trim().length > 0
      ? { text: "이름 확인됐어요.", color: "#177245" }
      : { text: "이름을 입력해 주세요.", color: touched.name ? (errors.name ? "#b71c1c" : "#999") : "#999" },
    phone: validatePhone(form.phone)
      ? { text: "전화번호 형식이 맞아요.", color: "#177245" }
      : { text: "형식으로 입력해 주세요.", color: touched.phone ? (errors.phone ? "#b71c1c" : "#999") : "#999" },
    email: validateEmail(form.email)
      ? { text: "이메일 형식이 맞아요.", color: "#177245" }
      : { text: "개인이메일을 입력해 주세요.", color: touched.email ? (errors.email ? "#b71c1c" : "#999") : "#999" },
    position: form.position
      ? { text: "확인했어요.", color: "#177245" }
      : { text: "직위를 입력해 주세요.", color: touched.position ? (errors.position ? "#b71c1c" : "#999") : "#999" },
    company: (form.company || "").trim().length > 0
      ? { text: "확인했어요.", color: "#177245" }
      : { text: "회사명을 입력해 주세요.", color: touched.company ? (errors.company ? "#b71c1c" : "#999") : "#999" },
  }), [form, touched, errors]);

  // Build detailed criteria list per field for the modal
  const criteria = useMemo(() => {
    const has = (s) => !!s;
    const checks = {
      userId: [
        { label: "이메일 입력", ok: has(form.userId) },
        { label: "이메일 형식 (예: name@domain.com)", ok: validateEmail(form.userId) },
      ],
      password: [
        { label: "비밀번호 입력", ok: has(form.password) },
        { label: "8자 이상", ok: (form.password || "").length >= 8 },
        { label: "영문 포함", ok: /[A-Za-z]/.test(form.password || "") },
        { label: "숫자 포함", ok: /\d/.test(form.password || "") },
      ],
      confirm: [
        { label: "확인 비밀번호 입력", ok: has(form.confirm) },
        { label: "위 비밀번호와 동일", ok: has(form.confirm) && form.password === form.confirm },
      ],
      name: [
        { label: "이름 입력", ok: (form.name || "").trim().length > 0 },
      ],
      phone: [
        { label: "전화번호 입력", ok: has(form.phone) && form.phone !== "010-" },
        { label: "010-0000-0000 형식", ok: validatePhone(form.phone) },
      ],
      email: [
        { label: "개인이메일 입력", ok: has(form.email) },
        { label: "이메일 형식", ok: validateEmail(form.email) },
      ],
      position: [
        { label: "직위 입력", ok: has(form.position) },
      ],
      company: [
        { label: "회사명 입력", ok: (form.company || "").trim().length > 0 },
      ],
    };
    return checks;
  }, [form]);

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
        <h1 className="login-title">회원가입</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-id" style={{ width: "120px", marginBottom: 0 }}>아이디</label>
            <div className="input-with-hint" style={{ flex: 1 }}>
              <input id="su-id" name="userId" type="email" className="login-input" value={form.userId} onChange={onChange} placeholder="이메일 주소" required style={{ minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
              <div className="login-help input-hint" style={{ color: fieldHints.userId.color }}>{fieldHints.userId.text}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-pw" style={{ width: "120px", marginBottom: 0 }}>비밀번호</label>
            <div className="input-with-hint" style={{ flex: 1 }}>
              <input id="su-pw" name="password" type="password" className="login-input" value={form.password} onChange={onChange} placeholder="비밀번호" required style={{ minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
              <div className="login-help input-hint" style={{ color: fieldHints.password.color }}>{fieldHints.password.text}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-pw2" style={{ width: "120px", marginBottom: 0 }}>비밀번호 확인</label>
            <div className="input-with-hint" style={{ flex: 1 }}>
              <input id="su-pw2" name="confirm" type="password" className="login-input" value={form.confirm} onChange={onChange} placeholder="비밀번호 확인" required style={{ minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
              <div className="login-help input-hint" style={{ color: fieldHints.confirm.color }}>{fieldHints.confirm.text}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-name" style={{ width: "120px", marginBottom: 0 }}>이름</label>
            <div className="input-with-hint" style={{ flex: 1 }}>
              <input id="su-name" name="name" type="text" className="login-input" value={form.name} onChange={onChange} placeholder="이름" required style={{ minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
              <div className="login-help input-hint" style={{ color: fieldHints.name.color }}>{fieldHints.name.text}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-phone" style={{ width: "120px", marginBottom: 0 }}>전화번호</label>
            <div className="input-with-hint" style={{ flex: 1 }}>
              <input id="su-phone" name="phone" type="tel" className="login-input" value={form.phone} onChange={handlePhoneChange} placeholder="000-0000-0000" inputMode="numeric" maxLength={13} required style={{ minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
              <div className="login-help input-hint" style={{ color: fieldHints.phone.color }}>{fieldHints.phone.text}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-email" style={{ width: "120px", marginBottom: 0 }}>개인이메일</label>
            <div className="input-with-hint" style={{ flex: 1 }}>
              <input id="su-email" name="email" type="email" className="login-input" value={form.email} onChange={onChange} placeholder="개인이메일 주소" required style={{ minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
              <div className="login-help input-hint" style={{ color: fieldHints.email.color }}>{fieldHints.email.text}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-pos" style={{ width: "120px", marginBottom: 0 }}>직위</label>
            <div className="input-with-hint" style={{ flex: 1 }}>
              <input id="su-pos" name="position" type="text" className="login-input" value={form.position} onChange={onChange} placeholder="직위를 입력하세요" required style={{ minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
              <div className="login-help input-hint" style={{ color: fieldHints.position.color }}>{fieldHints.position.text}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-company" style={{ width: "120px", marginBottom: 0 }}>회사명</label>
            <div className="input-with-hint" style={{ flex: 1 }}>
              <input id="su-company" name="company" type="text" className="login-input" value={form.company} onChange={onChange} placeholder="회사명" required style={{ minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
              <div className="login-help input-hint" style={{ color: fieldHints.company.color }}>{fieldHints.company.text}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="login-button"
              style={{
                backgroundColor: "#6c757d",
                flex: 1
              }}
            >
              돌아가기
            </button>
            <button type="submit" className="login-button" style={{ flex: 1 }} disabled={loading || isSubmitting}>
              {loading ? "처리 중..." : "가입하기"}
            </button>
          </div>
        </form>
        {message && message !== "success" && <p className="login-help" style={{ color: "#b71c1c" }}>{message}</p>}

        {/* 자세한 폼 검증 기준 안내 */}
        <Modal
          isOpen={showCriteria && message !== "success"}
          onClose={() => setShowCriteria(false)}
          title="가입 입력 가이드"
          size="large"
        >
          <div className="text-95" style={{ color: "#333" }}>
            <p style={{ marginTop: 0 }}>
              아래 항목을 채워 주세요. 초록색은 충족, 빨간색은 보완이 필요해요.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px", alignItems: "start" }}>
              <div style={{ color: "#555" }}>아이디(이메일)</div>
              <div>
                {criteria.userId.map((c, i) => (
                  <div key={i} className="login-help" style={{ marginTop: 4, color: c.ok ? "#177245" : "#b71c1c" }}>• {c.label}</div>
                ))}
              </div>

              <div style={{ color: "#555" }}>비밀번호</div>
              <div>
                {criteria.password.map((c, i) => (
                  <div key={i} className="login-help" style={{ marginTop: 4, color: c.ok ? "#177245" : "#b71c1c" }}>• {c.label}</div>
                ))}
              </div>

              <div style={{ color: "#555" }}>비밀번호 확인</div>
              <div>
                {criteria.confirm.map((c, i) => (
                  <div key={i} className="login-help" style={{ marginTop: 4, color: c.ok ? "#177245" : "#b71c1c" }}>• {c.label}</div>
                ))}
              </div>

              <div style={{ color: "#555" }}>이름</div>
              <div>
                {criteria.name.map((c, i) => (
                  <div key={i} className="login-help" style={{ marginTop: 4, color: c.ok ? "#177245" : "#b71c1c" }}>• {c.label}</div>
                ))}
              </div>

              <div style={{ color: "#555" }}>전화번호</div>
              <div>
                {criteria.phone.map((c, i) => (
                  <div key={i} className="login-help" style={{ marginTop: 4, color: c.ok ? "#177245" : "#b71c1c" }}>• {c.label}</div>
                ))}
              </div>

              <div style={{ color: "#555" }}>개인이메일</div>
              <div>
                {criteria.email.map((c, i) => (
                  <div key={i} className="login-help" style={{ marginTop: 4, color: c.ok ? "#177245" : "#b71c1c" }}>• {c.label}</div>
                ))}
              </div>

              <div style={{ color: "#555" }}>직위</div>
              <div>
                {criteria.position.map((c, i) => (
                  <div key={i} className="login-help" style={{ marginTop: 4, color: c.ok ? "#177245" : "#b71c1c" }}>• {c.label}</div>
                ))}
              </div>

              <div style={{ color: "#555" }}>회사명</div>
              <div>
                {criteria.company.map((c, i) => (
                  <div key={i} className="login-help" style={{ marginTop: 4, color: c.ok ? "#177245" : "#b71c1c" }}>• {c.label}</div>
                ))}
              </div>
            </div>
          </div>
        </Modal>

        {message === "success" && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "10px",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              maxWidth: "400px",
              width: "90%"
            }}>
              <h2 style={{ marginBottom: "20px", color: "#177245" }}>가입이 완료되었습니다.</h2>
              <p style={{ margin: 0, color: "#333", fontSize: "14px" }}>
                로그인 후 설정 화면에서 사업자등록증과 로고를 업로드해 주세요.
              </p>
              <button
                onClick={() => navigate("/")}
                className="login-button"
                style={{ marginTop: "20px", width: "100%" }}
              >
                로그인 하러 가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
