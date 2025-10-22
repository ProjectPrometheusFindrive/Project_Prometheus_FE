import { useState, useEffect } from "react";

/**
 * useDropdownState - 드롭다운 UI 상태 관리 훅
 * 여러 드롭다운(컬럼 설정, 관리상태, 불일치 팝업)의 열림/닫힘 상태를 관리합니다.
 *
 * @param {Object} options - 설정 옵션
 * @param {boolean} options.closeOnEscape - ESC 키로 닫기 활성화 (기본값: true)
 * @param {boolean} options.closeOnOutsideClick - 외부 클릭으로 닫기 활성화 (기본값: true)
 * @returns {Object} 드롭다운 상태 및 제어 함수
 */
export default function useDropdownState({ closeOnEscape = true, closeOnOutsideClick = true } = {}) {
    const [openDropdowns, setOpenDropdowns] = useState({
        column: false,           // 컬럼 설정 드롭다운
        stage: null,             // 관리상태 드롭다운 (행 ID)
        inconsistency: null,     // 불일치 팝업 (행 ID)
    });
    const [stageDropdownUp, setStageDropdownUp] = useState(false);

    const closeAll = () => {
        setOpenDropdowns({
            column: false,
            stage: null,
            inconsistency: null,
        });
        setStageDropdownUp(false);
    };

    const toggleColumn = () => setOpenDropdowns((prev) => ({ ...prev, column: !prev.column }));
    const closeColumn = () => setOpenDropdowns((prev) => ({ ...prev, column: false }));

    const toggleStage = (id) => setOpenDropdowns((prev) => ({
        ...prev,
        stage: prev.stage === id ? null : id,
    }));
    const closeStage = () => {
        setOpenDropdowns((prev) => ({ ...prev, stage: null }));
        setStageDropdownUp(false);
    };

    const toggleInconsistency = (id) => setOpenDropdowns((prev) => ({
        ...prev,
        inconsistency: prev.inconsistency === id ? null : id,
    }));
    const closeInconsistency = () => setOpenDropdowns((prev) => ({ ...prev, inconsistency: null }));

    // 외부 클릭 및 ESC 키 감지
    useEffect(() => {
        if (!closeOnEscape && !closeOnOutsideClick) return;

        const handleClickOutside = (event) => {
            if (!closeOnOutsideClick) return;
            // Ignore clicks inside modals
            if (event.target.closest('.modal') || event.target.closest('.modal-backdrop')) {
                return;
            }
            if (openDropdowns.column && !event.target.closest("[data-column-dropdown]")) {
                closeColumn();
            }
            if (openDropdowns.stage !== null && !event.target.closest("[data-stage-dropdown]")) {
                closeStage();
            }
            if (openDropdowns.inconsistency !== null && !event.target.closest("[data-inconsistency-popover]")) {
                closeInconsistency();
            }
        };

        const handleKeyDown = (event) => {
            if (!closeOnEscape || event.key !== "Escape") return;
            if (openDropdowns.column || openDropdowns.stage !== null || openDropdowns.inconsistency !== null) {
                closeAll();
            }
        };

        if (closeOnOutsideClick) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        if (closeOnEscape) {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            if (closeOnOutsideClick) {
                document.removeEventListener("mousedown", handleClickOutside);
            }
            if (closeOnEscape) {
                document.removeEventListener("keydown", handleKeyDown);
            }
        };
    }, [openDropdowns, closeOnEscape, closeOnOutsideClick]);

    return {
        openDropdowns,
        stageDropdownUp,
        setStageDropdownUp,
        toggleColumn,
        closeColumn,
        toggleStage,
        closeStage,
        toggleInconsistency,
        closeInconsistency,
        closeAll,
    };
}
