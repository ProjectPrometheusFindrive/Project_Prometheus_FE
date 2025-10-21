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
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
        if (!apiKey) {
            console.error("VITE_KAKAO_MAP_API_KEY is not set in environment variables");
            setIsKakaoReady(false);
            return;
        }
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

            const handleDataChange = () => {
                try {
                    const data = drawingManager.getData();

                    if (data && Array.isArray(data.polygon)) {
                        const toLatLng = (pt) => {
                            try {
                                if (!pt) return null;
                                if (typeof pt.getLat === 'function' && typeof pt.getLng === 'function') {
                                    return { lat: pt.getLat(), lng: pt.getLng() };
                                }
                                if (typeof pt.getY === 'function' && typeof pt.getX === 'function') {
                                    return { lat: pt.getY(), lng: pt.getX() };
                                }
                                if (typeof pt.lat === 'number' && typeof pt.lng === 'number') {
                                    return { lat: pt.lat, lng: pt.lng };
                                }
                                if (typeof pt.y === 'number' && typeof pt.x === 'number') {
                                    return { lat: pt.y, lng: pt.x };
                                }
                                return null;
                            } catch {
                                return null;
                            }
                        };

                        const extractPath = (poly) => {
                            try {
                                if (!poly) return [];
                                // Overlay instance with getPath()
                                if (typeof poly.getPath === 'function') {
                                    const path = poly.getPath();
                                    const arr = typeof path?.getArray === 'function' ? path.getArray() : path;
                                    return (Array.isArray(arr) ? arr : []).map(toLatLng).filter(Boolean);
                                }
                                // Overlay instance with getPoints()
                                if (typeof poly.getPoints === 'function') {
                                    const arr = poly.getPoints();
                                    return (Array.isArray(arr) ? arr : []).map(toLatLng).filter(Boolean);
                                }
                                // Data object with path or points
                                if (Array.isArray(poly.path)) {
                                    return poly.path.map(toLatLng).filter(Boolean);
                                }
                                if (Array.isArray(poly.points)) {
                                    return poly.points.map(toLatLng).filter(Boolean);
                                }
                                // Already an array of points
                                if (Array.isArray(poly)) {
                                    return poly.map(toLatLng).filter(Boolean);
                                }
                                return [];
                            } catch {
                                return [];
                            }
                        };

                        const newPolygons = data.polygon
                            .map(extractPath)
                            .filter((pts) => Array.isArray(pts) && pts.length > 0);

                        if (onChange && newPolygons) {
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
        if (!map) return;

        // Add delay to ensure DrawingManager is ready
        const loadPolygons = () => {
            try {
                // Clear existing polygons first
                clearExistingPolygons();

                if (!value || !Array.isArray(value) || value.length === 0) {
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

                if (polygonPaths.length > 0) {
                    // Add polygons to DrawingManager if available and not read-only
                    if (drawingManagerRef.current && !readOnly) {
                        try {
                            // Use put method with coordinate array instead of polygon object
                            polygonPaths.forEach((path, index) => {
                                drawingManagerRef.current.put(window.kakao.maps.drawing.OverlayType.POLYGON, path);
                            });

                            // After adding polygons, ensure edit mode is enabled
                            setTimeout(() => {
                                try {
                                    if (drawingManagerRef.current) {
                                        // Try to activate polygon editing mode
                                        drawingManagerRef.current.select(window.kakao.maps.drawing.OverlayType.POLYGON);

                                        // Get the added polygons and check if they're editable
                                        const data = drawingManagerRef.current.getData();
                                        if (data && data.polygon) {
                                            data.polygon.forEach((polygon, idx) => {
                                                // Try to enable editing for each polygon
                                                try {
                                                    if (polygon.setEditable) {
                                                        polygon.setEditable(true);
                                                    }
                                                    if (polygon.setDraggable) {
                                                        polygon.setDraggable(true);
                                                    }
                                                } catch (setError) {
                                                    if (import.meta.env.DEV) {
                                                        console.debug(`Could not set edit properties for polygon ${idx + 1}:`, setError);
                                                    }
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
            {!isKakaoReady && <div className="mb-2 text-[12px] text-gray-500">카카오 지도를 로딩 중입니다...</div>}
            {!readOnly && isKakaoReady}
            <div ref={mapContainer} style={{ width: "100%", height: `${height}px` }} className="border border-gray-300 rounded-lg" />
        </div>
    );
}
