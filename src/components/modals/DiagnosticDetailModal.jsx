import React, { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

/**
 * 심각도 숫자 변환
 */
const severityNumber = (val) => {
  if (typeof val === "number") return val;
  const parsed = parseFloat(val);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * 심각도 레벨 분류 (high: 7+, medium: 4-6, low: 0-3)
 */
const getSeverityLevel = (severity) => {
  const val = severityNumber(severity);
  if (val >= 7) return "high";
  if (val >= 4) return "medium";
  return "low";
};

/**
 * 차량 아이콘 SVG 컴포넌트
 */
const CarIcon = () => (
  <svg width="45" height="48" viewBox="0 0 45 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 차체 - 좌우 */}
    <path d="M11.691 10.01H23.462V38.614H5.375C3.308 38.614 3.078 37.184 3.078 36.04V26.028C3.078 24.426 4.609 22.691 5.375 22.024H2.217C-0.31 21.795 -0.654 18.305 1.068 18.305H4.514C5.662 18.305 5.949 20.212 5.949 21.165C6.332 19.831 7.27 16.417 7.959 13.442C8.648 10.468 10.734 9.915 11.691 10.01Z" fill="url(#car_left)"/>
    <path d="M33.223 10.01H21.452V38.614H39.539C41.606 38.614 41.836 37.184 41.836 36.04V26.028C41.836 24.426 40.305 22.691 39.539 22.024H42.697C45.224 21.795 45.568 18.305 43.846 18.305H40.4C39.252 18.305 38.965 20.212 38.965 21.165C38.582 19.831 37.644 16.417 36.955 13.442C36.266 10.468 34.18 9.915 33.223 10.01Z" fill="url(#car_right)"/>
    {/* 지붕 */}
    <path d="M4.319 10H15.547V20.015H0C0.384 18.489 1.324 14.864 2.015 12.575C2.447 11.145 2.879 10 4.319 10Z" fill="#2072BE"/>
    <path d="M25.624 10H14.396V20.015H29.943C29.559 18.489 28.618 14.864 27.927 12.575C27.495 11.145 27.064 10 25.624 10Z" fill="#2072BE"/>
    {/* 유리 */}
    <path d="M0 26.03H16.699L14.925 30C14.603 30.72 13.888 31.18 13.1 31.18H3.381C2.558 31.18 1.818 30.68 1.518 29.91L0 26.03Z" fill="#0978D1"/>
    {/* 바퀴 */}
    <rect x="0" y="34" width="7" height="6" rx="1" fill="url(#wheel_grad)"/>
    <rect x="31" y="34" width="7" height="6" rx="1" fill="url(#wheel_grad)"/>
    {/* 체크마크 배지 */}
    <circle cx="36" cy="30" r="10" fill="url(#badge_grad)"/>
    <path d="M31 30L34.5 33.5L41 27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="car_left" x1="12" y1="20" x2="12" y2="39" gradientUnits="userSpaceOnUse">
        <stop stopColor="#168DEB"/>
        <stop offset="1" stopColor="#006BC0"/>
      </linearGradient>
      <linearGradient id="car_right" x1="32" y1="20" x2="32" y2="39" gradientUnits="userSpaceOnUse">
        <stop stopColor="#168DEB"/>
        <stop offset="1" stopColor="#006BC0"/>
      </linearGradient>
      <linearGradient id="wheel_grad" x1="3.5" y1="34" x2="3.5" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#434343"/>
        <stop offset="1" stopColor="#000000"/>
      </linearGradient>
      <radialGradient id="badge_grad" cx="0" cy="0" r="1" gradientTransform="translate(36 30) scale(10)" gradientUnits="userSpaceOnUse">
        <stop offset="0.3" stopColor="#FAC027"/>
        <stop offset="1" stopColor="#FF7301"/>
      </radialGradient>
    </defs>
  </svg>
);

/**
 * 진단코드 상세 모달 컴포넌트
 * 디자인 Figma 기반 스타일 적용
 */
const DiagnosticDetailModal = ({
  isOpen,
  onClose,
  diagnosticDetail
}) => {
  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === "Escape") {
        try { onCloseRef.current && onCloseRef.current(); } catch {}
      }
    };
    document.addEventListener("keydown", onKey);

    setTimeout(() => {
      try { containerRef.current && containerRef.current.focus(); } catch {}
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      setTimeout(() => {
        try {
          if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
            previousActiveElementRef.current.focus();
          }
        } catch {}
      }, 0);
    };
  }, [isOpen]);

  if (!isOpen || !diagnosticDetail) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const { vehicleInfo, categoryName, count, issues = [] } = diagnosticDetail;

  return (
    <div
      className="diagnostic-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="진단 코드 상세 정보"
    >
      <div
        className="diagnostic-modal"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
        tabIndex={-1}
      >
        {/* 헤더 */}
        <div className="diagnostic-modal__header">
          <div className="diagnostic-modal__title-row">
            <h2 className="diagnostic-modal__title">진단코드상세</h2>
            <span className="diagnostic-modal__plate-badge">
              {vehicleInfo?.plate || ""}
            </span>
          </div>
          <button
            type="button"
            className="diagnostic-modal__close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* 차량 정보 박스 */}
        <div className="diagnostic-modal__vehicle-box">
          <div className="diagnostic-modal__vehicle-icon">
            <CarIcon />
          </div>
          <div className="diagnostic-modal__vehicle-info">
            <span className="diagnostic-modal__category-name">{categoryName || "전체진단"}</span>
            <span className="diagnostic-modal__vehicle-type">{vehicleInfo?.vehicleType || ""}</span>
          </div>
        </div>

        {/* 진단 코드 개수 */}
        <div className="diagnostic-modal__count-text">
          총 <span className="diagnostic-modal__count-highlight">{count || 0}개</span> 의 진단 코드가 발견되었습니다.
        </div>

        {/* 테이블 */}
        <div className="diagnostic-modal__table-wrapper">
          <div className="diagnostic-modal__table">
            {/* 테이블 헤더 */}
            <div className="diagnostic-modal__table-header">
              <div className="diagnostic-modal__th diagnostic-modal__th--code">코드</div>
              <div className="diagnostic-modal__th diagnostic-modal__th--desc">내용</div>
              <div className="diagnostic-modal__th diagnostic-modal__th--severity">심각도</div>
              <div className="diagnostic-modal__th diagnostic-modal__th--date">발생일</div>
            </div>

            {/* 테이블 바디 */}
            <div className="diagnostic-modal__table-body">
              {issues.length > 0 ? (
                issues.map((issue, idx) => {
                  const severityVal = severityNumber(issue.severity);
                  const severityLevel = getSeverityLevel(severityVal);
                  return (
                    <div
                      key={`${issue?.id ?? issue?.code ?? "issue"}-${idx}`}
                      className="diagnostic-modal__table-row"
                    >
                      <div className="diagnostic-modal__td diagnostic-modal__td--code">
                        {issue.code}
                      </div>
                      <div className="diagnostic-modal__td diagnostic-modal__td--desc">
                        {issue.description}
                      </div>
                      <div className="diagnostic-modal__td diagnostic-modal__td--severity">
                        <span className={`diagnostic-modal__severity-badge diagnostic-modal__severity-badge--${severityLevel}`}>
                          {severityVal.toFixed(1)}
                        </span>
                      </div>
                      <div className="diagnostic-modal__td diagnostic-modal__td--date">
                        {issue.detectedDate}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="diagnostic-modal__empty">
                  진단 코드가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="diagnostic-modal__footer">
          <button
            type="button"
            className="diagnostic-modal__footer-btn"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticDetailModal;
