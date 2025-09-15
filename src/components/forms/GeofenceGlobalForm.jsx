import React, { useState } from "react";
import useFormState from "../../hooks/useFormState";
import KakaoGeofenceInput from "./KakaoGeofenceInput";

export default function GeofenceGlobalForm({ initial = {}, initialName = "", readOnly = false, onSubmit, onChange, onNameChange, formId, showSubmit = true }) {
    const initialFormValues = {
        geofences: Array.isArray(initial.geofences) ? initial.geofences : [],
    };

    const { form, update, setFormValues } = useFormState(initialFormValues);
    const [name, setName] = useState(initialName || "");

    // Sync when parent initial changes (for Edit flows)
    React.useEffect(() => {
        const next = { geofences: Array.isArray(initial.geofences) ? initial.geofences : [] };
        setFormValues(next);

        if ((!initialName || initialName === "") && (!next.geofences || next.geofences.length === 0)) {
            setName("");
        }
    }, [initial, initialName, setFormValues]);

    React.useEffect(() => {
        setName(initialName || "");
    }, [initialName]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...form, name: name?.trim() || "" };
        if (onSubmit) onSubmit(payload);
    };

    return (
        <form id={formId} className="form-acions" onSubmit={handleSubmit}>
            <label className="form-label">Global Geofence(s)</label>
            <KakaoGeofenceInput
                value={form.geofences}
                onChange={(polys) => {
                    update("geofences", polys);
                    if (onChange) onChange({ geofences: polys });
                }}
                readOnly={readOnly}
                height={360}
                showList={false}
            />

            {!readOnly && showSubmit && (
                <div className="form-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                        className="form-input"
                        placeholder="Polygon name"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (onNameChange) onNameChange(e.target.value);
                        }}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="form-button">
                        Save
                    </button>
                </div>
            )}
        </form>
    );
}
