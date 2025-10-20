import React, { useMemo, useState } from "react";

function formatPct(confidence) {
  const c = typeof confidence === "number" ? confidence : (confidence && confidence.value) ? confidence.value : 0;
  const pct = c > 1 ? c : c * 100;
  return `${Math.round(pct)}%`;
}

export default function OcrSuggestionPicker({ items = [], onApply, style = {}, showLabel = true, maxWidth = 220 }) {
  const list = Array.isArray(items) ? items.filter((it) => it && typeof it.value !== "undefined") : [];
  const [index, setIndex] = useState(0);
  const initialIndex = useMemo(() => {
    if (list.length === 0) return 0;
    let best = 0;
    let bestC = -1;
    list.forEach((it, i) => {
      const c = typeof it.confidence === "number" ? it.confidence : (it.confidence && it.confidence.value) ? it.confidence.value : 0;
      const norm = c > 1 ? c / 100 : c;
      if (norm > bestC) { bestC = norm; best = i; }
    });
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(list.map((it) => it.confidence))]);

  React.useEffect(() => { setIndex(initialIndex); }, [initialIndex]);

  if (list.length === 0) return null;

  const apply = () => {
    const it = list[index] || list[0];
    if (!it) return;
    onApply && onApply(it.value);
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0, ...style }}>
      {showLabel ? <span style={{ fontSize: 12, color: "#666" }}>제안</span> : null}
      <select
        className="form-input"
        value={String(index)}
        onChange={(e) => setIndex(Number(e.target.value))}
        style={{ maxWidth, minWidth: 120, flex: "1 1 auto" }}
      >
        {list.map((it, i) => (
          <option key={`${String(it.value)}-${i}`} value={String(i)}>
            {String(it.value)} · {formatPct(it.confidence)}
          </option>
        ))}
      </select>
      <button type="button" className="form-button form-button--muted" onClick={apply} style={{ flex: "0 0 auto", marginTop: 0 }}>
        적용
      </button>
    </div>
  );
}
