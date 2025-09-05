import React from "react";

export default function FormActions({ children, className = "" }) {
    return <div className={`form-actions ${className}`}>{children}</div>;
}