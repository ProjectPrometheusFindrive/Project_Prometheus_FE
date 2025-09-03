import React, { useEffect, useRef } from "react";

export default function GeofencePreview({ polygons = [], height = 200 }) {
    const L = typeof window !== "undefined" ? window.L : null;
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const polysRef = useRef([]);

    useEffect(() => {
        if (!L) return;
        if (mapInstanceRef.current) return;

        const map = (mapInstanceRef.current = L.map(mapRef.current, { zoomControl: true }).setView([36.5, 127.9], 6));
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        // When the container may have been hidden or resized before Leaflet measured it,
        // re-invalidate size shortly after creation so tiles render correctly.
        setTimeout(() => {
            try {
                map.invalidateSize();
            } catch {}
        }, 200);

        // Keep a resize handler to invalidate the map when the window resizes
        const onResize = () => {
            try {
                map.invalidateSize();
            } catch {}
        };
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [L]);

    useEffect(() => {
        if (!L) return;
        const map = mapInstanceRef.current;
        if (!map) return;

        // Clear existing layers
        polysRef.current.forEach((pl) => map.removeLayer(pl));
        polysRef.current = [];
        const validPolys = (polygons || [])
            .map((poly) => (Array.isArray(poly) ? poly.filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number") : []))
            .filter((poly) => poly.length > 0);

        const layers = validPolys.map((poly) => {
            const latlngs = poly.map((p) => [p.lat, p.lng]);
            return L.polygon(latlngs, { color: "#0b57d0", weight: 2, fillOpacity: 0.08 }).addTo(map);
        });
        polysRef.current = layers;

        const pts = validPolys.flatMap((poly) => poly.map((p) => [p.lat, p.lng]));
        if (pts.length > 0) {
            try {
                map.fitBounds(pts, { padding: [20, 20] });
            } catch {}
            // If the map container was previously hidden, Leaflet may need a tick to compute sizes.
            setTimeout(() => {
                try {
                    map.invalidateSize();
                    if (pts.length > 0) map.fitBounds(pts, { padding: [20, 20] });
                } catch (e) {
                    // ignore
                }
            }, 250);
        }
    }, [polygons, L]);

    if (!L) return <div>지도를 불러올 수 없습니다.</div>;

    return <div ref={mapRef} className="map-container" style={{ height }} />;
}
