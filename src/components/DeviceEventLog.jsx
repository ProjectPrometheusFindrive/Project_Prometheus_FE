import React, { useMemo } from "react";
import { typedStorage } from "../utils/storage";

export default function DeviceEventLog({ assetId, fallbackInstallDate = "" }) {
  const events = useMemo(() => {
    const list = typedStorage.devices.getEvents(assetId) || [];
    if ((!list || list.length === 0) && fallbackInstallDate) {
      return [
        {
          id: `virtual-install-${assetId}`,
          type: "install",
          label: "단말 장착일",
          date: fallbackInstallDate,
          meta: { virtual: true },
        },
      ];
    }
    return list;
  }, [assetId, fallbackInstallDate]);

  return (
    <div style={{ marginTop: 16 }}>
      <div className="asset-doc__title" style={{ marginBottom: 6 }}>단말 이벤트 기록</div>
      {(!events || events.length === 0) && (
        <div style={{ color: "#666", fontSize: "0.9rem", padding: "8px 0" }}>기록 없음</div>
      )}
      {events && events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {events.map((e) => (
            <div key={e.id} className="asset-history__item">
              <div style={{ fontSize: 12 }}>{e.label || "이벤트"} {e.date || "-"}</div>
              {e.meta && !e.meta.virtual && (
                <div style={{ fontSize: 12, color: '#666' }}>
                  {e.meta.installer && `장착자: ${e.meta.installer}`}
                  {e.meta.supplier && ` · 공급사: ${e.meta.supplier}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

