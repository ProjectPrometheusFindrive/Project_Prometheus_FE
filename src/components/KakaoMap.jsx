import React, { useEffect, useRef, useState } from "react";

const KakaoMap = ({ latitude, longitude, markerTitle = "현재 위치", width = "100%", height = "400px" }) => {
    const mapContainer = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mapInstance, setMapInstance] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const initMap = async () => {
            if (!mapContainer.current) return;

            try {
                setIsLoading(true);
                setError(null);

                // 카카오 지도 API 확인
                if (!window.kakao || !window.kakao.maps) {
                    throw new Error("Kakao Maps API not loaded");
                }

                // 지도 초기화
                const options = {
                    center: new window.kakao.maps.LatLng(latitude, longitude),
                    level: 3
                };

                const map = new window.kakao.maps.Map(mapContainer.current, options);

                // 마커 생성
                const marker = new window.kakao.maps.Marker({
                    position: new window.kakao.maps.LatLng(latitude, longitude),
                    title: markerTitle
                });

                marker.setMap(map);

                // 정보창 생성
                const infoWindow = new window.kakao.maps.InfoWindow({
                    content: `<div style="padding:8px;font-size:12px;text-align:center;">${markerTitle}</div>`
                });

                // 이벤트 등록
                window.kakao.maps.event.addListener(marker, 'mouseover', () => {
                    infoWindow.open(map, marker);
                });

                window.kakao.maps.event.addListener(marker, 'mouseout', () => {
                    infoWindow.close();
                });

                if (mounted) {
                    setMapInstance({ map, marker, infoWindow });
                    setIsLoading(false);
                }

            } catch (err) {
                console.warn("카카오 지도 로드 실패:", err);
                if (mounted) {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        };

        // API 로드 후 지도 초기화
        const loadAndInit = () => {
            if (window.kakao && window.kakao.maps) {
                initMap();
            } else {
                // API 스크립트 동적 로딩
                const script = document.createElement('script');
                const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY || '4c8883615b01fddf76310cc10535008a';
                script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
                script.onload = () => {
                    if (window.kakao && window.kakao.maps) {
                        window.kakao.maps.load(() => {
                            initMap();
                        }, (error) => {
                            console.error('카카오 maps 초기화 실패:', error);
                            if (mounted) {
                                setError(`카카오 maps 초기화 실패: ${error}`);
                                setIsLoading(false);
                            }
                        });
                    } else {
                        console.error('카카오 maps 객체가 없음', window.kakao);
                        if (mounted) {
                            setError("카카오 maps 객체 로드 실패");
                            setIsLoading(false);
                        }
                    }
                };
                script.onerror = (err) => {
                    console.error('카카오 스크립트 로드 실패:', err);
                    console.error('도메인 등록 필요: https://developers.kakao.com/console/app 에서 Web 플랫폼에 현재 도메인을 등록해주세요');
                    if (mounted) {
                        setError("카카오 지도 API 인증 실패 - 도메인 등록 필요");
                        setIsLoading(false);
                    }
                };
                document.head.appendChild(script);
            }
        };

        loadAndInit();

        return () => {
            mounted = false;
            setMapInstance(null);
        };
    }, [latitude, longitude, markerTitle]);

    // 위치 업데이트
    useEffect(() => {
        if (mapInstance && window.kakao && window.kakao.maps) {
            try {
                const { map, marker } = mapInstance;
                const newPosition = new window.kakao.maps.LatLng(latitude, longitude);

                map.setCenter(newPosition);
                marker.setPosition(newPosition);
            } catch (err) {
                console.warn("지도 위치 업데이트 실패:", err);
            }
        }
    }, [latitude, longitude, mapInstance]);

    // 로딩 상태
    if (isLoading) {
        return (
            <div style={{
                width,
                height,
                borderRadius: "8px",
                border: "2px solid #dee2e6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8f9fa"
            }}>
                <div style={{ textAlign: "center", color: "#666" }}>
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
                    <div>카카오 지도 로딩 중...</div>
                </div>
            </div>
        );
    }

    // 에러 상태 또는 폴백 지도
    if (error || !mapInstance) {
        return (
            <div style={{
                width,
                height,
                borderRadius: "8px",
                border: "2px solid #dee2e6",
                background: `
                    linear-gradient(45deg, #e3f2fd 25%, transparent 25%),
                    linear-gradient(-45deg, #e3f2fd 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #e3f2fd 75%),
                    linear-gradient(-45deg, transparent 75%, #e3f2fd 75%)
                `,
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
            }}>
                <div style={{
                    background: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    textAlign: "center",
                    maxWidth: "300px"
                }}>
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
                    <div style={{ fontWeight: "600", marginBottom: "8px", color: "#1976d2" }}>
                        카카오 지도 (데모 모드)
                    </div>
                    <div style={{ fontSize: "12px", color: "#ff5722", marginBottom: "8px" }}>
                        도메인 등록 필요: developers.kakao.com
                    </div>
                    <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                        {markerTitle}
                    </div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
                        위도: {latitude}<br />
                        경도: {longitude}
                    </div>
                    <div style={{
                        position: "absolute",
                        top: "20px",
                        right: "20px",
                        width: "20px",
                        height: "20px",
                        background: "#dc3545",
                        borderRadius: "50% 50% 50% 0",
                        transform: "rotate(-45deg)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }} />
                </div>
            </div>
        );
    }

    // 정상적인 지도 컨테이너
    return (
        <div
            ref={mapContainer}
            style={{
                width,
                height,
                borderRadius: "8px",
                border: "2px solid #dee2e6"
            }}
        />
    );
};

export default KakaoMap;