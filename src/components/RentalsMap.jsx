import React, { useEffect, useRef } from "react";
import { dummyGeofences } from "../data/geofences";

export default function RentalsMap({ rentals, filters = { active: true, overdue: true, stolen: true, other: true, geofence: true } }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geofenceLayersRef = useRef([]);

  useEffect(() => {
    const L = window.L;
    if (!L) return; // Leaflet not loaded

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([36.5, 127.9], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Load geofences from companyInfo or legacy key, fallback to dummy
    const loadGeofences = () => {
      try {
        // New location: companyInfo.geofences
        const ciRaw = localStorage.getItem("companyInfo");
        if (ciRaw) {
          const ci = JSON.parse(ciRaw);
          const arr = Array.isArray(ci?.geofences) ? ci.geofences : [];
          const items = arr
            .map((it, i) => {
              if (Array.isArray(it)) return { name: `Polygon ${i + 1}`, points: it };
              if (it && Array.isArray(it.points)) return { name: it.name || `Polygon ${i + 1}`, points: it.points };
              return null;
            })
            .filter(Boolean);
          if (items.length > 0) return items;
        }
      } catch {}
      try {
        const raw = localStorage.getItem("geofenceSets");
        if (raw) {
          const parsed = JSON.parse(raw);
          const arr = Array.isArray(parsed?.geofences) ? parsed.geofences : [];
          const items = arr
            .map((it, i) => {
              if (Array.isArray(it)) return { name: `Polygon ${i + 1}`, points: it };
              if (it && Array.isArray(it.points)) return { name: it.name || `Polygon ${i + 1}`, points: it.points };
              return null;
            })
            .filter(Boolean);
          if (items.length > 0) return items;
        }
      } catch {}
      return dummyGeofences || [];
    };

    const geofences = loadGeofences();

    // Build separate clusters for each status with custom icons
    const makeClusterIcon = (type) => (cluster) =>
      L.divIcon({
        html: `<div class="cluster__inner">${cluster.getChildCount()}</div>`,
        className: `cluster cluster--${type}`,
        iconSize: [40, 40],
      });

    const clusterActive = L.markerClusterGroup({ iconCreateFunction: makeClusterIcon("active") });
    const clusterOverdue = L.markerClusterGroup({ iconCreateFunction: makeClusterIcon("overdue") });
    const clusterStolen = L.markerClusterGroup({ iconCreateFunction: makeClusterIcon("stolen") });
    const clusterOther = L.markerClusterGroup({ iconCreateFunction: makeClusterIcon("other") });

    const now = new Date();

    // Point-in-polygon (ray casting)
    const pointInPolygon = (pt, poly) => {
      if (!Array.isArray(poly) || poly.length < 3) return false;
      const x = pt.lng, y = pt.lat;
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].lng, yi = poly[i].lat;
        const xj = poly[j].lng, yj = poly[j].lat;
        const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };
    // Resolve company HQ location as fallback when current location is missing
    const getCompanyLatLng = () => {
      try {
        const raw = localStorage.getItem('companyInfo');
        const info = raw ? JSON.parse(raw) : null;
        const addr = (info && info.address ? String(info.address) : '').toLowerCase();
        const cityMap = [
          { k: ['seoul', '서울'], lat: 37.5665, lng: 126.9780 },
          { k: ['busan', '부산'], lat: 35.1796, lng: 129.0756 },
          { k: ['incheon', '인천'], lat: 37.4563, lng: 126.7052 },
          { k: ['daegu', '대구'], lat: 35.8714, lng: 128.6014 },
          { k: ['daejeon', '대전'], lat: 36.3504, lng: 127.3845 },
          { k: ['gwangju', '광주'], lat: 35.1595, lng: 126.8526 },
          { k: ['ulsan', '울산'], lat: 35.5384, lng: 129.3114 },
          { k: ['jeju', '제주'], lat: 33.4996, lng: 126.5312 },
        ];
        for (const c of cityMap) {
          if (c.k.some((kw) => addr.includes(kw))) return { lat: c.lat, lng: c.lng };
        }
      } catch {}
      // Default to Seoul City Hall
      return { lat: 37.5665, lng: 126.9780 };
    };

    rentals.forEach((r) => {
      const cp = r.current_location || getCompanyLatLng();

      const start = r?.rental_period?.start ? new Date(r.rental_period.start) : null;
      const end = r?.rental_period?.end ? new Date(r.rental_period.end) : null;
      const isActive = start && end ? now >= start && now <= end : false;
      const isOverdue = end ? now > end : false;
      const isStolen = Boolean(r.reported_stolen);

      let className = "marker marker--car";
      if (isStolen) className = "marker marker--stolen";
      else if (isOverdue) className = "marker marker--overdue";
      else if (isActive) className = "marker marker--active";

      const icon = L.divIcon({ className, html: "🚗", iconSize: [36, 36] });
      const m = L.marker([cp.lat, cp.lng], { icon });

      const overdueDays = end ? Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24))) : 0;
      const inside = geofences
        .map((g) => ({ name: g.name, inside: pointInPolygon(cp, g.points || []) }))
        .filter((x) => x.inside);
      const lines = [
        `<strong>Rental #${r.rental_id}</strong>`,
        `VIN: ${r.vin}`,
        `Renter: ${r.renter_name}`,
        `Period: ${r.rental_period?.start ?? "-"} ~ ${r.rental_period?.end ?? "-"}`,
        inside.length > 0
          ? `<span style=\"color:#0b57d0;\">Inside geofence: ${inside.map((x) => x.name).join(", ")}</span>`
          : `<span style=\"color:#666;\">Inside geofence: None</span>`,
        isStolen
          ? `<span style=\"color:#c62828;font-weight:600;\">Stolen suspected</span>`
          : isOverdue
          ? `<span style=\"color:#f59e0b;font-weight:600;\">Overdue ${overdueDays} day(s)</span>`
          : isActive
          ? `<span style=\"color:#177245;font-weight:600;\">Active</span>`
          : "",
      ].filter(Boolean);
      m.bindPopup(lines.join("<br/>"));

      // Add to corresponding cluster group
      if (isStolen) clusterStolen.addLayer(m);
      else if (isOverdue) clusterOverdue.addLayer(m);
      else if (isActive) clusterActive.addLayer(m);
      else clusterOther.addLayer(m);
    });

    // Add clusters conditionally based on filters
    if (filters.active) map.addLayer(clusterActive);
    if (filters.overdue) map.addLayer(clusterOverdue);
    if (filters.stolen) map.addLayer(clusterStolen);
    if (filters.other) map.addLayer(clusterOther);

    // Legend is rendered in JSX on the page; nothing to patch here.

    // Draw geofences with hatched fill
    const ensureHatchPattern = () => {
      try {
        const svg = map.getPanes()?.overlayPane?.querySelector('svg');
        if (!svg) return null;
        let defs = svg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svg.insertBefore(defs, svg.firstChild);
        }
        let pattern = defs.querySelector('#geo-hatch');
        if (!pattern) {
          pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
          pattern.setAttribute('id', 'geo-hatch');
          pattern.setAttribute('patternUnits', 'userSpaceOnUse');
          pattern.setAttribute('width', '8');
          pattern.setAttribute('height', '8');
          pattern.setAttribute('patternTransform', 'rotate(45)');

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', '0');
          line.setAttribute('y1', '0');
          line.setAttribute('x2', '0');
          line.setAttribute('y2', '8');
          line.setAttribute('stroke', '#0b57d0');
          line.setAttribute('stroke-width', '2');
          line.setAttribute('opacity', '0.5');
          pattern.appendChild(line);

          defs.appendChild(pattern);
        }
        return pattern;
      } catch {
        return null;
      }
    };

    // Create hatch definition (may be re-ensured per layer if SVG not ready yet)
    let pattern = ensureHatchPattern();
    const geofenceLayers = [];
    geofences.forEach((g) => {
      const pts = (g.points || []).filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number');
      if (pts.length < 3) return;
      const latlngs = pts.map((p) => [p.lat, p.lng]);
      const layer = L.polygon(latlngs, {
        color: '#0b57d0',
        weight: 2,
        fillOpacity: 0.1,
        fillColor: '#0b57d0',
      });
      if (filters?.geofence) {
        layer.addTo(map);
      }
      try {
        // Ensure pattern exists after first vector creation
        if (!pattern) pattern = ensureHatchPattern();
        const el = layer.getElement?.();
        if (el && pattern) {
          el.setAttribute('fill', 'url(#geo-hatch)');
          el.setAttribute('fill-opacity', '1');
        }
      } catch {}
      const name = g.name || 'Geofence';
      layer.bindTooltip(name, { sticky: true, className: 'leaflet-tooltip' });
      layer.bindPopup(`<strong>🔒 ${name}</strong>`);
      geofenceLayers.push(layer);

      // Add a small marker at polygon centroid with a lock icon
      try {
        const sum = pts.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
        const c = { lat: sum.lat / pts.length, lng: sum.lng / pts.length };
        const gIcon = L.divIcon({ className: 'marker marker--geo', html: '🔒', iconSize: [36, 36] });
        const gm = L.marker([c.lat, c.lng], { icon: gIcon });
        if (filters?.geofence) {
          gm.addTo(map);
        }
        gm.bindPopup(`<strong>🔒 ${name}</strong>`);
        geofenceLayers.push(gm);
      } catch {}
    });
    geofenceLayersRef.current = geofenceLayers;

    // Fit bounds to include current locations and geofences
    const points = rentals
      .map((r) => r.current_location || getCompanyLatLng())
      .filter(Boolean)
      .map((p) => [p.lat, p.lng]);
    const geofencePoints = filters?.geofence
      ? geofences
          .flatMap((g) => (Array.isArray(g.points) ? g.points : []))
          .map((p) => [p.lat, p.lng])
      : [];
    const allPts = [...points, ...geofencePoints];
    if (allPts.length > 0) {
      map.fitBounds(allPts, { padding: [30, 30] });
    }

    return () => {
      map.removeLayer(clusterActive);
      map.removeLayer(clusterOverdue);
      map.removeLayer(clusterStolen);
      map.removeLayer(clusterOther);
      geofenceLayersRef.current.forEach((l) => {
        try { map.removeLayer(l); } catch {}
      });
      geofenceLayersRef.current = [];
    };
  }, [rentals, filters]);

  // Fallback UI if Leaflet not loaded
  if (!window.L) {
    return <div className="map-container">지도를 불러올 수 없습니다. (Leaflet 미로딩)</div>;
  }

  return <div ref={mapRef} className="map-container" />;
}
