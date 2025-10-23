import React, { useCallback, useEffect, useRef, useState } from "react";
import KakaoMap from "../components/KakaoMap";
import GeofenceGlobalForm from "../components/forms/GeofenceGlobalForm";
import CompanyLogoSection from "../components/CompanyLogoSection";
import { useAuth } from "../contexts/AuthContext";
import {
    fetchCompanyInfo as loadCompanyInfo,
    saveCompanyInfo,
    defaultCompanyInfo,
    fetchGeofences,
    createGeofence,
    updateGeofence,
    deleteGeofence,
} from "../api";
import { CountBadge, GeofenceBadge } from "../components/badges/StatusBadge";
import DocumentViewer from "../components/DocumentViewer";
import { getSignedDownloadUrl } from "../utils/gcsApi";
import { uploadOne } from "../utils/uploadHelpers";

export default function Settings() {
    const auth = useAuth();
    const [viewData, setViewData] = useState({ ...defaultCompanyInfo });
    const [editData, setEditData] = useState({ ...defaultCompanyInfo });
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);

    // Geofence edit state
    const [geofenceList, setGeofenceList] = useState([]);
    const [newGeofenceDraft, setNewGeofenceDraft] = useState({ geofences: [] });
    const [newGeofenceName, setNewGeofenceName] = useState("");

    // Load company info, then load geofences from backend and migrate legacy data if needed
    useEffect(() => {
        let mounted = true;
        (async () => {
            let base = await loadCompanyInfo();

            try {
                // Fetch geofences from server
                let serverGeofences = [];
                try {
                    const gf = await fetchGeofences();
                    if (Array.isArray(gf)) serverGeofences = gf;
                } catch (e) {
                    console.error("Failed to fetch geofences from server:", e);
                }

                // Legacy migration from localStorage -> create on server if server has none
                const raw = localStorage.getItem("geofenceSets");
                if (raw && (!serverGeofences || serverGeofences.length === 0)) {
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
                        for (const item of items) {
                            try { await createGeofence(item); } catch (e) { console.error("Failed to migrate geofence:", e); }
                        }
                        try { localStorage.removeItem("geofenceSets"); } catch {}
                        try {
                            const gf2 = await fetchGeofences();
                            if (Array.isArray(gf2)) serverGeofences = gf2;
                        } catch {}
                    }
                }

                // If still empty, try to seed from dummy data
                if ((!serverGeofences || serverGeofences.length === 0)) {
                    try {
                        const { dummyGeofences } = await import("../data/geofences");
                        const seeds = Array.isArray(dummyGeofences) ? dummyGeofences : [];
                        if (seeds.length > 0) {
                            for (let i = 0; i < seeds.length; i++) {
                                const s = seeds[i];
                                try {
                                    await createGeofence({ name: s.name || `Polygon ${i + 1}`, points: Array.isArray(s.points) ? s.points : s });
                                } catch (e) {
                                    console.error("Failed to seed geofence:", e);
                                }
                            }
                            try {
                                const gf3 = await fetchGeofences();
                                if (Array.isArray(gf3)) serverGeofences = gf3;
                            } catch {}
                        }
                    } catch (error) {
                        console.error("Failed to load default geofences:", error);
                    }
                }

                if (mounted) {
                    setViewData(base);
                    setEditData(base);
                    setGeofenceList(Array.isArray(serverGeofences) ? serverGeofences : []);
                }
            } catch (e) {
                console.error("Failed to load or migrate company info", e);
                if (mounted) {
                    setViewData(base);
                    setEditData(base);
                }
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
            if (it && Array.isArray(it.points)) return { id: it.id != null ? it.id : it.name, name: it.name || `Polygon ${i + 1}`, points: it.points };
            return { name: `Polygon ${i + 1}`, points: [] };
        });
    };

    const autoSaveTimeoutRef = useRef(null);

    const handlePointsChange = useCallback(
        (idx, newPoints) => {
            // Update state immutably and keep a snapshot for save
            let listForSave = [];
            setGeofenceList((prev) => {
                const next = Array.isArray(prev) ? [...prev] : [];
                if (next[idx]) {
                    next[idx] = { ...next[idx], points: newPoints };
                }
                listForSave = next;
                return next;
            });

            // Debounced auto-save for a single item
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
            autoSaveTimeoutRef.current = setTimeout(async () => {
                const item = listForSave[idx];
                if (!item) return;
                try {
                    const identifier = item.id != null ? item.id : item.name;
                    let ok = true;
                    if (identifier != null) {
                        ok = await updateGeofence(identifier, { name: item.name, points: item.points });
                    }
                    if (!identifier || ok === false) {
                        const created = await createGeofence({ name: item.name, points: item.points });
                        setGeofenceList((prev) => {
                            const next = [...(prev || [])];
                            next[idx] = { ...item, id: created?.name != null ? created.name : item.name };
                            return next;
                        });
                    } else {
                        // Sync id to name if name is identifier
                        setGeofenceList((prev) => {
                            const next = [...(prev || [])];
                            next[idx] = { ...item, id: item.name };
                            return next;
                        });
                    }
                } catch (err) {
                    console.error("Failed to auto-save geofence:", err);
                }
            }, 800);
        },
        [updateGeofence, createGeofence]
    );

    // Stable wrapper to pass memoized polygons array and callback per item
    const GeofenceItemMap = ({ idx, points }) => {
        const memoPolygons = React.useMemo(() => [points], [points]);
        const onChange = React.useCallback((newPoints) => handlePointsChange(idx, newPoints), [idx, handlePointsChange]);
        return (
            <KakaoMap polygons={memoPolygons} height="300px" editable={true} onPolygonChange={onChange} />
        );
    };

    const handleGeofenceDeleteOne = async (idx) => {
        const item = (geofenceList || [])[idx];
        const identifier = item?.id != null ? item.id : item?.name;
        if (identifier != null) {
            try { await deleteGeofence(identifier); } catch (e) { console.error("Error deleting geofence:", e); }
        }
        const next = (geofenceList || []).filter((_, i) => i !== idx);
        setGeofenceList(next);
    };

    const handleRenameOne = async (idx, name) => {
        const list = toItems(geofenceList || []);
        if (!list[idx]) return;
        const prev = list[idx];
        const updated = { ...prev, name: name || prev.name };
        const identifier = prev.id != null ? prev.id : prev.name;
        setGeofenceList((prevList) => {
            const next = [...(prevList || [])];
            next[idx] = updated;
            return next;
        });
        try {
            let ok = true;
            if (identifier != null) {
                ok = await updateGeofence(identifier, { name: updated.name, points: updated.points });
            }
            if (!identifier || ok === false) {
                const created = await createGeofence({ name: updated.name, points: updated.points });
                setGeofenceList((prevList) => {
                    const next = [...(prevList || [])];
                    next[idx] = { ...updated, id: created?.name != null ? created.name : updated.name };
                    return next;
                });
            } else {
                // If backend uses name as identifier, sync id to new name
                setGeofenceList((prevList) => {
                    const next = [...(prevList || [])];
                    next[idx] = { ...updated, id: updated.name };
                    return next;
                });
            }
        } catch (e) {
            console.error("Failed to rename geofence:", e);
        }
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
                try {
                    const created = await createGeofence({ name, points: polys[0] });
                    const newId = created?.name != null ? created.name : name;
                    newList.push({ id: newId, name, points: polys[0] });
                } catch (e) {
                    console.error("Failed to create geofence:", e);
                }
            } else {
                for (let i = 0; i < polys.length; i++) {
                    const pts = polys[i];
                    const nm = `Polygon ${newList.length + i + 1}`;
                    try {
                        const created = await createGeofence({ name: nm, points: pts });
                        const newId = created?.name != null ? created.name : nm;
                        newList.push({ id: newId, name: nm, points: pts });
                    } catch (e) {
                        console.error("Failed to create geofence:", e);
                    }
                }
            }

            setGeofenceList(newList);

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

    // --- Business certificate upload (optional) ---
    const [bizFile, setBizFile] = useState(null);
    const [bizStatus, setBizStatus] = useState("idle"); // idle | uploading | success | error
    const [bizError, setBizError] = useState("");
    const [bizProgress, setBizProgress] = useState(0);
    const [bizPreviewUrl, setBizPreviewUrl] = useState("");
    const [bizPreviewKind, setBizPreviewKind] = useState(""); // image | pdf | unknown
    const [bizViewerOpen, setBizViewerOpen] = useState(false);
    const onBizFileChange = (e) => {
        const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        setBizFile(f);
    };
    const handleBizUpload = async (e) => {
        e.preventDefault();
        setBizError("");
        if (!bizFile) {
            setBizError("파일을 선택해 주세요.");
            return;
        }
        const type = bizFile.type || "";
        if (type && !("application/pdf,image/png,image/jpeg,image/webp,image/x-icon".split(",").includes(type))) {
            setBizError("허용되지 않는 파일 형식입니다. (PDF/이미지)");
            return;
        }
        const companyId = auth?.user?.company || viewData?.company || "";
        if (!companyId) {
            setBizError("회사 식별 정보를 찾을 수 없습니다. 관리자에게 문의해 주세요.");
            return;
        }
        try {
            setBizStatus("uploading");
            setBizProgress(0);
            const folder = `business-certificates/${companyId}`;
            const onProgress = (p) => setBizProgress(p?.percent || 0);
            const result = await uploadOne(bizFile, { folder, label: "bizCert", onProgress });
            const objectName = result?.objectName || "";
            if (!objectName) throw new Error("업로드 결과에 objectName이 없습니다.");
            // Persist via company API (updateCompanyInfo triggers PUT)
            setViewData((prev) => ({ ...prev, bizCertDocGcsObjectName: objectName, bizCertDocName: bizFile.name }));
            setEditData((prev) => ({ ...prev, bizCertDocGcsObjectName: objectName, bizCertDocName: bizFile.name }));
            // Save only changed fields to avoid backend validation on unrelated stale values
            try { await saveCompanyInfo({ bizCertDocGcsObjectName: objectName, bizCertDocName: bizFile.name }); } catch {}
            setBizStatus("success");
        } catch (err) {
            console.error("[settings] biz cert upload error", err);
            setBizError(err?.message || "업로드 중 오류가 발생했습니다.");
            setBizStatus("error");
        }
    };

    // Derive and load preview for existing uploaded business certificate
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const objName = viewData?.bizCertDocGcsObjectName
                    || (Array.isArray(viewData?.bizCertDocGcsObjectNames) && viewData.bizCertDocGcsObjectNames[0])
                    || "";
                if (!objName) {
                    if (!cancelled) {
                        setBizPreviewUrl("");
                        setBizPreviewKind("");
                    }
                    return;
                }
                const url = await getSignedDownloadUrl(objName);
                if (cancelled) return;
                const name = (viewData?.bizCertDocName || String(objName)).toLowerCase();
                const kind = name.endsWith(".pdf") ? "pdf" : (/(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(name) ? "image" : "unknown");
                setBizPreviewUrl(url);
                setBizPreviewKind(kind);
            } catch (e) {
                if (!cancelled) {
                    setBizPreviewUrl("");
                    setBizPreviewKind("");
                }
            }
        })();
        return () => { cancelled = true; };
    }, [viewData?.bizCertDocGcsObjectName, viewData?.bizCertDocGcsObjectNames, viewData?.bizCertDocName]);

    return (
        <div className="page space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">회사정보설정</h1>
            <div className="page-scroll space-y-4">
                {/* 로고 + 사업자등록증: 넓은 화면 가로 배치, 좁은 화면 세로 배치 */}
                <div className="company-docs-split">
                    {/* 회사 로고 섹션 */}
                    <CompanyLogoSection />

                    {/* 회사 서류(사업자등록증) 섹션 */}
                    <div className="card">
                        <div className="header-row" style={{ marginBottom: 10 }}>
                            <div>
                                <h2>사업자등록증</h2>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ color: "#555" }}>
                                현재 상태: {viewData?.bizCertDocName ? (
                                    <strong>{viewData.bizCertDocName}</strong>
                                ) : (
                                    <span className="empty">미등록</span>
                                )}
                            </div>
                            <form onSubmit={handleBizUpload}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input type="file" accept="application/pdf,image/*" onChange={onBizFileChange} className="form-input" />
                                    <button className="form-button" type="submit" disabled={bizStatus === "uploading"}>
                                        {bizStatus === "uploading" ? "업로드 중..." : "업로드/변경"}
                                    </button>
                                </div>
                                {bizStatus === "uploading" && (
                                    <div style={{ color: "#177245", fontSize: 13, marginTop: 6 }}>진행률: {bizProgress}%</div>
                                )}
                                {bizError && (
                                    <div className="error-message" style={{ marginTop: 6 }}>{bizError}</div>
                                )}
                                {bizStatus === "success" && (
                                    <div className="success-message" style={{ marginTop: 6, color: "#177245" }}>업로드가 완료되었습니다.</div>
                                )}
                            </form>

                            {/* 업로드된 파일 미리보기 */}
                            {bizPreviewUrl && (
                                <div style={{ marginTop: 10 }}>
                                    {bizPreviewKind === "image" && (
                                        <div>
                                            <img
                                                src={bizPreviewUrl}
                                                alt={viewData?.bizCertDocName || "사업자등록증"}
                                                style={{ maxWidth: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 6, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}
                                                onClick={() => setBizViewerOpen(true)}
                                            />
                                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                                                <button type="button" className="form-button" onClick={() => setBizViewerOpen(true)}>확대</button>
                                            </div>
                                        </div>
                                    )}
                                    {bizPreviewKind === "pdf" && (
                                        <div>
                                            <iframe
                                                src={bizPreviewUrl}
                                                title={viewData?.bizCertDocName || "사업자등록증"}
                                                style={{ width: "100%", height: 260, border: "none", background: "#fafafa", borderRadius: 6 }}
                                            />
                                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                                                <button type="button" className="form-button" onClick={() => setBizViewerOpen(true)}>확대</button>
                                            </div>
                                        </div>
                                    )}
                                    {bizPreviewKind === "unknown" && (
                                        <div style={{ color: "#777", fontSize: 13 }}>미리보기를 지원하지 않는 형식입니다.</div>
                                    )}
                                    <DocumentViewer
                                        isOpen={bizViewerOpen}
                                        onClose={() => setBizViewerOpen(false)}
                                        src={bizPreviewUrl}
                                        type={bizPreviewKind}
                                        title={viewData?.bizCertDocName || "사업자등록증"}
                                        allowDownload={true}
                                        downloadName={viewData?.bizCertDocName || "business-certificate"}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                </div>

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
                                    {Array.isArray(geofenceList) && geofenceList.length > 0 ? (
                                        <CountBadge count={geofenceList.length} label="개 저장됨" />
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
                                                                    onClick={async (e) => {
                                                                        const buttonEl = e.currentTarget;
                                                                        const item = geofenceList[idx];
                                                                        if (item) {
                                                                            try {
                                                                                const identifier = item.id != null ? item.id : item.name;
                                                                                let ok = true;
                                                                                if (identifier != null) {
                                                                                    ok = await updateGeofence(identifier, { name: item.name, points: item.points });
                                                                                }
                                                                                if (!identifier || ok === false) {
                                                                                    const created = await createGeofence({ name: item.name, points: item.points });
                                                                                    setGeofenceList((prev) => {
                                                                                        const next = [...(prev || [])];
                                                                                        next[idx] = { ...item, id: created?.name != null ? created.name : item.name };
                                                                                        return next;
                                                                                    });
                                                                                } else {
                                                                                    // Sync id to name if necessary
                                                                                    setGeofenceList((prev) => {
                                                                                        const next = [...(prev || [])];
                                                                                        next[idx] = { ...item, id: item.name };
                                                                                        return next;
                                                                                    });
                                                                                }
                                                                            } catch (err) {
                                                                                console.error("Failed to save geofence:", err);
                                                                            }
                                                                        }
                                                                        // Visual feedback
                                                                        try {
                                                                            buttonEl.textContent = "저장됨!";
                                                                            buttonEl.style.background = "#4CAF50";
                                                                            buttonEl.style.color = "white";
                                                                            setTimeout(() => {
                                                                                try {
                                                                                    buttonEl.textContent = "저장";
                                                                                    buttonEl.style.background = saveButtonStyle.backgroundColor;
                                                                                    buttonEl.style.color = saveButtonStyle.color;
                                                                                } catch {}
                                                                            }, 1000);
                                                                        } catch {}
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
                                                        <GeofenceItemMap idx={idx} points={item.points} />
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
    );
}
