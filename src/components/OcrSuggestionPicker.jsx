import React, { useMemo, useRef } from "react";

function formatPct(confidence) {
  const c = typeof confidence === "number" ? confidence : (confidence && confidence.value) ? confidence.value : 0;
  const pct = c > 1 ? c : c * 100;
  return `${Math.round(pct)}%`;
}

function normalizeConfidence(confidence) {
  const c = typeof confidence === "number" ? confidence : (confidence && confidence.value) ? confidence.value : 0;
  return c > 1 ? c / 100 : c;
}

function confidenceColor(confidence) {
  const n = normalizeConfidence(confidence);
  // >= 70%: green, >40% and <70%: yellow, <=40%: red
  if (n >= 0.7) return "#2e7d32"; // green
  if (n > 0.4) return "#f9a825"; // yellow/amber
  return "#d32f2f"; // red
}

export default function OcrSuggestionPicker({ items = [], onApply, style = {}, showLabel = true, maxWidth = 220 }) {
  const list = Array.isArray(items)
    ? items.filter((it) => it && typeof it.value !== "undefined" && normalizeConfidence(it.confidence) >= 0.4)
    : [];
  const initialIndex = useMemo(() => {
    if (list.length === 0) return 0;
    let best = 0;
    let bestC = -1;
    list.forEach((it, i) => {
      const norm = normalizeConfidence(it.confidence);
      if (norm > bestC) { bestC = norm; best = i; }
    });
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(list.map((it) => it.confidence))]);

  // Auto-apply the best suggestion once, then only show confidence.
  const appliedRef = useRef(false);
  React.useEffect(() => {
    if (appliedRef.current) return;
    const best = list[initialIndex];
    if (best && normalizeConfidence(best.confidence) >= 0.7 && typeof onApply === "function") {
      onApply(best.value);
      appliedRef.current = true;
    }
  }, [list, initialIndex, onApply]);

  if (list.length === 0) return null;

  const selected = list[initialIndex] || list[0];
  const selectedPct = selected ? formatPct(selected.confidence) : null;
  const selectedColor = selected ? confidenceColor(selected.confidence) : "#666";

  return (
    <div className="flex gap-1.5 items-center flex-wrap min-w-0" style={style}>
      {selectedPct ? (
        <span className="text-[11px]" style={{ color: selectedColor, flex: "0 0 auto" }} title="자동 채움 신뢰도">
          신뢰도 {selectedPct}
        </span>
      ) : null}
    </div>
  );
}
