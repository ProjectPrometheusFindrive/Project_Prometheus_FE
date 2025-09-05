import React, { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FaCar } from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";
import { fetchGeofences } from "../api";

export default function RentalsMap({ rentals, filters = { active: true, overdue: true, stolen: true, geofence: true }, focusVin = "" }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const geofenceLayersRef = useRef([]);
    const markersRef = useRef({});
    const [geofences, setGeofences] = useState([]);

    // Load geofences once through fake API
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const g = await fetchGeofences();
                if (mounted) setGeofences(Array.isArray(g) ? g : []);
            } catch (e) {
                console.error("Failed to load geofences", e);
                if (mounted) setGeofences([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

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
        markersRef.current = {};

        // geofences are loaded via fakeApi and kept in state

        // Build separate clusters for each status with custom icons
        const makeClusterIcon = (type) => (cluster) =>
            L.divIcon({
                html: `<div class="cluster__inner">${cluster.getChildCount()}</div>`,
                className: `cluster cluster--${type}`,
                iconSize: [40, 40],
            });

        // Create separate cluster groups per status (rented / overdue / suspicious)
        const clusterRented = L.markerClusterGroup({ iconCreateFunction: makeClusterIcon("active") });
        const clusterOverdue = L.markerClusterGroup({ iconCreateFunction: makeClusterIcon("overdue") });
        const clusterSuspicious = L.markerClusterGroup({ iconCreateFunction: makeClusterIcon("stolen") });

        const now = new Date();

        // Point-in-polygon (ray casting)
        const pointInPolygon = (pt, poly) => {
            if (!Array.isArray(poly) || poly.length < 3) return false;
            const x = pt.lng,
                y = pt.lat;
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i].lng,
                    yi = poly[i].lat;
                const xj = poly[j].lng,
                    yj = poly[j].lat;
                const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
                if (intersect) inside = !inside;
            }
            return inside;
        };
        // Resolve company HQ location as fallback when current location is missing
        const getCompanyLatLng = () => {
            try {
                const raw = localStorage.getItem("companyInfo");
                const info = raw ? JSON.parse(raw) : null;
                const addr = (info && info.address ? String(info.address) : "").toLowerCase();
                const cityMap = [
                    { k: ["seoul", "서울"], lat: 37.5665, lng: 126.978 },
                    { k: ["busan", "부산"], lat: 35.1796, lng: 129.0756 },
                    { k: ["incheon", "인천"], lat: 37.4563, lng: 126.7052 },
                    { k: ["daegu", "대구"], lat: 35.8714, lng: 128.6014 },
                    { k: ["daejeon", "대전"], lat: 36.3504, lng: 127.3845 },
                    { k: ["gwangju", "광주"], lat: 35.1595, lng: 126.8526 },
                    { k: ["ulsan", "울산"], lat: 35.5384, lng: 129.3114 },
                    { k: ["jeju", "제주"], lat: 33.4996, lng: 126.5312 },
                ];
                for (const c of cityMap) {
                    if (c.k.some((kw) => addr.includes(kw))) return { lat: c.lat, lng: c.lng };
                }
            } catch {}
            // Default to Seoul City Hall
            return { lat: 37.5665, lng: 126.978 };
        };

        rentals.forEach((r) => {
            const cp = r.current_location || getCompanyLatLng();

            const start = r?.rental_period?.start ? new Date(r.rental_period.start) : null;
            const end = r?.rental_period?.end ? new Date(r.rental_period.end) : null;
            const isActive = start && end ? now >= start && now <= end : false;
            const isOverdue = end ? now > end : false;
            const isStolen = Boolean(r.reported_stolen);

            let className = "marker marker--car";
            if (isStolen) className = "marker marker--suspicious";
            else if (isOverdue) className = "marker marker--overdue";
            else if (isActive) className = "marker marker--rented";

            // Render a small SVG icon that matches NavigationBar
            const IconComp = isStolen ? FiAlertTriangle : FaCar;
            const svg = renderToStaticMarkup(<IconComp className="map-icon-svg" aria-hidden />);
            const icon = L.divIcon({ className, html: svg, iconSize: [28, 28] });
            const zIndexOffset = isStolen ? 3000 : isOverdue ? 2000 : isActive ? 1000 : 0;
            const m = L.marker([cp.lat, cp.lng], { icon, zIndexOffset });
            // annotate marker with a simple status key for cluster counting
            m._status = isStolen ? "suspicious" : isOverdue ? "overdue" : isActive ? "rented" : "other";

            const overdueDays = end ? Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24))) : 0;
            const inside = geofences.map((g) => ({ name: g.name, inside: pointInPolygon(cp, g.points || []) })).filter((x) => x.inside);
            const hasGeofenceProblem = inside.length > 0;

            let statusBadge = "";
            if (isStolen) {
                statusBadge = `<span class="status-badge" style="background:#fef2f2; color:#c62828;">🚨 도난 의심</span>`;
            } else if (isOverdue) {
                statusBadge = `<span class="status-badge" style="background:#fef3c7; color:#d97706;">⏰ 반납 지연 ${overdueDays}일</span>`;
            } else if (hasGeofenceProblem) {
                statusBadge = `<span class="status-badge" style="background:#fef2f2; color:#c62828;">⚠️ 제한구역 침입</span>`;
            } else if (isActive) {
                statusBadge = `<span class="status-badge" style="background:#dcfce7; color:#16a34a;">✅ 정상 운행</span>`;
            }

            const popupContent = `
                <div class="popup-content" style="font-size: 12px; line-height: 1.3; white-space: nowrap;">
                    <div><strong style="font-size: 12px;">대여 계약</strong> #${r.rental_id} </br> <strong>차량번호:</strong> ${r.plate || r.vin} </br> <strong>대여자:</strong> ${
                r.renter_name
            } </br> <strong>대여기간:</strong> ${r.rental_period?.start ?? "-"} ~ ${r.rental_period?.end ?? "-"} </br> <strong>지오펜스:</strong> ${
                hasGeofenceProblem ? `<span style="color:#dc2626; font-weight:600;">제한구역 침입: ${inside.map((x) => x.name).join(", ")}</span>` : `<span style="color:#16a34a;">정상 범위</span>`
            }</div>
                </div>
            `;
            m.bindPopup(popupContent, {
                maxWidth: 300,
                className: "custom-popup",
            });
            m.bindTooltip(`${r.plate || r.vin}`, { permanent: false, direction: "top" });
            try {
                if (r.vin) markersRef.current[r.vin] = m;
            } catch {}

            // Add to the appropriate cluster group based on status and filters
            if (isStolen) {
                if (filters.stolen) clusterSuspicious.addLayer(m);
            } else if (isOverdue) {
                if (filters.overdue) clusterOverdue.addLayer(m);
            } else if (isActive) {
                if (filters.active) clusterRented.addLayer(m);
            } else {
                // 'Other' category removed as unused; skip rendering
            }
        });

        // Add separate cluster groups to the map
        map.addLayer(clusterRented);
        map.addLayer(clusterOverdue);
        map.addLayer(clusterSuspicious);

        // Legend is rendered in JSX on the page; nothing to patch here.

        // Draw geofences with hatched fill
        const ensureHatchPattern = () => {
            try {
                const svg = map.getPanes()?.overlayPane?.querySelector("svg");
                if (!svg) return null;
                let defs = svg.querySelector("defs");
                if (!defs) {
                    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                    svg.insertBefore(defs, svg.firstChild);
                }
                let pattern = defs.querySelector("#geo-hatch");
                if (!pattern) {
                    pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
                    pattern.setAttribute("id", "geo-hatch");
                    pattern.setAttribute("patternUnits", "userSpaceOnUse");
                    pattern.setAttribute("width", "8");
                    pattern.setAttribute("height", "8");
                    pattern.setAttribute("patternTransform", "rotate(45)");

                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", "0");
                    line.setAttribute("y1", "0");
                    line.setAttribute("x2", "0");
                    line.setAttribute("y2", "8");
                    line.setAttribute("stroke", "#6b7280");
                    line.setAttribute("stroke-width", "2");
                    line.setAttribute("opacity", "0.5");
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
            const pts = (g.points || []).filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number");
            if (pts.length < 3) return;
            const latlngs = pts.map((p) => [p.lat, p.lng]);
            const layer = L.polygon(latlngs, {
                color: "#6b7280",
                weight: 2,
                fillOpacity: 0.1,
                fillColor: "#6b7280",
            });
            if (filters?.geofence) {
                layer.addTo(map);
            }
            try {
                // Ensure pattern exists after first vector creation
                if (!pattern) pattern = ensureHatchPattern();
                const el = layer.getElement?.();
                if (el && pattern) {
                    el.setAttribute("fill", "url(#geo-hatch)");
                    el.setAttribute("fill-opacity", "1");
                }
            } catch {}
            const name = g.name || "Geofence";
            layer.bindTooltip(name, { sticky: true, className: "leaflet-tooltip" });
            layer.bindPopup(`
                <div class="popup-content">
                    <strong>⚠️ 제한구역: ${name}</strong>
                    <div style="margin-top: 8px; color: #dc2626; font-size: 13px; font-weight: 500;">
                        차량이 진입하면 안 되는 제한구역입니다.
                    </div>
                </div>
            `);
            geofenceLayers.push(layer);

            // centroid marker intentionally removed; only polygon is shown for geofences
        });
        geofenceLayersRef.current = geofenceLayers;

        // When a specific VIN is requested, zoom to that vehicle and open popup.
        if (focusVin) {
            const marker = markersRef.current[focusVin];
            if (marker) {
                const zoomToMarker = () => {
                    try {
                        map.setView(marker.getLatLng(), 15);
                        marker.openPopup();
                    } catch {}
                };
                // Ask each cluster group to reveal the marker if clustered
                try {
                    clusterRented.zoomToShowLayer(marker, zoomToMarker);
                } catch {}
                try {
                    clusterOverdue.zoomToShowLayer(marker, zoomToMarker);
                } catch {}
                try {
                    clusterSuspicious.zoomToShowLayer(marker, zoomToMarker);
                } catch {}
                // As a fallback, still try to set view directly
                zoomToMarker();
            } else {
                // No marker created (e.g., missing current_location). Use known/fallback coords.
                try {
                    const r = rentals.find((x) => x.vin === focusVin);
                    const cp = r?.current_location || getCompanyLatLng();
                    if (cp) map.setView([cp.lat, cp.lng], 15);
                } catch {}
            }
        } else {
            // Fit bounds to include current locations and geofences
            const points = rentals
                .map((r) => r.current_location || getCompanyLatLng())
                .filter(Boolean)
                .map((p) => [p.lat, p.lng]);
            const geofencePoints = filters?.geofence ? geofences.flatMap((g) => (Array.isArray(g.points) ? g.points : [])).map((p) => [p.lat, p.lng]) : [];
            const allPts = [...points, ...geofencePoints];
            if (allPts.length > 0) {
                map.fitBounds(allPts, { padding: [30, 30] });
            }
        }

        return () => {
            try {
                map.removeLayer(clusterRented);
            } catch {}
            try {
                map.removeLayer(clusterOverdue);
            } catch {}
            try {
                map.removeLayer(clusterSuspicious);
            } catch {}
            geofenceLayersRef.current.forEach((l) => {
                try {
                    map.removeLayer(l);
                } catch {}
            });
            geofenceLayersRef.current = [];
        };
    }, [rentals, filters, focusVin, geofences]);

    // Fallback UI if Leaflet not loaded
    if (!window.L) {
        return <div className="map-container">지도를 불러올 수 없습니다. (Leaflet 미로딩)</div>;
    }

    return <div ref={mapRef} className="map-container" />;
}
