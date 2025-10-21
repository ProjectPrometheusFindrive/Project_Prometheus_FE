import React, { useMemo } from "react";

export default function DeviceEventLog({ assetId, history = [], fallbackInstallDate = "" }) {
  const events = useMemo(() => {
    const list = Array.isArray(history) ? history : [];
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
    return list.map((e, idx) => ({
      id: e.id || `${assetId}-devhist-${idx}`,
      type: e.type || "event",
      label: e.label || (e.type === "install" ? "단말 장착" : "이벤트"),
      date: e.date || e.installDate || "",
      meta: e.meta || { installer: e.installer, supplier: e.supplier },
    }));
  }, [assetId, history, fallbackInstallDate]);

  return (
    <div className="mt-4">
      <div className="asset-doc__title mb-1.5">단말 이벤트 기록</div>
      {(!events || events.length === 0) && (
        <div className="text-gray-600 text-[0.9rem] py-2">기록 없음</div>
      )}
      {events && events.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {events.map((e) => (
            <div key={e.id} className="asset-history__item">
              <div className="text-[12px]">{e.label || "이벤트"} {e.date || "-"}</div>
              {e.meta && !e.meta.virtual && (
                <div className="text-[12px] text-gray-600">
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
