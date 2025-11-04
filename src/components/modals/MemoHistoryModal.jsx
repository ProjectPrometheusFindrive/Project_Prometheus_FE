import React, { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import { fetchAssetMemoHistory, fetchRentalMemoHistory } from "../../api";
import { formatYyMmDdHhMmSs } from "../../utils/datetime";
import { typedStorage } from "../../utils/storage";

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
          });

          // Include the most recent memo (current value) at top if missing
          const latestText = typeof currentMemo === "string" ? currentMemo.trim() : "";
          if (latestText && (sorted.length === 0 || String(sorted[0]?.memo || "").trim() !== latestText)) {
            const info = typedStorage.auth.getUserInfo() || {};
            const name = (info && typeof info.name === "string" && info.name.trim()) ? info.name.trim() : "-";
            const nowIso = new Date().toISOString();
            setItems([{ changedBy: name, memo: latestText, changedAt: nowIso }, ...sorted]);
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
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{h.changedBy || "-"}</span>
                  <span className="text-gray-400">-</span>
                  <span className="whitespace-pre-wrap">{h.memo || ""}</span>
                  <span className="text-[12px] text-gray-500">· {formatYyMmDdHhMmSs(h.changedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
