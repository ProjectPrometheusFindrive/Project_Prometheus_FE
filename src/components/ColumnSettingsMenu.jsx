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
  return (
    <div data-column-dropdown className="dropdown-menu">
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
          className={`dropdown-menu__item${column.required ? " is-required" : ""}${
            draggedColumnIndex === index ? " is-dragging" : ""
          }${dragOverColumnIndex === index ? " is-dragover" : ""}`}
        >
          <div className="drag-handle">
            <FaGripVertical size={10} color="#999" />
          </div>
          <div
            className="icon-cell"
            onClick={(e) => {
              e.stopPropagation();
              !column.required && onToggleVisibility(column.key);
            }}
          >
            {column.visible ? (
              <FaEye size={12} color="#4caf50" />
            ) : (
              <FaEyeSlash size={12} color="#f44336" />
            )}
          </div>
          <span className="text-85 flex-1">{column.label}</span>
          {column.required && <span className="text-70 text-muted-light">필수</span>}
        </div>
      ))}
    </div>
  );
}

