import React, { useEffect, useRef, useState } from "react";

export default function KakaoGeofenceInput({ value = [], onChange, readOnly = false, height = 360 }) {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    // Separate readiness: base maps vs drawing library
    const [isMapsReady, setIsMapsReady] = useState(false);
    const [isDrawingReady, setIsDrawingReady] = useState(false);
    const drawingManagerRef = useRef(null);
    const existingPolygonsRef = useRef([]);

    // Load Kakao Maps API script
    useEffect(() => {
        if (window.kakao && window.kakao.maps) {
            // Maps core is ready
            setIsMapsReady(true);
            // Drawing library may or may not be present depending on who loaded the script
            if (window.kakao.maps.drawing) setIsDrawingReady(true);
        }

        const script = document.createElement("script");
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
        if (!apiKey) {
            console.error("VITE_KAKAO_MAP_API_KEY is not set in environment variables");
            setIsMapsReady(false);
            setIsDrawingReady(false);
            return;
        }
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,drawing&autoload=false`;

        script.onload = () => {
            if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => {
                    setIsMapsReady(true);
                    if (window.kakao.maps.drawing) setIsDrawingReady(true);
                    else console.error("Kakao Maps Drawing library not loaded");
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
            // Script already exists. With autoload=false, we must ensure SDK initialization.
            try {
                if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
                    window.kakao.maps.load(() => {
                        setIsMapsReady(true);
                        if (window.kakao?.maps?.drawing) {
                            setIsDrawingReady(true);
                        } else {
                            // Existing script may have been loaded without the drawing library.
                            // Append an additional script tag that requests the drawing library.
                            const hasDrawingScript = document.querySelector("script[src*='libraries=drawing']");
                            if (!hasDrawingScript) {
                                const addScript = document.createElement("script");
                                addScript.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,drawing&autoload=false`;
                                addScript.onload = () => {
                                    try {
                                        if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
                                            window.kakao.maps.load(() => setIsDrawingReady(true));
                                        } else {
                                            const t2 = setInterval(() => {
                                                if (window.kakao && window.kakao.maps && window.kakao.maps.drawing) {
                                                    setIsDrawingReady(true);
                                                    clearInterval(t2);
                                                }
                                            }, 100);
                                            setTimeout(() => clearInterval(t2), 5000);
                                        }
                                    } catch {}
                                };
                                addScript.onerror = () => {
                                    console.error("Failed to load Kakao Maps drawing library");
                                };
                                document.head.appendChild(addScript);
                            } else {
                                const t = setInterval(() => {
                                    if (window.kakao && window.kakao.maps && window.kakao.maps.drawing) {
                                        setIsDrawingReady(true);
                                        clearInterval(t);
                                    }
                                }, 100);
                                setTimeout(() => clearInterval(t), 5000);
                            }
                        }
                    });
                } else if (window.kakao && window.kakao.maps && window.kakao.maps.drawing) {
                    // Already initialized
                    setIsMapsReady(true);
                    setIsDrawingReady(true);
                } else {
                    // Last resort: poll for availability
                    const checkInterval = setInterval(() => {
                        if (window.kakao && window.kakao.maps) {
                            setIsMapsReady(true);
                            if (window.kakao.maps.drawing) setIsDrawingReady(true);
                            clearInterval(checkInterval);
                        }
                    }, 100);
                    setTimeout(() => clearInterval(checkInterval), 5000);
                }
            } catch (e) {
                const checkInterval = setInterval(() => {
                    if (window.kakao && window.kakao.maps) {
                        setIsMapsReady(true);
                        if (window.kakao.maps.drawing) setIsDrawingReady(true);
                        clearInterval(checkInterval);
                    }
                }, 100);
                setTimeout(() => clearInterval(checkInterval), 5000);
            }
        }
    }, []);

    // Initialize map
    useEffect(() => {
        if (!isMapsReady || !mapContainer.current || map) return;

        const initializeMap = () => {
            try {
                const mapOption = {
                    center: new window.kakao.maps.LatLng(36.5, 127.9),
                    level: 7,
                };
                const newMap = new window.kakao.maps.Map(mapContainer.current, mapOption);
                setMap(newMap);

                // Default view: show entire South Korea when no initial polygons
                try {
                    const hasInitial = Array.isArray(value) && value.some((poly) => Array.isArray(poly) && poly.length > 0);
                    if (!hasInitial) {
                        const sw = new window.kakao.maps.LatLng(33.0, 124.0);
                        const ne = new window.kakao.maps.LatLng(38.8, 132.0);
                        const krBounds = new window.kakao.maps.LatLngBounds(sw, ne);
                        newMap.setBounds(krBounds);
                    }
                } catch {}
            } catch (error) {
                console.error("Failed to initialize Kakao map:", error);
            }
        };

        window.kakao.maps.load(initializeMap);
    }, [isMapsReady, map]);

    // Keep map layout in sync with container size changes
    useEffect(() => {
        if (!map || !mapContainer.current) return;
        let raf = null;
        const ro = new ResizeObserver(() => {
            // debounce with rAF to avoid thrashing
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                try {
                    const center = map.getCenter();
                    map.relayout();
                    // restore center to prevent visual drift
                    map.setCenter(center);
                } catch {}
            });
        });
        try { ro.observe(mapContainer.current); } catch {}
        // initial relayout in case parent became visible just now
        setTimeout(() => {
            try {
                const center = map.getCenter();
                map.relayout();
                map.setCenter(center);
            } catch {}
        }, 50);
        return () => {
            try { ro.disconnect(); } catch {}
            if (raf) cancelAnimationFrame(raf);
        };
    }, [map]);

    // Initialize DrawingManager
    useEffect(() => {
        if (!map || readOnly || drawingManagerRef.current || !isDrawingReady) return;

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
                        // Reset any previous state and activate drawing
                        try { drawingManagerRef.current.cancel(); } catch {}
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
    }, [map, readOnly, onChange, isDrawingReady]);

    // Clear existing polygons
    const clearExistingPolygons = () => {
        // If DrawingManager is managing polygons, clear its overlays properly
        if (drawingManagerRef.current && !readOnly) {
            try {
                // Preferred: remove overlay instances via getOverlays()
                const overlays = drawingManagerRef.current.getOverlays && drawingManagerRef.current.getOverlays();
                if (overlays && Array.isArray(overlays.polygon)) {
                    overlays.polygon.forEach((ov) => {
                        try { drawingManagerRef.current.remove(ov); } catch {}
                    });
                } else {
                    // Fallback: attempt removal from data return (may be coordinate objects)
                    const data = drawingManagerRef.current.getData && drawingManagerRef.current.getData();
                    if (data && Array.isArray(data.polygon)) {
                        data.polygon.forEach((p) => { try { drawingManagerRef.current.remove(p); } catch {} });
                    }
                }
                // Reset drawing state
                try { drawingManagerRef.current.cancel(); } catch {}
            } catch (error) {
                console.log("Error clearing DrawingManager overlays:", error);
            }
        }

        // Also clear manually tracked polygons
        existingPolygonsRef.current.forEach((polygon) => {
            try { polygon.setMap(null); } catch {}
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
                    // No polygons: ensure DM is empty and reset to default KR bounds
                    try {
                        clearExistingPolygons();
                        if (drawingManagerRef.current && !readOnly) {
                            try { drawingManagerRef.current.cancel(); } catch {}
                            try { drawingManagerRef.current.select(window.kakao.maps.drawing.OverlayType.POLYGON); } catch {}
                        }
                        const sw = new window.kakao.maps.LatLng(33.0, 124.0);
                        const ne = new window.kakao.maps.LatLng(38.8, 132.0);
                        const krBounds = new window.kakao.maps.LatLngBounds(sw, ne);
                        map.setBounds(krBounds);
                    } catch {}
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
            {!isMapsReady && <div className="mb-2 text-[12px] text-gray-500">카카오 지도를 로딩 중입니다...</div>}
            {!readOnly && isMapsReady && (
                <div className="mb-2 text-[12px] text-gray-500">지도를 클릭해 점을 추가하고, 우클릭으로 폴리곤을 종료하세요.</div>
            )}
            <div
                ref={mapContainer}
                style={{ width: "100%", height: `${height}px`, cursor: !readOnly ? "crosshair" : "default" }}
                className="border border-gray-300 rounded-lg"
            />
        </div>
    );
}
