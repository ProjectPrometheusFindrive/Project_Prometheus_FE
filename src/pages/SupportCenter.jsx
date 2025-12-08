import React, { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import SupportRequestForm from "../components/support/SupportRequestForm";
import "./SupportCenter.css";

// 아이콘 컴포넌트
const HeadsetIcon = () => (
  <svg style={{ width: 32, height: 32 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

const MailIcon = () => (
  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const ClockIcon = () => (
  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PhoneIcon = () => (
  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const ChevronDownIcon = ({ isOpen }) => (
  <svg
    style={{
      width: 16,
      height: 16,
      transition: 'transform 0.2s',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
    }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const QuestionIcon = () => (
  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

// FAQ 데이터
const FAQ_ITEMS = [
  {
    question: "문의 접수 후 답변은 얼마나 걸리나요?",
    answer: "일반적으로 영업일 기준 1~2일 이내에 답변을 드리고 있습니다. 긴급한 장애 건의 경우 우선 처리됩니다.",
  },
  {
    question: "장애나 오류가 발생했을 때 어떻게 신고하나요?",
    answer: "위 문의 양식에서 '장애 / 오류 신고'를 선택하신 후, 발생 시간, 화면, 오류 메시지 등을 최대한 자세히 기재해주시면 빠른 처리가 가능합니다.",
  },
  {
    question: "결제 관련 문의는 어떻게 하나요?",
    answer: "결제, 정산, 청구서 관련 문의는 '결제 / 정산 문의'를 선택하여 접수해주세요. 세금계산서 발행 관련 문의도 가능합니다.",
  },
  {
    question: "계정 권한 변경이나 담당자 변경은 어떻게 하나요?",
    answer: "'계정 / 권한 관련'을 선택하여 변경 요청을 접수해주세요. 보안상 본인 확인 절차가 필요할 수 있습니다.",
  },
];

// FAQ 아이템 컴포넌트
function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="support-faq-item">
      <button type="button" onClick={onToggle} className="support-faq-question">
        <span>{question}</span>
        <ChevronDownIcon isOpen={isOpen} />
      </button>
      <div
        style={{
          overflow: 'hidden',
          transition: 'max-height 0.2s ease-in-out, opacity 0.2s ease-in-out',
          maxHeight: isOpen ? 160 : 0,
          opacity: isOpen ? 1 : 0,
        }}
      >
        <p className="support-faq-answer">{answer}</p>
      </div>
    </div>
  );
}

function SupportCenter() {
  const auth = useAuth();
  const { companyInfo } = useCompany();
  const user = auth?.user;
  const [openFAQ, setOpenFAQ] = useState(null);

  const meta = useMemo(() => {
    const companyName = (companyInfo && companyInfo.name) || user?.company || "";
    const companyId = user?.companyId || companyInfo?.companyId || "";
    const requesterName = user?.name || user?.username || "";
    const requesterId = user?.userId || user?.email || "";
    const requesterPosition = user?.position || "";
    const initialEmail = user?.userId || user?.email || "";
    const initialPhone = user?.phone || "";

    return {
      companyName,
      companyId,
      requesterName,
      requesterId,
      requesterPosition,
      initialEmail,
      initialPhone,
    };
  }, [companyInfo, user]);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <div className="page page--data">
      <div className="page-scroll support-page">
        <div className="support-layout">
          {/* 좌측: 문의 양식 */}
          <div className="support-main">
            <section className="support-form-card">
              <div className="support-form-header">
                <h2>문의 남기기</h2>
                <p>서비스 이용, 장애 신고, 결제/정산, 계정/권한 등 운영 관련 문의를 남기면 담당자가 답변을 드립니다.</p>
              </div>
              <div className="support-form-body">
                <SupportRequestForm
                  companyName={meta.companyName}
                  companyId={meta.companyId}
                  requesterName={meta.requesterName}
                  requesterId={meta.requesterId}
                  requesterPosition={meta.requesterPosition}
                  initialEmail={meta.initialEmail}
                  initialPhone={meta.initialPhone}
                />
              </div>
            </section>
          </div>

          {/* 우측: 사이드바 */}
          <div className="support-sidebar">
            {/* 연락처 정보 카드 */}
            <section className="support-card">
              <h3>연락처 정보</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="support-contact-item">
                  <div className="support-contact-icon support-contact-icon--email">
                    <MailIcon />
                  </div>
                  <div>
                    <p className="support-contact-label">이메일</p>
                    <p className="support-contact-value">prometheus.rok@gmail.com</p>
                  </div>
                </div>
                <div className="support-contact-item">
                  <div className="support-contact-icon support-contact-icon--phone">
                    <PhoneIcon />
                  </div>
                  <div>
                    <p className="support-contact-label">전화</p>
                    <p className="support-contact-value">1588-0000</p>
                  </div>
                </div>
                <div className="support-contact-item">
                  <div className="support-contact-icon support-contact-icon--time">
                    <ClockIcon />
                  </div>
                  <div>
                    <p className="support-contact-label">운영 시간</p>
                    <p className="support-contact-value">평일 09:00 ~ 18:00</p>
                    <p className="support-contact-sub">주말/공휴일 휴무</p>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ 섹션 */}
            <section className="support-card">
              <div className="support-faq-header">
                <div className="support-faq-icon">
                  <QuestionIcon />
                </div>
                <h3 style={{ margin: 0 }}>자주 묻는 질문</h3>
              </div>
              <div>
                {FAQ_ITEMS.map((item, index) => (
                  <FAQItem
                    key={index}
                    question={item.question}
                    answer={item.answer}
                    isOpen={openFAQ === index}
                    onToggle={() => toggleFAQ(index)}
                  />
                ))}
              </div>
            </section>

            {/* 긴급 문의 안내 */}
            <section className="support-emergency">
              <div style={{ position: 'absolute', right: -24, top: -24, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', left: -16, bottom: -16, width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'relative', zIndex: 10 }}>
                <h3>긴급 장애 신고</h3>
                <p>
                  서비스 이용이 불가능한 긴급 상황 시<br />
                  아래 번호로 연락해주세요
                </p>
                <div className="support-emergency-phone">
                  <PhoneIcon />
                  <span style={{ fontWeight: 600 }}>1588-0000</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportCenter;
