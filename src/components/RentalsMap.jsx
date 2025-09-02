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
    const currentIcon = L.divIcon({ className: "marker marker--current", html: "C" });

    rentals.forEach((r) => {
      const cp = r.current_location;
      if (cp) {
        const m = L.marker([cp.lat, cp.lng], { icon: currentIcon });
        m.bindPopup(`Current #${r.rental_id}<br/>VIN ${r.vin}`);
        cluster.addLayer(m);
      }
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
