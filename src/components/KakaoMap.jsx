import React, { useEffect, useRef, useState } from "react";

// Precompute small edit-handle marker images once per module
const VERTEX_SVG_BASE64 =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa(
        `\
<svg width=\"8\" height=\"8\" viewBox=\"0 0 8 8\" xmlns=\"http://www.w3.org/2000/svg\">\
  <rect width=\"8\" height=\"8\" fill=\"#ffffff\" stroke=\"#ff6b6b\" stroke-width=\"2\"/>\
</svg>`
      )
    : "");
const MIDPOINT_SVG_BASE64 =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa(
        `\
<svg width=\"6\" height=\"6\" viewBox=\"0 0 6 6\" xmlns=\"http://www.w3.org/2000/svg\">\
  <circle cx=\"3\" cy=\"3\" r=\"3\" fill=\"#ff6b6b\" stroke=\"#ffffff\" stroke-width=\"1\"/>\
</svg>`
      )
    : "");
const LOCATION_SVG_BASE64 =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa(
        `\
<svg width=\"18\" height=\"18\" viewBox=\"0 0 18 18\" xmlns=\"http://www.w3.org/2000/svg\">\
  <circle cx=\"9\" cy=\"9\" r=\"7\" fill=\"white\" stroke=\"#0B57D0\" stroke-width=\"2\"/>\
</svg>`
      )
    : "");

const TRACK_ARROW_INTERVAL = 5;
// Show direction arrows only when sufficiently zoomed-in
// (Kakao map level: smaller number => more zoomed-in)
const TRACK_ARROW_MAX_LEVEL = 4;

const KakaoMap = ({
    latitude,
    longitude,
    vehicleNumber,
    lastUpdateTime,
    markerTitle = "현재 위치",
    width = "100%",
    height = "400px",
    renterName,
    engineOn,
    isOnline,
    polygons = [], // [[{lat, lng}, ...], ...]
    trackingData = [], // 이동 경로 데이터 배열
    editable = false, // 폴리곤 편집 가능 여부
    onPolygonChange = null, // 폴리곤 변경 콜백
    onAddressResolved = null, // 역지오코딩된 주소 콜백
    showSpeedLegend = true,
    showStatusOverlay = true,
}) => {
    const mapContainer = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const mapRef = useRef(null);
    const vehicleMarkerRef = useRef(null);
    const infoWindowRef = useRef(null);
    const geocoderRef = useRef(null);
    const hasFittedBoundsRef = useRef(false);
    const idleListenerRef = useRef(null);

    // Keep overlays and edit handles for cleanup/reuse
    const overlaysRef = useRef({
        polygons: [], // [{ polygon, vertexMarkers: [], midMarkers: [], listeners: [] }]
        polylines: [],
    });

    // 속도에 따른 색상 계산 (3단계)
    const getSpeedColor = (speed) => {
        if (speed < 30) return "#1E88E5"; // 저속 - 파랑 (30km/h 미만)
        if (speed <= 80) return "#43A047"; // 중속 - 초록 (30-80km/h)
        return "#E53935"; // 고속/과속 - 빨강 (80km/h 초과)
    };

    // 경로 데이터 처리 및 그룹화
    const processTrackingData = (data) => {
        if (!data || data.length < 2) return [];
        
        // 시간순 정렬
        const sortedData = [...data].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        
        // 속도별로 세그먼트 그룹화
        const segments = [];
        for (let i = 0; i < sortedData.length - 1; i++) {
            const current = sortedData[i];
            const next = sortedData[i + 1];
            
            segments.push({
                start: { lat: current.latitude, lng: current.longitude },
                end: { lat: next.latitude, lng: next.longitude },
                speed: current.speed,
                color: getSpeedColor(current.speed),
                dateTime: current.dateTime
            });
        }
        
        return segments;
    };

    // 카카오 스크립트 로딩
    useEffect(() => {
        if (window.kakao && window.kakao.maps) {
            setIsScriptLoaded(true);
            return;
        }
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
        const src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,drawing&autoload=false`;
        const existing = document.querySelector(`script[src=\"${src}\"]`) || document.querySelector("script[src*='dapi.kakao.com']");
        if (existing) {
            // Poll until loaded
            const t = setInterval(() => {
                if (window.kakao && window.kakao.maps) {
                    setIsScriptLoaded(true);
                    clearInterval(t);
                }
            }, 100);
            setTimeout(() => clearInterval(t), 5000);
            return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
            if (window.kakao && window.kakao.maps) {
                setIsScriptLoaded(true);
            } else {
                setError("카카오 지도 API를 불러올 수 없습니다");
                setIsLoading(false);
            }
        };
        script.onerror = () => {
            console.error("카카오 지도 스크립트 로드 실패");
            setError("카카오 지도 API 로드 실패 - 도메인 등록을 확인해주세요");
            setIsLoading(false);
        };
        document.head.appendChild(script);
    }, []);

    // Helpers
    const clearPolylines = () => {
        const list = overlaysRef.current.polylines || [];
        list.forEach((pl) => pl && pl.setMap && pl.setMap(null));
        overlaysRef.current.polylines = [];
    };

    const clearPolygons = () => {
        const list = overlaysRef.current.polygons || [];
        list.forEach((entry) => {
            try {
                if (!entry) return;
                if (Array.isArray(entry.vertexMarkers)) entry.vertexMarkers.forEach((m) => m && m.setMap && m.setMap(null));
                if (Array.isArray(entry.midMarkers)) entry.midMarkers.forEach((m) => m && m.setMap && m.setMap(null));
                if (entry.polygon && entry.polygon.setMap) entry.polygon.setMap(null);
                if (entry.labelOverlay && entry.labelOverlay.setMap) entry.labelOverlay.setMap(null);
                if (entry.labelOverlay) entry.labelOverlay = null;
            } catch {}
        });
        overlaysRef.current.polygons = [];
    };

    const toLatLngPath = (points = []) => {
        return points
            .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
            .map((p) => new window.kakao.maps.LatLng(p.lat, p.lng));
    };

    const normalizePolygonsInput = (rawPolygons) => {
        if (!Array.isArray(rawPolygons)) return [];
        return rawPolygons.map((entry, idx) => {
            if (Array.isArray(entry)) {
                return { id: idx, name: "", points: entry, options: {} };
            }
            if (entry && Array.isArray(entry.points)) {
                return {
                    id: entry.id != null ? entry.id : idx,
                    name: entry.name || "",
                    points: entry.points,
                    options: entry.options || {}
                };
            }
            return null;
        });
    };

    const buildLabelElement = (label) => {
        const element = document.createElement("div");
        element.style.pointerEvents = "none";
        element.style.padding = "2px 8px";
        element.style.borderRadius = "12px";
        element.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        element.style.border = "1px solid rgba(11, 87, 208, 0.7)";
        element.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
        element.style.color = "#0b57d0";
        element.style.fontSize = "12px";
        element.style.fontWeight = "600";
        element.style.fontFamily = "Noto Sans KR, Noto Sans, Arial, sans-serif";
        element.style.whiteSpace = "nowrap";
        element.textContent = label;
        return element;
    };

    const removeLabelOverlay = (entry) => {
        if (entry?.labelOverlay) {
            entry.labelOverlay.setMap(null);
            entry.labelOverlay = null;
        }
    };

    const updateLabelOverlay = (map, entry, position, rawLabel) => {
        if (!map || !position) {
            removeLabelOverlay(entry);
            return;
        }
        const normalizedLabel = typeof rawLabel === "string" ? rawLabel.trim() : rawLabel ? String(rawLabel).trim() : "";
        if (!normalizedLabel) {
            removeLabelOverlay(entry);
            return;
        }
        if (!entry.labelOverlay) {
            entry.labelOverlay = new window.kakao.maps.CustomOverlay({
                position,
                content: buildLabelElement(normalizedLabel),
                yAnchor: 1.1,
                xAnchor: 0.5,
            });
            entry.labelOverlay.setMap(map);
            return;
        }
        entry.labelOverlay.setPosition(position);
        const currentContent = entry.labelOverlay.getContent();
        if (currentContent && currentContent.textContent !== normalizedLabel) {
            currentContent.textContent = normalizedLabel;
        }
    };

    const attachEditHandles = (map, polygon, index) => {
        // If not editable or no callback, return empty arrays (markers will be cleared by caller if needed)
        if (!editable || !onPolygonChange) return { vertexMarkers: [], midMarkers: [] };
        
        const path = polygon.getPath();
        const vertexMarkers = [];
        const midMarkers = [];

        // Vertex markers
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const marker = new window.kakao.maps.Marker({
                position: point,
                image: new window.kakao.maps.MarkerImage(
                    VERTEX_SVG_BASE64,
                    new window.kakao.maps.Size(8, 8),
                    { offset: new window.kakao.maps.Point(4, 4) }
                ),
                draggable: true,
                zIndex: 100 // Ensure handles are on top
            });
            marker.setMap(map);
            window.kakao.maps.event.addListener(marker, "dragend", function () {
                const newPosition = marker.getPosition();
                const currentPath = polygon.getPath();
                currentPath[i] = newPosition;
                polygon.setPath(currentPath);
                const newPoints = currentPath.map((pt) => ({ lat: pt.getLat(), lng: pt.getLng() }));
                onPolygonChange(newPoints, index);
                
                // Sync UI immediately
                // sync other vertex markers
                vertexMarkers.forEach((vm, vmIndex) => {
                    if (vmIndex !== i) vm.setPosition(currentPath[vmIndex]);
                });
                // update mid markers positions
                for (let k = 0; k < currentPath.length; k++) {
                    const a = currentPath[k];
                    const b = currentPath[(k + 1) % currentPath.length];
                    const midLat = (a.getLat() + b.getLat()) / 2;
                    const midLng = (a.getLng() + b.getLng()) / 2;
                    if(midMarkers[k]) midMarkers[k].setPosition(new window.kakao.maps.LatLng(midLat, midLng));
                }
            });
            vertexMarkers.push(marker);
        }

        // Midpoint markers
        for (let i = 0; i < path.length; i++) {
            const current = path[i];
            const next = path[(i + 1) % path.length];
            const midLat = (current.getLat() + next.getLat()) / 2;
            const midLng = (current.getLng() + next.getLng()) / 2;
            const midPoint = new window.kakao.maps.LatLng(midLat, midLng);
            const midMarker = new window.kakao.maps.Marker({
                position: midPoint,
                image: new window.kakao.maps.MarkerImage(
                    MIDPOINT_SVG_BASE64,
                    new window.kakao.maps.Size(6, 6),
                    { offset: new window.kakao.maps.Point(3, 3) }
                ),
                draggable: true,
                zIndex: 90
            });
            midMarker.setMap(map);
            window.kakao.maps.event.addListener(midMarker, "dragend", (function (segmentIdx) {
                return function () {
                    const newPosition = midMarker.getPosition();
                    const currentPath = polygon.getPath();
                    currentPath.splice(segmentIdx + 1, 0, newPosition);
                    polygon.setPath(currentPath);
                    const newPoints = currentPath.map((pt) => ({ lat: pt.getLat(), lng: pt.getLng() }));
                    onPolygonChange(newPoints, index);
                };
            })(i));
            midMarkers.push(midMarker);
        }

        return { vertexMarkers, midMarkers };
    };

    const extendBoundsWithPath = (bounds, path) => {
        if (!bounds || !path) return;
        for (let i = 0; i < path.length; i++) {
            bounds.extend(path[i]);
        }
    };

    const extendBoundsWithTrackingPoints = (bounds) => {
        if (!Array.isArray(trackingData)) return;
        for (const point of trackingData) {
            const lat = typeof point?.lat === "number" ? point.lat : point?.latitude;
            const lng = typeof point?.lng === "number" ? point.lng : point?.longitude;
            if (typeof lat === "number" && typeof lng === "number") {
                bounds.extend(new window.kakao.maps.LatLng(lat, lng));
            }
        }
    };

    const fitMapToVisibleData = (map) => {
        if (!map || !window.kakao?.maps) return;
        const bounds = new window.kakao.maps.LatLngBounds();

        overlaysRef.current.polygons.forEach((entry) => {
            if (!entry?.polygon?.getPath) return;
            const path = entry.polygon.getPath();
            extendBoundsWithPath(bounds, path);
        });

        overlaysRef.current.polylines.forEach((pl) => {
            if (!pl?.getPath) return;
            const path = pl.getPath();
            extendBoundsWithPath(bounds, path);
        });

        // If only a single tracking point exists, fall back to raw points so bounds still reflect the trail
        if ((overlaysRef.current.polylines || []).length === 0) {
            extendBoundsWithTrackingPoints(bounds);
        }

        if (vehicleMarkerRef.current?.getPosition) {
            bounds.extend(vehicleMarkerRef.current.getPosition());
        }

        if (!bounds.isEmpty()) {
            map.setBounds(bounds);
            hasFittedBoundsRef.current = true;
        }
    };

    const drawOrUpdatePolygons = (map) => {
        const normalizedPolygons = normalizePolygonsInput(polygons);
        const hasAnyPath =
            normalizedPolygons.some((entry) => entry && Array.isArray(entry.points) && entry.points.length > 0);
        if (!hasAnyPath) {
            clearPolygons();
            return;
        }

        let existing = overlaysRef.current.polygons;
        if (existing.length !== normalizedPolygons.length) {
            clearPolygons();
            existing = overlaysRef.current.polygons;
        }

        const results = new Array(normalizedPolygons.length);
        for (let i = 0; i < normalizedPolygons.length; i++) {
            const polyMeta = normalizedPolygons[i];
            if (!polyMeta || !Array.isArray(polyMeta.points) || polyMeta.points.length === 0) {
                results[i] = null;
                continue;
            }
            const path = toLatLngPath(polyMeta.points);
            if (path.length === 0) {
                results[i] = null;
                continue;
            }

            // Determine Styles
            const defaultColor = "#0b57d0";
            const editColor = "#ff6b6b";
            
            // Allow overrides from props, but enforce edit mode styles if editable is true
            const baseStrokeColor = polyMeta.options?.strokeColor || defaultColor;
            const baseFillColor = polyMeta.options?.fillColor || defaultColor;
            
            const strokeColor = editable ? editColor : baseStrokeColor;
            const fillColor = editable ? editColor : baseFillColor;
            const strokeOpacity = 0.8;
            const fillOpacity = editable ? 0.2 : 0.1;

            let entry = existing[i];
            if (!entry) {
                const polygon = new window.kakao.maps.Polygon({
                    path,
                    strokeWeight: 4,
                    strokeColor,
                    strokeOpacity,
                    strokeStyle: "solid",
                    fillColor,
                    fillOpacity,
                    draggable: false, // We use handles for editing
                    editable: false, // We use custom handles
                });
                polygon.setMap(map);
                const handles = attachEditHandles(map, polygon, i);
                entry = { polygon, ...handles };
            } else {
                entry.polygon.setPath(path);
                entry.polygon.setOptions({
                    strokeColor,
                    fillColor,
                    fillOpacity
                });

                // Update Handles logic
                // If editable is true, ensures handles exist. If false, remove them.
                const hasHandles = Array.isArray(entry.vertexMarkers) && entry.vertexMarkers.length > 0;
                
                if (editable) {
                    if (!hasHandles || entry.vertexMarkers.length !== path.length) {
                        // Re-attach handles if count mismatch or missing
                        // First clear existing
                        if(entry.vertexMarkers) entry.vertexMarkers.forEach(m => m.setMap(null));
                        if(entry.midMarkers) entry.midMarkers.forEach(m => m.setMap(null));
                        
                        const handles = attachEditHandles(map, entry.polygon, i);
                        entry.vertexMarkers = handles.vertexMarkers;
                        entry.midMarkers = handles.midMarkers;
                    } else {
                        // Just update positions
                        try {
                            const currentPath = entry.polygon.getPath();
                            if (Array.isArray(entry.vertexMarkers)) {
                                entry.vertexMarkers.forEach((vm, k) => vm.setPosition(currentPath[k]));
                            }
                            if (Array.isArray(entry.midMarkers)) {
                                for (let k = 0; k < currentPath.length; k++) {
                                    const a = currentPath[k];
                                    const b = currentPath[(k + 1) % currentPath.length];
                                    const midLat = (a.getLat() + b.getLat()) / 2;
                                    const midLng = (a.getLng() + b.getLng()) / 2;
                                    if(entry.midMarkers[k]) entry.midMarkers[k].setPosition(new window.kakao.maps.LatLng(midLat, midLng));
                                }
                            }
                        } catch {}
                    }
                } else {
                    // Not editable, remove handles if present
                    if (hasHandles) {
                        entry.vertexMarkers.forEach(m => m.setMap(null));
                        entry.midMarkers.forEach(m => m.setMap(null));
                        entry.vertexMarkers = [];
                        entry.midMarkers = [];
                    }
                }
            }
            const labelPosition = (entry.polygon.getPath && entry.polygon.getPath()[0]) || path[0];
            updateLabelOverlay(map, entry, labelPosition, polyMeta.name);
            results[i] = entry;
        }
        overlaysRef.current.polygons = results;
    };

    const drawOrUpdatePolylines = (map, options = {}) => {
        const { skipFit } = options || {};
        clearPolylines();
        if (!trackingData || trackingData.length < 2) {
            if (!skipFit) {
                fitMapToVisibleData(map);
            }
            return;
        }
        const segments = processTrackingData(trackingData);
        const list = [];
        const level = typeof map?.getLevel === "function" ? map.getLevel() : null;
        const arrowsEnabled = typeof level === "number" ? level <= TRACK_ARROW_MAX_LEVEL : true;
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const path = [
                new window.kakao.maps.LatLng(segment.start.lat, segment.start.lng),
                new window.kakao.maps.LatLng(segment.end.lat, segment.end.lng),
            ];
            const shouldShowArrow = arrowsEnabled && i % TRACK_ARROW_INTERVAL === 0;
            const polyline = new window.kakao.maps.Polyline({
                path,
                strokeWeight: 4,
                strokeColor: segment.color,
                strokeOpacity: 0.8,
                strokeStyle: "solid",
                endArrow: shouldShowArrow,
            });
            polyline.setMap(map);
            list.push(polyline);
        }
        overlaysRef.current.polylines = list;
        if (!skipFit) {
            fitMapToVisibleData(map);
        }
    };

    const initOrGetGeocoder = () => {
        if (geocoderRef.current) return geocoderRef.current;
        if (window.kakao?.maps?.services?.Geocoder) {
            geocoderRef.current = new window.kakao.maps.services.Geocoder();
        }
        return geocoderRef.current;
    };

    const createOrUpdateVehicleMarker = (map) => {
        if (!latitude || !longitude) return;
        const pos = new window.kakao.maps.LatLng(latitude, longitude);
        if (!vehicleMarkerRef.current) {
            const markerImage = new window.kakao.maps.MarkerImage(
                LOCATION_SVG_BASE64,
                new window.kakao.maps.Size(18, 18),
                { offset: new window.kakao.maps.Point(9, 9) }
            );
            vehicleMarkerRef.current = new window.kakao.maps.Marker({ position: pos, image: markerImage });
            vehicleMarkerRef.current.setMap(map);
        } else {
            vehicleMarkerRef.current.setPosition(pos);
        }

        // InfoWindow
        const formatTime = (timeString) => {
            if (!timeString || timeString === "업데이트 시간 없음") return "업데이트 시간 없음";
            try {
                const date = new Date(timeString);
                const year = date.getFullYear().toString().slice(-2);
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                return `${year}.${month}.${day} ${hours}:${minutes}`;
            } catch (error) {
                return timeString;
            }
        };

        const buildInfoWindow = (address = "주소를 가져오는 중...") => {
            const formattedTime = formatTime(lastUpdateTime);
            const infoContent = `
                <div style=\"padding: 5px; font-family: Arial, sans-serif; width: 240px; line-height: 1.5;\">
                    <div style=\"font-weight: bold; color: #d9534f; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 8px; font-size: 14px;\">
                        ${vehicleNumber || "차량번호 없음"}
                    </div>
                    <div style=\"font-size: 12px; color: #333; display: flex; align-items: center; margin-bottom: 4px;\">
                        <span style=\"margin-right: 5px;\">📍</span>
                        <span>${address}</span>
                    </div>
                    <div style=\"font-size: 12px; color: #555; display: flex; align-items: center;\">
                        <span style=\"margin-right: 5px;\">🕒</span>
                        <span>마지막 GPS: ${formattedTime}</span>
                    </div>
                </div>
            `;
            return new window.kakao.maps.InfoWindow({ content: infoContent, removable: true });
        };

        if (!infoWindowRef.current) {
            infoWindowRef.current = buildInfoWindow();
            infoWindowRef.current.open(map, vehicleMarkerRef.current);
            window.kakao.maps.event.addListener(
                vehicleMarkerRef.current,
                "click",
                () => infoWindowRef.current && infoWindowRef.current.open(map, vehicleMarkerRef.current)
            );
        } else {
            infoWindowRef.current.open(map, vehicleMarkerRef.current);
        }

        const geocoder = initOrGetGeocoder();
        if (geocoder) {
            const lngNum = Number(longitude);
            const latNum = Number(latitude);
            const resolveAddress = (onDone) => {
                const tryAddress = (x, y, next) => {
                    geocoder.coord2Address(x, y, (result, status) => {
                        if (status === window.kakao.maps.services.Status.OK && result && result[0]) {
                            const resolved = result[0].address?.address_name || "";
                            if (resolved) {
                                onDone(resolved);
                                return;
                            }
                        }
                        next();
                    });
                };
                const tryRegion = (x, y, next) => {
                    geocoder.coord2RegionCode(x, y, (result, status) => {
                        if (status === window.kakao.maps.services.Status.OK && result && result[0]) {
                            const resolved = result[0].address_name || "";
                            if (resolved) {
                                onDone(resolved);
                                return;
                            }
                        }
                        next();
                    });
                };

                tryAddress(lngNum, latNum, () => {
                    tryRegion(lngNum, latNum, () => onDone(null));
                });
            };
            if (Number.isFinite(lngNum) && Number.isFinite(latNum)) {
                resolveAddress((resolved) => {
                    if (infoWindowRef.current) {
                        infoWindowRef.current.close();
                        infoWindowRef.current = buildInfoWindow(resolved || "주소 확인 실패");
                        infoWindowRef.current.open(map, vehicleMarkerRef.current);
                    }
                    if (resolved && typeof onAddressResolved === "function") {
                        try {
                            onAddressResolved(resolved);
                        } catch {}
                    }
                });
            }
        }
    };

    // Initialize map once
    useEffect(() => {
        if (!isScriptLoaded || !mapContainer.current || mapRef.current) return;
        const initializeMap = () => {
            try {
                const mapOption = {
                    center: new window.kakao.maps.LatLng(latitude || 37.5665, longitude || 126.978),
                    level: latitude && longitude ? 3 : 7,
                };
                const map = new window.kakao.maps.Map(mapContainer.current, mapOption);
                mapRef.current = map;
                // Initial draw
                drawOrUpdatePolygons(map);
                drawOrUpdatePolylines(map);
                createOrUpdateVehicleMarker(map);
                fitMapToVisibleData(map);
                
                // 지도 타일 로딩 개선: relayout() 호출로 타일 재로딩 유도
                // 지도가 완전히 렌더링된 후 relayout()을 호출하여 타일 재로딩
                setTimeout(() => {
                    try {
                        if (map && mapContainer.current) {
                            const center = map.getCenter();
                            map.relayout();
                            // relayout 후 중심점 복원
                            if (center) {
                                map.setCenter(center);
                            }
                        }
                    } catch (err) {
                        console.warn("지도 relayout 실패:", err);
                    }
                }, 300);
                
                // 추가 재시도: 지도 이벤트 리스너로 타일 로딩 완료 감지
                if (window.kakao?.maps?.event) {
                    const handleIdle = () => {
                        try {
                            if (map && mapContainer.current) {
                                map.relayout();
                            }
                        } catch (err) {
                            console.warn("지도 idle 이벤트 처리 실패:", err);
                        }
                    };
                    window.kakao.maps.event.addListener(map, 'idle', handleIdle);
                    idleListenerRef.current = { map, handler: handleIdle };
                }
                
                setIsLoading(false);
                setError(null);
            } catch (err) {
                console.error("카카오 지도 생성 실패:", err);
                setError("지도를 불러올 수 없습니다");
                setIsLoading(false);
            }
        };
        window.kakao.maps.load(initializeMap);
        return () => {
            // Cleanup on unmount
            try {
                clearPolylines();
                clearPolygons();
                if (vehicleMarkerRef.current) {
                    vehicleMarkerRef.current.setMap(null);
                    vehicleMarkerRef.current = null;
                }
                if (infoWindowRef.current) {
                    infoWindowRef.current.close();
                    infoWindowRef.current = null;
                }
                // 이벤트 리스너 제거
                if (idleListenerRef.current && window.kakao?.maps?.event) {
                    try {
                        window.kakao.maps.event.removeListener(
                            idleListenerRef.current.map,
                            'idle',
                            idleListenerRef.current.handler
                        );
                    } catch {}
                    idleListenerRef.current = null;
                }
                mapRef.current = null;
            } catch {}
        };
    }, [isScriptLoaded]);

    // Update polygons when data changes (no full re-init)
    useEffect(() => {
        if (!mapRef.current || !isScriptLoaded) return;
        drawOrUpdatePolygons(mapRef.current);
    }, [polygons, editable, isScriptLoaded]);

    // Update polylines when tracking data changes
    useEffect(() => {
        if (!mapRef.current || !isScriptLoaded) return;
        drawOrUpdatePolylines(mapRef.current);
    }, [trackingData, isScriptLoaded]);

    // Redraw polylines on zoom change to adjust arrow visibility
    useEffect(() => {
        if (!mapRef.current || !isScriptLoaded || !window.kakao?.maps?.event) return;
        const map = mapRef.current;
        const handler = () => {
            drawOrUpdatePolylines(map, { skipFit: true });
        };
        window.kakao.maps.event.addListener(map, "zoom_changed", handler);
        return () => {
            try {
                window.kakao.maps.event.removeListener(map, "zoom_changed", handler);
            } catch {}
        };
    }, [isScriptLoaded, trackingData]);

    // Update vehicle marker and optionally center on change
    useEffect(() => {
        if (!mapRef.current || !isScriptLoaded) return;
        createOrUpdateVehicleMarker(mapRef.current);
    }, [latitude, longitude, lastUpdateTime, vehicleNumber, isScriptLoaded]);

    const showLoading = isLoading && !error;

    if (error) {
        return <div>{error}</div>;
    }

    const hasTrackingData = Array.isArray(trackingData) && trackingData.length > 0;

    return (
        <div className="relative" style={{ width, height }}>
            {/* 속도 범례 */}
            {showSpeedLegend && hasTrackingData && (
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 px-3 py-1.5 rounded-full shadow-md bg-white/95 dark:bg-slate-800/95 border border-white/70 dark:border-slate-700 text-[11px] text-slate-900 dark:text-slate-100 leading-tight backdrop-blur-sm">
                    <span className="font-bold whitespace-nowrap">속도</span>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <div className="w-4 h-[3px] rounded-full bg-[#1E88E5]" />
                            <span>저속 &lt;30</span>
                        </div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <div className="w-4 h-[3px] rounded-full bg-[#43A047]" />
                            <span>중속 30-80</span>
                        </div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <div className="w-4 h-[3px] rounded-full bg-[#E53935]" />
                            <span>고속 &gt;80</span>
                        </div>
                    </div>
                </div>
            )}
            {showStatusOverlay && (renterName || typeof engineOn !== "undefined" || typeof isOnline !== "undefined") && (
                <div className="absolute top-2.5 left-2.5 z-10 bg-white/90 p-2.5 rounded-lg shadow text-[12px] flex flex-col gap-1.5" style={{ color: "#111827" }}>
                    {renterName && <div className="font-bold">대여자: {renterName}</div>}
                    {typeof engineOn !== "undefined" && (
                        <div>
                            <span>엔진: </span>
                            <span className={`font-bold ${engineOn ? 'text-green-600' : 'text-red-600'}`}>{engineOn ? "ON" : "OFF"}</span>
                        </div>
                    )}
                    {typeof isOnline !== "undefined" && (
                        <div>
                            <span>단말: </span>
                            <span className={`font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>{isOnline ? "온라인" : "오프라인"}</span>
                        </div>
                    )}
                </div>
            )}
            <div ref={mapContainer} className="w-full h-full rounded-lg border-2 border-[#dee2e6]" />
            {showLoading && (
                <div className="absolute inset-0 rounded-lg bg-gray-50 flex items-center justify-center z-[1000]">
                    <div className="text-center text-gray-600">
                        <div className="text-2xl mb-2">🗺️</div>
                        <div>카카오 지도 로딩 중...</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Shallow-deep compare helper for polygons
function equalPolygons(a, b) {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const pa = a[i];
        const pb = b[i];
        if (!Array.isArray(pa) || !Array.isArray(pb)) return false;
        if (pa.length !== pb.length) return false;
        for (let k = 0; k < pa.length; k++) {
            const A = pa[k];
            const B = pb[k];
            if (!A || !B) return false;
            if (A.lat !== B.lat || A.lng !== B.lng) return false;
        }
    }
    return true;
}

const KakaoMapMemo = React.memo(KakaoMap, (prev, next) => {
    // Re-render if dimensions changed (style), polygon data, tracking, or marker position changed
    if (prev.width !== next.width || prev.height !== next.height) return false;
    if (prev.latitude !== next.latitude || prev.longitude !== next.longitude) return false;
    if (prev.vehicleNumber !== next.vehicleNumber || prev.lastUpdateTime !== next.lastUpdateTime) return false;
    if (prev.editable !== next.editable) return false;
    if (prev.showSpeedLegend !== next.showSpeedLegend || prev.showStatusOverlay !== next.showStatusOverlay) return false;
    if (!equalPolygons(prev.polygons, next.polygons)) return false;
    const prevTD = Array.isArray(prev.trackingData) ? prev.trackingData.length : 0;
    const nextTD = Array.isArray(next.trackingData) ? next.trackingData.length : 0;
    if (prevTD !== nextTD) return false;
    return true;
});

export default KakaoMapMemo;
