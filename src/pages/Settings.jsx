import React, { useCallback, useEffect, useState } from "react";
import KakaoMap from "../components/KakaoMap";
import GeofenceGlobalForm from "../components/forms/GeofenceGlobalForm";
import { fetchCompanyInfo as loadCompanyInfo, saveCompanyInfo, defaultCompanyInfo } from "../api";
import { COLORS, DIMENSIONS } from "../constants";
import { CountBadge, GeofenceBadge } from "../components/StatusBadge";

export default function Settings() {
    const [viewData, setViewData] = useState({ ...defaultCompanyInfo });
    const [editData, setEditData] = useState({ ...defaultCompanyInfo });
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);

    // Geofence edit state
    const [geofenceList, setGeofenceList] = useState([]);
    const [newGeofenceDraft, setNewGeofenceDraft] = useState({ geofences: [] });
    const [newGeofenceName, setNewGeofenceName] = useState("");

    // Load company info and migrate legacy geofences
    useEffect(() => {
        let mounted = true;
        (async () => {
            let base = await loadCompanyInfo();

            try {
                const raw = localStorage.getItem("geofenceSets");
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const arr = Array.isArray(parsed?.geofences) ? parsed.geofences : [];
                    const items = arr
                        .map((it, i) => {
                            if (Array.isArray(it)) return { name: `Polygon ${i + 1}`, points: it };
                            if (it && Array.isArray(it.points)) return { name: it.name || `Polygon ${i + 1}`, points: it.points };
                            return null;
                        })
                        .filter(Boolean);
                    if (items.length > 0) {
                        const migratedBase = { ...base, geofences: items, geofencesUpdatedAt: parsed?.updatedAt || new Date().toISOString() };
                        await saveCompanyInfo(migratedBase);
                        base = migratedBase;
                        try {
                            localStorage.removeItem("geofenceSets");
                        } catch {}
                    }
                }
            } catch (e) {
                console.error("Failed to load or migrate company info", e);
            }

            if (mounted) {
                setViewData(base);
                setEditData(base);
                let geofences = Array.isArray(base?.geofences) ? base.geofences : [];

                // 지오펜스가 없으면 기본 데이터 로드
                if (geofences.length === 0) {
                    try {
                        const { dummyGeofences } = await import("../data/geofences");
                        geofences = Array.isArray(dummyGeofences) ? dummyGeofences : [];

                        if (geofences.length > 0) {
                            const updatedBase = { ...base, geofences: geofences };
                            await saveCompanyInfo(updatedBase);
                            setViewData(updatedBase);
                            setEditData(updatedBase);
                        }
                    } catch (error) {
                        console.error("Failed to load default geofences:", error);
                    }
                }

                setGeofenceList(geofences);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    function startEdit() {
        setEditData(viewData);
        setEditing(true);
    }

    function cancelEdit() {
        setEditData(viewData);
        setEditing(false);
    }

    function onChange(field, value) {
        setEditData((prev) => ({ ...prev, [field]: value }));
    }

    function onFileChange(field, file) {
        if (!file) {
            onChange(field, "");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            onChange(field, reader.result);
        };
        reader.readAsDataURL(file);
    }

    async function saveCompany() {
        await saveCompanyInfo(editData);
        setViewData(editData);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
    }

    // Geofence helpers
    const toItems = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((it, i) => {
            if (Array.isArray(it)) return { name: `Polygon ${i + 1}`, points: it };
            if (it && Array.isArray(it.points)) return { name: it.name || `Polygon ${i + 1}`, points: it.points };
            return { name: `Polygon ${i + 1}`, points: [] };
        });
    };

    const saveGeofencesIntoCompany = async (items) => {
        const now = new Date().toISOString();
        const current = await loadCompanyInfo();
        const next = { ...current, geofences: items, geofencesUpdatedAt: now };
        await saveCompanyInfo(next);
        setViewData(next);
        setEditData(next);
    };

    const handleGeofenceDeleteOne = async (idx) => {
        const next = (geofenceList || []).filter((_, i) => i !== idx);
        setGeofenceList(next);
        await saveGeofencesIntoCompany(next);
    };

    const handleRenameOne = async (idx, name) => {
        const list = toItems(geofenceList || []);
        if (!list[idx]) return;
        list[idx] = { ...list[idx], name: name || list[idx].name };
        setGeofenceList(list);
        await saveGeofencesIntoCompany(list);
    };

    const handleNewGeofenceSubmit = async (data) => {
        try {
            const polys = Array.isArray(data?.geofences) ? data.geofences : [];
            if (polys.length === 0) {
                return;
            }

            let newList = [...geofenceList];

            if (polys.length === 1) {
                const name = (data?.name && data.name.trim()) || newGeofenceName.trim() || `Polygon ${newList.length + 1}`;
                newList.push({ name, points: polys[0] });
            } else {
                polys.forEach((pts, i) => {
                    newList.push({ name: `Polygon ${newList.length + i + 1}`, points: pts });
                });
            }

            setGeofenceList(newList);
            await saveGeofencesIntoCompany(newList);

            // Reset form
            setNewGeofenceDraft({ geofences: [] });
            setNewGeofenceName("");
        } catch (e) {
            console.error("Error adding new geofence:", e);
        }
    };

    const handleNewGeofenceDraftChange = useCallback((v) => {
        setNewGeofenceDraft(v);
    }, []);

    const smallButtonStyle = {
        padding: "4px 8px",
        fontSize: "12px",
        minWidth: "auto",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
    };

    const saveButtonStyle = {
        ...smallButtonStyle,
        backgroundColor: "#e9f8ee",
        color: "#177245",
    };

    const deleteButtonStyle = {
        ...smallButtonStyle,
        backgroundColor: "#fdecef",
        color: "#c62828",
    };

    return (
        <div className="page">
            <h1>회사정보설정</h1>
            <div className="page-scroll">
                {/* 세로 배치 컨테이너 (반응형 컬럼 제거) */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        alignItems: "stretch",
                    }}
                >
                    {/* 회사 정보 섹션 */}
                    <div>
                        <div className="card">
                            <div className="header-row" style={{ marginBottom: 10 }}>
                                <div>
                                    <h2>회사 정보</h2>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span className="form-label">대표자명</span>
                                    <span>{viewData.ceoName || <span className="empty">-</span>}</span>
                                </div>
                                <span style={{ color: "#bbb" }}>|</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span className="form-label">사업자등록번호</span>
                                    <span>{viewData.regNumber || <span className="empty">-</span>}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 지오펜스 설정 섹션 */}
                    <div>
                        <div className="card">
                            <div className="header-row" style={{ marginBottom: 10 }}>
                                <div>
                                    <h2>지오펜스 관리</h2>
                                </div>
                                <div>
                                    {Array.isArray(viewData?.geofences) && viewData.geofences.length > 0 ? (
                                        <CountBadge count={viewData.geofences.length} label="개 저장됨" />
                                    ) : (
                                        <span className="empty">지오펜스 없음</span>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <h3 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: "600" }}>신규 지오펜스 추가</h3>
                                <GeofenceGlobalForm
                                    initial={newGeofenceDraft}
                                    initialName={newGeofenceName}
                                    onSubmit={handleNewGeofenceSubmit}
                                    onChange={handleNewGeofenceDraftChange}
                                    onNameChange={(v) => setNewGeofenceName(v)}
                                />
                            </div>

                            <div>
                                <h2>Geofence 목록</h2>
                                {(() => {
                                    const displayItems = toItems(geofenceList).filter((it) => Array.isArray(it.points) && it.points.length > 0);
                                    if (!displayItems || displayItems.length === 0) return <div className="empty">No geofences</div>;
                                    return (
                                        <>
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                                                    gap: 12,
                                                }}
                                            >
                                                {displayItems.map((item, idx) => (
                                                    <div key={idx}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                                            <GeofenceBadge index={idx} />
                                                            <input
                                                                className="form-input"
                                                                value={item.name || ""}
                                                                onChange={(e) => handleRenameOne(idx, e.target.value)}
                                                                style={{ flex: 1, minWidth: "80px" }}
                                                            />
                                                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                                                <button
                                                                    className="form-button"
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        saveGeofencesIntoCompany(geofenceList);
                                                                        const button = e.currentTarget;
                                                                        button.textContent = "저장됨!";
                                                                        button.style.background = "#4CAF50";
                                                                        button.style.color = "white";

                                                                        setTimeout(() => {
                                                                            button.textContent = "저장";
                                                                            button.style.background = saveButtonStyle.backgroundColor;
                                                                            button.style.color = saveButtonStyle.color;
                                                                        }, 1000);
                                                                    }}
                                                                    style={saveButtonStyle}
                                                                >
                                                                    저장
                                                                </button>
                                                                <button className="form-button" type="button" onClick={() => handleGeofenceDeleteOne(idx)} style={deleteButtonStyle}>
                                                                    삭제
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <KakaoMap
                                                            polygons={[item.points]}
                                                            height="300px"
                                                            editable={true}
                                                            onPolygonChange={(newPoints) => {
                                                                // 상태만 업데이트 (자동 저장은 디바운스 적용)
                                                                const updatedList = [...geofenceList];
                                                                updatedList[idx] = { ...updatedList[idx], points: newPoints };
                                                                setGeofenceList(updatedList);

                                                                // 디바운스된 자동 저장
                                                                clearTimeout(window.autoSaveTimeout);
                                                                window.autoSaveTimeout = setTimeout(() => {
                                                                    saveGeofencesIntoCompany(updatedList);
                                                                }, 1000);
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
