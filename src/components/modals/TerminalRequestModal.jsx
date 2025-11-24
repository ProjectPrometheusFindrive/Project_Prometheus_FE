import React, { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import FormGrid from "../forms/FormGrid";
import FormField from "../forms/FormField";
import FormActions from "../forms/FormActions";
import { submitTerminalRequest } from "../../api";
import { emitToast } from "../../utils/toast";
import { formatPhone11, digitsOnly } from "../../utils/formatters";
import { useCompany } from "../../contexts/CompanyContext";
import { useAuth } from "../../contexts/AuthContext";

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
            expectedVehicleCount: resolvedDefaults.expectedVehicleCount !== "" ? String(resolvedDefaults.expectedVehicleCount) : "",
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
        <FormActions className="justify-between items-center">
            <div className="text-sm text-gray-600">
                제출 후 메일로 접수 알림을 받게 됩니다.
            </div>
            <div className="flex items-center gap-2">
                <button type="button" className="form-button form-button--muted" onClick={onClose} disabled={submitting}>
                    취소
                </button>
                <button type="submit" form={formId} className="form-button" disabled={submitting}>
                    {submitting ? "신청 중..." : "신청하기"}
                </button>
            </div>
        </FormActions>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="단말 장착 신청"
            ariaLabel="단말 장착 신청"
            showFooter={true}
            footerContent={footerContent}
            className="max-w-3xl"
        >
            <div className="space-y-3">
                
                {submitError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
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

                <FormGrid id={formId} onSubmit={handleSubmit} className="space-y-3">
                    <div className="form-row">
                        <div className="form-col">
                            <FormField
                                id="tr-company"
                                label="회사명"
                                value={form.companyName}
                                onChange={(v) => updateField("companyName", v)}
                                required
                                className={fieldErrors.companyName ? "is-invalid" : ""}
                                placeholder="예: 프로메테우스 모빌리티"
                            />
                            {fieldErrors.companyName && <div className="text-sm text-red-600 mt-1">{fieldErrors.companyName}</div>}
                        </div>
                        <div className="form-col">
                            <FormField
                                id="tr-manager"
                                label="담당자명"
                                value={form.managerName}
                                onChange={(v) => updateField("managerName", v)}
                                required
                                className={fieldErrors.managerName ? "is-invalid" : ""}
                                placeholder="홍길동"
                            />
                            {fieldErrors.managerName && <div className="text-sm text-red-600 mt-1">{fieldErrors.managerName}</div>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-col">
                            <FormField
                                id="tr-phone"
                                label="담당자 연락처"
                                value={form.managerPhone}
                                onChange={(v) => updateField("managerPhone", formatPhone11(v))}
                                required
                                className={fieldErrors.managerPhone ? "is-invalid" : ""}
                                placeholder="010-1234-5678"
                            />
                            {fieldErrors.managerPhone && <div className="text-sm text-red-600 mt-1">{fieldErrors.managerPhone}</div>}
                        </div>
                        <div className="form-col">
                            <FormField
                                id="tr-vehicle-count"
                                label="신청 장착 대수"
                                type="number"
                                min="1"
                                step="1"
                                value={form.expectedVehicleCount}
                                onChange={(v) => updateField("expectedVehicleCount", v)}
                                required
                                className={fieldErrors.expectedVehicleCount ? "is-invalid" : ""}
                                placeholder="예: 20"
                            />
                            {fieldErrors.expectedVehicleCount && <div className="text-sm text-red-600 mt-1">{fieldErrors.expectedVehicleCount}</div>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-col">
                            <FormField
                                id="tr-target"
                                label="차종/대상 차량"
                                value={form.targetVehicle}
                                onChange={(v) => updateField("targetVehicle", v)}
                                required
                                className={fieldErrors.targetVehicle ? "is-invalid" : ""}
                                placeholder="예: EV SUV, 1톤 탑차 등"
                            />
                            {fieldErrors.targetVehicle && <div className="text-sm text-red-600 mt-1">{fieldErrors.targetVehicle}</div>}
                        </div>
                        <div className="form-col">
                            <FormField
                                id="tr-region"
                                label="신청 지역"
                                value={form.preferredRegion}
                                onChange={(v) => updateField("preferredRegion", v)}
                                required
                                className={fieldErrors.preferredRegion ? "is-invalid" : ""}
                                placeholder="예: 서울/경기, 전국 등"
                            />
                            {fieldErrors.preferredRegion && <div className="text-sm text-red-600 mt-1">{fieldErrors.preferredRegion}</div>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-col">
                            <FormField
                                id="tr-start-date"
                                label="도입 예정 시기"
                                type="date"
                                value={form.expectedStartDate}
                                onChange={(v) => updateField("expectedStartDate", v)}
                                required
                                className={fieldErrors.expectedStartDate ? "is-invalid" : ""}
                                placeholder="YYYY-MM-DD"
                            />
                            {fieldErrors.expectedStartDate && <div className="text-sm text-red-600 mt-1">{fieldErrors.expectedStartDate}</div>}
                        </div>
                        <div className="form-col">
                            <div className="form-label">시동 차단 필요 여부</div>
                            <div className="form-radio-row">
                                <label className="form-radio">
                                    <input
                                        type="radio"
                                        name="tr-restart-block"
                                        value="true"
                                        checked={form.needsRestartBlock === true}
                                        onChange={() => updateField("needsRestartBlock", true)}
                                    />
                                    필요
                                </label>
                                <label className="form-radio">
                                    <input
                                        type="radio"
                                        name="tr-restart-block"
                                        value="false"
                                        checked={form.needsRestartBlock === false}
                                        onChange={() => updateField("needsRestartBlock", false)}
                                    />
                                    불필요
                                </label>
                            </div>
                        </div>
                    </div>
                </FormGrid>
            </div>
        </Modal>
    );
}
