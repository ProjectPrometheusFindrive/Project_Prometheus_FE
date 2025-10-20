import React from "react";

export default function FormField({
    id,
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    options = [], // for select inputs
    rows = 4, // for textarea
    accept, // for file inputs
    capture, // for camera capture
    multiple = false, // allow multi-file selection
    className = "",
    inlineChildren = false,
    children,
    ...props
}) {
    const handleChange = (e) => {
        if (type === "file") {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
                if (multiple) {
                    console.debug("[upload-ui] file input selected (multiple):", { id, count: files.length, names: files.map(f => f.name) });
                    onChange(files);
                } else {
                    const file = files[0];
                    console.debug("[upload-ui] file input selected:", { id, name: file.name, size: file.size, type: file.type });
                    onChange(file);
                }
            } else {
                console.debug("[upload-ui] file input cleared:", { id });
                onChange(multiple ? [] : null);
            }
        } else {
            onChange(e.target.value);
        }
    };

    const renderInput = () => {
        switch (type) {
            case "select":
                return (
                    <select
                        id={id}
                        className={`form-input ${className}`}
                        value={value}
                        onChange={handleChange}
                        disabled={disabled}
                        {...props}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case "textarea":
                return (
                    <textarea
                        id={id}
                        className={`form-input ${className}`}
                        value={value}
                        onChange={handleChange}
                        placeholder={placeholder}
                        rows={rows}
                        disabled={disabled}
                        {...props}
                    />
                );

            case "file":
                return (
                    <input
                        id={id}
                        type="file"
                        className={`form-input ${className}`}
                        accept={accept}
                        capture={capture}
                        multiple={multiple}
                        onChange={handleChange}
                        required={required}
                        disabled={disabled}
                        {...props}
                    />
                );

            default:
                return (
                    <input
                        id={id}
                        type={type}
                        className={`form-input ${className}`}
                        value={value}
                        onChange={handleChange}
                        placeholder={placeholder}
                        required={required}
                        disabled={disabled}
                        {...props}
                    />
                );
        }
    };

    const inputEl = renderInput();

    if (inlineChildren && children) {
        return (
            <>
                <label className="form-label" htmlFor={id}>
                    {label}
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>{inputEl}</div>
                    <div className="form-field-inline-extra" style={{ flex: "0 1 auto", minWidth: 0 }}>{children}</div>
                </div>
            </>
        );
    }

    return (
        <>
            <label className="form-label" htmlFor={id}>
                {label}
            </label>
            {inputEl}
            {children && <div className="form-field-extra">{children}</div>}
        </>
    );
}
