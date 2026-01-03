import React, { useEffect, useMemo, useState } from "react";
import { createSupportTicket } from "../../api";
import { emitToast } from "../../utils/toast";
import { digitsOnly, formatPhone11 } from "../../utils/formatters";
import "../../pages/SupportCenter.css";

const EMPTY_FORM = {
  category: "usage",
  subject: "",
  message: "",
  replyEmail: "",
  replyPhone: "",
};

const ErrorIcon = () => (
  <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);

const ErrorIconSmall = () => (
  <svg style={{ width: 12, height: 12 }} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const DropdownArrow = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L5 5L9 1" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default function SupportRequestForm({
  companyName,
  companyId,
  requesterName,
  requesterId,
  requesterPosition,
  initialEmail,
  initialPhone,
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    replyEmail: initialEmail || "",
    replyPhone: initialPhone || "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitDetails, setSubmitDetails] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const formId = "support-request-form";

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      replyEmail: prev.replyEmail || initialEmail || "",
      replyPhone: prev.replyPhone || initialPhone || "",
    }));
  }, [initialEmail, initialPhone]);

  const categoryOptions = useMemo(
    () => [
      { value: "usage", label: "서비스 이용 문의" },
      { value: "bug", label: "장애 / 오류 신고" },
      { value: "billing", label: "결제 / 정산 문의" },
      { value: "account", label: "계정 / 권한 관련" },
      { value: "other", label: "기타" },
    ],
    []
  );

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhone11(value);
    updateField("replyPhone", formatted);
  };

  const validateForm = () => {
    const errors = {};
    const trimmed = (v) => (typeof v === "string" ? v.trim() : "");

    if (!trimmed(form.category)) {
      errors.category = "문의 유형을 선택해주세요.";
    }
    if (!trimmed(form.subject)) {
      errors.subject = "제목을 입력해주세요.";
    }
    if (!trimmed(form.message)) {
      errors.message = "문의 내용을 입력해주세요.";
    }
    const email = trimmed(form.replyEmail);
    if (!email) {
      errors.replyEmail = "회신 이메일을 입력해주세요.";
    } else if (!validateEmail(email)) {
      errors.replyEmail = "올바른 이메일 형식을 입력해주세요.";
    }

    const phoneDigits = digitsOnly(form.replyPhone);
    if (trimmed(form.replyPhone) && phoneDigits.length < 8) {
      errors.replyPhone = "연락처 형식이 올바르지 않습니다.";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitError("");
    setSubmitDetails([]);
    setSubmitting(true);

    const trimmedSubject = String(form.subject || "").trim();
    const trimmedMessage = String(form.message || "").trim();
    const trimmedEmail = String(form.replyEmail || "").trim();
    const phoneFormatted = form.replyPhone ? formatPhone11(form.replyPhone) : "";

    const payload = {
      category: form.category,
      subject: trimmedSubject,
      message: trimmedMessage,
      replyEmail: trimmedEmail,
      replyPhone: phoneFormatted,
      companyName: companyName || "",
      companyId: companyId || "",
      requesterName: requesterName || "",
      requesterId: requesterId || trimmedEmail,
      requesterPosition: requesterPosition || "",
      reply_email: trimmedEmail,
      reply_phone: phoneFormatted,
      company_name: companyName || "",
      company_id: companyId || "",
      requester_name: requesterName || "",
      requester_id: requesterId || trimmedEmail,
      requester_position: requesterPosition || "",
    };

    let result;
    try {
      result = await createSupportTicket(payload);
    } catch (err) {
      setSubmitError(err?.message || "문의 접수에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    if (result?.ok) {
      emitToast("문의가 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.", "success", 3200);
      setForm({
        ...EMPTY_FORM,
        replyEmail: initialEmail || "",
        replyPhone: initialPhone || "",
      });
      setSubmitting(false);
      return;
    }

    const err = result?.error || {};
    const details = Array.isArray(err.details) ? err.details.slice() : [];
    if ((err.type === "EMAIL_NOT_CONFIGURED" || err.type === "EMAIL_FAILED") && details.length === 0) {
      details.push("메일 발송 설정에 문제가 있는 것 같습니다. 담당자에게 직접 연락해 주세요.");
    } else if ((err.status === 502 || err.status === 503) && details.length === 0) {
      details.push("메일 발송 서버에 일시적인 장애가 있는 것 같습니다. 잠시 후 다시 시도해 주세요.");
    }

    setSubmitError(err.message || "문의 접수에 실패했습니다.");
    setSubmitDetails(details);
    setSubmitting(false);
  };

  return (
    <div>
      {/* 문의하기 타이틀 */}
      <div className="support-section-header">
        <h2 className="support-section-title">문의하기</h2>
      </div>

      {/* 에러 메시지 */}
      {submitError && (
        <div className="support-error-box">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: '#fee2e2',
                color: '#dc2626',
                flexShrink: 0,
              }}
            >
              <ErrorIcon />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#991b1b', fontSize: 14, margin: 0 }}>문의 접수에 실패했습니다</p>
              <p style={{ fontSize: 14, color: '#b91c1c', marginTop: 4, marginBottom: 0 }}>{submitError}</p>
              {submitDetails.length > 0 && (
                <ul style={{ listStyle: 'disc', paddingLeft: 16, marginTop: 8, marginBottom: 0 }}>
                  {submitDetails.map((msg, idx) => (
                    <li key={idx} style={{ fontSize: 12, color: '#dc2626' }}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 보내는 사람 섹션 */}
      <div className="support-sender-section">
        <h3 className="support-sender-title">보내는 사람</h3>
        <div className="support-sender-grid">
          {/* 이름 */}
          <div className="support-sender-field">
            <label className="support-sender-label">이름</label>
            <div className="support-sender-input">{requesterName || "-"}</div>
          </div>
          {/* 이메일 */}
          <div className="support-sender-field">
            <label className="support-sender-label">이메일</label>
            <div className="support-sender-input">{initialEmail || "-"}</div>
          </div>
          {/* 회사명 */}
          <div className="support-sender-field">
            <label className="support-sender-label">회사명</label>
            <div className="support-sender-input">{companyName || "-"}</div>
          </div>
          {/* 직책 */}
          <div className="support-sender-field">
            <label className="support-sender-label">직책</label>
            <div className="support-sender-input">{requesterPosition || "-"}</div>
          </div>
        </div>
      </div>

      {/* 구분선 */}
      <div className="support-divider" />

      {/* 문의 양식 */}
      <form id={formId} onSubmit={handleSubmit}>
        {/* 문의 유형 */}
        <div className="support-form-row-inline">
          <label className="support-form-label-side" htmlFor="support-category">
            문의 유형
          </label>
          <div className="support-select-wrapper">
            <select
              id="support-category"
              className="support-form-select"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 메일 제목 */}
        <div className="support-form-row-inline">
          <label className="support-form-label-side" htmlFor="support-subject">
            메일 제목
          </label>
          <input
            id="support-subject"
            className="support-form-input-wide"
            type="text"
            value={form.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            placeholder="제목을 입력하세요"
            required
          />
        </div>
        {fieldErrors.subject && (
          <div className="support-field-error" style={{ marginLeft: 70 }}>
            <ErrorIconSmall />
            {fieldErrors.subject}
          </div>
        )}

        {/* 내용 */}
        <div className="support-form-row-inline" style={{ alignItems: 'flex-start' }}>
          <label className="support-form-label-side" style={{ paddingTop: 10 }} htmlFor="support-message">
            내용
          </label>
          <div className="support-content-wrapper">
            <div className="support-content-box support-content-box--info">
              <span className="support-content-text">
                서비스 이용, 장애 신고, 결제·정산, 계정·권한 등 운영 관련 문의를 남겨주시면 담당자가 답변을 드립니다.
              </span>
              <br />
              <span className="support-content-text">
                문제가 발생한 화면, 상황, 발생 시간 등을 최대한 자세히 적어주세요.
              </span>
              <br />
              <span className="support-content-warning">
                주민번호나 계좌번호 등 민감한 정보는 입력하지 마세요.
              </span>
            </div>
            <textarea
              id="support-message"
              className="support-form-textarea"
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              placeholder="문의 내용을 입력하세요"
              rows={6}
              required
            />
            {fieldErrors.message && (
              <div className="support-field-error">
                <ErrorIconSmall />
                {fieldErrors.message}
              </div>
            )}
          </div>
        </div>

        {/* 회신 받을 이메일 + 연락처 */}
        <div className="support-reply-row">
          <div className="support-reply-field">
            <label className="support-reply-label" htmlFor="support-reply-email">
              회신 받을 이메일
            </label>
            <input
              id="support-reply-email"
              className="support-reply-input"
              type="email"
              value={form.replyEmail}
              onChange={(e) => updateField("replyEmail", e.target.value)}
              placeholder="abcd@efff.com"
              required
            />
            {fieldErrors.replyEmail && (
              <div className="support-field-error">
                <ErrorIconSmall />
                {fieldErrors.replyEmail}
              </div>
            )}
          </div>
          <div className="support-reply-field">
            <label className="support-reply-label" htmlFor="support-reply-phone">
              연락처 (선택)
            </label>
            <input
              id="support-reply-phone"
              className="support-reply-input"
              type="text"
              value={form.replyPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="010-1234-5678"
            />
          </div>
        </div>

        {/* 하단 구분선 + 버튼 */}
        <div className="support-form-footer">
          <div className="support-footer-line" />
          <button
            type="submit"
            form={formId}
            disabled={submitting}
            className="support-submit-btn"
          >
            {submitting ? (
              <>
                <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>전송 중...</span>
              </>
            ) : (
              <span>문의 접수</span>
            )}
          </button>
        </div>
      </form>

      {/* 스핀 애니메이션 CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
