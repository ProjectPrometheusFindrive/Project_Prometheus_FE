import React, { useEffect } from "react";
import useFormState from "../../hooks/useFormState";

const STATUS_OPTIONS = ["자산등록 완료", "보험등록 완료", "장비장착 완료", "장비장착 대기", "미등록"];

export default function AssetForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
    const initialFormValues = {
        plate: initial.plate || "",
        vehicleType: initial.vehicleType || "",
        registrationDate: initial.registrationDate || "",
        registrationStatus: initial.registrationStatus || STATUS_OPTIONS[0],
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
        <form id={formId} className="form-grid" onSubmit={handleSubmit}>
            <label className="form-label" htmlFor="plate">
                차량번호
            </label>
            <input id="plate" className="form-input" value={form.plate} onChange={(e) => update("plate", e.target.value)} placeholder="예: 28가2345" required disabled={readOnly} />

            <label className="form-label" htmlFor="vehicleType">
                차종
            </label>
            <input
                id="vehicleType"
                className="form-input"
                value={form.vehicleType}
                onChange={(e) => update("vehicleType", e.target.value)}
                placeholder="예: 쏘나타 25년형"
                required
                disabled={readOnly}
            />

            <label className="form-label" htmlFor="registrationDate">
                차량등록일
            </label>
            <input id="registrationDate" type="date" className="form-input" value={form.registrationDate} onChange={(e) => update("registrationDate", e.target.value)} required disabled={readOnly} />

            <label className="form-label" htmlFor="registrationStatus">
                차량상태
            </label>
            <select id="registrationStatus" className="form-input" value={form.registrationStatus} onChange={(e) => update("registrationStatus", e.target.value)} disabled={readOnly}>
                {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                        {s}
                    </option>
                ))}
            </select>

            <label className="form-label" htmlFor="registrationDoc">
                자동차등록증 첨부
            </label>
            <input
                id="registrationDoc"
                type="file"
                className="form-input"
                accept="image/*,application/pdf"
                onChange={(e) => update("registrationDoc", e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                disabled={readOnly}
            />
            {form.registrationDoc && <div style={{ fontSize: 12, color: "#555" }}>{form.registrationDoc.name}</div>}

            <label className="form-label" htmlFor="insuranceDoc">
                보험가입증명서 첨부
            </label>
            <input
                id="insuranceDoc"
                type="file"
                className="form-input"
                accept="image/*,application/pdf"
                onChange={(e) => update("insuranceDoc", e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                disabled={readOnly}
            />
            {form.insuranceDoc && <div style={{ fontSize: 12, color: "#555" }}>{form.insuranceDoc.name}</div>}

            {!readOnly && showSubmit && (
                <div className="form-actions">
                    <button type="submit" className="form-button">
                        저장
                    </button>
                </div>
            )}
        </form>
    );
}
