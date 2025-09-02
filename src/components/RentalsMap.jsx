import React, { useEffect, useRef } from "react";

export default function RentalsMap({ rentals }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

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

    // Use a cluster group to merge nearby markers and show counts
    const cluster = L.markerClusterGroup();

    const now = new Date();
    rentals.forEach((r) => {
      const cp = r.current_location;
      if (!cp) return;

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
      const lines = [
        `<strong>Rental #${r.rental_id}</strong>`,
        `VIN: ${r.vin}`,
        `Renter: ${r.renter_name}`,
        `Period: ${r.rental_period?.start ?? "-"} ~ ${r.rental_period?.end ?? "-"}`,
        isStolen
          ? `<span style=\"color:#c62828;font-weight:600;\">Stolen suspected</span>`
          : isOverdue
          ? `<span style=\"color:#f59e0b;font-weight:600;\">Overdue ${overdueDays} day(s)</span>`
          : isActive
          ? `<span style=\"color:#177245;font-weight:600;\">Active</span>`
          : "",
      ].filter(Boolean);
      m.bindPopup(lines.join("<br/>"));

      cluster.addLayer(m);
    });

    map.addLayer(cluster);

    // Fit bounds to current locations only
    const points = rentals
      .map((r) => r.current_location)
      .filter(Boolean)
      .map((p) => [p.lat, p.lng]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [30, 30] });
    }

    return () => {
      map.removeLayer(cluster);
    };
  }, [rentals]);

  // Fallback UI if Leaflet not loaded
  if (!window.L) {
    return <div className="map-container">지도를 불러올 수 없습니다. (Leaflet 미로딩)</div>;
  }

  return <div ref={mapRef} className="map-container" />;
}
