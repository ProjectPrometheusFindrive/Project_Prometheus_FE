import React from "react";

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

  const requiredColumns = columns.filter(col => col.required);
  const optionalColumns = columns.filter(col => !col.required);
  const allVisible = optionalColumns.every(col => col.visible);

  const handleToggleAll = () => {
    optionalColumns.forEach(col => {
      if (allVisible && col.visible) {
        onToggleVisibility(col.key);
      } else if (!allVisible && !col.visible) {
        onToggleVisibility(col.key);
      }
    });
  };

  return (
    <div
      data-column-dropdown
      role="menu"
      aria-label="컬럼 표시 설정"
      style={{
        width: 170,
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: '4px',
        background: 'white',
        boxShadow: '0px 8px 12px 3px rgba(0, 0, 0, 0.10)',
        borderRadius: 8,
        border: '1px rgba(0, 0, 0, 0.08) solid',
        zIndex: 1000
      }}
    >
      {/* 선택해제 버튼 */}
      <div style={{ padding: '20px 20px 10px 20px' }}>
        <button
          type="button"
          onClick={handleToggleAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            width: '100%'
          }}
        >
          <div style={{ width: 16, height: 16, position: 'relative' }}>
            {allVisible ? (
              <div style={{
                width: 16,
                height: 16,
                background: 'white',
                borderRadius: 3,
                border: '1px rgba(0, 0, 0, 0.15) solid'
              }} />
            ) : (
              <>
                <div style={{
                  width: 16,
                  height: 16,
                  background: 'white',
                  borderRadius: 3,
                  border: '1px rgba(0, 0, 0, 0.15) solid'
                }} />
              </>
            )}
          </div>
          <div style={{
            color: '#888888',
            fontSize: 14,
            fontFamily: 'Pretendard',
            fontWeight: 500,
            lineHeight: '20px'
          }}>
            선택해제
          </div>
        </button>
      </div>

      {/* 구분선 */}
      <div style={{
        width: 130,
        height: 0,
        marginLeft: 20,
        marginRight: 20,
        marginTop: 0,
        marginBottom: 10,
        outline: '1px rgba(0, 0, 0, 0.08) solid',
        outlineOffset: '-0.50px'
      }} />

      {/* 필수 컬럼 */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 15 }}>
        {requiredColumns.map((column, index) => (
          <div
            key={column.key}
            style={{
              width: 130,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, position: 'relative' }}>
                <div style={{
                  width: 16,
                  height: 16,
                  opacity: 0.60,
                  background: '#006CEC',
                  borderRadius: 3
                }} />
                <svg width="10" height="8" viewBox="0 0 10 8" style={{
                  position: 'absolute',
                  left: 3,
                  top: 4
                }}>
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{
                color: '#888888',
                fontSize: 14,
                fontFamily: 'Pretendard',
                fontWeight: 500,
                lineHeight: '20px'
              }}>
                {column.label}
              </div>
            </div>
            <div style={{
              color: '#E50E08',
              fontSize: 12,
              fontFamily: 'Pretendard',
              fontWeight: 400,
              lineHeight: '20px'
            }}>
              필수
            </div>
          </div>
        ))}
      </div>

      {/* 구분선 */}
      <div style={{
        width: 130,
        height: 0,
        margin: '10px 20px 20px',
        outline: '1px rgba(0, 0, 0, 0.08) solid',
        outlineOffset: '-0.50px'
      }} />

      {/* 선택 가능 컬럼 */}
      <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 15 }}>
        {optionalColumns.map((column, index) => (
          <div
            key={column.key}
            draggable
            onDragStart={(e) => onDragStart(e, columns.indexOf(column))}
            onDragOver={(e) => onDragOver(e, columns.indexOf(column))}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, columns.indexOf(column))}
            onDragEnd={onDragEnd}
            data-menu-item
            role="menuitem"
            tabIndex={0}
            onKeyDown={handleItemKey}
            style={{
              width: 130,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              opacity: draggedColumnIndex === columns.indexOf(column) ? 0.5 : 1
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(column.key);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, position: 'relative' }}>
                {column.visible ? (
                  <>
                    <div style={{
                      width: 16,
                      height: 16,
                      background: '#006CEC',
                      borderRadius: 3
                    }} />
                    <svg width="10" height="8" viewBox="0 0 10 8" style={{
                      position: 'absolute',
                      left: 3,
                      top: 4
                    }}>
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                ) : (
                  <div style={{
                    width: 16,
                    height: 16,
                    background: 'white',
                    borderRadius: 3,
                    border: '1px rgba(0, 0, 0, 0.15) solid'
                  }} />
                )}
              </div>
              <div style={{
                color: '#1C1C1C',
                fontSize: 14,
                fontFamily: 'Pretendard',
                fontWeight: 500,
                lineHeight: '20px'
              }}>
                {column.label}
              </div>
            </div>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M0 0H0.642857H11.3571H12V1.25H11.3571H0.642857H0V0ZM0 8.75H0.642857H11.3571H12V10H11.3571H0.642857H0V8.75ZM0.642857 4.375H0V5.625H0.642857H11.3571H12V4.375H11.3571H0.642857Z" fill="#888888"/>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
