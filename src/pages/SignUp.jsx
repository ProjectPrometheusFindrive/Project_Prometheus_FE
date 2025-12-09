import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatPhone11 } from "../utils/formatters";
import { signup } from "../api";
import { typedStorage } from "../utils/storage";
import useFormState from "../hooks/useFormState";
import { ROLES } from "../constants/auth";

export default function SignUp() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  const {
    form,
    errors,
    touched,
    updateField,
    handleSubmit: handleValidatedSubmit,
    isSubmitting,
    setForm,
  } = useFormState({
    userId: "",
    password: "",
    confirm: "",
    name: "",
    phone: "010-",
    email: "",
    position: "",
    company: "",
    bizRegNo: "",
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

      if (!v.position) out.position = "직위를 선택해주세요.";
      if (!String(v.company || "").trim()) out.company = "소속회사를 입력해주세요.";

      const digits = String(v.bizRegNo || "").replace(/\D/g, "");
      if (!digits) out.bizRegNo = "사업자등록번호를 입력해주세요.";
      else if (digits.length !== 10) out.bizRegNo = "숫자 10자리로 입력해주세요.";
      return out;
    }
  });

  function onChange(e) {
    const { name, value } = e.target;
    updateField(name, value);
  }

  function handlePhoneChange(e) {
    const value = e.target.value;
    if (value.length < 4) {
      setForm((p) => ({ ...p, phone: "010-" }));
      return;
    }
    const formatted = formatPhone11(value);
    updateField("phone", formatted);
  }

  function formatBizRegNo(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  function handleBizRegNoChange(e) {
    const formatted = formatBizRegNo(e.target.value);
    updateField("bizRegNo", formatted);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const ok = await handleValidatedSubmit();
    if (!ok) {
      setMessage("입력 정보를 다시 확인해주세요.");
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
        company: form.company,
        bizRegNo: form.bizRegNo,
        role: form.position === "대표" ? ROLES.ADMIN : ROLES.MEMBER,
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

  // Calculate progress
  const filledFields = useMemo(() => {
    let count = 0;
    if (validateEmail(form.userId)) count++;
    if (validatePassword(form.password)) count++;
    if (form.confirm && form.password === form.confirm) count++;
    if ((form.name || "").trim()) count++;
    if (validatePhone(form.phone)) count++;
    if (validateEmail(form.email)) count++;
    if (form.position) count++;
    if ((form.company || "").trim()) count++;
    if (String(form.bizRegNo || "").replace(/\D/g, "").length === 10) count++;
    return count;
  }, [form]);

  const progress = Math.round((filledFields / 9) * 100);

  // Field hints
  const getFieldStatus = (fieldName) => {
    const value = form[fieldName];

    switch (fieldName) {
      case 'userId':
        if (!value) return { status: 'default', text: '이메일 형식으로 입력해주세요' };
        if (validateEmail(value)) return { status: 'success', text: '올바른 형식입니다' };
        return { status: 'error', text: '올바른 이메일 형식을 입력해주세요' };

      case 'password':
        if (!value) return { status: 'default', text: '8자 이상, 영문과 숫자 포함' };
        if (validatePassword(value)) return { status: 'success', text: '안전한 비밀번호입니다' };
        return { status: 'error', text: '8자 이상, 영문과 숫자를 포함해주세요' };

      case 'confirm':
        if (!value) return { status: 'default', text: '비밀번호를 다시 입력해주세요' };
        if (form.password === value) return { status: 'success', text: '비밀번호가 일치합니다' };
        return { status: 'error', text: '비밀번호가 일치하지 않습니다' };

      case 'name':
        if (!(value || "").trim()) return { status: 'default', text: '실명을 입력해주세요' };
        return { status: 'success', text: '확인되었습니다' };

      case 'phone':
        if (!value || value === "010-") return { status: 'default', text: '010-0000-0000 형식' };
        if (validatePhone(value)) return { status: 'success', text: '올바른 형식입니다' };
        return { status: 'error', text: '010-0000-0000 형식으로 입력해주세요' };

      case 'email':
        if (!value) return { status: 'default', text: '개인 연락용 이메일' };
        if (validateEmail(value)) return { status: 'success', text: '올바른 형식입니다' };
        return { status: 'error', text: '올바른 이메일 형식을 입력해주세요' };

      case 'position':
        if (!value) return { status: 'default', text: '직위를 선택해주세요' };
        return { status: 'success', text: '확인되었습니다' };

      case 'company':
        if (!(value || "").trim()) return { status: 'default', text: '소속 회사명' };
        return { status: 'success', text: '확인되었습니다' };

      case 'bizRegNo':
        const digits = String(value || "").replace(/\D/g, "");
        if (!digits) return { status: 'default', text: '숫자 10자리 (하이픈 자동 입력)' };
        if (digits.length === 10) return { status: 'success', text: '확인되었습니다' };
        return { status: 'error', text: `${digits.length}/10자리 입력됨` };

      default:
        return { status: 'default', text: '' };
    }
  };

  const getInputClassName = (fieldName) => {
    const { status } = getFieldStatus(fieldName);
    let base = 'signup-form__input';
    if (status === 'success') base += ' signup-form__input--success';
    if (status === 'error' && touched[fieldName]) base += ' signup-form__input--error';
    return base;
  };

  return (
    <div className="signup-page">
      {/* Sidebar */}
      <div className="signup-page__sidebar">
        <div className="terms-page__sidebar-header">
          <h1 className="terms-page__sidebar-title">회원가입</h1>
          <p className="terms-page__sidebar-subtitle">기본 정보를 입력해주세요</p>
        </div>

        <div className="terms-page__steps">
          <div className="terms-page__step terms-page__step--completed">
            <div className="terms-page__step-number">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
            <span className="terms-page__step-text">약관 동의</span>
          </div>
          <div className="terms-page__step terms-page__step--active">
            <div className="terms-page__step-number">2</div>
            <span className="terms-page__step-text">정보 입력</span>
          </div>
          <div className="terms-page__step">
            <div className="terms-page__step-number">3</div>
            <span className="terms-page__step-text">가입 완료</span>
          </div>
        </div>

        <div className="signup-page__progress">
          <div className="signup-page__progress-bar">
            <div
              className="signup-page__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="signup-page__progress-text">입력 진행률 {progress}%</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="signup-page__content">
        <div className="signup-card">
          <div className="signup-card__header">
            <h2 className="signup-card__title">기본 정보 입력</h2>
            <p className="signup-card__subtitle">모든 필수 항목을 입력해주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
            {/* User ID (Email) */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">아이디</label>
              <div className="signup-form__field">
                <input
                  type="email"
                  name="userId"
                  className={getInputClassName('userId')}
                  value={form.userId}
                  onChange={onChange}
                  placeholder="example@email.com"
                />
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('userId').status}`}>
                  {getFieldStatus('userId').text}
                </span>
              </div>
            </div>

            {/* Password */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">비밀번호</label>
              <div className="signup-form__field">
                <input
                  type="password"
                  name="password"
                  className={getInputClassName('password')}
                  value={form.password}
                  onChange={onChange}
                  placeholder="비밀번호"
                />
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('password').status}`}>
                  {getFieldStatus('password').text}
                </span>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">비밀번호 확인</label>
              <div className="signup-form__field">
                <input
                  type="password"
                  name="confirm"
                  className={getInputClassName('confirm')}
                  value={form.confirm}
                  onChange={onChange}
                  placeholder="비밀번호 확인"
                />
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('confirm').status}`}>
                  {getFieldStatus('confirm').text}
                </span>
              </div>
            </div>

            {/* Name */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">이름</label>
              <div className="signup-form__field">
                <input
                  type="text"
                  name="name"
                  className={getInputClassName('name')}
                  value={form.name}
                  onChange={onChange}
                  placeholder="홍길동"
                />
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('name').status}`}>
                  {getFieldStatus('name').text}
                </span>
              </div>
            </div>

            {/* Phone */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">전화번호</label>
              <div className="signup-form__field">
                <input
                  type="tel"
                  name="phone"
                  className={getInputClassName('phone')}
                  value={form.phone}
                  onChange={handlePhoneChange}
                  placeholder="010-0000-0000"
                  inputMode="numeric"
                  maxLength={13}
                />
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('phone').status}`}>
                  {getFieldStatus('phone').text}
                </span>
              </div>
            </div>

            {/* Personal Email */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">개인이메일</label>
              <div className="signup-form__field">
                <input
                  type="email"
                  name="email"
                  className={getInputClassName('email')}
                  value={form.email}
                  onChange={onChange}
                  placeholder="personal@email.com"
                />
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('email').status}`}>
                  {getFieldStatus('email').text}
                </span>
              </div>
            </div>

            {/* Position */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">직위</label>
              <div className="signup-form__field">
                <div className="signup-form__radio-group">
                  <label className="signup-form__radio">
                    <input
                      type="radio"
                      name="position"
                      value="대표"
                      checked={form.position === "대표"}
                      onChange={onChange}
                    />
                    <span>대표</span>
                  </label>
                  <label className="signup-form__radio">
                    <input
                      type="radio"
                      name="position"
                      value="직원"
                      checked={form.position === "직원"}
                      onChange={onChange}
                    />
                    <span>직원</span>
                  </label>
                </div>
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('position').status}`}>
                  {getFieldStatus('position').text}
                </span>
              </div>
            </div>

            {/* Company */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">회사명</label>
              <div className="signup-form__field">
                <input
                  type="text"
                  name="company"
                  className={getInputClassName('company')}
                  value={form.company}
                  onChange={onChange}
                  placeholder="회사명"
                />
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('company').status}`}>
                  {getFieldStatus('company').text}
                </span>
              </div>
            </div>

            {/* Business Registration Number */}
            <div className="signup-form__row">
              <label className="signup-form__label signup-form__label--required">사업자등록번호</label>
              <div className="signup-form__field">
                <input
                  type="text"
                  name="bizRegNo"
                  className={getInputClassName('bizRegNo')}
                  value={form.bizRegNo}
                  onChange={handleBizRegNoChange}
                  placeholder="123-45-67890"
                  inputMode="numeric"
                  maxLength={12}
                />
                <span className={`signup-form__hint signup-form__hint--${getFieldStatus('bizRegNo').status}`}>
                  {getFieldStatus('bizRegNo').text}
                </span>
              </div>
            </div>

            {message && message !== "success" && (
              <div className="auth-form__error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                </svg>
                <span>{message}</span>
              </div>
            )}

            <div className="signup-form__actions">
              <button
                type="button"
                onClick={() => navigate("/terms")}
                className="signup-form__btn signup-form__btn--secondary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                이전
              </button>
              <button
                type="submit"
                className="signup-form__btn signup-form__btn--primary"
                disabled={loading || isSubmitting}
              >
                {loading ? (
                  <>
                    <svg className="auth-form__spinner" width="20" height="20" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round"/>
                    </svg>
                    처리 중...
                  </>
                ) : (
                  <>
                    가입하기
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {message === "success" && (
        <div className="signup-success-modal">
          <div className="signup-success-modal__content">
            <div className="signup-success-modal__icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h3 className="signup-success-modal__title">가입이 완료되었습니다!</h3>
            <p className="signup-success-modal__text">
              로그인 후 설정 화면에서<br/>
              사업자등록증과 로고를 업로드해 주세요.
            </p>
            <button
              onClick={() => navigate("/")}
              className="signup-success-modal__btn"
            >
              로그인 하러 가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
