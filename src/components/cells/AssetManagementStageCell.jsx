import React, { useEffect, useRef } from "react";
import { FaChevronDown, FaExclamationTriangle } from "react-icons/fa";
import { MANAGEMENT_STAGE_OPTIONS } from "../../constants/forms";

const MANAGEMENT_STAGE_BADGE_CLASS = {
  대여가능: "badge--available",
  대여중: "badge--rented",
  예약중: "badge--pending",
  "입고 대상": "badge--default",
  "수리/점검 중": "badge--maintenance",
  "수리/점검 완료": "badge--completed",
};

const MANAGEMENT_STAGE_STYLES = {
  "수리/점검 완료": {
    paddingLeft: '14px',
    paddingRight: '14px',
    paddingTop: '2px',
    paddingBottom: '2px',
    background: 'rgba(26.22, 129.17, 255, 0.05)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.05) solid',
    outlineOffset: '-1px',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '5px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#006CEC',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "대여중": {
    paddingLeft: '14px',
    paddingRight: '14px',
    paddingTop: '2px',
    paddingBottom: '2px',
    background: '#F1CFFF',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.05) solid',
    outlineOffset: '-1px',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '5px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#6C0099',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "대여가능": {
    paddingLeft: '14px',
    paddingRight: '14px',
    paddingTop: '2px',
    paddingBottom: '2px',
    background: 'rgba(0, 163.81, 26.33, 0.15)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.05) solid',
    outlineOffset: '-1px',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '5px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#2D6536',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "예약중": {
    paddingLeft: '14px',
    paddingRight: '14px',
    paddingTop: '2px',
    paddingBottom: '2px',
    background: 'rgba(232, 136, 0, 0.15)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.05) solid',
    outlineOffset: '-1px',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '5px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#E88800',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "수리/점검 중": {
    paddingLeft: '14px',
    paddingRight: '14px',
    paddingTop: '2px',
    paddingBottom: '2px',
    background: 'rgba(235, 74, 69, 0.15)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.05) solid',
    outlineOffset: '-1px',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '5px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#EB4A45',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  },
  "입고 대상": {
    paddingLeft: '14px',
    paddingRight: '14px',
    paddingTop: '2px',
    paddingBottom: '2px',
    background: 'rgba(0, 0, 0, 0.10)',
    borderRadius: '100px',
    outline: '1px rgba(0, 0, 0, 0.05) solid',
    outlineOffset: '-1px',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '5px',
    display: 'inline-flex',
    textAlign: 'center',
    color: '#1C1C1C',
    fontSize: '14px',
    fontFamily: 'Pretendard',
    fontWeight: 500,
    lineHeight: '24px',
    wordWrap: 'break-word',
    border: 'none',
    cursor: 'pointer'
  }
};

const AssetManagementStageCell = React.memo(function AssetManagementStageCell({
  rowId,
  label,
  isSaving,
  isOpen,
  stageDropdownUp,
  onToggleOpen,
  onSelect,
  inconsistent,
  reason,
  openInconsistencyId,
  setOpenInconsistencyId,
}) {
  const badgeClass = MANAGEMENT_STAGE_BADGE_CLASS[label] || "badge--default";
  const safeKey = String(rowId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const dropdownId = `management-stage-${safeKey}`;
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen && listRef.current) {
      // Focus first option when opening for keyboard navigation
      const firstBtn = listRef.current.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }
  }, [isOpen]);

  const buttonStyle = MANAGEMENT_STAGE_STYLES[label] || MANAGEMENT_STAGE_STYLES["입고 대상"];

  return (
    <span data-stage-dropdown className="inline-flex items-center gap-6 relative justify-end">
      {inconsistent && (
        <span
          className={`inconsistency-indicator ${openInconsistencyId === rowId ? "is-open" : ""}`}
          data-inconsistency-popover
          role="button"
          tabIndex={0}
          aria-label={`관리상태와 계약상태 불일치: ${reason}`}
          aria-expanded={openInconsistencyId === rowId}
          onClick={(e) => {
            e.stopPropagation();
            setOpenInconsistencyId((prev) => (prev === rowId ? null : rowId));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenInconsistencyId((prev) => (prev === rowId ? null : rowId));
            }
          }}
          title="관리상태와 계약상태 불일치"
        >
          <FaExclamationTriangle size={14} color="#f59e0b" aria-hidden="true" />
          <div className="inconsistency-popover" role="tooltip">
            <div className="inconsistency-popover__title">상태 불일치</div>
            <div className="inconsistency-popover__body">
              {reason}
            </div>
          </div>
        </span>
      )}
      <button
        type="button"
        className={`badge badge--clickable ${badgeClass} management-stage-badge`}
        onClick={() => onToggleOpen(rowId)}
        disabled={isSaving}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        aria-label={rowId ? `${rowId} 관리 단계 변경` : "관리 단계 변경"}
        style={buttonStyle}
      >
        <span>{label}</span>
        <svg
          width="7"
          height="4"
          viewBox="0 0 7 4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M0.5 0.5L3.5 3.5L6.5 0.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen && (
        <ul
          id={dropdownId}
          role="listbox"
          aria-label="관리단계 선택"
          className={`management-stage-dropdown${stageDropdownUp ? " is-up" : ""}`}
          ref={listRef}
          onKeyDown={(e) => {
            const current = document.activeElement;
            if (!listRef.current) return;
            const buttons = Array.from(listRef.current.querySelectorAll('button'));
            const idx = buttons.indexOf(current);
            if (e.key === 'Escape') {
              e.preventDefault();
              onToggleOpen(rowId);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = buttons[Math.min(buttons.length - 1, idx + 1)] || buttons[0];
              next && next.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const prev = buttons[Math.max(0, idx - 1)] || buttons[buttons.length - 1];
              prev && prev.focus();
            }
          }}
        >
          {MANAGEMENT_STAGE_OPTIONS.map((option) => {
            const optionStyle = MANAGEMENT_STAGE_STYLES[option.value] || MANAGEMENT_STAGE_STYLES["입고 대상"];
            const optionColor = optionStyle.color;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => onSelect(option.value)}
                  className="management-stage-dropdown__option"
                  disabled={isSaving}
                  role="option"
                  style={{ padding: '8px 12px', display: 'flex', justifyContent: 'flex-start', width: '100%' }}
                >
                  <span style={{ ...optionStyle, display: 'inline-flex' }}>
                    <span>{option.label}</span>
                    <svg
                      width="7"
                      height="4"
                      viewBox="0 0 7 4"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M0.5 0.5L3.5 3.5L6.5 0.5"
                        stroke={optionColor}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {isSaving && (
        <span className="badge badge--pending" aria-live="polite">
          저장 중...
        </span>
      )}
    </span>
  );
});

export default AssetManagementStageCell;
