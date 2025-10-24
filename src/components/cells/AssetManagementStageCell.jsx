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

  return (
    <span data-stage-dropdown className="inline-flex items-center gap-6 relative">
      <button
        type="button"
        className={`badge badge--clickable ${badgeClass}`}
        onClick={() => onToggleOpen(rowId)}
        disabled={isSaving}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        aria-label={rowId ? `${rowId} 관리 단계 변경` : "관리 단계 변경"}
      >
        <span>{label}</span>
        <FaChevronDown size={10} aria-hidden="true" />
      </button>
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
              관리상태와 계약상태가 일치하지 않습니다.
              <br />사유: {reason}
            </div>
          </div>
        </span>
      )}
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
          {MANAGEMENT_STAGE_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => onSelect(option.value)}
                className="management-stage-dropdown__option"
                disabled={isSaving}
                role="option"
              >
                <span className={`badge management-stage-dropdown__badge ${MANAGEMENT_STAGE_BADGE_CLASS[option.value] || "badge--default"}`}>{option.label}</span>
              </button>
            </li>
          ))}
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
