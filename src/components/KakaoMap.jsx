import React, { useEffect, useRef, useState } from "react";
import carIcon from "../assets/car.svg";

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
}) => {
    const mapContainer = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const editablePolygonsRef = useRef([]);

    // 속도에 따른 색상 계산 (3단계)
    const getSpeedColor = (speed) => {
        if (speed < 30) return "#4CAF50"; // 저속 - 초록 (30km/h 미만)
        if (speed <= 100) return "#FFC107"; // 중속 - 노랑 (30-100km/h)
        return "#F44336"; // 고속 - 빨강 (100km/h 초과)
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
        const script = document.createElement("script");
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,drawing&autoload=false`;
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

    // 지도 초기화
    useEffect(() => {
        if (!isScriptLoaded || !mapContainer.current) return;

        const initializeMap = () => {
            try {
                const mapOption = {
                    center: new window.kakao.maps.LatLng(latitude || 37.5665, longitude || 126.978),
                    level: latitude && longitude ? 3 : 7,
                };
                const map = new window.kakao.maps.Map(mapContainer.current, mapOption);

                let bounds = new window.kakao.maps.LatLngBounds();

                // 폴리곤 그리기
                if (polygons && polygons.length > 0) {
                    polygons.forEach((polyPoints, index) => {
                        if (!Array.isArray(polyPoints) || polyPoints.length === 0) return;

                        const path = polyPoints.map((p) => new window.kakao.maps.LatLng(p.lat, p.lng));
                        const polygon = new window.kakao.maps.Polygon({
                            path: path,
                            strokeWeight: 3,
                            strokeColor: editable ? "#ff6b6b" : "#0b57d0",
                            strokeOpacity: 0.8,
                            strokeStyle: "solid",
                            fillColor: editable ? "#ff6b6b" : "#0b57d0",
                            fillOpacity: editable ? 0.2 : 0.1,
                            draggable: editable,
                            editable: editable,
                            removable: editable
                        });

                        polygon.setMap(map);
                        path.forEach((p) => bounds.extend(p));

                        // 편집 가능한 경우 이벤트 리스너와 편집점 표시
                        if (editable && onPolygonChange) {
                            editablePolygonsRef.current.push(polygon);

                            // 꼭짓점 마커 표시
                            const vertexMarkers = [];
                            path.forEach((point, vertexIndex) => {
                                const marker = new window.kakao.maps.Marker({
                                    position: point,
                                    image: new window.kakao.maps.MarkerImage(
                                        'data:image/svg+xml;base64,' + btoa(`
                                            <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                                                <rect width="8" height="8" fill="#ffffff" stroke="#ff6b6b" stroke-width="2"/>
                                            </svg>
                                        `),
                                        new window.kakao.maps.Size(8, 8),
                                        { offset: new window.kakao.maps.Point(4, 4) }
                                    ),
                                    draggable: true
                                });

                                marker.setMap(map);
                                vertexMarkers.push(marker);

                                // 마커 드래그 이벤트
                                window.kakao.maps.event.addListener(marker, 'dragend', function() {
                                    const newPosition = marker.getPosition();
                                    const currentPath = polygon.getPath();
                                    currentPath[vertexIndex] = newPosition;
                                    polygon.setPath(currentPath);

                                    const newPoints = currentPath.map(point => ({
                                        lat: point.getLat(),
                                        lng: point.getLng()
                                    }));
                                    onPolygonChange(newPoints, index);

                                    // 다른 꼭짓점 마커들 위치 업데이트
                                    vertexMarkers.forEach((vm, vmIndex) => {
                                        if (vmIndex !== vertexIndex) {
                                            vm.setPosition(currentPath[vmIndex]);
                                        }
                                    });
                                });
                            });

                            // 중간점 마커 표시
                            const midPointMarkers = [];
                            for (let i = 0; i < path.length; i++) {
                                const current = path[i];
                                const next = path[(i + 1) % path.length];

                                const midLat = (current.getLat() + next.getLat()) / 2;
                                const midLng = (current.getLng() + next.getLng()) / 2;
                                const midPoint = new window.kakao.maps.LatLng(midLat, midLng);

                                const midMarker = new window.kakao.maps.Marker({
                                    position: midPoint,
                                    image: new window.kakao.maps.MarkerImage(
                                        'data:image/svg+xml;base64,' + btoa(`
                                            <svg width="6" height="6" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="3" cy="3" r="3" fill="#ff6b6b" stroke="#ffffff" stroke-width="1"/>
                                            </svg>
                                        `),
                                        new window.kakao.maps.Size(6, 6),
                                        { offset: new window.kakao.maps.Point(3, 3) }
                                    ),
                                    draggable: true
                                });

                                midMarker.setMap(map);
                                midPointMarkers.push({ marker: midMarker, segmentIndex: i });

                                // 중간점 드래그로 새 점 추가
                                window.kakao.maps.event.addListener(midMarker, 'dragend', (function(segmentIdx) {
                                    return function() {
                                        const newPosition = midMarker.getPosition();
                                        const currentPath = polygon.getPath();

                                        // 새 점을 해당 세그먼트 다음에 삽입
                                        currentPath.splice(segmentIdx + 1, 0, newPosition);
                                        polygon.setPath(currentPath);

                                        const newPoints = currentPath.map(point => ({
                                            lat: point.getLat(),
                                            lng: point.getLng()
                                        }));
                                        onPolygonChange(newPoints, index);
                                    };
                                })(i));
                            }

                            // 폴리곤 클릭 이벤트
                            window.kakao.maps.event.addListener(polygon, 'click', function() {
                                // Polygon clicked for editing
                            });
                        }
                    });
                }

                // 이동 경로 표시
                if (trackingData && trackingData.length > 0) {
                    const segments = processTrackingData(trackingData);
                    
                    segments.forEach((segment) => {
                        const path = [
                            new window.kakao.maps.LatLng(segment.start.lat, segment.start.lng),
                            new window.kakao.maps.LatLng(segment.end.lat, segment.end.lng)
                        ];
                        
                        const polyline = new window.kakao.maps.Polyline({
                            path: path,
                            strokeWeight: 5,
                            strokeColor: segment.color,
                            strokeOpacity: 0.8,
                            strokeStyle: 'solid'
                        });
                        
                        polyline.setMap(map);
                        
                        // 경로 범위에 추가
                        path.forEach(p => bounds.extend(p));
                    });

                }

                // 마커 표시 (위치 정보가 있을 경우에만)
                if (latitude && longitude) {
                    const markerPosition = new window.kakao.maps.LatLng(latitude, longitude);
                    const markerImage = new window.kakao.maps.MarkerImage(carIcon, new window.kakao.maps.Size(30, 20), { offset: new window.kakao.maps.Point(10, 7.5) });
                    const marker = new window.kakao.maps.Marker({ position: markerPosition, image: markerImage });
                    marker.setMap(map);
                    bounds.extend(markerPosition);

                    // 인포윈도우
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

                    const createInfoWindow = (address = "주소를 가져오는 중...") => {
                        const formattedTime = formatTime(lastUpdateTime);
                        const infoContent = `
                            <div style="padding: 5px; font-family: Arial, sans-serif; width: 240px; line-height: 1.5;">
                                <div style="font-weight: bold; color: #d9534f; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 8px; font-size: 14px;">
                                    ${vehicleNumber || "차량번호 없음"}
                                </div>
                                <div style="font-size: 12px; color: #333; display: flex; align-items: center; margin-bottom: 4px;">
                                    <span style="margin-right: 5px;">📍</span>
                                    <span>${address}</span>
                                </div>
                                <div style="font-size: 12px; color: #555; display: flex; align-items: center;">
                                    <span style="margin-right: 5px;">🕒</span>
                                    <span>마지막 GPS: ${formattedTime}</span>
                                </div>
                            </div>
                        `;
                        return new window.kakao.maps.InfoWindow({ content: infoContent, removable: true });
                    };

                    let infowindow = createInfoWindow();
                    infowindow.open(map, marker);

                    window.kakao.maps.event.addListener(marker, "click", () => infowindow.open(map, marker));

                    if (window.kakao.maps.services.Geocoder) {
                        const geocoder = new window.kakao.maps.services.Geocoder();
                        geocoder.coord2Address(longitude, latitude, (result, status) => {
                            if (status === window.kakao.maps.services.Status.OK && result[0]) {
                                infowindow.close();
                                infowindow = createInfoWindow(result[0].address.address_name);
                                infowindow.open(map, marker);
                            }
                        });
                    }
                }

                // 지도 범위 조정
                if (!bounds.isEmpty()) {
                    map.setBounds(bounds);
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
    }, [isScriptLoaded, latitude, longitude, polygons, trackingData]); // trackingData를 의존성 배열에 추가

    const showLoading = isLoading && !error;

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div style={{ position: "relative", width, height }}>
            {/* 속도 범례 */}
            {trackingData && trackingData.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        zIndex: 10,
                        background: "rgba(255, 255, 255, 0.95)",
                        padding: "12px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        fontSize: "11px",
                        fontFamily: "Arial, sans-serif",
                        minWidth: "120px"
                    }}
                >
                    <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#333" }}>속도 범례</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "12px", height: "3px", backgroundColor: "#4CAF50" }}></div>
                            <span>저속 (30km/h 미만)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "12px", height: "3px", backgroundColor: "#FFC107" }}></div>
                            <span>중속 (30-100km/h)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "12px", height: "3px", backgroundColor: "#F44336" }}></div>
                            <span>고속 (100km/h 초과)</span>
                        </div>
                    </div>
                </div>
            )}
            {(renterName || typeof engineOn !== "undefined") && (
                <div
                    style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        zIndex: 10,
                        background: "rgba(255, 255, 255, 0.9)",
                        padding: "10px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                        fontSize: "12px",
                        fontFamily: "Arial, sans-serif",
                    }}
                >
                    {renterName && <div style={{ fontWeight: "bold" }}>대여자: {renterName}</div>}
                    {typeof engineOn !== "undefined" && (
                        <div>
                            <span>엔진: </span>
                            <span style={{ color: engineOn ? "green" : "red", fontWeight: "bold" }}>{engineOn ? "ON" : "OFF"}</span>
                        </div>
                    )}
                    {typeof isOnline !== "undefined" && (
                        <div>
                            <span>단말기: </span>
                            <span style={{ color: isOnline ? "green" : "red", fontWeight: "bold" }}>{isOnline ? "온라인" : "오프라인"}</span>
                        </div>
                    )}
                </div>
            )}
            <div ref={mapContainer} style={{ width: "100%", height: "100%", borderRadius: "8px", border: "2px solid #dee2e6" }} />
            {showLoading && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: "8px",
                        backgroundColor: "#f8f9fa",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <div style={{ textAlign: "center", color: "#666" }}>
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
                        <div>카카오 지도 로딩 중...</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KakaoMap;
