import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import Modal from "../components/Modal";

const ConfirmContext = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: "", message: "", confirmText: "확인", cancelText: "취소", resolve: null });

  const confirm = useCallback((opts) => {
    const { title = "확인", message = "계속하시겠습니까?", confirmText = "확인", cancelText = "취소" } = typeof opts === "string" ? { message: opts } : (opts || {});
    return new Promise((resolve) => {
      setState({ open: true, title, message, confirmText, cancelText, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    setState((s) => {
      if (s.resolve) s.resolve(false);
      return { ...s, open: false, resolve: null };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => {
      if (s.resolve) s.resolve(true);
      return { ...s, open: false, resolve: null };
    });
  }, []);

  const ctx = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={ctx}>
      {children}
      {state.open && (
        <Modal isOpen={state.open} onClose={handleClose} title={state.title} ariaLabel={state.title} showFooter={false}>
          <div className="p-1 text-[0.95rem]">{state.message}</div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="form-button form-button--muted" onClick={handleClose}>{state.cancelText}</button>
            <button type="button" className="form-button form-button--danger" onClick={handleConfirm}>{state.confirmText}</button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
