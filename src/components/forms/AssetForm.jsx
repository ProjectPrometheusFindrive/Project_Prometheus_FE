import React, { useEffect } from "react";
import useFormState from "../../hooks/useFormState";
import FormGrid from "./FormGrid";
import FormField from "./FormField";
import FormActions from "./FormActions";
import { STATUS_OPTIONS } from "../../constants/forms";

export default function AssetForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
    const initialFormValues = {
        plate: initial.plate || "",
        vehicleType: initial.vehicleType || "",
        registrationDate: initial.registrationDate || "",
        registrationStatus: initial.registrationStatus || STATUS_OPTIONS[0].value,
        registrationDoc: initial.registrationDoc || null,
        insuranceDoc: initial.insuranceDoc || null,
    };

    const { form, update, handleSubmit, setForm } = useFormState(initialFormValues, { onSubmit });

    useEffect(() => {
        if (!form.vehicleType) {
            const { make, model, year } = initial || {};
            if (make || model || year) {
                const vt = [make, model, year ? `${year}년형` : null].filter(Boolean).join(" ");
                if (vt) setForm((p) => ({ ...p, vehicleType: vt }));
            }
        }
    }, [initial, form.vehicleType, setForm]);

    return (
        <FormGrid id={formId} onSubmit={handleSubmit}>
            <FormField
                id="plate"
                label="차량번호"
                value={form.plate}
                onChange={(value) => update("plate", value)}
                placeholder="예: 28가2345"
                required
                disabled={readOnly}
            />

            <FormField
                id="vehicleType"
                label="차종"
                value={form.vehicleType}
                onChange={(value) => update("vehicleType", value)}
                placeholder="예: 쏘나타 25년형"
                required
                disabled={readOnly}
            />

            <FormField
                id="registrationDate"
                label="차량등록일"
                type="date"
                value={form.registrationDate}
                onChange={(value) => update("registrationDate", value)}
                required
                disabled={readOnly}
            />

            <FormField
                id="registrationStatus"
                label="차량상태"
                type="select"
                value={form.registrationStatus}
                onChange={(value) => update("registrationStatus", value)}
                options={STATUS_OPTIONS}
                disabled={readOnly}
            />

            <FormField
                id="registrationDoc"
                label="자동차등록증 첨부"
                type="file"
                accept="image/*,application/pdf"
                onChange={(value) => update("registrationDoc", value)}
                disabled={readOnly}
            >
                {form.registrationDoc && <div className="file-info">{form.registrationDoc.name}</div>}
            </FormField>

            <FormField
                id="insuranceDoc"
                label="보험가입증명서 첨부"
                type="file"
                accept="image/*,application/pdf"
                onChange={(value) => update("insuranceDoc", value)}
                disabled={readOnly}
            >
                {form.insuranceDoc && <div className="file-info">{form.insuranceDoc.name}</div>}
            </FormField>

            {!readOnly && showSubmit && (
                <FormActions>
                    <button type="submit" className="form-button">
                        저장
                    </button>
                </FormActions>
            )}
        </FormGrid>
    );
}
