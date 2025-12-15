import React, { useEffect, useMemo, useState, useRef } from "react";
import { FiX, FiCalendar, FiPlus, FiMinus } from "react-icons/fi";
import { submitTerminalRequest } from "../../api";
import { emitToast } from "../../utils/toast";
import { formatPhone11, digitsOnly } from "../../utils/formatters";
import { useCompany } from "../../contexts/CompanyContext";
import { useAuth } from "../../contexts/AuthContext";

const EMPTY_FORM = {
    companyName: "",
    managerName: "",
    managerPhone: "",
    expectedVehicleCount: 1,
    targetVehicle: "",
    preferredRegion: "",
    expectedStartDate: "",
    needsRestartBlock: false
};

function normalizeDefaults(defaults = {}, companyInfo, user) {
    const normalizeDateInputValue = (value) => {
        if (!value) return "";
        const str = String(value).trim();
        const isoLike = /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : "";
        if (isoLike) return isoLike;
        const dt = new Date(str);
        if (!isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, "0");
            const d = String(dt.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }
        return "";
    };
    const companyName = defaults.companyName || companyInfo?.name || "";
    const managerName = defaults.managerName || user?.name || user?.username || "";
    const managerPhone = defaults.managerPhone || user?.phone || user?.contactNumber || "";
    const expectedVehicleCount = defaults.expectedVehicleCount != null ? defaults.expectedVehicleCount : 1;
    const targetVehicle = defaults.targetVehicle || "";
    const preferredRegion = defaults.preferredRegion || "";
    const expectedStartDate = normalizeDateInputValue(defaults.expectedStartDate || "");
    const needsRestartBlock = defaults.needsRestartBlock != null ? Boolean(defaults.needsRestartBlock) : false;
    return {
        companyName,
        managerName,
        managerPhone,
        expectedVehicleCount: expectedVehicleCount === 0 ? 1 : expectedVehicleCount,
        targetVehicle,
        preferredRegion,
        expectedStartDate,
        needsRestartBlock
    };
}

export default function TerminalRequestModal({ isOpen, onClose, defaults }) {
    const { companyInfo } = useCompany();
    const auth = useAuth();
    const [form, setForm] = useState(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitError, setSubmitError] = useState("");
    const [submitDetails, setSubmitDetails] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const containerRef = useRef(null);
    const previousActiveElementRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const dateInputRef = useRef(null);

    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    const resolvedDefaults = useMemo(
        () => normalizeDefaults(defaults, companyInfo, auth?.user),
        [
            defaults,
            companyInfo?.name,
            auth?.user?.name,
            auth?.user?.username,
            auth?.user?.phone,
            auth?.user?.contactNumber
        ]
    );

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

        setForm({
            ...EMPTY_FORM,
            ...resolvedDefaults,
            managerPhone: resolvedDefaults.managerPhone ? formatPhone11(resolvedDefaults.managerPhone) : "",
            expectedVehicleCount: resolvedDefaults.expectedVehicleCount || 1,
            expectedStartDate: resolvedDefaults.expectedStartDate || "",
            needsRestartBlock: !!resolvedDefaults.needsRestartBlock
        });
        setFieldErrors({});
        setSubmitError("");
        setSubmitDetails([]);
        setSubmitting(false);

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
    }, [isOpen, resolvedDefaults]);

    const updateField = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCountChange = (delta) => {
        setForm((prev) => ({
            ...prev,
            expectedVehicleCount: Math.max(1, (prev.expectedVehicleCount || 1) + delta)
        }));
    };

    const validateForm = () => {
        const errors = {};
        const trimmed = (v) => (typeof v === "string" ? v.trim() : "");

        if (!trimmed(form.companyName)) errors.companyName = "회사명을 입력해 주세요.";
        if (!trimmed(form.managerName)) errors.managerName = "담당자명을 입력해 주세요.";

        const phoneDigits = digitsOnly(form.managerPhone);
        if (!phoneDigits) {
            errors.managerPhone = "담당자 연락처를 입력해 주세요.";
        } else if (phoneDigits.length < 8) {
            errors.managerPhone = "연락처를 8자리 이상 입력해 주세요.";
        }

        const countNum = typeof form.expectedVehicleCount === "number" ? form.expectedVehicleCount : Number(form.expectedVehicleCount);
        if (!Number.isInteger(countNum) || countNum <= 0) {
            errors.expectedVehicleCount = "신청 장착 대수를 숫자로 입력해 주세요.";
        }

        if (!trimmed(form.targetVehicle)) errors.targetVehicle = "차종/차량 유형을 입력해 주세요.";
        if (!trimmed(form.preferredRegion)) errors.preferredRegion = "신청 지역을 입력해 주세요.";
        if (!trimmed(form.expectedStartDate)) errors.expectedStartDate = "도입 예상 시기를 입력해 주세요.";

        return { errors, countNum };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { errors, countNum } = validateForm();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        setSubmitting(true);
        setSubmitError("");
        setSubmitDetails([]);

        const payload = {
            companyName: form.companyName.trim(),
            managerName: form.managerName.trim(),
            managerPhone: formatPhone11(form.managerPhone),
            expectedVehicleCount: countNum,
            targetVehicle: form.targetVehicle.trim(),
            preferredRegion: form.preferredRegion.trim(),
            expectedStartDate: form.expectedStartDate.trim(),
            needsRestartBlock: !!form.needsRestartBlock,
            company_name: form.companyName.trim(),
            manager_name: form.managerName.trim(),
            manager_phone: formatPhone11(form.managerPhone),
            expected_vehicle_count: countNum,
            target_vehicle: form.targetVehicle.trim(),
            preferred_region: form.preferredRegion.trim(),
            expected_start_date: form.expectedStartDate.trim(),
            needs_restart_block: !!form.needsRestartBlock
        };

        const result = await submitTerminalRequest(payload);
        if (result?.ok) {
            emitToast("단말 장착 신청이 접수되었습니다.", "success", 3200);
            if (onClose) onClose();
            setSubmitting(false);
            return;
        }

        const err = result?.error || {};
        const details = Array.isArray(err.details) ? err.details.slice() : [];
        if ((err.type === "EMAIL_NOT_CONFIGURED" || err.type === "EMAIL_FAILED") && details.length === 0) {
            details.push("메일 전송 설정을 확인해 주세요. 담당자에게 직접 문의가 필요할 수 있습니다.");
        } else if ((err.status === 502 || err.status === 503) && details.length === 0) {
            details.push("메일 발송이 지연되고 있습니다. 잠시 후 다시 시도하거나 관리자에게 연락해 주세요.");
        }

        setSubmitError(err.message || "단말 장착 신청에 실패했습니다.");
        setSubmitDetails(details);
        setSubmitting(false);
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return "0000. 00. 00";
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            return `${parts[0]}. ${parts[1]}. ${parts[2]}`;
        }
        return dateStr;
    };

    if (!isOpen) return null;

    return (
        <div
            className="terminal-modal-backdrop"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="단말 장착 신청"
        >
            <div
                className="terminal-modal"
                onClick={(e) => e.stopPropagation()}
                ref={containerRef}
                tabIndex={-1}
            >
                {/* 헤더 */}
                <div className="terminal-modal__header">
                    <h2 className="terminal-modal__title">단말장착신청</h2>
                    <button
                        type="button"
                        className="terminal-modal__close-btn"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* 폼 내용 */}
                <form onSubmit={handleSubmit} className="terminal-modal__content">
                    {submitError && (
                        <div className="terminal-modal__error">
                            <div className="terminal-modal__error-title">신청을 접수하지 못했습니다.</div>
                            <div className="terminal-modal__error-msg">{submitError}</div>
                            {submitDetails.length > 0 && (
                                <ul className="terminal-modal__error-list">
                                    {submitDetails.map((msg, idx) => (
                                        <li key={idx}>{msg}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* 회사명 */}
                    <div className="terminal-modal__field">
                        <label className="terminal-modal__label">회사명</label>
                        <div className="terminal-modal__input-wrap">
                            <input
                                type="text"
                                className={`terminal-modal__input ${fieldErrors.companyName ? 'terminal-modal__input--error' : ''}`}
                                value={form.companyName}
                                onChange={(e) => updateField("companyName", e.target.value)}
                                placeholder="한국모빌리티"
                            />
                        </div>
                        {fieldErrors.companyName && <div className="terminal-modal__field-error">{fieldErrors.companyName}</div>}
                    </div>

                    {/* 담당자명 */}
                    <div className="terminal-modal__field">
                        <label className="terminal-modal__label">담당자명</label>
                        <div className="terminal-modal__input-wrap">
                            <input
                                type="text"
                                className={`terminal-modal__input ${fieldErrors.managerName ? 'terminal-modal__input--error' : ''}`}
                                value={form.managerName}
                                onChange={(e) => updateField("managerName", e.target.value)}
                                placeholder=""
                            />
                        </div>
                        {fieldErrors.managerName && <div className="terminal-modal__field-error">{fieldErrors.managerName}</div>}
                    </div>

                    {/* 담당자 연락처 */}
                    <div className="terminal-modal__field">
                        <label className="terminal-modal__label">담당자 연락처</label>
                        <div className="terminal-modal__input-wrap">
                            <input
                                type="text"
                                className={`terminal-modal__input ${fieldErrors.managerPhone ? 'terminal-modal__input--error' : ''}`}
                                value={form.managerPhone}
                                onChange={(e) => updateField("managerPhone", formatPhone11(e.target.value))}
                                placeholder=""
                            />
                        </div>
                        {fieldErrors.managerPhone && <div className="terminal-modal__field-error">{fieldErrors.managerPhone}</div>}
                    </div>

                    {/* 신청 장착 대수 */}
                    <div className="terminal-modal__field">
                        <label className="terminal-modal__label">신청 장착 대수</label>
                        <div className="terminal-modal__input-wrap terminal-modal__input-wrap--counter">
                            <input
                                type="number"
                                className={`terminal-modal__input terminal-modal__input--counter ${fieldErrors.expectedVehicleCount ? 'terminal-modal__input--error' : ''}`}
                                value={form.expectedVehicleCount}
                                onChange={(e) => updateField("expectedVehicleCount", Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                            />
                            <div className="terminal-modal__counter-btns">
                                <button
                                    type="button"
                                    className="terminal-modal__counter-btn terminal-modal__counter-btn--minus"
                                    onClick={() => handleCountChange(-1)}
                                    disabled={form.expectedVehicleCount <= 1}
                                >
                                    <FiMinus size={12} />
                                </button>
                                <button
                                    type="button"
                                    className="terminal-modal__counter-btn terminal-modal__counter-btn--plus"
                                    onClick={() => handleCountChange(1)}
                                >
                                    <FiPlus size={12} />
                                </button>
                            </div>
                        </div>
                        {fieldErrors.expectedVehicleCount && <div className="terminal-modal__field-error">{fieldErrors.expectedVehicleCount}</div>}
                    </div>

                    {/* 차종/대상차량 */}
                    <div className="terminal-modal__field">
                        <label className="terminal-modal__label">차종/대상차량</label>
                        <div className="terminal-modal__input-wrap">
                            <input
                                type="text"
                                className={`terminal-modal__input ${fieldErrors.targetVehicle ? 'terminal-modal__input--error' : ''}`}
                                value={form.targetVehicle}
                                onChange={(e) => updateField("targetVehicle", e.target.value)}
                                placeholder=""
                            />
                        </div>
                        {fieldErrors.targetVehicle && <div className="terminal-modal__field-error">{fieldErrors.targetVehicle}</div>}
                    </div>

                    {/* 신청지역 */}
                    <div className="terminal-modal__field">
                        <label className="terminal-modal__label">신청지역</label>
                        <div className="terminal-modal__input-wrap">
                            <input
                                type="text"
                                className={`terminal-modal__input ${fieldErrors.preferredRegion ? 'terminal-modal__input--error' : ''}`}
                                value={form.preferredRegion}
                                onChange={(e) => updateField("preferredRegion", e.target.value)}
                                placeholder=""
                            />
                        </div>
                        {fieldErrors.preferredRegion && <div className="terminal-modal__field-error">{fieldErrors.preferredRegion}</div>}
                    </div>

                    {/* 도입예정시기 */}
                    <div className="terminal-modal__field">
                        <label className="terminal-modal__label">도입예정시기</label>
                        <div className="terminal-modal__input-wrap terminal-modal__input-wrap--date">
                            <input
                                ref={dateInputRef}
                                type="date"
                                className={`terminal-modal__input terminal-modal__input--date-hidden ${fieldErrors.expectedStartDate ? 'terminal-modal__input--error' : ''}`}
                                value={form.expectedStartDate}
                                onChange={(e) => updateField("expectedStartDate", e.target.value)}
                            />
                            <div
                                className="terminal-modal__date-display"
                                onClick={() => dateInputRef.current?.showPicker?.()}
                            >
                                <span>{formatDisplayDate(form.expectedStartDate)}</span>
                                <FiCalendar size={18} className="terminal-modal__calendar-icon" />
                            </div>
                        </div>
                        {fieldErrors.expectedStartDate && <div className="terminal-modal__field-error">{fieldErrors.expectedStartDate}</div>}
                    </div>

                    {/* 시동차단 필요 여부 */}
                    <div className="terminal-modal__field terminal-modal__field--radio">
                        <label className="terminal-modal__label">시동차단 필요 여부</label>
                        <div className="terminal-modal__radio-group">
                            <label className="terminal-modal__radio">
                                <input
                                    type="radio"
                                    name="needsRestartBlock"
                                    checked={form.needsRestartBlock === true}
                                    onChange={() => updateField("needsRestartBlock", true)}
                                />
                                <span className="terminal-modal__radio-custom"></span>
                                <span className="terminal-modal__radio-label">필요</span>
                            </label>
                            <label className="terminal-modal__radio">
                                <input
                                    type="radio"
                                    name="needsRestartBlock"
                                    checked={form.needsRestartBlock === false}
                                    onChange={() => updateField("needsRestartBlock", false)}
                                />
                                <span className="terminal-modal__radio-custom"></span>
                                <span className="terminal-modal__radio-label">불필요</span>
                            </label>
                        </div>
                    </div>
                </form>

                {/* 푸터 */}
                <div className="terminal-modal__footer">
                    <p className="terminal-modal__footer-notice">제출 후 메일로 접수 알림을 받게 됩니다.</p>
                    <div className="terminal-modal__footer-btns">
                        <button
                            type="button"
                            className="terminal-modal__btn terminal-modal__btn--cancel"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="terminal-modal__btn terminal-modal__btn--submit"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? "신청 중..." : "신청하기"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
