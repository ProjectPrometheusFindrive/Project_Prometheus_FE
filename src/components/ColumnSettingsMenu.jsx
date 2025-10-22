import React from "react";
import { FaGripVertical, FaEye, FaEyeSlash } from "react-icons/fa";

export default function ColumnSettingsMenu({
  columns,
  draggedColumnIndex,
  dragOverColumnIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onToggleVisibility,
}) {
  const handleItemKey = (e) => {
    const current = e.currentTarget;
    if (!current) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = current.nextElementSibling;
      if (next && next.hasAttribute("data-menu-item")) next.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = current.previousElementSibling;
      if (prev && prev.hasAttribute("data-menu-item")) prev.focus();
    }
  };
  return (
    <div data-column-dropdown className="dropdown-menu" role="menu" aria-label="컬럼 표시 설정">
      <div className="dropdown-menu__header">컬럼 표시 설정</div>
      {columns.map((column, index) => (
        <div
          key={column.key}
          draggable
          onDragStart={(e) => onDragStart(e, index)}
          onDragOver={(e) => onDragOver(e, index)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, index)}
          onDragEnd={onDragEnd}
          data-menu-item
          role="menuitem"
          tabIndex={0}
          onKeyDown={handleItemKey}
          className={`dropdown-menu__item${column.required ? " is-required" : ""}${
            draggedColumnIndex === index ? " is-dragging" : ""
          }${dragOverColumnIndex === index ? " is-dragover" : ""}`}
        >
          <div className="drag-handle">
            <FaGripVertical size={10} color="#999" />
          </div>
          <button
            type="button"
            className="icon-cell"
            aria-label={`${column.label} ${column.visible ? "숨기기" : "표시하기"}`}
            title={`${column.label} ${column.visible ? "숨기기" : "표시하기"}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!column.required) onToggleVisibility(column.key);
            }}
          >
            {column.visible ? (
              <FaEye size={12} color="#4caf50" />
            ) : (
              <FaEyeSlash size={12} color="#f44336" />
            )}
          </button>
          <span className="text-85 flex-1">{column.label}</span>
          {column.required && <span className="text-70 text-muted-light">필수</span>}
        </div>
      ))}
    </div>
  );
}
