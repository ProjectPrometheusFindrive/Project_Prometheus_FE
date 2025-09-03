import React, { useEffect, useState } from "react";

const STORAGE_KEY = "companyInfo";

function loadCompanyInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCompanyInfo(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export default function Settings() {
  const [viewData, setViewData] = useState({
    corpName: "",
    ceoName: "",
    regNumber: "",
    incorpDate: "",
    address: "",
    logoDataUrl: "",
    certDataUrl: "",
  });
  const [editData, setEditData] = useState(viewData);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = loadCompanyInfo();
    if (existing) {
      setViewData(existing);
      setEditData(existing);
    }
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

  function save() {
    const ok = saveCompanyInfo(editData);
    if (ok) {
      setViewData(editData);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  }

  return (
    <div className="page">
      <h1>회사정보상세</h1>
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
                <button type="button" className="form-button" onClick={save}>저장</button>
                <button type="button" className="toggle-btn" onClick={cancelEdit}>취소</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
