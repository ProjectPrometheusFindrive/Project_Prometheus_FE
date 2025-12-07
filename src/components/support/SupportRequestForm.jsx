import React, { useEffect, useMemo, useState } from "react";
import { createSupportTicket } from "../../api";
import { emitToast } from "../../utils/toast";
import { digitsOnly, formatPhone11 } from "../../utils/formatters";

const EMPTY_FORM = {
  category: "usage",
  subject: "",
  message: "",
  replyEmail: "",
  replyPhone: "",
};

// 아이콘 컴포넌트
const UserIcon = () => (
  <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const BuildingIcon = () => (
  <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const MailIcon = () => (
  <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
  </svg>
);

const SendIcon = () => (
  <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const WarningIcon = () => (
  <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

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

  const infoCardStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'white',
    border: '1px solid #f3f4f6',
  };

  const infoLabelStyle = {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  };

  const infoValueStyle = {
    fontSize: 14,
    fontWeight: 500,
    color: '#111827',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const errorMsgStyle = {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 에러 메시지 */}
      {submitError && (
        <div
          style={{
            borderRadius: 12,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            padding: 16,
          }}
        >
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

      {/* 보내는 사람 정보 카드 */}
      <div
        style={{
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              width: 24,
              height: 24,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: '#e5e7eb',
              color: '#4b5563',
            }}
          >
            <UserIcon />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>보내는 사람</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={infoCardStyle}>
            <span style={{ color: '#6b7280' }}><UserIcon /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={infoLabelStyle}>이름</p>
              <p style={infoValueStyle}>{requesterName || "-"}</p>
            </div>
          </div>
          <div style={infoCardStyle}>
            <span style={{ color: '#6b7280' }}><MailIcon /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={infoLabelStyle}>이메일</p>
              <p style={infoValueStyle}>{initialEmail || "-"}</p>
            </div>
          </div>
          <div style={infoCardStyle}>
            <span style={{ color: '#6b7280' }}><BuildingIcon /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={infoLabelStyle}>회사</p>
              <p style={infoValueStyle}>{companyName || "-"}</p>
            </div>
          </div>
          <div style={infoCardStyle}>
            <span style={{ color: '#6b7280' }}><BriefcaseIcon /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={infoLabelStyle}>직책</p>
              <p style={infoValueStyle}>{requesterPosition || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 문의 양식 */}
      <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 문의 유형 + 제목 - 한 줄 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap', minWidth: 60 }} htmlFor="support-category">
              문의 유형
            </label>
            <select
              id="support-category"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                background: 'white',
              }}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap', minWidth: 30 }} htmlFor="support-subject">
              제목
            </label>
            <input
              id="support-subject"
              type="text"
              value={form.subject}
              onChange={(e) => updateField("subject", e.target.value)}
              placeholder="예) 대시보드 접속 시 오류가 발생합니다"
              required
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        {/* 내용 */}
        <div>
          <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }} htmlFor="support-message">
            내용
          </label>
          <textarea
            id="support-message"
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
            placeholder="문제가 발생한 화면, 상황, 발생 시간 등을 최대한 자세히 적어주세요."
            rows={8}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 14,
              boxSizing: 'border-box',
              resize: 'vertical',
              height: 206,
            }}
          />
          {fieldErrors.message && (
            <div style={errorMsgStyle}>
              <ErrorIconSmall />
              {fieldErrors.message}
            </div>
          )}
        </div>

        {/* 회신 이메일 + 연락처 - 한 줄 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap', minWidth: 70 }} htmlFor="support-reply-email">
              회신 이메일
            </label>
            <input
              id="support-reply-email"
              type="email"
              value={form.replyEmail}
              onChange={(e) => updateField("replyEmail", e.target.value)}
              placeholder="name@company.com"
              required
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#555', whiteSpace: 'nowrap', minWidth: 70 }} htmlFor="support-reply-phone">
              연락처 (선택)
            </label>
            <input
              id="support-reply-phone"
              type="text"
              value={form.replyPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="010-1234-5678"
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>
        </div>
      </form>

      {/* 하단 액션 영역 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
          borderTop: '1px solid #f3f4f6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9ca3af' }}>
          <WarningIcon />
          <span>민감 정보(주민번호, 계좌번호 등)는 입력하지 마세요</span>
        </div>
        <button
          type="submit"
          form={formId}
          disabled={submitting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            background: submitting ? '#f3f4f6' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: submitting ? '#9ca3af' : 'white',
          }}
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
            <>
              <SendIcon />
              <span>문의 보내기</span>
            </>
          )}
        </button>
      </div>

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
