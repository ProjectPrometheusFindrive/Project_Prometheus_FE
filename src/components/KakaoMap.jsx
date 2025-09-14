import React, { useEffect, useRef, useState } from "react";
import carIcon from "../assets/car.svg";

const KakaoMap = ({ latitude, longitude, vehicleNumber, lastUpdateTime, markerTitle = "현재 위치", width = "100%", height = "400px", renterName, engineOn, isOnline }) => {
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

        const script = document.createElement("script");
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY || "4c8883615b01fddf76310cc10535008a";
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;

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
                    level: 3,
                };

                // 지도 생성
                const map = new window.kakao.maps.Map(mapContainer.current, options);

                // 커스텀 마커 이미지 생성 (차량 아이콘)
                const markerImageSrc = carIcon;
                const markerImageSize = new window.kakao.maps.Size(20, 15);
                const markerImageOption = { offset: new window.kakao.maps.Point(16, 16) };

                const markerImage = new window.kakao.maps.MarkerImage(markerImageSrc, markerImageSize, markerImageOption);

                // 마커 생성
                const markerPosition = new window.kakao.maps.LatLng(latitude, longitude);
                const marker = new window.kakao.maps.Marker({
                    position: markerPosition,
                    image: markerImage,
                });

                // 마커를 지도에 표시
                marker.setMap(map);

                // 시간 형식 변환 함수
                const formatTime = (timeString) => {
                    if (!timeString || timeString === "업데이트 시간 없음") {
                        return "업데이트 시간 없음";
                    }

                    try {
                        const date = new Date(timeString);
                        const year = date.getFullYear().toString().slice(-2);
                        const month = String(date.getMonth() + 1).padStart(2, "0");
                        const day = String(date.getDate()).padStart(2, "0");
                        const hours = String(date.getHours()).padStart(2, "0");
                        const minutes = String(date.getMinutes()).padStart(2, "0");

                        return `${year}.${month}.${day} ${hours}:${minutes}`;
                    } catch (error) {
                        return timeString; // 파싱 실패시 원본 그대로 반환
                    }
                };

                // 인포윈도우 생성 함수
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

                    return new window.kakao.maps.InfoWindow({
                        content: infoContent,
                        removable: true,
                    });
                };

                // 기본 인포윈도우 먼저 생성
                let infowindow = createInfoWindow();

                // 마커 클릭 이벤트
                window.kakao.maps.event.addListener(marker, "click", () => {
                    infowindow.open(map, marker);
                });

                // 기본적으로 인포윈도우 열기
                infowindow.open(map, marker);

                // Geocoder 서비스 확인 후 주소 가져오기
                if (window.kakao && window.kakao.maps && window.kakao.maps.services && window.kakao.maps.services.Geocoder) {
                    try {
                        const geocoder = new window.kakao.maps.services.Geocoder();

                        // 좌표로부터 주소 정보 가져오기
                        geocoder.coord2Address(longitude, latitude, (result, status) => {
                            let address = "주소를 찾을 수 없습니다";
                            if (status === window.kakao.maps.services.Status.OK && result[0]) {
                                const addr = result[0].address;
                                address = addr.address_name || "주소를 찾을 수 없습니다";
                            }

                            // 주소를 받아온 후 인포윈도우 업데이트
                            infowindow.close();
                            infowindow = createInfoWindow(address);

                            // 마커 클릭 이벤트 재설정
                            window.kakao.maps.event.addListener(marker, "click", () => {
                                infowindow.open(map, marker);
                            });

                            // 업데이트된 인포윈도우 열기
                            infowindow.open(map, marker);
                        });
                    } catch (geocoderError) {
                        console.warn("Geocoder 초기화 실패:", geocoderError);
                    }
                } else {
                    console.warn("Geocoder 서비스를 사용할 수 없습니다. services 라이브러리가 로드되지 않았을 수 있습니다.");
                }

                setIsLoading(false);
                setError(null);
            } catch (err) {
                console.error("카카오 지도 생성 실패:", err);
                setError("지도를 불러올 수 없습니다");
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
                    setError("지도 컨테이너를 찾을 수 없습니다");
                    setIsLoading(false);
                }
            }, 50);
        });
    }, [isScriptLoaded, latitude, longitude, markerTitle, vehicleNumber, lastUpdateTime]);

    // 로딩 상태일 때도 지도 컨테이너를 렌더링하되, 로딩 오버레이를 표시
    const showLoading = isLoading && !error;

    // 에러 상태 (데모 모드)
    if (error) {
        return (
            <div
                style={{
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
                    position: "relative",
                }}
            >
                <div
                    style={{
                        background: "white",
                        padding: "20px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        textAlign: "center",
                        maxWidth: "300px",
                    }}
                >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
                    <div style={{ fontWeight: "600", marginBottom: "8px", color: "#1976d2" }}>카카오 지도 (데모 모드)</div>
                    <div style={{ fontSize: "12px", color: "#ff5722", marginBottom: "8px" }}>{error}</div>
                    <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>{markerTitle}</div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
                        위도: {latitude}
                        <br />
                        경도: {longitude}
                    </div>
                    <div
                        style={{
                            position: "absolute",
                            top: "20px",
                            right: "20px",
                            width: "20px",
                            height: "20px",
                            background: "#dc3545",
                            borderRadius: "50% 50% 50% 0",
                            transform: "rotate(-45deg)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                    />
                </div>
            </div>
        );
    }

    // 지도 컨테이너 (항상 렌더링)
    return (
        <div style={{ position: "relative", width, height }}>
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
                <div>
                    <span>엔진: </span>
                    <span style={{ color: engineOn ? "green" : "red", fontWeight: "bold" }}>{engineOn ? "ON" : "OFF"}</span>
                </div>
                <div>
                    <span>단말기: </span>
                    <span style={{ color: isOnline ? "green" : "red", fontWeight: "bold" }}>{isOnline ? "온라인" : "오프라인"}</span>
                </div>
            </div>

            {/* 지도 컨테이너 */}
            <div
                ref={mapContainer}
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "8px",
                    border: "2px solid #dee2e6",
                }}
            />

            {/* 로딩 오버레이 */}
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
