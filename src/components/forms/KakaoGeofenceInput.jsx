import React, { useEffect, useRef, useState } from "react";

export default function KakaoGeofenceInput({ value = [], onChange, readOnly = false, height = 360 }) {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    const [isKakaoReady, setIsKakaoReady] = useState(false);
    const drawingManagerRef = useRef(null);
    const existingPolygonsRef = useRef([]);

    // Load Kakao Maps API script
    useEffect(() => {
        if (window.kakao && window.kakao.maps && window.kakao.maps.drawing) {
            setIsKakaoReady(true);
            return;
        }

        const script = document.createElement("script");
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY || "4c8883615b01fddf76310cc10535008a";
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,drawing&autoload=false`;

        script.onload = () => {
            if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => {
                    if (window.kakao.maps.drawing) {
                        setIsKakaoReady(true);
                    } else {
                        console.error("Kakao Maps Drawing library not loaded");
                    }
                });
            } else {
                console.error("Kakao Maps API not available");
            }
        };

        script.onerror = () => {
            console.error("Failed to load Kakao Maps script");
        };

        // Check if script already exists
        const existingScript = document.querySelector(`script[src*="dapi.kakao.com"]`);
        if (!existingScript) {
            document.head.appendChild(script);
        } else {
            // Script already exists, check if it's loaded
            const checkInterval = setInterval(() => {
                if (window.kakao && window.kakao.maps && window.kakao.maps.drawing) {
                    setIsKakaoReady(true);
                    clearInterval(checkInterval);
                }
            }, 100);

            setTimeout(() => clearInterval(checkInterval), 5000); // Timeout after 5 seconds
        }
    }, []);

    // Initialize map
    useEffect(() => {
        if (!isKakaoReady || !mapContainer.current || map) return;

        const initializeMap = () => {
            try {
                const mapOption = {
                    center: new window.kakao.maps.LatLng(36.5, 127.9),
                    level: 7,
                };
                const newMap = new window.kakao.maps.Map(mapContainer.current, mapOption);
                setMap(newMap);
            } catch (error) {
                console.error("Failed to initialize Kakao map:", error);
            }
        };

        window.kakao.maps.load(initializeMap);
    }, [isKakaoReady, map]);

    // Initialize DrawingManager
    useEffect(() => {
        if (!map || readOnly || drawingManagerRef.current) return;

        try {
            const drawingManager = new window.kakao.maps.drawing.DrawingManager({
                map: map,
                drawingMode: [window.kakao.maps.drawing.OverlayType.POLYGON],
                guideTooltip: ["draw", "drag", "edit"],
                polygonOptions: {
                    strokeWeight: 3,
                    strokeColor: "#0066ff",
                    strokeOpacity: 0.8,
                    strokeStyle: "solid",
                    fillColor: "#0066ff",
                    fillOpacity: 0.2,
                    draggable: true,
                    removable: true,
                    editable: true,
                },
                // Enable editing mode by default
                editingMode: true,
            });

            drawingManagerRef.current = drawingManager;

            // Ensure drawing mode is properly set
            setTimeout(() => {
                try {
                    if (drawingManagerRef.current) {
                        drawingManagerRef.current.select(window.kakao.maps.drawing.OverlayType.POLYGON);
                    }
                } catch (error) {
                    console.error("Error activating polygon drawing mode:", error);
                }
            }, 100);

            const handleDataChange = (e) => {
                try {
                    const data = drawingManager.getData();

                    if (data && data.polygon && Array.isArray(data.polygon)) {
                        const newPolygons = data.polygon.map((p) => {
                            return p.getPoints().map((point) => ({ lat: point.y, lng: point.x }));
                        });

                        if (onChange) {
                            onChange(newPolygons);
                        }
                    }
                } catch (error) {
                    console.error("Error handling drawing data change:", error);
                }
            };

            // Add event listeners
            window.kakao.maps.event.addListener(drawingManager, "drawend", handleDataChange);
            window.kakao.maps.event.addListener(drawingManager, "remove", handleDataChange);
            window.kakao.maps.event.addListener(drawingManager, "edit", handleDataChange);

            // Cleanup function
            return () => {
                if (drawingManagerRef.current) {
                    try {
                        drawingManagerRef.current.cancel();
                        drawingManagerRef.current = null;
                    } catch (error) {
                        console.error("Error during DrawingManager cleanup:", error);
                    }
                }
            };
        } catch (error) {
            console.error("Failed to initialize DrawingManager:", error);
        }
    }, [map, readOnly, onChange]);

    // Clear existing polygons
    const clearExistingPolygons = () => {
        // If DrawingManager is managing polygons, clear its data
        if (drawingManagerRef.current && !readOnly) {
            try {
                // Get current data and clear polygons
                const data = drawingManagerRef.current.getData();
                if (data && data.polygon && data.polygon.length > 0) {
                    // Remove all polygons from DrawingManager
                    data.polygon.forEach((polygon) => {
                        try {
                            drawingManagerRef.current.remove(polygon);
                        } catch (error) {
                            // Ignore removal errors
                        }
                    });
                }
            } catch (error) {
                console.log("Error clearing DrawingManager data:", error);
            }
        }

        // Also clear manually tracked polygons
        existingPolygonsRef.current.forEach((polygon) => {
            try {
                polygon.setMap(null);
            } catch (error) {
                console.error("Error removing polygon:", error);
            }
        });
        existingPolygonsRef.current = [];
    };

    // Load initial polygon data
    useEffect(() => {
        console.log("KakaoGeofenceInput - value changed:", value);
        console.log("KakaoGeofenceInput - map available:", !!map);
        console.log("KakaoGeofenceInput - drawingManager available:", !!drawingManagerRef.current);

        if (!map) return;

        // Add delay to ensure DrawingManager is ready
        const loadPolygons = () => {
            try {
                // Clear existing polygons first
                clearExistingPolygons();

                if (!value || !Array.isArray(value) || value.length === 0) {
                    console.log("KakaoGeofenceInput - no value to load");
                    return;
                }

                const polygonPaths = value
                    .map((poly) => {
                        if (!Array.isArray(poly)) return [];
                        return poly
                            .map((p) => {
                                if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") return null;
                                return new window.kakao.maps.LatLng(p.lat, p.lng);
                            })
                            .filter(Boolean);
                    })
                    .filter((poly) => poly.length > 0);

                console.log("KakaoGeofenceInput - processed polygon paths:", polygonPaths);

                if (polygonPaths.length > 0) {
                    // Add polygons to DrawingManager if available and not read-only
                    if (drawingManagerRef.current && !readOnly) {
                        try {
                            // Use put method with coordinate array instead of polygon object
                            polygonPaths.forEach((path, index) => {
                                console.log("Adding path to DrawingManager:", path);
                                drawingManagerRef.current.put(window.kakao.maps.drawing.OverlayType.POLYGON, path);
                                console.log(`Path ${index + 1} added to DrawingManager for editing`);
                            });

                            // After adding polygons, ensure edit mode is enabled
                            setTimeout(() => {
                                try {
                                    if (drawingManagerRef.current) {
                                        // Try to activate polygon editing mode
                                        drawingManagerRef.current.select(window.kakao.maps.drawing.OverlayType.POLYGON);
                                        console.log("Polygon editing mode activated");

                                        // Get the added polygons and check if they're editable
                                        const data = drawingManagerRef.current.getData();
                                        if (data && data.polygon) {
                                            console.log("Current polygons in DrawingManager:", data.polygon.length);
                                            data.polygon.forEach((polygon, idx) => {
                                                console.log(`Polygon ${idx + 1} editable:`, polygon.getEditable ? polygon.getEditable() : "unknown");

                                                // Try to enable editing for each polygon
                                                try {
                                                    if (polygon.setEditable) {
                                                        polygon.setEditable(true);
                                                        console.log(`Enabled editing for polygon ${idx + 1}`);
                                                    }
                                                    if (polygon.setDraggable) {
                                                        polygon.setDraggable(true);
                                                        console.log(`Enabled dragging for polygon ${idx + 1}`);
                                                    }
                                                } catch (setError) {
                                                    console.log(`Could not set edit properties for polygon ${idx + 1}:`, setError);
                                                }
                                            });
                                        }
                                    }
                                } catch (editError) {
                                    console.error("Error activating edit mode:", editError);
                                }
                            }, 100);
                        } catch (error) {
                            console.error("Error adding paths to DrawingManager:", error);
                            // Fallback: create regular polygons and display on map
                            polygonPaths.forEach((path) => {
                                const polygon = new window.kakao.maps.Polygon({
                                    path: path,
                                    strokeWeight: 3,
                                    strokeColor: "#0066ff",
                                    strokeOpacity: 0.8,
                                    strokeStyle: "solid",
                                    fillColor: "#0066ff",
                                    fillOpacity: 0.2,
                                });
                                polygon.setMap(map);
                                existingPolygonsRef.current.push(polygon);
                            });
                        }
                    } else {
                        // Just display on map if no DrawingManager or read-only
                        polygonPaths.forEach((path) => {
                            const polygon = new window.kakao.maps.Polygon({
                                path: path,
                                strokeWeight: 3,
                                strokeColor: "#0066ff",
                                strokeOpacity: 0.8,
                                strokeStyle: "solid",
                                fillColor: "#0066ff",
                                fillOpacity: 0.2,
                            });
                            polygon.setMap(map);
                            existingPolygonsRef.current.push(polygon);
                        });
                    }

                    // Set map bounds to fit all polygons
                    const bounds = new window.kakao.maps.LatLngBounds();
                    polygonPaths.forEach((path) => {
                        path.forEach((point) => bounds.extend(point));
                    });

                    if (!bounds.isEmpty()) {
                        map.setBounds(bounds);
                    }

                    console.log("KakaoGeofenceInput - polygons loaded successfully");
                }
            } catch (error) {
                console.error("Error loading initial polygon data:", error);
            }
        };

        // Add delay if DrawingManager is not ready yet
        if (drawingManagerRef.current) {
            loadPolygons();
        } else {
            setTimeout(loadPolygons, 200);
        }
    }, [map, value, readOnly]);

    // Cleanup polygons on unmount
    useEffect(() => {
        return () => {
            clearExistingPolygons();
        };
    }, []);

    return (
        <div>
            {!isKakaoReady && <div style={{ marginBottom: "8px", fontSize: "12px", color: "#999" }}>카카오 지도를 로딩 중입니다...</div>}
            {!readOnly && isKakaoReady}
            <div ref={mapContainer} style={{ width: "100%", height: `${height}px`, border: "1px solid #ddd", borderRadius: 8 }} />
        </div>
    );
}
