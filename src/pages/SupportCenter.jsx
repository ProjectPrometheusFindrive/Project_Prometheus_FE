import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import SupportRequestForm from '../components/support/SupportRequestForm';
import './SupportCenter.css';

const ChevronDownIcon = ({ isOpen }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      transition: 'transform 0.2s',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    }}
  >
    <path
      d="M4 6L8 10L12 6"
      stroke="#888888"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// FAQ 데이터
const FAQ_ITEMS = [
  {
    question: '문의 접수 후 답변은 얼마나 걸리나요?',
    answer:
      '일반적으로 영업일 기준 1~2일 이내에 답변을 드리고 있습니다. 긴급한 장애 건의 경우 우선 처리됩니다.',
  },
  {
    question: '장애나 오류가 발생했을 때 어떻게 신고하나요?',
    answer:
      "위 문의 양식에서 '장애 / 오류 신고'를 선택하신 후, 발생 시간, 화면, 오류 메시지 등을 최대한 자세히 기재해주시면 빠른 처리가 가능합니다.",
  },
  {
    question: '결제 관련 문의는 어떻게 하나요?',
    answer:
      "결제, 정산, 청구서 관련 문의는 '결제 / 정산 문의'를 선택하여 접수해주세요. 세금계산서 발행 관련 문의도 가능합니다.",
  },
  {
    question: '계정 권한 변경이나 담당자 변경은 어떻게 하나요?',
    answer:
      "'계정 / 권한 관련'을 선택하여 변경 요청을 접수해주세요. 보안상 본인 확인 절차가 필요할 수 있습니다.",
  },
  {
    question: '문의 상태는 어디서 확인할 수 있나요?',
    answer:
      '접수된 문의는 담당자가 확인 후 등록된 이메일 또는 연락처로 진행 상황을 안내드립니다. 추가 정보가 필요하면 별도 연락을 드립니다.',
  },
  {
    question: '첨부파일은 어떤 형식과 용량까지 업로드할 수 있나요?',
    answer:
      '일반적인 이미지(PNG, JPG)와 PDF, Excel 파일을 지원하며, 단일 파일 기준 약 20MB 이하 업로드를 권장합니다. 대용량 자료가 필요하면 링크 형태로 남겨주세요.',
  },
  {
    question: '서비스 이용 가이드나 교육 자료를 받을 수 있나요?',
    answer:
      "도입/온보딩 자료가 필요하면 문의 유형을 '기타 문의'로 선택해 요청해주세요. 사용 가이드, 계정 설정 방법, 운영 베스트 프랙티스 등을 전달드립니다.",
  },
  {
    question: '데이터 정정이나 로그 확인을 요청하려면 어떻게 해야 하나요?',
    answer:
      '관련 화면 캡처와 원하는 기간, 대상(차량/계정)을 포함해 문의를 남겨주세요. 필요한 경우 추가 확인을 위해 담당자가 연락드립니다.',
  },
];

// FAQ 아이템 컴포넌트
function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="support-faq-item">
      <button
        type="button"
        onClick={onToggle}
        className="support-faq-question"
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <ChevronDownIcon isOpen={isOpen} />
      </button>
      <div
        className="support-faq-answer-wrapper"
        style={{
          maxHeight: isOpen ? 200 : 0,
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
  const [openFAQ, setOpenFAQ] = useState(0); // 첫 번째 항목 기본 열림

  const meta = useMemo(() => {
    const companyName = (companyInfo && companyInfo.name) || user?.company || '';
    const companyId = user?.companyId || companyInfo?.companyId || '';
    const requesterName = user?.name || user?.username || '';
    const requesterId = user?.userId || user?.email || '';
    const requesterPosition = user?.position || '';
    const initialEmail = user?.userId || user?.email || '';
    const initialPhone = user?.phone || '';

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
      <div className="page-scroll">
        <div className="support-page">
          {/* 페이지 타이틀 */}
          <h1 className="support-page-title">고객센터</h1>

          <div className="support-layout">
            {/* 좌측: 문의 양식 */}
            <div className="support-main">
              <section className="support-form-card">
                <SupportRequestForm
                  companyName={meta.companyName}
                  companyId={meta.companyId}
                  requesterName={meta.requesterName}
                  requesterId={meta.requesterId}
                  requesterPosition={meta.requesterPosition}
                  initialEmail={meta.initialEmail}
                  initialPhone={meta.initialPhone}
                />
              </section>
            </div>

            {/* 우측: FAQ */}
            <div className="support-sidebar">
              <section className="support-card support-card--faq">
                <div className="support-section-header">
                  <h3 className="support-section-title">자주 묻는 질문</h3>
                </div>
                <div className="support-faq-list">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupportCenter;
