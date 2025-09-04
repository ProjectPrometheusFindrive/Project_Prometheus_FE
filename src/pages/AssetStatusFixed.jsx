import React, { useEffect, useMemo, useState } from "react";
import { assets as seedAssets } from "../data/assets";
import AssetForm from "../components/forms/AssetForm";
import DeviceInfoForm from "../components/forms/DeviceInfoForm";

export default function AssetStatus() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState(() => seedAssets.map((a) => ({ ...a })));
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [activeAsset, setActiveAsset] = useState(null);

  const deviceInitial = useMemo(() => {
    if (!activeAsset) return {};
    try {
      const raw = localStorage.getItem("deviceInfoByAsset");
      const map = raw ? JSON.parse(raw) : {};
      return map[activeAsset.id] || {};
    } catch {
      return {};
    }
  }, [activeAsset]);

  const fmtDateShort = (s) => {
    try {
      const d = new Date(s);
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `'${yy}.${mm}.${dd}`;
    } catch {
      return s || "";
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("deviceInfoByAsset");
      if (!raw) return;
      const map = JSON.parse(raw) || {};
      setRows((prev) =>
        prev.map((a) => {
          const info = map[a.id];
          if (info) return { ...a, deviceSerial: info.serial || a.deviceSerial, installer: info.installer || a.installer };
          return a;
        })
      );
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((a) => {
      const matchesTerm = term
        ? [a.plate, a.vehicleType, a.insuranceInfo, a.registrationDate, a.registrationStatus, a.installer, a.deviceSerial, a.id]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term)
        : true;
      const matchesStatus = status === "all" ? true : a.registrationStatus === status;
      return matchesTerm && matchesStatus;
    });
  }, [q, status, rows]);

  const openDeviceModal = (asset) => {
    setActiveAsset(asset);
    setShowDeviceModal(true);
  };

  const handleDeviceInfoSubmit = (form) => {
    if (!activeAsset) return;
    try {
      const raw = localStorage.getItem("deviceInfoByAsset");
      const map = raw ? JSON.parse(raw) : {};
      map[activeAsset.id] = {
        supplier: form.supplier || "",
        installDate: form.installDate || "",
        installer: form.installer || "",
        serial: form.serial || "",
      };
      localStorage.setItem("deviceInfoByAsset", JSON.stringify(map));
    } catch {}
    setRows((prev) =>
      prev.map((a) => (a.id === activeAsset.id ? { ...a, deviceSerial: form.serial || a.deviceSerial, installer: form.installer || a.installer } : a))
    );
    setShowDeviceModal(false);
    setActiveAsset(null);
  };

  const nextAssetId = () => {
    const prefix = "VH-";
    let max = 0;
    for (const a of rows) {
      const m = String(a.id || "").match(/(\d{1,})$/);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) max = Math.max(max, n);
      }
    }
    return `${prefix}${String(max + 1).padStart(4, "0")}`;
  };

  const handleAssetSubmit = (data) => {
    const id = nextAssetId();
    const next = {
      id,
      plate: data.plate || "",
      vehicleType: data.vehicleType || "",
      insuranceInfo: "",
      registrationDate: data.registrationDate || new Date().toISOString().slice(0, 10),
      registrationStatus: data.registrationStatus || "자산등록 완료",
      installer: "",
      deviceSerial: "",
    };
    setRows((prev) => [next, ...prev]);
    try {
      const arr = JSON.parse(localStorage.getItem("assetDrafts") || "[]");
      const { registrationDoc, insuranceDoc, ...rest } = data || {};
      arr.push({ ...rest, createdAt: new Date().toISOString(), id });
      localStorage.setItem("assetDrafts", JSON.stringify(arr));
    } catch {}
    setShowAssetModal(false);
  };

  return (
    <div className="page">
      <h1>차량 자산 등록/관리</h1>

      <div className="asset-toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색(차량번호, 차종, 상태, 일련번호...)"
          className="asset-search"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="asset-filter">
          <option value="all">전체 상태</option>
          <option value="자산등록 완료">자산등록 완료</option>
          <option value="보험등록 완료">보험등록 완료</option>
          <option value="장비장착 완료">장비장착 완료</option>
          <option value="장비장착 대기">장비장착 대기</option>
          <option value="미등록">미등록</option>
        </select>
        <div style={{ flex: 1 }} />
        <button type="button" className="form-button" onClick={() => setShowAssetModal(true)}>
          자산 등록
        </button>
      </div>

      {showAssetModal && (
        <div className="modal-backdrop" onClick={() => setShowAssetModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>자산 등록</h2>
            <AssetForm formId="asset-create" onSubmit={handleAssetSubmit} showSubmit={false} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" className="form-button" form="asset-create">저장</button>
              <button type="button" className="form-button" style={{ background: "#777" }} onClick={() => setShowAssetModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {showDeviceModal && activeAsset && (
        <div className="modal-backdrop" onClick={() => setShowDeviceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>단말 정보 등록 - {activeAsset.id}</h2>
            <DeviceInfoForm formId="device-info" initial={deviceInitial} onSubmit={handleDeviceInfoSubmit} showSubmit={false} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" className="form-button" form="device-info">저장</button>
              <button type="button" className="form-button" style={{ background: "#777" }} onClick={() => setShowDeviceModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="asset-table">
          <thead>
            <tr>
              <th>차량번호</th>
              <th>차종</th>
              <th>보험가입 정보</th>
              <th>등록일</th>
              <th>차량등록상태</th>
              <th>장착자</th>
              <th>단말 일련번호</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>{a.plate}</td>
                <td>{a.vehicleType}</td>
                <td>{a.insuranceInfo || '-'}</td>
                <td>{fmtDateShort(a.registrationDate)}</td>
                <td>{a.registrationStatus}</td>
                <td>{a.installer || '-'}</td>
                <td>
                  {a.deviceSerial ? (
                    a.deviceSerial
                  ) : (
                    <button type="button" className="form-button" onClick={() => openDeviceModal(a)}>단말 등록</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty">조건에 맞는 차량 자산이 없습니다.</div>}
      </div>
    </div>
  );
}

