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
    <section className="card card-padding" style={{ marginTop: 12 }}>
      <h3 className="section-title section-margin-0">단말이벤트 기록</h3>
      <div style={{ marginTop: 8 }}>
        {(!events || events.length === 0) && (
          <div style={{ color: "#666", fontSize: "0.9rem" }}>기록 없음</div>
        )}
        {events && events.length > 0 && (
          <div>
            {events.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div style={{ fontWeight: 600 }}>{e.label || "이벤트"}</div>
                <div style={{ marginLeft: "auto", color: "#333" }}>{e.date || "-"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

