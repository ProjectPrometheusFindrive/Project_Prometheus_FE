import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { fetchAssetMemoHistory, fetchRentalMemoHistory } from "../api";
import { formatYyMmDdHhMmSs } from "../utils/datetime";

export default function MemoHistoryModal({ isOpen, onClose, entityType, entityId, title }) {
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
          });
          setItems(sorted);
        }
      } catch (e) {
        if (!ignore) setError("메모 히스토리를 불러오지 못했습니다.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [isOpen, entityType, entityId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={headerTitle} showFooter={false}>
      <div style={{ maxHeight: 360, overflowY: "auto", paddingTop: 4 }}>
        {loading && (
          <div className="text-muted" style={{ padding: 8 }}>불러오는 중...</div>
        )}
        {!loading && error && (
          <div className="text-danger" style={{ padding: 8 }}>{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="text-muted" style={{ padding: 8 }}>기록 없음</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div>
            {items.map((h, idx) => (
              <div key={`${h.changedAt || idx}-${idx}`} style={{ padding: "8px 4px", borderBottom: "1px solid #eee" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{h.changedBy || "-"}</span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{h.memo || ""}</span>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{formatYyMmDdHhMmSs(h.changedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
