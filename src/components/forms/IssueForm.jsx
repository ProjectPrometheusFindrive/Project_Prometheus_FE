import React from "react";
import useFormState from "../../hooks/useFormState";
import FormGrid from "./FormGrid";
import FormField from "./FormField";
import FormActions from "./FormActions";
import { ISSUE_TYPE_OPTIONS, SEVERITY_OPTIONS } from "../../constants/forms";

export default function IssueForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
    const initialFormValues = {
        vin: initial.vin || "",
        type: initial.type || "overdue",
        severity: initial.severity || "medium",
        description: initial.description || "",
    };

    const { form, update, handleSubmit } = useFormState(initialFormValues, { onSubmit });

    return (
        <FormGrid id={formId} onSubmit={handleSubmit}>
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
                id="type"
                label="문제 유형"
                type="select"
                value={form.type}
                onChange={(value) => update("type", value)}
                options={ISSUE_TYPE_OPTIONS}
                disabled={readOnly}
            />

            <FormField
                id="severity"
                label="심각도"
                type="select"
                value={form.severity}
                onChange={(value) => update("severity", value)}
                options={SEVERITY_OPTIONS}
                disabled={readOnly}
            />

            <FormField
                id="description"
                label="설명"
                type="textarea"
                value={form.description}
                onChange={(value) => update("description", value)}
                placeholder="상세 내용을 입력하세요"
                rows={4}
                disabled={readOnly}
            />

            {!readOnly && showSubmit && (
                <FormActions>
                    <button type="submit" className="form-button">
                        등록
                    </button>
                </FormActions>
            )}
        </FormGrid>
    );
}
