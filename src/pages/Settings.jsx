import React, { useCallback, useEffect, useState } from "react";
import KakaoMap from "../components/KakaoMap";
import GeofenceGlobalForm from "../components/forms/GeofenceGlobalForm";
import { fetchCompanyInfo as loadCompanyInfo, saveCompanyInfo, defaultCompanyInfo } from "../api";
import { COLORS, DIMENSIONS } from "../constants";
import { FileBadge, CountBadge, GeofenceBadge } from "../components/StatusBadge";

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
                        console.error('Failed to load default geofences:', error);
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


    return (
        <div className="page">
            <h1>회사정보설정</h1>
            <div className="page-scroll">
                {/* 반응형 그리드 컨테이너 */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
                    gap: 16,
                    alignItems: "start"
                }}>
                    {/* 회사 정보 섹션 */}
                    <div>
                        {!editing ? (
                            <div className="card">
                                <div className="header-row" style={{ marginBottom: 10 }}>
                                    <div>
                                        <strong>회사 정보</strong>
                                    </div>
                                    <div>
                                        {saved ? <span className="saved-indicator">저장됨</span> : null}
                                        <button className="form-button" onClick={startEdit}>
                                            편집
                                        </button>
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <label className="form-label">법인명</label>
                                    <div>{viewData.corpName || <span className="empty">-</span>}</div>

                                    <label className="form-label">대표자명</label>
                                    <div>{viewData.ceoName || <span className="empty">-</span>}</div>

                                    <label className="form-label">사업자번호</label>
                                    <div>{viewData.regNumber || <span className="empty">-</span>}</div>

                                    <label className="form-label">법인설립일</label>
                                    <div>{viewData.incorpDate || <span className="empty">-</span>}</div>

                                    <label className="form-label">법인주소</label>
                                    <div>{viewData.address || <span className="empty">-</span>}</div>

                                    <label className="form-label">회사 로고</label>
                                    <div>
                                        {viewData.logoDataUrl ? (
                                            <img src={viewData.logoDataUrl} alt="회사 로고" style={{ height: 64, width: 64, objectFit: "contain", border: "1px solid #eee", borderRadius: 8 }} />
                                        ) : (
                                            <span className="empty">업로드된 로고 없음</span>
                                        )}
                                    </div>

                                    <label className="form-label">사업자등록증</label>
                                    <div>
                                        {viewData.certDataUrl ? (
                                            String(viewData.certDataUrl).startsWith("data:application/pdf") ? (
                                                <FileBadge>PDF 업로드됨</FileBadge>
                                            ) : (
                                                <img src={viewData.certDataUrl} alt="사업자등록증" style={{ maxWidth: 280, maxHeight: 180, objectFit: "contain", border: "1px solid #eee", borderRadius: 8 }} />
                                            )
                                        ) : (
                                            <span className="empty">업로드된 파일 없음</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="card">
                                <div className="header-row" style={{ marginBottom: 10 }}>
                                    <div>
                                        <strong>회사 정보 편집</strong>
                                    </div>
                                </div>
                                <div className="form-grid">
                                    <label htmlFor="corpName" className="form-label">
                                        법인명
                                    </label>
                                    <input id="corpName" className="form-input" type="text" value={editData.corpName} onChange={(e) => onChange("corpName", e.target.value)} />

                                    <label htmlFor="ceoName" className="form-label">
                                        대표자명
                                    </label>
                                    <input id="ceoName" className="form-input" type="text" value={editData.ceoName} onChange={(e) => onChange("ceoName", e.target.value)} />

                                    <label htmlFor="regNumber" className="form-label">
                                        사업자번호
                                    </label>
                                    <input id="regNumber" className="form-input" type="text" placeholder="000-00-00000" value={editData.regNumber} onChange={(e) => onChange("regNumber", e.target.value)} />

                                    <label htmlFor="incorpDate" className="form-label">
                                        법인설립일
                                    </label>
                                    <input id="incorpDate" className="form-input" type="date" value={editData.incorpDate} onChange={(e) => onChange("incorpDate", e.target.value)} />

                                    <label htmlFor="address" className="form-label">
                                        법인주소
                                    </label>
                                    <input id="address" className="form-input" type="text" value={editData.address} onChange={(e) => onChange("address", e.target.value)} />

                                    <label htmlFor="logoUpload" className="form-label">
                                        회사 로고 업로드
                                    </label>
                                    <div>
                                        <input id="logoUpload" type="file" accept="image/*" capture="environment" onChange={(e) => onFileChange("logoDataUrl", e.target.files?.[0])} />
                                        {editData.logoDataUrl ? (
                                            <div style={{ marginTop: 8 }}>
                                                <img src={editData.logoDataUrl} alt="로고 미리보기" style={{ height: 64, width: 64, objectFit: "contain", border: "1px solid #eee", borderRadius: 8 }} />
                                            </div>
                                        ) : null}
                                    </div>

                                    <label htmlFor="certUpload" className="form-label">
                                        사업자등록증 업로드
                                    </label>
                                    <div>
                                        <input id="certUpload" type="file" accept="image/*,.pdf" capture="environment" onChange={(e) => onFileChange("certDataUrl", e.target.files?.[0])} />
                                        {editData.certDataUrl ? (
                                            <div style={{ marginTop: 8 }}>
                                                {String(editData.certDataUrl).startsWith("data:application/pdf") ? (
                                                    <FileBadge>PDF 선택됨</FileBadge>
                                                ) : (
                                                    <img
                                                        src={editData.certDataUrl}
                                                        alt="사업자등록증 미리보기"
                                                        style={{ maxWidth: 280, maxHeight: 180, objectFit: "contain", border: "1px solid #eee", borderRadius: 8 }}
                                                    />
                                                )}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="form-actions" style={{ display: "flex", gap: 8 }}>
                                        <button type="button" className="form-button" onClick={saveCompany}>
                                            저장
                                        </button>
                                        <button type="button" className="toggle-btn" onClick={cancelEdit}>
                                            취소
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 지오펜스 설정 섹션 */}
                    <div>
                        <div className="card">
                            <div className="header-row" style={{ marginBottom: 10 }}>
                                <div>
                                    <strong>지오펜스 관리</strong>
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


                            <div style={{ marginTop: 16 }}>
                                <h2 style={{ margin: "0 0 8px" }}>Geofence 목록</h2>
                                <div style={{ fontSize: "12px", color: "#666", marginBottom: "12px", backgroundColor: "#f0f8ff", padding: "8px", borderRadius: "4px" }}>
                                    💡 <strong>편집 방법:</strong> 아래 지도에서 직접 수정할 수 있습니다.
                                    <br />• <strong>꼭짓점(사각형)</strong> 드래그: 폴리곤 모양 변경
                                    <br />• <strong>중간점(원형)</strong> 드래그: 새 점 추가
                                    <br />• 변경 사항은 실시간 자동 저장되며, "저장" 버튼으로 확인 가능합니다.
                                </div>
                                {(() => {
                                    const displayItems = toItems(geofenceList).filter((it) => Array.isArray(it.points) && it.points.length > 0);
                                    if (!displayItems || displayItems.length === 0) return <div className="empty">No geofences</div>;
                                    return (
                                        <>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                                                {displayItems.map((item, idx) => (
                                                    <div key={idx}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                            <GeofenceBadge index={idx} />
                                                            <input className="form-input" value={item.name || ""} onChange={(e) => handleRenameOne(idx, e.target.value)} style={{ flex: 1 }} />
                                                        </div>
                                                        <KakaoMap
                                                            polygons={[item.points]}
                                                            height="200px"
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
                                                        <div className="form-actions" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                                            <button className="form-button" type="button" onClick={() => {
                                                                // 현재 상태를 다시 저장 (확인용)
                                                                saveGeofencesIntoCompany(geofenceList);
                                                                // 저장 완료 표시
                                                                const button = event.target;
                                                                const originalText = button.textContent;
                                                                button.textContent = "저장됨!";
                                                                button.style.background = "#4CAF50";
                                                                setTimeout(() => {
                                                                    button.textContent = originalText;
                                                                    button.style.background = "";
                                                                }, 1000);
                                                            }} style={{ background: "#2196F3" }}>
                                                                저장
                                                            </button>
                                                            <button className="form-button" type="button" onClick={() => handleGeofenceDeleteOne(idx)} style={{ background: "#c62828" }}>
                                                                삭제
                                                            </button>
                                                        </div>
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
