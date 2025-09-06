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
    className = "",
    children,
    ...props
}) {
    const handleChange = (e) => {
        if (type === "file") {
            onChange(e.target.files && e.target.files[0] ? e.target.files[0] : null);
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
                        onChange={handleChange}
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

    return (
        <>
            <label className="form-label" htmlFor={id}>
                {label}
            </label>
            {renderInput()}
            {children && <div className="form-field-extra">{children}</div>}
        </>
    );
}