import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPhone11 } from "../utils/formatters";
import FilePreview from "../components/FilePreview";
import { signup, requestUploadSign } from "../api";
import { typedStorage } from "../utils/storage";
import { emitToast } from "../utils/toast";


export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userId: "",
    password: "",
    confirm: "",
    name: "",
    phone: "010-",
    email: "",
    position: "",
    company: "",
  });
  const [bizCert, setBizCert] = useState(null); // File object (not persisted)
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);


  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePhone(phone) {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  }

  function handlePhoneChange(e) {
    const value = e.target.value;
    // Prevent deletion of "010-" prefix
    if (value.length < 4) {
      setForm((p) => ({ ...p, phone: "010-" }));
      return;
    }
    const formatted = formatPhone11(value);
    setForm((p) => ({ ...p, phone: formatted }));
  }

  function onFileChange(e) {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setBizCert(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    // Basic validations
    if (!form.userId) {
      setMessage("아이디(이메일)를 입력해주세요.");
      return;
    }
    if (!validateEmail(form.userId)) {
      setMessage("올바른 이메일 형식을 입력해주세요.");
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
    if (!form.name.trim()) {
      setMessage("이름을 입력해주세요.");
      return;
    }
    if (!form.phone || form.phone === "010-") {
      setMessage("전화번호를 입력해주세요.");
      return;
    }
    if (!validatePhone(form.phone)) {
      setMessage("전화번호는 010-xxxx-xxxx 형식으로 입력해주세요.");
      return;
    }
    if (!form.email) {
      setMessage("개인이메일을 입력해주세요.");
      return;
    }
    if (!validateEmail(form.email)) {
      setMessage("올바른 개인이메일 형식을 입력해주세요.");
      return;
    }
    if (!form.position) {
      setMessage("직위를 선택해주세요.");
      return;
    }
    // 사업자등록증은 로그인 후에도 업로드 가능하므로 여기서는 선택 사항으로 처리
    if (!form.company.trim()) {
      setMessage("소속회사를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      let bizCertUrl = "";
      if (bizCert) {
        try {
          // Try uploading certificate (may require auth in new backend policy)
          const uploadSignData = await requestUploadSign({
            fileName: bizCert.name,
            contentType: bizCert.type,
            folder: "business-certificates"
          });
          const uploadResponse = await fetch(uploadSignData.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': bizCert.type },
            body: bizCert
          });
          if (!uploadResponse.ok) throw new Error("파일 업로드에 실패했습니다.");
          bizCertUrl = uploadSignData.publicUrl || uploadSignData.fileUrl || "";
        } catch (e) {
          // Graceful fallback: proceed without file
          emitToast("서류 업로드는 로그인 후 설정 화면에서 완료해 주세요.", "info", 4000);
          bizCertUrl = "";
        }
      }

      // 2. Call signup API with optional uploaded file URL
      const userData = {
        userId: form.userId,
        password: form.password,
        name: form.name,
        phone: form.phone,
        email: form.email,
        position: form.position,
        company: form.company,
        ...(bizCertUrl ? { bizCertUrl } : {})
      };

      await signup(userData);
      // Flag for post-login banner to prompt document/logo upload
      try { typedStorage.flags.setNeedsCompanyDocs(true); } catch {}

      // Success
      setMessage("success");
    } catch (error) {
      console.error("회원가입 오류:", error);
      setMessage(error.message || "회원가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxHeight: "90vh", overflowY: "auto", padding: "20px", maxWidth: "100%", boxSizing: "border-box" }}>
        <h1 className="login-title">회원가입</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-id" style={{ width: "120px", marginBottom: 0 }}>아이디</label>
            <input id="su-id" name="userId" type="email" className="login-input" value={form.userId} onChange={onChange} placeholder="이메일 주소" required style={{ flex: 1, minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-pw" style={{ width: "120px", marginBottom: 0 }}>비밀번호</label>
            <input id="su-pw" name="password" type="password" className="login-input" value={form.password} onChange={onChange} placeholder="비밀번호" required style={{ flex: 1, minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-pw2" style={{ width: "120px", marginBottom: 0 }}>비밀번호 확인</label>
            <input id="su-pw2" name="confirm" type="password" className="login-input" value={form.confirm} onChange={onChange} placeholder="비밀번호 확인" required style={{ flex: 1, minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-name" style={{ width: "120px", marginBottom: 0 }}>이름</label>
            <input id="su-name" name="name" type="text" className="login-input" value={form.name} onChange={onChange} placeholder="이름" required style={{ flex: 1, minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-phone" style={{ width: "120px", marginBottom: 0 }}>전화번호</label>
            <input id="su-phone" name="phone" type="tel" className="login-input" value={form.phone} onChange={handlePhoneChange} placeholder="000-0000-0000" inputMode="numeric" maxLength={13} required style={{ flex: 1, minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-email" style={{ width: "120px", marginBottom: 0 }}>개인이메일</label>
            <input id="su-email" name="email" type="email" className="login-input" value={form.email} onChange={onChange} placeholder="개인이메일 주소" required style={{ flex: 1, minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-pos" style={{ width: "120px", marginBottom: 0 }}>직위</label>
            <input id="su-pos" name="position" type="text" className="login-input" value={form.position} onChange={onChange} placeholder="직위를 입력하세요" required style={{ flex: 1, minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-biz" style={{ width: "120px", marginBottom: 0 }}>사업자등록증</label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input id="su-biz" name="bizCert" type="file" accept="application/pdf,image/*" capture="environment" className="login-input" onChange={onFileChange} required style={{ width: "100%", fontSize: "14px", padding: "8px 12px", marginBottom: "8px" }} />
              <FilePreview file={bizCert} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
            <label className="login-label" htmlFor="su-company" style={{ width: "120px", marginBottom: 0 }}>회사명</label>
            <input id="su-company" name="company" type="text" className="login-input" value={form.company} onChange={onChange} placeholder="회사명" required style={{ flex: 1, minWidth: 0, fontSize: "14px", padding: "8px 12px" }} />
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
            <button type="submit" className="login-button" style={{ flex: 1 }} disabled={loading}>
              {loading ? "처리 중..." : "가입하기"}
            </button>
          </div>
        </form>
        {message && message !== "success" && <p className="login-help" style={{ color: "#b71c1c" }}>{message}</p>}

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
