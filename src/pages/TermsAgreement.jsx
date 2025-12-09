import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { emitToast } from "../utils/toast";
import privacyMd from "../data/terms/privacy.md?raw";
import locationMd from "../data/terms/location.md?raw";
import marketingMd from "../data/terms/marketing.md?raw";
import Markdown from "../components/Markdown";

export default function TermsAgreement() {
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState({
    privacy: false,
    location: false,
    marketing: false
  });

  const handleAgreementChange = (type) => {
    setAgreements(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSelectAll = () => {
    const allChecked = agreements.privacy && agreements.location && agreements.marketing;
    setAgreements({
      privacy: !allChecked,
      location: !allChecked,
      marketing: !allChecked
    });
  };

  const handleNext = () => {
    if (!agreements.privacy || !agreements.location) {
      emitToast("필수 약관에 동의해주세요.", "warning");
      return;
    }
    navigate("/signup");
  };

  const canProceed = agreements.privacy && agreements.location;
  const allChecked = agreements.privacy && agreements.location && agreements.marketing;

  return (
    <div className="terms-page">
      {/* Sidebar with steps */}
      <div className="terms-page__sidebar">
        <div className="terms-page__sidebar-header">
          <h1 className="terms-page__sidebar-title">회원가입</h1>
          <p className="terms-page__sidebar-subtitle">서비스 이용을 위한 약관에 동의해주세요</p>
        </div>

        <div className="terms-page__steps">
          <div className="terms-page__step terms-page__step--active">
            <div className="terms-page__step-number">1</div>
            <span className="terms-page__step-text">약관 동의</span>
          </div>
          <div className="terms-page__step">
            <div className="terms-page__step-number">2</div>
            <span className="terms-page__step-text">정보 입력</span>
          </div>
          <div className="terms-page__step">
            <div className="terms-page__step-number">3</div>
            <span className="terms-page__step-text">가입 완료</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="terms-page__content">
        <div className="terms-card">
          <div className="terms-card__header">
            <h2 className="terms-card__title">약관 동의</h2>
            <label className="terms-card__select-all">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={handleSelectAll}
              />
              <span>전체 동의</span>
            </label>
          </div>

          <div className="terms-card__list">
            {/* Privacy Policy */}
            <div className={`terms-item ${agreements.privacy ? 'terms-item--checked' : ''}`}>
              <div className="terms-item__header" onClick={() => handleAgreementChange("privacy")}>
                <input
                  type="checkbox"
                  className="terms-item__checkbox"
                  checked={agreements.privacy}
                  onChange={() => handleAgreementChange("privacy")}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="terms-item__label">개인정보 처리방침 동의</span>
                <span className="terms-item__badge terms-item__badge--required">필수</span>
              </div>
              <div className="terms-item__content">
                <Markdown content={privacyMd} className="markdown-body" />
              </div>
            </div>

            {/* Location Terms */}
            <div className={`terms-item ${agreements.location ? 'terms-item--checked' : ''}`}>
              <div className="terms-item__header" onClick={() => handleAgreementChange("location")}>
                <input
                  type="checkbox"
                  className="terms-item__checkbox"
                  checked={agreements.location}
                  onChange={() => handleAgreementChange("location")}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="terms-item__label">위치정보 이용약관 동의</span>
                <span className="terms-item__badge terms-item__badge--required">필수</span>
              </div>
              <div className="terms-item__content">
                <Markdown content={locationMd} className="markdown-body" />
              </div>
            </div>

            {/* Marketing Terms */}
            <div className={`terms-item ${agreements.marketing ? 'terms-item--checked' : ''}`}>
              <div className="terms-item__header" onClick={() => handleAgreementChange("marketing")}>
                <input
                  type="checkbox"
                  className="terms-item__checkbox"
                  checked={agreements.marketing}
                  onChange={() => handleAgreementChange("marketing")}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="terms-item__label">마케팅 정보 수신 동의</span>
                <span className="terms-item__badge terms-item__badge--optional">선택</span>
              </div>
              <div className="terms-item__content">
                <Markdown content={marketingMd} className="markdown-body" />
              </div>
            </div>
          </div>

          <div className="terms-card__footer">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="terms-card__btn terms-card__btn--secondary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              취소
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="terms-card__btn terms-card__btn--primary"
              disabled={!canProceed}
            >
              다음 단계
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
