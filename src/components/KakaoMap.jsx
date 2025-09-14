import React, { useEffect, useRef, useState } from "react";

const KakaoMap = ({ latitude, longitude, markerTitle = "현재 위치", width = "100%", height = "400px" }) => {
    const mapContainer = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    // 카카오 스크립트 로딩을 위한 별도 useEffect
    useEffect(() => {
        if (window.kakao && window.kakao.maps) {
            setIsScriptLoaded(true);
            return;
        }

        const script = document.createElement('script');
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY || '4c8883615b01fddf76310cc10535008a';
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;

        script.onload = () => {
            if (window.kakao && window.kakao.maps) {
                setIsScriptLoaded(true);
            } else {
                setError('카카오 지도 API를 불러올 수 없습니다');
                setIsLoading(false);
            }
        };

        script.onerror = () => {
            console.error('카카오 지도 스크립트 로드 실패');
            setError('카카오 지도 API 로드 실패 - 도메인 등록을 확인해주세요');
            setIsLoading(false);
        };

        document.head.appendChild(script);

        return () => {
            // cleanup: 스크립트 제거는 하지 않음 (다른 컴포넌트가 사용할 수 있음)
        };
    }, []);

    // 지도 초기화를 위한 별도 useEffect
    useEffect(() => {
        if (!isScriptLoaded || !mapContainer.current) {
            return;
        }

        const initializeMap = () => {
            try {
                // 지도를 생성할 때 필요한 기본 옵션
                const options = {
                    center: new window.kakao.maps.LatLng(latitude, longitude),
                    level: 3
                };

                // 지도 생성
                const map = new window.kakao.maps.Map(mapContainer.current, options);

                // 마커 생성
                const markerPosition = new window.kakao.maps.LatLng(latitude, longitude);
                const marker = new window.kakao.maps.Marker({
                    position: markerPosition
                });

                // 마커를 지도에 표시
                marker.setMap(map);

                // 인포윈도우 생성
                const infowindow = new window.kakao.maps.InfoWindow({
                    content: `<div style="width:150px;text-align:center;padding:6px 0;">${markerTitle}</div>`
                });
                infowindow.open(map, marker);

                setIsLoading(false);
                setError(null);

            } catch (err) {
                console.error('카카오 지도 생성 실패:', err);
                setError('지도를 불러올 수 없습니다');
                setIsLoading(false);
            }
        };

        // kakao.maps.load를 사용하여 지도 라이브러리가 완전히 로드된 후 초기화
        window.kakao.maps.load(() => {
            // 약간의 지연을 두어 DOM이 완전히 준비될 때까지 기다림
            setTimeout(() => {
                if (mapContainer.current) {
                    initializeMap();
                } else {
                    setError('지도 컨테이너를 찾을 수 없습니다');
                    setIsLoading(false);
                }
            }, 50);
        });

    }, [isScriptLoaded, latitude, longitude, markerTitle]);

    // 로딩 상태일 때도 지도 컨테이너를 렌더링하되, 로딩 오버레이를 표시
    const showLoading = isLoading && !error;

    // 에러 상태 (데모 모드)
    if (error) {
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
                        {error}
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

    // 지도 컨테이너 (항상 렌더링)
    return (
        <div style={{ position: "relative", width, height }}>
            {/* 지도 컨테이너 */}
            <div
                ref={mapContainer}
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "8px",
                    border: "2px solid #dee2e6"
                }}
            />

            {/* 로딩 오버레이 */}
            {showLoading && (
                <div style={{
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
                    zIndex: 1000
                }}>
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