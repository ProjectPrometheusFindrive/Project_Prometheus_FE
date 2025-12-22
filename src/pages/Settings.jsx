import React, { useCallback, useEffect, useRef, useState } from 'react';
import KakaoMap from '../components/KakaoMap';
import KakaoGeofenceInput from '../components/forms/KakaoGeofenceInput';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
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
} from '../api';
import DocumentViewer from '../components/DocumentViewer';
import GCSImage from '../components/GCSImage';
import { getSignedDownloadUrl } from '../utils/gcsApi';
import { uploadOne } from '../utils/uploadHelpers';
import { typedStorage } from '../utils/storage';
import { emitToast } from '../utils/toast';
import './Settings.css';

const defaultLogoUrl = '/PPFD.png';

export default function Settings() {
  const auth = useAuth();
  const confirm = useConfirm();
  const { companyInfo, updateCompanyInfo } = useCompany();
  const [viewData, setViewData] = useState({ ...defaultCompanyInfo });
  const [editData, setEditData] = useState({ ...defaultCompanyInfo });

  // Geofence state
  const [geofenceList, setGeofenceList] = useState([]);
  const [newGeofencePoints, setNewGeofencePoints] = useState([]);
  const [newGeofenceName, setNewGeofenceName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedGeofenceIdx, setSelectedGeofenceIdx] = useState(null);
  const [editingGeofenceIdx, setEditingGeofenceIdx] = useState(null);

  // Load Data
  useEffect(() => {
    let mounted = true;
    (async () => {
      let base = await loadCompanyInfo();
      try {
        let serverGeofences = [];
        try {
          const gf = await fetchGeofences();
          if (Array.isArray(gf)) serverGeofences = gf;
        } catch (e) {
          console.error('Failed to fetch geofences', e);
        }

        if (mounted) {
          const list = Array.isArray(serverGeofences) ? serverGeofences : [];
          setViewData(base);
          setEditData(base);
          setGeofenceList(list);
          setSelectedGeofenceIdx(null);
        }
      } catch (e) {
        console.error('Failed to load company info', e);
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

  const companyId = auth?.user?.companyId || companyInfo?.companyId || '';
  const folder = companyId ? `company/${companyId}/docs` : '';

  // --- Logo Upload ---
  const handleLogoUploadSuccess = (objectName) => {
    updateCompanyInfo({ logoPath: objectName, logoDataUrl: '' });
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !folder) return;
    try {
      const result = await uploadOne(file, { folder, label: 'logo' });
      if (result?.objectName) {
        handleLogoUploadSuccess(result.objectName);
        emitToast('CI가 업데이트되었습니다.', 'success');
      }
    } catch (err) {
      console.error('CI upload error:', err);
      emitToast('CI 업로드에 실패했습니다.', 'error');
    }
    e.target.value = '';
  };

  // --- Biz Cert Upload ---
  const [bizFile, setBizFile] = useState(null);
  const [bizStatus, setBizStatus] = useState('idle');
  const [bizPreviewUrl, setBizPreviewUrl] = useState('');
  const [bizPreviewKind, setBizPreviewKind] = useState('');
  const [bizViewerOpen, setBizViewerOpen] = useState(false);

  const onBizFileChange = async (e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!f) return;
    if (!companyId) {
      emitToast('회사 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    try {
      setBizStatus('uploading');
      const bizFolder = `business-certificates/${companyId}`;
      const result = await uploadOne(f, { folder: bizFolder, label: 'bizCert' });
      const objectName = result?.objectName || '';
      if (!objectName) throw new Error('Upload failed');

      setViewData((prev) => ({
        ...prev,
        bizCertDocGcsObjectName: objectName,
        bizCertDocName: f.name,
      }));
      await saveCompanyInfo({ bizCertDocGcsObjectName: objectName, bizCertDocName: f.name });
      setBizStatus('success');
      emitToast('사업자등록증이 업로드되었습니다.', 'success');
    } catch (err) {
      console.error('Biz cert upload error', err);
      setBizStatus('error');
      emitToast('업로드 중 오류가 발생했습니다.', 'error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const objName =
          viewData?.bizCertDocGcsObjectName ||
          (Array.isArray(viewData?.bizCertDocGcsObjectNames) &&
            viewData.bizCertDocGcsObjectNames[0]) ||
          '';
        if (!objName) {
          if (!cancelled) {
            setBizPreviewUrl('');
            setBizPreviewKind('');
          }
          return;
        }
        const url = await getSignedDownloadUrl(objName);
        if (cancelled) return;
        const name = (viewData?.bizCertDocName || String(objName)).toLowerCase();
        const kind = name.endsWith('.pdf')
          ? 'pdf'
          : /(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(name)
            ? 'image'
            : 'unknown';
        setBizPreviewUrl(url);
        setBizPreviewKind(kind);
      } catch (e) {
        if (!cancelled) {
          setBizPreviewUrl('');
          setBizPreviewKind('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewData?.bizCertDocGcsObjectName, viewData?.bizCertDocName]);

  // --- Withdrawal ---
  const handleSelfWithdraw = async () => {
    const me = auth?.user;
    if (!me || !me.userId) return;
    const ok = await confirm({
      title: '회원 탈퇴',
      message: '정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      confirmText: '탈퇴',
      cancelText: '취소',
    });
    if (!ok) return;
    try {
      const success = await withdrawMember(me.userId);
      if (success) {
        emitToast('탈퇴 처리가 완료되었습니다.', 'success');
        try {
          typedStorage.auth.logout();
        } catch {}
        try {
          window.location.hash = '#/';
        } catch {}
      } else {
        emitToast('탈퇴 처리에 실패했습니다.', 'error');
      }
    } catch (e) {
      emitToast('탈퇴 처리에 실패했습니다.', 'error');
    }
  };

  // --- Geofence Logic ---
  const toItems = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((it, i) => {
      if (Array.isArray(it)) return { name: `Polygon ${i + 1}`, points: it };
      if (it && Array.isArray(it.points))
        return {
          id: it.id != null ? it.id : it.name,
          name: it.name || `Polygon ${i + 1}`,
          points: it.points,
        };
      return { name: `Polygon ${i + 1}`, points: [] };
    });
  };
  const displayItems = toItems(geofenceList);

  const handleNewGeofenceSave = async () => {
    if (newGeofencePoints.length < 3) {
      emitToast('최소 3개 이상의 점을 찍어주세요.', 'error');
      return;
    }
    const name = newGeofenceName.trim() || `구역 ${geofenceList.length + 1}`;
    try {
      const created = await createGeofence({ name, points: newGeofencePoints });
      const newId = created?.name != null ? created.name : name;
      setGeofenceList([...geofenceList, { id: newId, name, points: newGeofencePoints }]);
      setNewGeofencePoints([]);
      setNewGeofenceName('');
      setIsAddingNew(false);
      emitToast('구역이 등록되었습니다.', 'success');
    } catch (e) {
      emitToast('구역 등록 실패: ' + e.message, 'error');
    }
  };

  const handleDeleteGeofence = async (idx, e) => {
    e.stopPropagation();
    if (!(await confirm({ title: '구역 삭제', message: '정말 삭제하시겠습니까?' }))) return;

    const item = (geofenceList || [])[idx];
    const identifier = item?.id != null ? item.id : item?.name;
    if (identifier != null) {
      try {
        await deleteGeofence(identifier);
      } catch (e) {
        console.error('Error deleting geofence:', e);
      }
    }
    const next = (geofenceList || []).filter((_, i) => i !== idx);
    setGeofenceList(next);
    if (selectedGeofenceIdx === idx) setSelectedGeofenceIdx(null);
  };

  const handleStartEdit = (idx, e) => {
    e.stopPropagation();
    setEditingGeofenceIdx(idx);
    setSelectedGeofenceIdx(idx);
  };

  const handleRenameOne = (idx, newName) => {
    const next = [...geofenceList];
    const item = next[idx];
    if (item) {
      next[idx] = { ...item, name: newName };
      setGeofenceList(next);
    }
  };

  const handlePointsChange = useCallback(
    (newPoints, _idxInMap) => {
      if (editingGeofenceIdx === null) return;
      setGeofenceList((prev) => {
        const next = [...prev];
        const item = next[editingGeofenceIdx];
        if (item) {
          next[editingGeofenceIdx] = { ...item, points: newPoints };
        }
        return next;
      });
    },
    [editingGeofenceIdx]
  );

  const handleSaveEdit = async (e) => {
    e.stopPropagation();
    if (editingGeofenceIdx === null) return;
    const item = geofenceList[editingGeofenceIdx];
    if (!item) return;

    try {
      if (item.id) {
        await updateGeofence(item.id, { name: item.name, points: item.points });
      }
      emitToast('수정되었습니다.', 'success');
    } catch (e) {
      console.error(e);
      emitToast('저장 실패', 'error');
    }
    setEditingGeofenceIdx(null);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingGeofenceIdx(null);
  };

  const mapPolygons = isAddingNew
    ? []
    : editingGeofenceIdx !== null
      ? [displayItems[editingGeofenceIdx]]
      : selectedGeofenceIdx !== null
        ? [displayItems[selectedGeofenceIdx]]
        : displayItems;

  const fileInputRef = useRef(null);
  const bizInputRef = useRef(null);

  return (
    <div className="page page--data">
      <div className="page-title-bar">
        <h1>회사 설정</h1>
      </div>
      <div className="page-scroll">
        <div className="settings-container">
          {/* Left Panel: Company Settings Cards */}
          <div className="settings-left-panel">
            {/* 1. Company Profile Card */}
            <div className="settings-card card-company-profile">
              {/* Removed company-role-badge */}

              <div
                className="company-logo-area"
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                {companyInfo?.logoPath ? (
                  <GCSImage
                    objectName={companyInfo.logoPath}
                    alt="Company Logo"
                    className="company-logo-img"
                  />
                ) : companyInfo?.logoDataUrl ? (
                  <img
                    src={companyInfo.logoDataUrl}
                    alt="Company Logo"
                    className="company-logo-img"
                  />
                ) : (
                  <div className="company-logo-placeholder">
                    <span style={{ color: '#888', fontSize: '12px' }}>CI를 등록해주세요</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden-input"
                accept="image/*"
                onChange={handleLogoChange}
              />

              <div className="company-name-section">
                <div className="company-name-text-aligned">
                  {companyInfo?.companyName || auth?.user?.companyName || '회사명'}
                </div>
                <button className="logo-edit-button" onClick={() => fileInputRef.current?.click()}>
                  로고 수정
                </button>
              </div>

              <div className="company-info-row">
                <span className="company-info-text">{viewData.ceoName || '대표자명 없음'}</span>
              </div>
              <div className="company-info-row">
                <span className="company-info-text">{viewData.regNumber || '사업자번호 없음'}</span>
              </div>
            </div>

            {/* 2. Biz Certificate Card */}
            <div className="settings-card card-biz-cert">
              <div
                className="biz-cert-preview-area"
                onClick={() => bizPreviewUrl && setBizViewerOpen(true)}
              >
                {bizPreviewUrl && (bizPreviewKind === 'image' || bizPreviewKind === 'pdf') ? (
                  bizPreviewKind === 'image' ? (
                    <img src={bizPreviewUrl} alt="Biz Cert" className="biz-cert-img" />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        flexDirection: 'column',
                      }}
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#888"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      <span style={{ fontSize: '12px', color: '#888', marginTop: 8 }}>
                        PDF 문서
                      </span>
                    </div>
                  )
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#ccc',
                    }}
                  >
                    No Image
                  </div>
                )}
              </div>

              <div className="biz-cert-upload-btn" onClick={() => bizInputRef.current?.click()}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12.5 6.6256L6.82667 11.9763C6.13165 12.6317 5.18899 13 4.20608 13C3.22317 13 2.28051 12.6317 1.58549 11.9763C0.890461 11.3208 0.5 10.4317 0.5 9.5047C0.5 8.57769 0.890461 7.68865 1.58549 7.03315L7.25881 1.6825C7.72216 1.2455 8.3506 1 9.00587 1C9.66115 1 10.2896 1.2455 10.7529 1.6825C11.2163 2.1195 11.4766 2.71219 11.4766 3.3302C11.4766 3.94821 11.2163 4.5409 10.7529 4.9779L5.07344 10.3286C4.84176 10.5471 4.52754 10.6698 4.19991 10.6698C3.87227 10.6698 3.55805 10.5471 3.32638 10.3286C3.0947 10.1101 2.96455 9.81371 2.96455 9.5047C2.96455 9.1957 3.0947 8.89935 3.32638 8.68085L8.56756 3.74358"
                    stroke="#006CEC"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="biz-cert-btn-text">사업자등록증 업로드</span>
              </div>
              <input
                type="file"
                ref={bizInputRef}
                className="hidden-input"
                accept="application/pdf,image/*"
                onChange={onBizFileChange}
              />
            </div>

            {/* Mobile: Map & Geofences Card (between biz cert and opt out) */}
            <div className="settings-card settings-map-card-mobile">
              {/* Map */}
              <div className="settings-map-wrapper">
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
                    height={400}
                  />
                ) : (
                  <KakaoMap
                    polygons={mapPolygons.map((item) => ({
                      points: item.points,
                      name: item.name,
                      options: {
                        fillColor:
                          selectedGeofenceIdx !== null && displayItems[selectedGeofenceIdx] === item
                            ? '#E2F1FE'
                            : '#A2D5F2',
                        strokeColor:
                          selectedGeofenceIdx !== null && displayItems[selectedGeofenceIdx] === item
                            ? '#006CEC'
                            : '#006CEC',
                        strokeWeight: 2,
                      },
                    }))}
                    height="400px"
                    editable={editingGeofenceIdx !== null}
                    onPolygonChange={handlePointsChange}
                    center={
                      selectedGeofenceIdx !== null &&
                      displayItems[selectedGeofenceIdx] &&
                      displayItems[selectedGeofenceIdx].points[0]
                        ? displayItems[selectedGeofenceIdx].points[0]
                        : undefined
                    }
                    level={selectedGeofenceIdx !== null ? 4 : 8}
                  />
                )}
              </div>

              {/* Geofence Overlay List */}
              <div className="geofence-list-overlay geofence-list-overlay-mobile">
                <div className="geofence-list-header">
                  <span className="geofence-list-title">등록된 구역</span>
                  <button
                    className="geofence-add-btn"
                    onClick={() => {
                      setIsAddingNew(!isAddingNew);
                      setSelectedGeofenceIdx(null);
                    }}
                  >
                    {isAddingNew ? (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    )}
                  </button>
                </div>

                {isAddingNew && (
                  <div className="geofence-edit-form">
                    <input
                      className="geofence-input"
                      placeholder="구역 이름 (예: 부산항)"
                      value={newGeofenceName}
                      onChange={(e) => setNewGeofenceName(e.target.value)}
                    />
                    <div className="geofence-actions">
                      <button
                        className="biz-cert-upload-btn"
                        style={{ width: 'auto', flex: 1 }}
                        onClick={handleNewGeofenceSave}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                )}

                <div className="geofence-items-container">
                  {displayItems.length === 0 ? (
                    <div className="geofence-empty-state">등록된 구역이 없습니다.</div>
                  ) : (
                    displayItems.map((item, idx) => {
                      const isEditing = editingGeofenceIdx === idx;
                      return (
                        <div
                          key={idx}
                          className={`geofence-item-row ${selectedGeofenceIdx === idx ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedGeofenceIdx(idx);
                            setIsAddingNew(false);
                          }}
                        >
                          {isEditing ? (
                            <div
                              className="geofence-edit-inline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                className="geofence-input"
                                value={item.name}
                                onChange={(e) => handleRenameOne(idx, e.target.value)}
                              />
                              <div className="geofence-actions">
                                <button
                                  className="geofence-tag tag-blue"
                                  onClick={(e) => handleSaveEdit(e)}
                                  style={{ border: 'none', cursor: 'pointer' }}
                                >
                                  저장
                                </button>
                                <button
                                  className="geofence-tag tag-red"
                                  onClick={(e) => handleCancelEdit(e)}
                                  style={{ border: 'none', cursor: 'pointer' }}
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span className="geofence-item-name">{item.name}</span>
                              <div className="geofence-tags">
                                <button
                                  className="geofence-tag tag-blue"
                                  onClick={(e) => handleStartEdit(idx, e)}
                                  style={{ border: 'none', cursor: 'pointer' }}
                                >
                                  수정
                                </button>
                                <button
                                  className="geofence-tag tag-red"
                                  onClick={(e) => handleDeleteGeofence(idx, e)}
                                  style={{ border: 'none', cursor: 'pointer' }}
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 3. Opt Out Card */}
            <div className="settings-card card-opt-out">
              <div className="opt-out-title">계정관리</div> {/* Changed title */}
              <div className="opt-out-desc">
                {' '}
                {/* Updated description */}
                회원 탈퇴 시 모든 계정 정보 및 데이터가 삭제되며 복구할 수 없습니다.
              </div>
              <button className="opt-out-btn" onClick={handleSelfWithdraw}>
                <span className="opt-out-btn-text">회원탈퇴</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Map & Geofences */}
          <div className="settings-right-panel">
            {/* Map */}
            <div style={{ width: '100%', height: '100%' }}>
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
              ) : (
                <KakaoMap
                  polygons={mapPolygons.map((item) => ({
                    points: item.points,
                    name: item.name,
                    options: {
                      fillColor:
                        selectedGeofenceIdx !== null && displayItems[selectedGeofenceIdx] === item
                          ? '#E2F1FE'
                          : '#A2D5F2',
                      strokeColor:
                        selectedGeofenceIdx !== null && displayItems[selectedGeofenceIdx] === item
                          ? '#006CEC'
                          : '#006CEC',
                      strokeWeight: 2,
                    },
                  }))}
                  height="100%"
                  editable={editingGeofenceIdx !== null}
                  onPolygonChange={handlePointsChange}
                  center={
                    selectedGeofenceIdx !== null &&
                    displayItems[selectedGeofenceIdx] &&
                    displayItems[selectedGeofenceIdx].points[0]
                      ? displayItems[selectedGeofenceIdx].points[0]
                      : undefined
                  }
                  level={selectedGeofenceIdx !== null ? 4 : 8}
                />
              )}
            </div>

            {/* Geofence Overlay List */}
            <div className="geofence-list-overlay">
              <div className="geofence-list-header">
                <span className="geofence-list-title">등록된 구역</span>
                <button
                  className="geofence-add-btn"
                  onClick={() => {
                    setIsAddingNew(!isAddingNew);
                    setSelectedGeofenceIdx(null);
                  }}
                >
                  {isAddingNew ? (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  )}
                </button>
              </div>

              {isAddingNew && (
                <div className="geofence-edit-form">
                  <input
                    className="geofence-input"
                    placeholder="구역 이름 (예: 부산항)"
                    value={newGeofenceName}
                    onChange={(e) => setNewGeofenceName(e.target.value)}
                  />
                  <div className="geofence-actions">
                    <button
                      className="biz-cert-upload-btn"
                      style={{ width: 'auto', flex: 1 }}
                      onClick={handleNewGeofenceSave}
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}

              <div className="geofence-items-container">
                {displayItems.length === 0 ? (
                  <div className="geofence-empty-state">등록된 구역이 없습니다.</div>
                ) : (
                  displayItems.map((item, idx) => {
                    const isEditing = editingGeofenceIdx === idx;
                    return (
                      <div
                        key={idx}
                        className={`geofence-item-row ${selectedGeofenceIdx === idx ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedGeofenceIdx(idx);
                          setIsAddingNew(false);
                        }}
                      >
                        {isEditing ? (
                          <div
                            className="geofence-edit-inline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              className="geofence-input"
                              value={item.name}
                              onChange={(e) => handleRenameOne(idx, e.target.value)}
                            />
                            <div className="geofence-actions">
                              <button
                                className="geofence-tag tag-blue"
                                onClick={(e) => handleSaveEdit(e)}
                                style={{ border: 'none', cursor: 'pointer' }}
                              >
                                저장
                              </button>
                              <button
                                className="geofence-tag tag-red"
                                onClick={(e) => handleCancelEdit(e)}
                                style={{ border: 'none', cursor: 'pointer' }}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span className="geofence-item-name">{item.name}</span>
                            <div className="geofence-tags">
                              <button
                                className="geofence-tag tag-blue"
                                onClick={(e) => handleStartEdit(idx, e)}
                                style={{ border: 'none', cursor: 'pointer' }}
                              >
                                수정
                              </button>
                              <button
                                className="geofence-tag tag-red"
                                onClick={(e) => handleDeleteGeofence(idx, e)}
                                style={{ border: 'none', cursor: 'pointer' }}
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
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
        title={viewData?.bizCertDocName || '사업자등록증'}
        allowDownload={true}
        downloadName={viewData?.bizCertDocName || 'business-certificate'}
      />
    </div>
  );
}
