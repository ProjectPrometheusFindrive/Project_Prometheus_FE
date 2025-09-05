import React from "react";
import useFormState from "../../hooks/useFormState";

export default function RentalForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
    const initialFormValues = {
        rental_id: initial.rental_id || "",
        vin: initial.vin || "",
        // New: vehicle type and plate number (대여 차종, 대여 차량 번호)
        vehicleType: initial.vehicleType || "",
        plate: initial.plate || "",
        // Renter info (계약자)
        renter_name: initial.renter_name || "",
        contact_number: initial.contact_number || "",
        address: initial.address || "",
        // Period (대여 기간)
        start: initial.start || initial?.rental_period?.start || "",
        end: initial.end || initial?.rental_period?.end || "",
        insurance_name: initial.insurance_name || "",
        // Uploads
        contract_file: initial.contract_file || null, // 대여 계약서 업로드
        driver_license_file: initial.driver_license_file || null, // 운전면허증 업로드
    };

    const { form, update, handleSubmit } = useFormState(initialFormValues, { onSubmit });

    return (
        <form id={formId} className="form-grid" onSubmit={handleSubmit}>
            <label className="form-label" htmlFor="rental_id">
                Rental ID
            </label>
            <input id="rental_id" className="form-input" value={form.rental_id} onChange={(e) => update("rental_id", e.target.value)} placeholder="e.g. 100000000017" required disabled={readOnly} />

            <label className="form-label" htmlFor="vin">
                VIN
            </label>
            <input id="vin" className="form-input" value={form.vin} onChange={(e) => update("vin", e.target.value)} placeholder="e.g. 1HGCM82633A004352" required disabled={readOnly} />

            <label className="form-label" htmlFor="vehicleType">
                차종
            </label>
            <input id="vehicleType" className="form-input" value={form.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} placeholder="예: 싼타페 25년형" disabled={readOnly} />

            <label className="form-label" htmlFor="plate">
                차량번호
            </label>
            <input id="plate" className="form-input" value={form.plate} onChange={(e) => update("plate", e.target.value)} placeholder="예: 28가2345" disabled={readOnly} />

            <label className="form-label" htmlFor="renter_name">
                계약자 이름
            </label>
            <input id="renter_name" className="form-input" value={form.renter_name} onChange={(e) => update("renter_name", e.target.value)} placeholder="예: 홍길동" required disabled={readOnly} />

            <label className="form-label" htmlFor="contact_number">
                계약자 연락처
            </label>
            <input
                id="contact_number"
                className="form-input"
                value={form.contact_number}
                onChange={(e) => update("contact_number", e.target.value)}
                placeholder="예: 010-1234-5678"
                disabled={readOnly}
            />

            <label className="form-label" htmlFor="address">
                계약자 주소
            </label>
            <input id="address" className="form-input" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="예: 서울 종로구 ..." disabled={readOnly} />

            <label className="form-label" htmlFor="start">
                대여 시작일
            </label>
            <input id="start" type="date" className="form-input" value={form.start} onChange={(e) => update("start", e.target.value)} required disabled={readOnly} />

            <label className="form-label" htmlFor="end">
                대여 종료일
            </label>
            <input id="end" type="date" className="form-input" value={form.end} onChange={(e) => update("end", e.target.value)} required disabled={readOnly} />

            <label className="form-label" htmlFor="insurance_name">
                보험사
            </label>
            <input id="insurance_name" className="form-input" value={form.insurance_name} onChange={(e) => update("insurance_name", e.target.value)} placeholder="예: ABC 보험" disabled={readOnly} />

            {/* 대여 계약서 업로드 */}
            <label className="form-label" htmlFor="contract_file">
                대여 계약서 업로드
            </label>
            <input
                id="contract_file"
                type="file"
                className="form-input"
                accept="image/*,application/pdf"
                onChange={(e) => update("contract_file", e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                disabled={readOnly}
            />
            {form.contract_file && <div style={{ fontSize: 12, color: "#555" }}>{form.contract_file.name}</div>}

            {/* 운전면허증 업로드 */}
            <label className="form-label" htmlFor="driver_license_file">
                운전면허증 업로드
            </label>
            <input
                id="driver_license_file"
                type="file"
                className="form-input"
                accept="image/*,application/pdf"
                onChange={(e) => update("driver_license_file", e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                disabled={readOnly}
            />
            {form.driver_license_file && <div style={{ fontSize: 12, color: "#555" }}>{form.driver_license_file.name}</div>}

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
