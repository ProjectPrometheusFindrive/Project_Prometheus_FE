import React, { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import { submitTerminalRequest } from "../../api";
import { emitToast } from "../../utils/toast";
import { formatPhone11, digitsOnly } from "../../utils/formatters";
import { useCompany } from "../../contexts/CompanyContext";
import { useAuth } from "../../contexts/AuthContext";
import "./TerminalRequestModal.css";

const EMPTY_FORM = {
    companyName: "",
    managerName: "",
    managerPhone: "",
    expectedVehicleCount: "",
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
    const expectedVehicleCount = defaults.expectedVehicleCount != null ? defaults.expectedVehicleCount : "";
    const targetVehicle = defaults.targetVehicle || "";
    const preferredRegion = defaults.preferredRegion || "";
    const expectedStartDate = normalizeDateInputValue(defaults.expectedStartDate || "");
    const needsRestartBlock = defaults.needsRestartBlock != null ? Boolean(defaults.needsRestartBlock) : false;
    return {
        companyName,
        managerName,
        managerPhone,
        expectedVehicleCount: expectedVehicleCount === 0 ? "" : expectedVehicleCount,
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

    const formId = "terminal-request-form";

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
        setForm({
            ...EMPTY_FORM,
            ...resolvedDefaults,
            managerPhone: resolvedDefaults.managerPhone ? formatPhone11(resolvedDefaults.managerPhone) : "",
            expectedVehicleCount: resolvedDefaults.expectedVehicleCount !== "" ? String(resolvedDefaults.expectedVehicleCount) : "1",
            expectedStartDate: resolvedDefaults.expectedStartDate || "",
            needsRestartBlock: !!resolvedDefaults.needsRestartBlock
        });
        setFieldErrors({});
        setSubmitError("");
        setSubmitDetails([]);
        setSubmitting(false);
    }, [isOpen, resolvedDefaults]);

    const updateField = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const incrementCount = () => {
        const current = parseInt(form.expectedVehicleCount) || 0;
        updateField("expectedVehicleCount", String(current + 1));
    };

    const decrementCount = () => {
        const current = parseInt(form.expectedVehicleCount) || 0;
        if (current > 1) {
            updateField("expectedVehicleCount", String(current - 1));
        }
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
            // snake_case mirrors for backends that accept either style
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

    const footerContent = (
        <div className="terminal-request-footer">
            <div className="terminal-request-footer__divider" />
            <p className="terminal-request-footer__notice">제출 후 메일로 접수 알림을 받게 됩니다.</p>
            <div className="terminal-request-footer__buttons">
                <button
                    type="button"
                    className="terminal-request-btn terminal-request-btn--cancel"
                    onClick={onClose}
                    disabled={submitting}
                >
                    취소
                </button>
                <button
                    type="submit"
                    form={formId}
                    className="terminal-request-btn terminal-request-btn--submit"
                    disabled={submitting}
                >
                    {submitting ? "신청 중..." : "신청하기"}
                </button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="단말장착신청"
            ariaLabel="단말장착신청"
            showFooter={true}
            footerContent={footerContent}
            className="terminal-request-modal"
        >
            <div className="terminal-request-content">
                {submitError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
                        <div className="font-semibold">신청을 접수하지 못했습니다.</div>
                        <div className="mt-1">{submitError}</div>
                        {submitDetails.length > 0 && (
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                {submitDetails.map((msg, idx) => (
                                    <li key={idx}>{msg}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <form id={formId} onSubmit={handleSubmit} className="terminal-request-form">
                    {/* 회사명 */}
                    <div className="terminal-request-row">
                        <label className="terminal-request-label">회사명</label>
                        <div className="terminal-request-input-wrapper">
                            <input
                                type="text"
                                className={`terminal-request-input ${fieldErrors.companyName ? "is-invalid" : ""}`}
                                value={form.companyName}
                                onChange={(e) => updateField("companyName", e.target.value)}
                                placeholder="한국모빌리티"
                            />
                            {fieldErrors.companyName && <div className="terminal-request-error">{fieldErrors.companyName}</div>}
                        </div>
                    </div>

                    {/* 담당자명 */}
                    <div className="terminal-request-row">
                        <label className="terminal-request-label">담당자명</label>
                        <div className="terminal-request-input-wrapper">
                            <input
                                type="text"
                                className={`terminal-request-input ${fieldErrors.managerName ? "is-invalid" : ""}`}
                                value={form.managerName}
                                onChange={(e) => updateField("managerName", e.target.value)}
                                placeholder=""
                            />
                            {fieldErrors.managerName && <div className="terminal-request-error">{fieldErrors.managerName}</div>}
                        </div>
                    </div>

                    {/* 담당자 연락처 */}
                    <div className="terminal-request-row">
                        <label className="terminal-request-label">담당자 연락처</label>
                        <div className="terminal-request-input-wrapper">
                            <input
                                type="text"
                                className={`terminal-request-input ${fieldErrors.managerPhone ? "is-invalid" : ""}`}
                                value={form.managerPhone}
                                onChange={(e) => updateField("managerPhone", formatPhone11(e.target.value))}
                                placeholder=""
                            />
                            {fieldErrors.managerPhone && <div className="terminal-request-error">{fieldErrors.managerPhone}</div>}
                        </div>
                    </div>

                    {/* 신청 장착 대수 */}
                    <div className="terminal-request-row">
                        <label className="terminal-request-label">신청 장착 대수</label>
                        <div className="terminal-request-input-wrapper">
                            <div className="terminal-request-stepper">
                                <input
                                    type="text"
                                    className={`terminal-request-input terminal-request-input--stepper ${fieldErrors.expectedVehicleCount ? "is-invalid" : ""}`}
                                    value={form.expectedVehicleCount}
                                    onChange={(e) => updateField("expectedVehicleCount", e.target.value.replace(/\D/g, ""))}
                                    readOnly
                                />
                                <div className="terminal-request-stepper-buttons">
                                    <button type="button" className="terminal-request-stepper-btn terminal-request-stepper-btn--minus" onClick={decrementCount}>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <rect className="stepper-bg" width="20" height="20" rx="10" fill="#F8F8F8"/>
                                            <rect className="stepper-icon" x="5" y="9" width="10" height="2" rx="1" fill="#006CEC"/>
                                        </svg>
                                    </button>
                                    <button type="button" className="terminal-request-stepper-btn terminal-request-stepper-btn--plus" onClick={incrementCount}>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <rect className="stepper-bg" width="20" height="20" rx="10" fill="#F8F8F8"/>
                                            <path className="stepper-icon" d="M5 10C5 9.44772 5.44772 9 6 9H14C14.5523 9 15 9.44772 15 10C15 10.5523 14.5523 11 14 11H6C5.44772 11 5 10.5523 5 10Z" fill="#006CEC"/>
                                            <path className="stepper-icon" d="M10 5C10.5523 5 11 5.44772 11 6L11 14C11 14.5523 10.5523 15 10 15C9.44771 15 9 14.5523 9 14L9 6C9 5.44772 9.44772 5 10 5Z" fill="#006CEC"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            {fieldErrors.expectedVehicleCount && <div className="terminal-request-error">{fieldErrors.expectedVehicleCount}</div>}
                        </div>
                    </div>

                    {/* 차종/대상차량 */}
                    <div className="terminal-request-row">
                        <label className="terminal-request-label">차종/대상차량</label>
                        <div className="terminal-request-input-wrapper">
                            <input
                                type="text"
                                className={`terminal-request-input ${fieldErrors.targetVehicle ? "is-invalid" : ""}`}
                                value={form.targetVehicle}
                                onChange={(e) => updateField("targetVehicle", e.target.value)}
                                placeholder=""
                            />
                            {fieldErrors.targetVehicle && <div className="terminal-request-error">{fieldErrors.targetVehicle}</div>}
                        </div>
                    </div>

                    {/* 신청지역 */}
                    <div className="terminal-request-row">
                        <label className="terminal-request-label">신청지역</label>
                        <div className="terminal-request-input-wrapper">
                            <input
                                type="text"
                                className={`terminal-request-input ${fieldErrors.preferredRegion ? "is-invalid" : ""}`}
                                value={form.preferredRegion}
                                onChange={(e) => updateField("preferredRegion", e.target.value)}
                                placeholder=""
                            />
                            {fieldErrors.preferredRegion && <div className="terminal-request-error">{fieldErrors.preferredRegion}</div>}
                        </div>
                    </div>

                    {/* 도입예정시기 */}
                    <div className="terminal-request-row">
                        <label className="terminal-request-label">도입예정시기</label>
                        <div className="terminal-request-input-wrapper">
                            <div className="terminal-request-date-wrapper">
                                <input
                                    type="date"
                                    className={`terminal-request-input terminal-request-input--date ${fieldErrors.expectedStartDate ? "is-invalid" : ""}`}
                                    value={form.expectedStartDate}
                                    onChange={(e) => updateField("expectedStartDate", e.target.value)}
                                />
                            </div>
                            {fieldErrors.expectedStartDate && <div className="terminal-request-error">{fieldErrors.expectedStartDate}</div>}
                        </div>
                    </div>

                    {/* 시동차단 필요 여부 */}
                    <div className="terminal-request-row">
                        <label className="terminal-request-label">시동차단 필요 여부</label>
                        <div className="terminal-request-input-wrapper">
                            <div className="terminal-request-radio-group">
                                <label className="terminal-request-radio">
                                    <input
                                        type="radio"
                                        name="tr-restart-block"
                                        checked={form.needsRestartBlock === true}
                                        onChange={() => updateField("needsRestartBlock", true)}
                                    />
                                    <span className="terminal-request-radio__custom"></span>
                                    <span className="terminal-request-radio__text">필요</span>
                                </label>
                                <label className="terminal-request-radio">
                                    <input
                                        type="radio"
                                        name="tr-restart-block"
                                        checked={form.needsRestartBlock === false}
                                        onChange={() => updateField("needsRestartBlock", false)}
                                    />
                                    <span className="terminal-request-radio__custom"></span>
                                    <span className="terminal-request-radio__text">불필요</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
