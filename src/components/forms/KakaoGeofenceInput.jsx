import React, { useEffect, useRef, useState } from 'react';

export default function KakaoGeofenceInput({ value = [], onChange, readOnly = false, height = 360 }) {
    const mapContainer = useRef(null);
    const [map, setMap] = useState(null);
    const drawingManagerRef = useRef(null);

    // Initialize map
    useEffect(() => {
        if (!window.kakao || !window.kakao.maps || !mapContainer.current) return;

        const mapOption = {
            center: new window.kakao.maps.LatLng(36.5, 127.9),
            level: 7,
        };
        const newMap = new window.kakao.maps.Map(mapContainer.current, mapOption);
        setMap(newMap);

    }, []);

    // Initialize DrawingManager
    useEffect(() => {
        if (!map || readOnly) return;

        const drawingManager = new window.kakao.maps.drawing.DrawingManager({
            map: map,
            drawingMode: [window.kakao.maps.drawing.OverlayType.POLYGON],
            guideTooltip: ['draw', 'drag', 'edit'],
            polygonOptions: {
                draggable: true,
                removable: true,
                editable: true,
                strokeColor: '#39f',
                fillColor: '#39f',
                fillOpacity: 0.5,
            },
        });

        drawingManagerRef.current = drawingManager;

        const handleDataChange = (e) => {
            const newPolygons = drawingManager.getData().polygon.map(p => {
                return p.getPoints().map(point => ({ lat: point.y, lng: point.x }));
            });
            if (onChange) {
                onChange(newPolygons);
            }
        };

        window.kakao.maps.event.addListener(drawingManager, 'drawend', handleDataChange);
        window.kakao.maps.event.addListener(drawingManager, 'remove', handleDataChange);
        window.kakao.maps.event.addListener(drawingManager, 'edit', handleDataChange);


        
    }, [map, readOnly, onChange]);

    // Load initial polygon data
    useEffect(() => {
        if (!map || !drawingManagerRef.current) return;

        const initialData = {
            polygon: (value || []).map(poly => {
                return poly.map(p => new window.kakao.maps.LatLng(p.lat, p.lng));
            })
        };

        if (initialData.polygon.length > 0) {
            drawingManagerRef.current.setData(initialData);
            const bounds = new window.kakao.maps.LatLngBounds();
            initialData.polygon.forEach(path => {
                path.forEach(point => bounds.extend(point));
            });
            map.setBounds(bounds);
        }

    }, [map, value]);


    return (
        <div>
            {!readOnly && 
                <div style={{marginBottom: '8px', fontSize: '12px', color: '#555'}}>
                    지도 좌측 상단의 컨트롤을 사용하여 폴리곤을 그리거나 수정할 수 있습니다.
                </div>
            }
            <div ref={mapContainer} style={{ width: '100%', height: `${height}px`, border: '1px solid #ddd', borderRadius: 8 }} />
        </div>
    );
}
