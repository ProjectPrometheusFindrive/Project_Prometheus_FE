import React from "react";
import useFormState from "../../hooks/useFormState";
import FormGrid from "./FormGrid";
import FormField from "./FormField";
import FormActions from "./FormActions";

export default function RentalForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
    const initialFormValues = {
        rental_id: initial.rental_id || "",
        vin: initial.vin || "",
        vehicleType: initial.vehicleType || "",
        plate: initial.plate || "",
        renter_name: initial.renter_name || "",
        contact_number: initial.contact_number || "",
        address: initial.address || "",
        start: initial.start || initial?.rental_period?.start || "",
        end: initial.end || initial?.rental_period?.end || "",
        insurance_name: initial.insurance_name || "",
        contract_file: initial.contract_file || null,
        driver_license_file: initial.driver_license_file || null,
    };

    const { form, update, handleSubmit } = useFormState(initialFormValues, { onSubmit });

    return (
        <FormGrid id={formId} onSubmit={handleSubmit}>
            <FormField
                id="rental_id"
                label="대여 계약번호"
                value={form.rental_id}
                onChange={(value) => update("rental_id", value)}
                placeholder="예: 100000000017"
                required
                disabled={readOnly}
            />

            <FormField
                id="vin"
                label="VIN"
                value={form.vin}
                onChange={(value) => update("vin", value)}
                placeholder="예: 1HGCM82633A004352"
                required
                disabled={readOnly}
            />

            <FormField
                id="vehicleType"
                label="차종"
                value={form.vehicleType}
                onChange={(value) => update("vehicleType", value)}
                placeholder="예: 싼타페 25년형"
                disabled={readOnly}
            />

            <FormField
                id="plate"
                label="차량번호"
                value={form.plate}
                onChange={(value) => update("plate", value)}
                placeholder="예: 28가2345"
                disabled={readOnly}
            />

            <FormField
                id="renter_name"
                label="계약자 이름"
                value={form.renter_name}
                onChange={(value) => update("renter_name", value)}
                placeholder="예: 홍길동"
                required
                disabled={readOnly}
            />

            <FormField
                id="contact_number"
                label="계약자 연락처"
                value={form.contact_number}
                onChange={(value) => update("contact_number", value)}
                placeholder="예: 010-1234-5678"
                disabled={readOnly}
            />

            <FormField
                id="address"
                label="계약자 주소"
                value={form.address}
                onChange={(value) => update("address", value)}
                placeholder="예: 서울 종로구 ..."
                disabled={readOnly}
            />

            <FormField
                id="start"
                label="대여 시작일"
                type="date"
                value={form.start}
                onChange={(value) => update("start", value)}
                required
                disabled={readOnly}
            />

            <FormField
                id="end"
                label="대여 종료일"
                type="date"
                value={form.end}
                onChange={(value) => update("end", value)}
                required
                disabled={readOnly}
            />

            <FormField
                id="insurance_name"
                label="보험사"
                value={form.insurance_name}
                onChange={(value) => update("insurance_name", value)}
                placeholder="예: ABC 보험"
                disabled={readOnly}
            />

            <FormField
                id="contract_file"
                label="대여 계약서 업로드"
                type="file"
                accept="image/*,application/pdf"
                onChange={(value) => update("contract_file", value)}
                disabled={readOnly}
            >
                {form.contract_file && <div className="file-info">{form.contract_file.name}</div>}
            </FormField>

            <FormField
                id="driver_license_file"
                label="운전면허증 업로드"
                type="file"
                accept="image/*,application/pdf"
                onChange={(value) => update("driver_license_file", value)}
                disabled={readOnly}
            >
                {form.driver_license_file && <div className="file-info">{form.driver_license_file.name}</div>}
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