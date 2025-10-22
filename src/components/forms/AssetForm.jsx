import React, { useEffect, useMemo } from "react";
import useFormState from "../../hooks/useFormState";
import FormGrid from "./FormGrid";
import FormField from "./FormField";
import FormActions from "./FormActions";
import FilePreview from "../FilePreview";
import FilesPreviewCarousel from "../FilesPreviewCarousel";
import { STATUS_OPTIONS, FUEL_TYPE_OPTIONS, YEAR_OPTIONS } from "../../constants/forms";
import { formatCurrency } from "../../utils/formatters";
import { normalizeKoreanPlate, isValidKoreanPlate } from "../../utils/validators";

export default function AssetForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true, requireDocs = true }) {
    const initialFormValues = useMemo(() => ({
        plate: initial.plate || "",
        make: initial.make || "",
        model: initial.model || "",
        vin: initial.vin || "",
        year: initial.year != null && initial.year !== "" ? String(initial.year) : "",
        fuelType: initial.fuelType || "",
        vehicleValue: initial.vehicleValue || "",
        purchaseDate: initial.purchaseDate || "",
        systemRegDate: initial.systemRegDate || "",
        systemDelDate: initial.systemDelDate || "",
        vehicleType: initial.vehicleType || "",
        registrationDate: initial.registrationDate || "",
        registrationStatus: initial.registrationStatus || STATUS_OPTIONS[0].value,
        registrationDoc: initial.registrationDoc || null,
        insuranceDoc: initial.insuranceDoc || null,
    }), [initial]);

    const { form, update, handleSubmit, setForm, updateFields } = useFormState(initialFormValues, { onSubmit });

    useEffect(() => {
        if (!form.vehicleType) {
            const { make, model, year } = initial || {};
            if (make || model || year) {
                const vt = [make, model, year ? `${year}년형` : null].filter(Boolean).join(" ");
                if (vt) setForm((p) => ({ ...p, vehicleType: vt }));
            }
        }
    }, [initial, form.vehicleType, setForm]);

    // Normalize vehicle value to comma-format on mount
    useEffect(() => {
        const vv = form.vehicleValue;
        if (vv != null && typeof vv !== "undefined") {
            const s = String(vv);
            if (/^\d+$/.test(s) && !/,/.test(s)) {
                updateFields({ vehicleValue: formatCurrency(s) });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <FormGrid id={formId} onSubmit={handleSubmit}>
            {/* 필수 서류 */}
            <FormField
                id="insuranceDoc"
                label="원리금 상환 계획표"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                multiple
                onChange={(value) => update("insuranceDoc", value)}
                required={requireDocs}
                disabled={readOnly}
            >
                {Array.isArray(form.insuranceDoc) ? (
                    <FilesPreviewCarousel files={form.insuranceDoc} />
                ) : (
                    <FilePreview file={form.insuranceDoc} />
                )}
            </FormField>

            <FormField
                id="registrationDoc"
                label="자동차 등록증"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                multiple
                onChange={(value) => update("registrationDoc", value)}
                required={requireDocs}
                disabled={readOnly}
            >
                {Array.isArray(form.registrationDoc) ? (
                    <FilesPreviewCarousel files={form.registrationDoc} />
                ) : (
                    <FilePreview file={form.registrationDoc} />
                )}
            </FormField>

            {/* 차량 기본 정보 */}
            <FormField
                id="make"
                label="제조사"
                value={form.make}
                onChange={(value) => update("make", value)}
                placeholder="예: 현대"
                disabled={readOnly}
            />

            <FormField
                id="model"
                label="차종"
                value={form.model}
                onChange={(value) => update("model", value)}
                placeholder="예: 쏘나타"
                disabled={readOnly}
            />

            <FormField
                id="year"
                label="연식"
                type="select"
                value={form.year}
                onChange={(value) => update("year", value)}
                options={YEAR_OPTIONS}
                disabled={readOnly}
            />

            <FormField
                id="fuelType"
                label="연료 타입"
                type="select"
                value={form.fuelType}
                onChange={(value) => update("fuelType", value)}
                options={FUEL_TYPE_OPTIONS}
                disabled={readOnly}
            />

            <FormField
                id="plate"
                label="차량번호"
                value={form.plate}
                onChange={(value) => update("plate", value)}
                onBlur={(e) => {
                    const v = normalizeKoreanPlate(e.target.value);
                    if (v !== form.plate) update("plate", v);
                }}
                placeholder="예: 28가2345"
                className={form.plate && !isValidKoreanPlate(normalizeKoreanPlate(form.plate)) ? "is-invalid" : ""}
                aria-invalid={form.plate && !isValidKoreanPlate(normalizeKoreanPlate(form.plate)) ? true : undefined}
                disabled={readOnly}
            >
                {!readOnly && form.plate && !isValidKoreanPlate(normalizeKoreanPlate(form.plate)) && (
                    <div className="form-field-extra text-right text-[12px] text-[#d32f2f]" aria-live="polite">
                        올바르지 않은 형식
                    </div>
                )}
            </FormField>

            <FormField
                id="vin"
                label="차대번호(VIN)"
                value={form.vin}
                onChange={(value) => update("vin", value)}
                placeholder="예: KMHxxxxxxxxxxxxxx"
                disabled={readOnly}
            />

            <FormField
                id="vehicleValue"
                label="차량가액(원)"
                type="text"
                value={form.vehicleValue}
                onChange={(value) => update("vehicleValue", formatCurrency(value))}
                placeholder="예: 25,000,000"
                inputMode="numeric"
                maxLength={20}
                disabled={readOnly}
            />

            {/* 일자 (일자순) */}
            <FormField
                id="purchaseDate"
                label="차량 구매일"
                type="date"
                value={form.purchaseDate}
                onChange={(value) => update("purchaseDate", value)}
                disabled={readOnly}
            />

            <FormField
                id="systemRegDate"
                label="전산 등록 일자"
                type="date"
                value={form.systemRegDate}
                onChange={(value) => update("systemRegDate", value)}
                disabled={readOnly}
            />

            <FormField
                id="systemDelDate"
                label="전산 삭제 일자"
                type="date"
                value={form.systemDelDate}
                onChange={(value) => update("systemDelDate", value)}
                disabled={readOnly}
            />

            {/* 내부 상태 필드 (필요시 자동 설정) */}
            <FormField
                id="registrationStatus"
                label="차량상태"
                type="select"
                value={form.registrationStatus}
                onChange={(value) => update("registrationStatus", value)}
                options={STATUS_OPTIONS}
                disabled={readOnly}
            />

            {!readOnly && showSubmit && (
                <FormActions>
                    <button
                        type="submit"
                        className="form-button"
                        disabled={form.plate && !isValidKoreanPlate(normalizeKoreanPlate(form.plate))}
                        title={form.plate && !isValidKoreanPlate(normalizeKoreanPlate(form.plate)) ? "차량번호 형식이 올바르지 않습니다" : undefined}
                    >
                        저장
                    </button>
                </FormActions>
            )}
        </FormGrid>
    );
}
