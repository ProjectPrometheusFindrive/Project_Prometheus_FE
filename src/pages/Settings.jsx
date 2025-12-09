import React, { useCallback, useEffect, useRef, useState } from "react";
import KakaoMap from "../components/KakaoMap";
import KakaoGeofenceInput from "../components/forms/KakaoGeofenceInput";
import { useCompany } from "../contexts/CompanyContext";
import { useAuth } from "../contexts/AuthContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
    fetchCompanyInfo as loadCompanyInfo,
    saveCompanyInfo,
    defaultCompanyInfo,
    fetchGeofences,
    fetchAllMembers,
    withdrawMember,
    createGeofence,
    updateGeofence,
    deleteGeofence,
} from "../api";
import { GeofenceBadge } from "../components/badges/StatusBadge";
import DocumentViewer from "../components/DocumentViewer";
import GCSImage from "../components/GCSImage";
import { getSignedDownloadUrl } from "../utils/gcsApi";
import { uploadOne } from "../utils/uploadHelpers";
import { typedStorage } from "../utils/storage";
import { emitToast } from "../utils/toast";
import "./Settings.css";

// Icons
const BuildingIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
    </svg>
);

const DocumentIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
    </svg>
);

const MapPinIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
    </svg>
);

const UserIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
    </svg>
);

const LogOutIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
);

const defaultLogoUrl = "/PPFD.png";

export default function Settings() {
    const auth = useAuth();
    const confirm = useConfirm();
    const { companyInfo, updateCompanyInfo } = useCompany();
    const [viewData, setViewData] = useState({ ...defaultCompanyInfo });
    const [editData, setEditData] = useState({ ...defaultCompanyInfo });
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);

    // Geofence edit state
    const [geofenceList, setGeofenceList] = useState([]);
    const [newGeofencePoints, setNewGeofencePoints] = useState([]);
    const [newGeofenceName, setNewGeofenceName] = useState("");
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [selectedGeofenceIdx, setSelectedGeofenceIdx] = useState(0);
    const [editingGeofenceIdx, setEditingGeofenceIdx] = useState(null); // 수정 모드인 구역 인덱스

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
                const list = Array.isArray(serverGeofences) ? serverGeofences : [];
                setViewData(base);
                setEditData(base);
                setGeofenceList(list);
                // 초기에는 전체 보기 모드 (selectedGeofenceIdx = null)
                setSelectedGeofenceIdx(null);
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

    // Company logo upload
    const handleLogoUploadSuccess = (objectName) => {
        updateCompanyInfo({ logoPath: objectName, logoDataUrl: "" });
    };

    const companyId = auth?.user?.companyId || companyInfo?.companyId || "";
    const folder = companyId ? `company/${companyId}/docs` : "";

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
            let listForSave = [];
            setGeofenceList((prev) => {
                const next = Array.isArray(prev) ? [...prev] : [];
                if (next[idx]) {
                    next[idx] = { ...next[idx], points: newPoints };
                }
                listForSave = next;
                return next;
            });

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
                    }
                } catch (err) {
                    console.error("Failed to auto-save geofence:", err);
                }
            }, 800);
        },
        []
    );

    const GeofenceItemMap = ({ idx, points, isEditing }) => {
        const memoPolygons = React.useMemo(() => [points], [points]);
        const onChange = React.useCallback((newPoints) => handlePointsChange(idx, newPoints), [idx]);
        return (
            <KakaoMap
                polygons={memoPolygons}
                height="100%"
                editable={isEditing}
                onPolygonChange={isEditing ? onChange : undefined}
            />
        );
    };

    // 수정 모드 시작
    const handleStartEdit = (idx) => {
        setEditingGeofenceIdx(idx);
        setSelectedGeofenceIdx(idx);
        setIsAddingNew(false);
    };

    // 수정 저장
    const handleSaveEdit = async () => {
        if (editingGeofenceIdx === null) return;
        const item = geofenceList[editingGeofenceIdx];
        if (!item) return;
        try {
            const identifier = item.id != null ? item.id : item.name;
            await updateGeofence(identifier, { name: item.name, points: item.points });
            emitToast("구역이 저장되었습니다.", "success");
        } catch (e) {
            console.error("Failed to save geofence:", e);
            emitToast("저장에 실패했습니다.", "error");
        }
        setEditingGeofenceIdx(null);
    };

    // 수정 취소
    const handleCancelEdit = () => {
        setEditingGeofenceIdx(null);
    };

    const handleGeofenceDeleteOne = async (idx) => {
        const item = (geofenceList || [])[idx];
        const identifier = item?.id != null ? item.id : item?.name;
        if (identifier != null) {
            try { await deleteGeofence(identifier); } catch (e) { console.error("Error deleting geofence:", e); }
        }
        const next = (geofenceList || []).filter((_, i) => i !== idx);
        setGeofenceList(next);
        if (selectedGeofenceIdx === idx) setSelectedGeofenceIdx(null);
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
                await createGeofence({ name: updated.name, points: updated.points });
            }
        } catch (e) {
            console.error("Failed to rename geofence:", e);
        }
    };

    const handleNewGeofenceSave = async () => {
        if (newGeofencePoints.length < 3) {
            emitToast("최소 3개 이상의 점을 찍어주세요.", "error");
            return;
        }
        const name = newGeofenceName.trim() || `구역 ${geofenceList.length + 1}`;
        try {
            const created = await createGeofence({ name, points: newGeofencePoints });
            const newId = created?.name != null ? created.name : name;
            setGeofenceList([...geofenceList, { id: newId, name, points: newGeofencePoints }]);
            setNewGeofencePoints([]);
            setNewGeofenceName("");
            setIsAddingNew(false);
            setSelectedGeofenceIdx(geofenceList.length);
            emitToast("구역이 등록되었습니다.", "success");
        } catch (e) {
            console.error("Failed to create geofence:", e);
            const errMsg = e?.message || "";
            if (errMsg.includes("already exists") || errMsg.includes("이미 존재")) {
                emitToast(`'${name}' 이름의 구역이 이미 존재합니다.`, "error");
            } else {
                emitToast(errMsg || "구역 등록에 실패했습니다.", "error");
            }
        }
    };

    const handleNewGeofenceCancel = () => {
        setNewGeofencePoints([]);
        setNewGeofenceName("");
        setIsAddingNew(false);
    };

    // --- Account self-withdrawal ---
    const ensureNotLastAdminSelf = async () => {
        try {
            const members = await fetchAllMembers();
            const me = auth?.user;
            if (!me) return true;
            if (me.role !== 'admin') return true;
            const adminCount = (Array.isArray(members) ? members : []).filter((m) => m && m.companyId === me.companyId && m.role === 'admin' && m.membershipStatus !== 'withdrawn').length;
            if (adminCount <= 1) {
                const ok = await confirm({
                    title: '마지막 관리자 경고',
                    message: '현재 회사의 마지막 관리자입니다. 탈퇴 시 회사 관리 권한이 사라집니다. 계속 진행하시겠습니까?',
                    confirmText: '계속',
                    cancelText: '취소'
                });
                return !!ok;
            }
            return true;
        } catch {
            return true;
        }
    };

    const handleSelfWithdraw = async () => {
        const me = auth?.user;
        if (!me || !me.userId) return;
        const proceed = await ensureNotLastAdminSelf();
        if (!proceed) return;
        const ok = await confirm({ title: '회원 탈퇴', message: '정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.', confirmText: '탈퇴', cancelText: '취소' });
        if (!ok) return;
        try {
            const success = await withdrawMember(me.userId);
            if (success) {
                try { emitToast('탈퇴 처리가 완료되었습니다. 로그아웃합니다.', 'success'); } catch {}
                try { typedStorage.auth.logout(); } catch {}
                try { window.location.hash = '#/'; } catch {}
            } else {
                emitToast('탈퇴 처리에 실패했습니다.', 'error');
            }
        } catch (e) {
            console.error('Failed to withdraw self:', e);
            emitToast(e?.message || '탈퇴 처리에 실패했습니다.', 'error');
        }
    };

    // --- Business certificate upload ---
    const [bizFile, setBizFile] = useState(null);
    const [bizStatus, setBizStatus] = useState("idle");
    const [bizError, setBizError] = useState("");
    const [bizProgress, setBizProgress] = useState(0);
    const [bizPreviewUrl, setBizPreviewUrl] = useState("");
    const [bizPreviewKind, setBizPreviewKind] = useState("");
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
        if (!companyId) {
            setBizError("회사 식별 정보를 찾을 수 없습니다.");
            return;
        }
        try {
            setBizStatus("uploading");
            setBizProgress(0);
            const bizFolder = `business-certificates/${companyId}`;
            const onProgress = (p) => setBizProgress(p?.percent || 0);
            const result = await uploadOne(bizFile, { folder: bizFolder, label: "bizCert", onProgress });
            const objectName = result?.objectName || "";
            if (!objectName) {
                setBizStatus("error");
                setBizError("업로드가 실패했습니다.");
                return;
            }
            setViewData((prev) => ({ ...prev, bizCertDocGcsObjectName: objectName, bizCertDocName: bizFile.name }));
            setEditData((prev) => ({ ...prev, bizCertDocGcsObjectName: objectName, bizCertDocName: bizFile.name }));
            try { await saveCompanyInfo({ bizCertDocGcsObjectName: objectName, bizCertDocName: bizFile.name }); } catch {}
            setBizStatus("success");
            emitToast("사업자등록증이 업로드되었습니다.", "success");
        } catch (err) {
            console.error("[settings] biz cert upload error", err);
            setBizError(err?.message || "업로드 중 오류가 발생했습니다.");
            setBizStatus("error");
        }
    };

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

    const displayItems = toItems(geofenceList).filter((it) => Array.isArray(it.points) && it.points.length > 0);

    return (
        <div className="settings-page">
            {/* 페이지 타이틀 */}
            <div className="settings-title-bar">
                <h1>회사 설정</h1>
            </div>

            <div className="settings-content">
                {/* 좌측: 회사 프로필 */}
                <div className="settings-sidebar">
                    {/* 회사 로고 카드 */}
                    <div className="settings-card settings-card--profile">
                        <div className="settings-logo-wrapper">
                            {companyInfo?.logoPath ? (
                                <GCSImage objectName={companyInfo.logoPath} alt="Company Logo" className="settings-logo" />
                            ) : companyInfo?.logoDataUrl ? (
                                <img src={companyInfo.logoDataUrl} alt="Company Logo" className="settings-logo" />
                            ) : (
                                <img src={defaultLogoUrl} alt="Default Logo" className="settings-logo" />
                            )}
                            <label className="settings-logo-overlay" htmlFor="ci-upload-input">
                                <span className="settings-logo-overlay__text">수정하기</span>
                                <input
                                    id="ci-upload-input"
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    className="sr-only"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file || !folder) return;
                                        try {
                                            const result = await uploadOne(file, { folder, label: "logo" });
                                            if (result?.objectName) {
                                                handleLogoUploadSuccess(result.objectName);
                                                emitToast("CI가 업데이트되었습니다.", "success");
                                            }
                                        } catch (err) {
                                            console.error("CI upload error:", err);
                                            emitToast("CI 업로드에 실패했습니다.", "error");
                                        }
                                        e.target.value = "";
                                    }}
                                />
                            </label>
                        </div>
                        <div className="settings-company-name">
                            {companyInfo?.companyName || auth?.user?.companyName || "회사명"}
                        </div>
                    </div>

                    {/* 회사 정보 카드 */}
                    <div className="settings-card">
                        <div className="settings-card__header">
                            <div className="settings-card__icon"><BuildingIcon /></div>
                            <h3>회사 정보</h3>
                        </div>
                        <div className="settings-info-grid">
                            <div className="settings-info-item">
                                <span className="settings-info-label">대표자명</span>
                                <span className="settings-info-value">{viewData.ceoName || "-"}</span>
                            </div>
                            <div className="settings-info-item">
                                <span className="settings-info-label">사업자등록번호</span>
                                <span className="settings-info-value">{viewData.regNumber || "-"}</span>
                            </div>
                        </div>
                    </div>

                    {/* 사업자등록증 카드 */}
                    <div className="settings-card settings-card--biz">
                        <div className="settings-card__header">
                            <div className="settings-card__icon"><DocumentIcon /></div>
                            <h3>사업자등록증</h3>
                            {viewData?.bizCertDocName && (
                                <span className="settings-badge settings-badge--success">등록됨</span>
                            )}
                        </div>

                        {bizPreviewUrl && bizPreviewKind === "image" && (
                            <div className="settings-biz-preview" onClick={() => setBizViewerOpen(true)}>
                                <img src={bizPreviewUrl} alt="사업자등록증" />
                                <div className="settings-biz-preview__overlay">
                                    <span>클릭하여 확대</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleBizUpload} className="settings-upload-form">
                            <label className="settings-file-input">
                                <input type="file" accept="application/pdf,image/*" onChange={onBizFileChange} />
                                <span>{bizFile ? bizFile.name : "파일 선택..."}</span>
                            </label>
                            <button type="submit" className="settings-btn settings-btn--primary" disabled={bizStatus === "uploading"}>
                                {bizStatus === "uploading" ? `${bizProgress}%` : "업로드"}
                            </button>
                        </form>
                        {bizError && <div className="settings-error">{bizError}</div>}
                        {bizStatus === "success" && <div className="settings-success">업로드 완료!</div>}
                    </div>

                    {/* 계정 관리 카드 */}
                    <div className="settings-card settings-card--danger">
                        <div className="settings-card__header">
                            <div className="settings-card__icon"><UserIcon /></div>
                            <h3>계정 관리</h3>
                        </div>
                        <p className="settings-card__desc">
                            계정을 비활성화하면 다시 로그인할 수 없습니다. 복원이 필요한 경우 관리자에게 문의하세요.
                        </p>
                        <button type="button" className="settings-btn settings-btn--danger" onClick={handleSelfWithdraw}>
                            <LogOutIcon />
                            회원 탈퇴
                        </button>
                    </div>
                </div>

                {/* 우측: 지오펜스 관리 */}
                <div className="settings-main">
                    <div className="settings-card settings-card--full">
                        <div className="settings-card__header">
                            <div className="settings-card__icon"><MapPinIcon /></div>
                            <h3>지오펜스 관리</h3>
                            <button
                                type="button"
                                className={`settings-geofence-overview-btn ${selectedGeofenceIdx === null && !isAddingNew ? "settings-geofence-overview-btn--active" : ""}`}
                                onClick={() => { setSelectedGeofenceIdx(null); setIsAddingNew(false); setEditingGeofenceIdx(null); }}
                            >
                                {displayItems.length}개 구역 전체 보기
                            </button>
                        </div>

                        {/* 지오펜스 레이아웃 */}
                        <div className="settings-geofence-layout">
                            {/* 지오펜스 리스트 */}
                            <div className="settings-geofence-list">
                                {/* 신규 등록 버튼 또는 입력 폼 */}
                                {isAddingNew ? (
                                    <div className="settings-geofence-add-form">
                                        <input
                                            className="settings-geofence-add-input"
                                            placeholder="구역 이름 입력"
                                            value={newGeofenceName}
                                            onChange={(e) => setNewGeofenceName(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="settings-geofence-add-actions">
                                            <button
                                                className="settings-btn settings-btn--sm settings-btn--primary"
                                                onClick={handleNewGeofenceSave}
                                            >
                                                저장
                                            </button>
                                            <button
                                                className="settings-btn settings-btn--sm settings-btn--secondary"
                                                onClick={handleNewGeofenceCancel}
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="settings-geofence-add-btn"
                                        onClick={() => { setIsAddingNew(true); setSelectedGeofenceIdx(null); }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        신규 등록하기
                                    </button>
                                )}

                                {displayItems.length === 0 && !isAddingNew ? (
                                    <div className="settings-empty">
                                        <MapPinIcon />
                                        <p>등록된 지오펜스가 없습니다</p>
                                    </div>
                                ) : (
                                    displayItems.map((item, idx) => {
                                        const isEditing = editingGeofenceIdx === idx;
                                        return (
                                            <div
                                                key={idx}
                                                className={`settings-geofence-item ${selectedGeofenceIdx === idx && !isAddingNew ? "settings-geofence-item--active" : ""} ${isEditing ? "settings-geofence-item--editing" : ""}`}
                                                onClick={() => { setSelectedGeofenceIdx(idx); setIsAddingNew(false); }}
                                            >
                                                <div className="settings-geofence-item__header">
                                                    <GeofenceBadge index={idx} />
                                                    <input
                                                        className="settings-geofence-name"
                                                        value={item.name || ""}
                                                        onChange={(e) => handleRenameOne(idx, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        readOnly={!isEditing}
                                                    />
                                                </div>
                                                <div className="settings-geofence-item__actions">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                className="settings-btn settings-btn--sm settings-btn--primary"
                                                                onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                                                            >
                                                                저장
                                                            </button>
                                                            <button
                                                                className="settings-btn settings-btn--sm settings-btn--secondary"
                                                                onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                                                            >
                                                                취소
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="settings-btn settings-btn--sm settings-btn--outline"
                                                                onClick={(e) => { e.stopPropagation(); handleStartEdit(idx); }}
                                                            >
                                                                수정
                                                            </button>
                                                            <button
                                                                className="settings-btn settings-btn--sm settings-btn--danger-outline"
                                                                onClick={(e) => { e.stopPropagation(); handleGeofenceDeleteOne(idx); }}
                                                            >
                                                                삭제
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* 지오펜스 지도 */}
                            <div className="settings-geofence-map">
                                {isAddingNew ? (
                                    <KakaoGeofenceInput
                                        value={newGeofencePoints.length > 0 ? [newGeofencePoints] : []}
                                        onChange={(polys) => {
                                            if (polys && polys.length > 0 && polys[0]) {
                                                setNewGeofencePoints(polys[0]);
                                            } else {
                                                setNewGeofencePoints([]);
                                            }
                                        }}
                                    />
                                ) : selectedGeofenceIdx !== null && displayItems[selectedGeofenceIdx] ? (
                                    <GeofenceItemMap
                                        idx={selectedGeofenceIdx}
                                        points={displayItems[selectedGeofenceIdx].points}
                                        isEditing={editingGeofenceIdx === selectedGeofenceIdx}
                                    />
                                ) : displayItems.length > 0 ? (
                                    // 전체 보기 모드: 모든 폴리곤을 한 지도에 표시
                                    <KakaoMap
                                        polygons={displayItems.map((item) => item.points)}
                                        height="100%"
                                        editable={false}
                                    />
                                ) : (
                                    <div className="settings-map-placeholder">
                                        <MapPinIcon />
                                        <p>신규 등록하기 버튼을 눌러 구역을 추가하세요</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
    );
}
