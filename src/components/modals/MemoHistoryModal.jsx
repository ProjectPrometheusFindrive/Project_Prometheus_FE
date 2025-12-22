import React, { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import { fetchAssetMemoHistory, fetchRentalMemoHistory } from "../../api";
import { formatYyMmDdHhMmSs } from "../../utils/datetime";
import { typedStorage } from "../../utils/storage";
import "./MemoHistoryModal.css";

export default function MemoHistoryModal({ isOpen, onClose, entityType, entityId, title, currentMemo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headerTitle = useMemo(() => {
    if (title) return title;
    const label = entityType === "asset" ? "자산" : "계약";
    return `메모 히스토리 (${label} ${entityId || "-"})`;
  }, [title, entityType, entityId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!isOpen || !entityType || !entityId) return;
      setLoading(true);
      setError("");
      try {
        const data = entityType === "asset"
          ? await fetchAssetMemoHistory(entityId)
          : await fetchRentalMemoHistory(entityId);
        if (!ignore) {
          const arr = Array.isArray(data) ? data : [];
          // Sort by changedAt desc if present
          const sorted = [...arr].sort((a, b) => {
            const ta = a?.changedAt ? new Date(a.changedAt).getTime() : 0;
            const tb = b?.changedAt ? new Date(b.changedAt).getTime() : 0;
            return tb - ta;
          }).map((item) => ({ ...item, isCurrent: false }));

          // Include the most recent memo (current value) at top if missing
          const latestText = typeof currentMemo === "string" ? currentMemo.trim() : "";
          if (latestText && (sorted.length === 0 || String(sorted[0]?.memo || "").trim() !== latestText)) {
            const info = typedStorage.auth.getUserInfo() || {};
            const name = (info && typeof info.name === "string" && info.name.trim()) ? info.name.trim() : "-";
            const nowIso = new Date().toISOString();
            setItems([{ changedBy: name, memo: latestText, changedAt: nowIso, isCurrent: true }, ...sorted]);
          } else {
            setItems(sorted);
          }
        }
      } catch (e) {
        if (!ignore) setError("메모 히스토리를 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [isOpen, entityType, entityId, currentMemo]);

  const headerContent = (
    <div className="memo-history-header">
      <div className="memo-history-header__titles">
        <p className="memo-history-header__eyebrow">Memo History</p>
        <strong className="memo-history-header__title">{headerTitle}</strong>
      </div>
      <button type="button" className="memo-history-close" onClick={onClose} aria-label="닫기">
        ×
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      customHeaderContent={headerContent}
      showFooter={false}
      className="memo-history-modal"
    >
      <div className="memo-history-body">
        {loading && (
          <div className="memo-history-state">불러오는 중...</div>
        )}
        {!loading && error && (
          <div className="memo-history-state memo-history-state--error">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="memo-history-state">기록 없음</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="memo-history-list">
            {items.map((h, idx) => (
              <div
                key={`${h.changedAt || idx}-${idx}`}
                className={`memo-history-card ${h.isCurrent ? "memo-history-card--current" : ""}`}
              >
                <div className="memo-history-meta">
                  <span className="memo-history-author">{h.changedBy || "-"}</span>
                  <span className="memo-history-dot" aria-hidden="true">•</span>
                  <span className="memo-history-time">{formatYyMmDdHhMmSs(h.changedAt)}</span>
                  {h.isCurrent && <span className="memo-history-badge">현재</span>}
                </div>
                <div className="memo-history-text">{h.memo || ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
