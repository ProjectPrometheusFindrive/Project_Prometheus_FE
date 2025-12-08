import React from "react";

export default function FormGrid({ children, onSubmit, id, className = "", style }) {
    return (
        <form id={id} className={`form-grid ${className}`} style={style} onSubmit={onSubmit}>
            {children}
        </form>
    );
}