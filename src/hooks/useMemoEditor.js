import { useState, useCallback } from "react";

// Shared editor state for memo cells
export default function useMemoEditor() {
  const [editingId, setEditingId] = useState(null);
  const [memoText, setMemoText] = useState("");

  const onEdit = useCallback((id, currentText = "") => {
    setEditingId(id);
    setMemoText(currentText || "");
  }, []);

  const onChange = useCallback((value) => {
    setMemoText(value);
  }, []);

  const onCancel = useCallback(() => {
    setEditingId(null);
    setMemoText("");
  }, []);

  return { editingId, memoText, setMemoText, onEdit, onChange, onCancel };
}

