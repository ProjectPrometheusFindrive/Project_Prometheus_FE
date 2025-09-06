import React, { useEffect, useMemo, useRef, useState } from "react";
import { GeofenceBadge } from "../StatusBadge";

/**
 * GeofenceInput
 * - Lets users create multiple polygon geofences by clicking on a Leaflet map.
 * - Controls: Start New, Undo, Complete, Clear All, and per-polygon Remove.
 * - Value shape: Array of polygons, each polygon is an array of { lat, lng }.
 */
export default function GeofenceInput({ value = [], onChange, readOnly = false, height = 320, showList = true }) {
  const L = typeof window !== "undefined" ? window.L : null;
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({ polygons: [], tempLine: null, tempMarkers: [], vertexMarkers: [] });

  const [polygons, setPolygons] = useState(() => (Array.isArray(value) ? value : []));
  const [draft, setDraft] = useState([]); // current polygon points: [{lat,lng}]
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(isDrawing);
  const readOnlyRef = useRef(readOnly);
  const polygonsStateRef = useRef(polygons);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);
  useEffect(() => {
    polygonsStateRef.current = polygons;
  }, [polygons]);

  // Sync external value → internal state (one-way, only when value changes from outside)
  useEffect(() => {
    if (Array.isArray(value)) setPolygons(value);
  }, [value]);

  // Notify parent when polygons change (avoid render phase updates)
  const lastNotifiedRef = useRef(value);
  useEffect(() => {
    if (onChange && JSON.stringify(polygons) !== JSON.stringify(lastNotifiedRef.current)) {
      lastNotifiedRef.current = polygons;
      onChange(polygons);
    }
  }, [polygons, onChange]);

  // Initialize map once
  useEffect(() => {
    if (!L) return;
    if (mapInstanceRef.current) return;

    const map = (mapInstanceRef.current = L.map(mapRef.current).setView([36.5, 127.9], 7));
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const onClick = (e) => {
      if (!isDrawingRef.current || readOnlyRef.current) return;
      const pt = { lat: e.latlng.lat, lng: e.latlng.lng };
      setDraft((prev) => [...prev, pt]);
    };
    map.on("click", onClick);

    return () => {
      map.off("click", onClick);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [L]);

  // Render layers when polygons or draft changes
  useEffect(() => {
    if (!L) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear temp draft layers
    const { polygons: polyLayers, tempLine, tempMarkers, vertexMarkers } = layersRef.current;
    if (tempLine) {
      map.removeLayer(tempLine);
      layersRef.current.tempLine = null;
    }
    tempMarkers.forEach((m) => map.removeLayer(m));
    layersRef.current.tempMarkers = [];
    // Clear existing vertex markers
    (vertexMarkers || []).forEach((arr) => (arr || []).forEach((m) => { try { map.removeLayer(m); } catch {} }));
    layersRef.current.vertexMarkers = [];

    // Draw existing polygons
    polyLayers.forEach((pl) => map.removeLayer(pl));
    layersRef.current.polygons = (polygons || []).map((poly, pi) => {
      const latlngs = poly.map((p) => [p.lat, p.lng]);
      const layer = L.polygon(latlngs, { color: "#0b57d0", weight: 2, fillOpacity: 0.1 });
      layer.addTo(map);

      // Add draggable vertex markers for editing existing polygons
      const markers = (poly || []).map((pt, vi) => {
        const icon = L.divIcon({
          className: "",
          html: '<div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.2);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        const m = L.marker([pt.lat, pt.lng], { draggable: !readOnly, icon, autoPan: true, autoPanPadding: [30, 30] });
        m.addTo(map);
        if (!readOnly) {
          // Prevent map drag while manipulating a vertex
          m.on("mousedown", (e) => {
            if (e?.originalEvent) {
              e.originalEvent.preventDefault();
              e.originalEvent.stopPropagation();
            }
            try { map.dragging.disable(); } catch {}
          });
          m.on("touchstart", (e) => {
            if (e?.originalEvent) {
              e.originalEvent.preventDefault();
              e.originalEvent.stopPropagation();
            }
            try { map.dragging.disable(); } catch {}
          });
          m.on("dragstart", () => {
            try { map.dragging.disable(); } catch {}
          });
          m.on("drag", (e) => {
            const ll = e.target.getLatLng();
            // Update polygon layer directly for smooth dragging without recreating layers
            const current = (polygonsStateRef.current || []).map((poly) => poly.map((p) => ({ ...p })));
            if (current[pi] && current[pi][vi]) {
              current[pi][vi] = { lat: ll.lat, lng: ll.lng };
            }
            const layer = layersRef.current.polygons[pi];
            if (layer) {
              try {
                layer.setLatLngs(current[pi].map((p) => [p.lat, p.lng]));
              } catch {}
            }
          });
          m.on("dragend", (e) => {
            const ll = e.target.getLatLng();
            // Commit to state once at the end of drag
            setPolygons((prev) => {
              const next = (prev || []).map((poly) => poly.map((p) => ({ ...p })));
              if (next[pi] && next[pi][vi]) {
                next[pi][vi] = { lat: ll.lat, lng: ll.lng };
              }
              return next;
            });
            try { map.dragging.enable(); } catch {}
          });
        }
        return m;
      });
      layersRef.current.vertexMarkers[pi] = markers;

      return layer;
    });

    // Draw draft as a polyline + markers
    if (draft.length > 0) {
      const latlngs = draft.map((p) => [p.lat, p.lng]);
      const line = L.polyline(latlngs, { color: "#f59e0b", weight: 2, dashArray: "4,4" });
      line.addTo(map);
      layersRef.current.tempLine = line;

      draft.forEach((p) => {
        const m = L.circleMarker([p.lat, p.lng], { radius: 4, color: "#f59e0b" });
        m.addTo(map);
        layersRef.current.tempMarkers.push(m);
      });
    }
  }, [polygons, draft, L]);

  // Adjust viewport as user adds points/polygons
  useEffect(() => {
    if (!L) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const polyPts = polygons.flatMap((poly) => poly.map((p) => [p.lat, p.lng]));
    const draftPts = draft.map((p) => [p.lat, p.lng]);
    const totalPts = polyPts.length + draftPts.length;

    if (totalPts >= 2) {
      // From two points onward, include all points
      const all = [...polyPts, ...draftPts];
      try {
        map.fitBounds(all, { padding: [20, 20] });
      } catch {}
    } else if (totalPts === 1) {
      // First click: zoom to a reasonable level around the point
      const [lat, lng] = draftPts[0] || polyPts[0];
      if (typeof lat === "number" && typeof lng === "number") {
        map.setView([lat, lng], Math.max(map.getZoom(), 14));
      }
    }
  }, [polygons, draft, L]);

  const startNew = () => {
    setIsDrawing(true);
    setDraft([]);
  };

  const undoPoint = () => {
    if (!isDrawing || draft.length === 0) return;
    setDraft((prev) => prev.slice(0, -1));
  };

  const complete = () => {
    if (!isDrawing) return;
    if (draft.length < 3) return; // need at least triangle
    const next = [...polygons, draft];
    setPolygons(next);
    setDraft([]);
    setIsDrawing(false);
    if (onChange) onChange(next);
  };

  const clearAll = () => {
    setPolygons([]);
    setDraft([]);
    setIsDrawing(false);
    if (onChange) onChange([]);
  };

  const removePolygon = (idx) => {
    const next = polygons.filter((_, i) => i !== idx);
    setPolygons(next);
    if (onChange) onChange(next);
  };

  // Simple, inline styles to keep component self-contained
  const mapStyle = useMemo(() => ({ height: `${height}px`, border: "1px solid #ddd", borderRadius: 8 }), [height]);

  if (!L) {
    return <div>지도를 불러올 수 없습니다. (Leaflet 미로딩)</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {!readOnly && (
          <>
            {!isDrawing && (
              <button type="button" className="form-button" onClick={startNew}>새 폴리곤 시작</button>
            )}
            {isDrawing && (
              <>
                <button type="button" className="form-button" onClick={undoPoint} disabled={draft.length === 0}>되돌리기</button>
                <button type="button" className="form-button" onClick={complete} disabled={draft.length < 3}>완료</button>
              </>
            )}
            <button type="button" className="form-button" onClick={clearAll} disabled={polygons.length === 0 && draft.length === 0}>전체 삭제</button>
          </>
        )}
      </div>
      <div ref={mapRef} className="geofence-map" style={mapStyle} />
      {showList && (
        <div style={{ marginTop: 8 }}>
          <strong>폴리곤 목록</strong>
          {polygons.length === 0 ? (
            <div className="empty">등록된 폴리곤이 없습니다.</div>
          ) : (
            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              {polygons.map((poly, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GeofenceBadge index={idx} />
                  <span style={{ color: "#555" }}>{poly.length} vertices</span>
                  {!readOnly && (
                    <button type="button" className="form-button" onClick={() => removePolygon(idx)} style={{ marginLeft: "auto" }}>
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
