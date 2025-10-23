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
      <div className="max-h-90 overflow-y-auto pt-1">
        {loading && (
          <div className="text-muted p-2">불러오는 중...</div>
        )}
        {!loading && error && (
          <div className="text-danger p-2">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="text-muted p-2">기록 없음</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div>
            {items.map((h, idx) => (
              <div key={`${h.changedAt || idx}-${idx}`} className="py-2 px-1 border-b border-gray-200">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{h.changedBy || "-"}</span>
                  <span className="whitespace-pre-wrap">{h.memo || ""}</span>
                </div>
                <div className="text-[12px] text-gray-500 mt-0.5">{formatYyMmDdHhMmSs(h.changedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
