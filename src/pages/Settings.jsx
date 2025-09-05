import React, { useEffect, useState } from "react";
import GeofenceGlobalForm from "../components/forms/GeofenceGlobalForm";
import GeofencePreview from "../components/GeofencePreview";
import { loadCompanyInfo, saveCompanyInfo, defaultCompanyInfo } from "../data/company";
import { COLORS, DIMENSIONS } from "../constants";

export default function Settings() {
  const [viewData, setViewData] = useState({ ...defaultCompanyInfo });
  const [editData, setEditData] = useState({ ...defaultCompanyInfo });
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Geofence edit state
  const [geofenceDraft, setGeofenceDraft] = useState({ geofences: [] });
  const [geofenceList, setGeofenceList] = useState([]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingName, setEditingName] = useState("");

  // Load company info and migrate legacy geofences
  useEffect(() => {
    let base = loadCompanyInfo();
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
          base = { ...base, geofences: items, geofencesUpdatedAt: parsed?.updatedAt || new Date().toISOString() };
          saveCompanyInfo(base);
          try { localStorage.removeItem("geofenceSets"); } catch {}
        }
      }
    } catch {}
    setViewData(base);
    setEditData(base);
    setGeofenceList(Array.isArray(base?.geofences) ? base.geofences : []);
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

  function saveCompany() {
    const ok = saveCompanyInfo(editData);
    if (ok) {
      setViewData(editData);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
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

  const saveGeofencesIntoCompany = (items) => {
    const now = new Date().toISOString();
    const current = loadCompanyInfo();
    const next = { ...current, geofences: items, geofencesUpdatedAt: now };
    const ok = saveCompanyInfo(next);
    if (ok) {
      setViewData(next);
      setEditData(next);
    }
    return ok;
  };

  const handleGeofenceSubmit = (data) => {
    try {
      if (editingIdx !== null) {
        setGeofenceList((prev) => {
          const list = toItems(prev || []);
          const incoming = Array.isArray(data?.geofences) && data.geofences[0] ? data.geofences[0] : null;
          if (list[editingIdx] && incoming) list[editingIdx] = { name: editingName || list[editingIdx].name, points: incoming };
          saveGeofencesIntoCompany(list);
          setEditingIdx(null);
          setEditingName("");
          setGeofenceDraft({ geofences: [] });
          return list;
        });
        return;
      }

      const polys = Array.isArray(data?.geofences) ? data.geofences : [];
      let items = [];
      if (polys.length === 1) {
        const nm = (data?.name && data.name.trim()) || `Polygon 1`;
        items = [{ name: nm, points: polys[0] }];
      } else {
        items = polys.map((pts, i) => ({ name: `Polygon ${i + 1}`, points: pts }));
      }
      setGeofenceList(items);
      saveGeofencesIntoCompany(items);
      setGeofenceDraft({ geofences: [] });
      setEditingName("");
    } catch {}
  };

  const handleGeofenceDelete = () => {
    const items = [];
    setGeofenceList(items);
    saveGeofencesIntoCompany(items);
  };

  const handleGeofenceEditAll = () => {
    const set = geofenceList || [];
    const points = toItems(set).map((it) => it.points);
    setGeofenceDraft({ geofences: points });
    setEditingIdx(null);
    setEditingName("");
  };

  const handleGeofenceEditOne = (idx) => {
    const items = toItems(geofenceList || []);
    const it = items[idx];
    if (!it) return;
    setEditingIdx(idx);
    setEditingName(it.name || "");
    setGeofenceDraft({ geofences: [it.points] });
  };

  const handleGeofenceDeleteOne = (idx) => {
    setGeofenceList((prev) => {
      const next = Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : [];
      saveGeofencesIntoCompany(next);
      return next;
    });
  };

  const handleRenameOne = (idx, name) => {
    setGeofenceList((prev) => {
      const list = toItems(prev || []);
      if (!list[idx]) return prev;
      list[idx] = { ...list[idx], name: name || list[idx].name };
      saveGeofencesIntoCompany(list);
      return list;
    });
  };

  return (
    <div className="page">
      <h1>회사정보설정</h1>
      <div className="page-scroll">
        {!editing ? (
          <div className="card" style={{ maxWidth: 720 }}>
            <div className="header-row" style={{ marginBottom: 10 }}>
              <div>
                <strong>회사 정보</strong>
              </div>
              <div>
                {saved ? <span className="saved-indicator">저장됨</span> : null}
                <button className="form-button" onClick={startEdit}>편집</button>
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
                    <span className="badge" style={{ background: "#eef2ff", color: "#1e40af" }}>PDF 업로드됨</span>
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
          <div className="card" style={{ maxWidth: 720 }}>
            <div className="header-row" style={{ marginBottom: 10 }}>
              <div>
                <strong>회사 정보 편집</strong>
              </div>
            </div>
            <div className="form-grid">
              <label htmlFor="corpName" className="form-label">법인명</label>
              <input id="corpName" className="form-input" type="text" value={editData.corpName} onChange={(e) => onChange("corpName", e.target.value)} />

              <label htmlFor="ceoName" className="form-label">대표자명</label>
              <input id="ceoName" className="form-input" type="text" value={editData.ceoName} onChange={(e) => onChange("ceoName", e.target.value)} />

              <label htmlFor="regNumber" className="form-label">사업자번호</label>
              <input id="regNumber" className="form-input" type="text" placeholder="000-00-00000" value={editData.regNumber} onChange={(e) => onChange("regNumber", e.target.value)} />

              <label htmlFor="incorpDate" className="form-label">법인설립일</label>
              <input id="incorpDate" className="form-input" type="date" value={editData.incorpDate} onChange={(e) => onChange("incorpDate", e.target.value)} />

              <label htmlFor="address" className="form-label">법인주소</label>
              <input id="address" className="form-input" type="text" value={editData.address} onChange={(e) => onChange("address", e.target.value)} />

              <label htmlFor="logoUpload" className="form-label">회사 로고 업로드</label>
              <div>
                <input id="logoUpload" type="file" accept="image/*" onChange={(e) => onFileChange("logoDataUrl", e.target.files?.[0])} />
                {editData.logoDataUrl ? (
                  <div style={{ marginTop: 8 }}>
                    <img src={editData.logoDataUrl} alt="로고 미리보기" style={{ height: 64, width: 64, objectFit: "contain", border: "1px solid #eee", borderRadius: 8 }} />
                  </div>
                ) : null}
              </div>

              <label htmlFor="certUpload" className="form-label">사업자등록증 업로드</label>
              <div>
                <input id="certUpload" type="file" accept="image/*,.pdf" onChange={(e) => onFileChange("certDataUrl", e.target.files?.[0])} />
                {editData.certDataUrl ? (
                  <div style={{ marginTop: 8 }}>
                    {String(editData.certDataUrl).startsWith("data:application/pdf") ? (
                      <span className="badge" style={{ background: "#eef2ff", color: "#1e40af" }}>PDF 선택됨</span>
                    ) : (
                      <img src={editData.certDataUrl} alt="사업자등록증 미리보기" style={{ maxWidth: 280, maxHeight: 180, objectFit: "contain", border: "1px solid #eee", borderRadius: 8 }} />
                    )}
                  </div>
                ) : null}
              </div>

              <div className="form-actions" style={{ display: "flex", gap: 8 }}>
                <button type="button" className="form-button" onClick={saveCompany}>저장</button>
                <button type="button" className="toggle-btn" onClick={cancelEdit}>취소</button>
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ maxWidth: 960, marginTop: 16 }}>
          <div className="header-row" style={{ marginBottom: 10 }}>
            <div>
              <strong>지오펜스 설정</strong>
            </div>
            <div>
              {Array.isArray(viewData?.geofences) && viewData.geofences.length > 0 ? (
                <span className="badge">{viewData.geofences.length}개 저장됨</span>
              ) : (
                <span className="empty">지오펜스 없음</span>
              )}
            </div>
          </div>

          <GeofenceGlobalForm
            initial={geofenceDraft}
            initialName={editingIdx !== null ? editingName : ""}
            onSubmit={handleGeofenceSubmit}
            onChange={(v) => setGeofenceDraft(v)}
            onNameChange={(v) => setEditingName(v)}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="form-button" type="button" onClick={handleGeofenceEditAll} disabled={(toItems(geofenceList).length || 0) === 0}>
              전체 수정
            </button>
            <button className="form-button" type="button" onClick={handleGeofenceDelete} style={{ background: "#c62828" }}>
              전체 삭제
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <h2 style={{ margin: "0 0 8px" }}>Geofence 목록</h2>
            {(() => {
              const displayItems = toItems(geofenceList).filter((it) => Array.isArray(it.points) && it.points.length > 0);
              if (!displayItems || displayItems.length === 0) return <div className="empty">No geofences</div>;
              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                    {displayItems.map((item, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span className="badge badge--available">#{idx + 1}</span>
                          <input
                            className="form-input"
                            value={item.name || ""}
                            onChange={(e) => handleRenameOne(idx, e.target.value)}
                            style={{ flex: 1 }}
                          />
                        </div>
                        <GeofencePreview polygons={[item.points]} height={200} />
                        <div className="form-actions" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button className="form-button" type="button" onClick={() => handleGeofenceEditOne(idx)}>
                            Edit
                          </button>
                          <button className="form-button" type="button" onClick={() => handleGeofenceDeleteOne(idx)} style={{ background: "#c62828" }}>
                            Delete
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
  );
}

