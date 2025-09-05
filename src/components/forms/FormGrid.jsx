import React from "react";

export default function FormGrid({ children, onSubmit, id, className = "" }) {
    return (
        <form id={id} className={`form-grid ${className}`} onSubmit={onSubmit}>
            {children}
        </form>
    );
}