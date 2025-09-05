import React, { useEffect, useMemo, useState } from "react";
import { resolveVehicleRentals, fetchAssetById, fetchAssets } from "../api";
import AssetForm from "../components/forms/AssetForm";
import DeviceInfoForm from "../components/forms/DeviceInfoForm";
import Modal from "../components/Modal";
import Table from "../components/Table";
import useTableSelection from "../hooks/useTableSelection";
import { typedStorage } from "../utils/storage";
import { COLORS, DIMENSIONS, ASSET } from "../constants";
import { formatDateShort } from "../utils/date";

export default function AssetStatus() {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [rows, setRows] = useState([]);
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [activeAsset, setActiveAsset] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoVehicle, setInfoVehicle] = useState(null);

    const deviceInitial = useMemo(() => {
        if (!activeAsset) return {};
        return typedStorage.devices.getInfo(activeAsset.id);
    }, [activeAsset]);

    // Date formatting handled by utils/date

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const list = await fetchAssets();
                let next = Array.isArray(list) ? list.map((a) => ({ ...a })) : [];
                try {
                    const map = typedStorage.devices.getAll() || {};
                    next = next.map((a) => {
                        const info = map[a.id];
                        return info ? { ...a, deviceSerial: info.serial || a.deviceSerial, installer: info.installer || a.installer } : a;
                    });
                } catch {}
                if (mounted) setRows(next);
            } catch (e) {
                console.error("Failed to load assets", e);
                if (mounted) setRows([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return rows.filter((a) => {
            const matchesTerm = term
                ? [a.plate, a.vehicleType, a.insuranceInfo, a.registrationDate, a.registrationStatus, a.installer, a.deviceSerial, a.id].filter(Boolean).join(" ").toLowerCase().includes(term)
                : true;
            const matchesStatus = status === "all" ? true : a.registrationStatus === status;
            return matchesTerm && matchesStatus;
        });
    }, [q, status, rows]);

    const selection = useTableSelection(filtered, "id");
    const { selected, selectedCount, clearSelection } = selection;

    const handleDeleteSelected = () => {
        if (selectedCount === 0) return;
        const ok = window.confirm("선택한 항목을 삭제하시겠습니까?");
        if (!ok) return;
        setRows((prev) => prev.filter((a) => !selected.has(a.id)));
        clearSelection();
    };

    const openInfoModal = async (asset) => {
        if (!asset) return;
        let assetFull = asset;
        try {
            if (asset?.id) {
                const fetched = await fetchAssetById(asset.id);
                if (fetched) assetFull = fetched;
            }
        } catch {}
        let rental = null;
        try {
            if (assetFull?.vin) {
                const status = await resolveVehicleRentals(assetFull.vin);
                rental = status?.current || null;
            }
        } catch {}
        setInfoVehicle({ asset: assetFull, rental, vin: assetFull?.vin || asset?.vin || null });
        setShowInfoModal(true);
    };

    const openDeviceModal = (asset) => {
        setActiveAsset(asset);
        setShowDeviceModal(true);
    };

    const handleDeviceInfoSubmit = (form) => {
        if (!activeAsset) return;

        const deviceInfo = {
            supplier: form.supplier || "",
            installDate: form.installDate || "",
            installer: form.installer || "",
            serial: form.serial || "",
            updatedAt: new Date().toISOString(),
        };

        typedStorage.devices.setInfo(activeAsset.id, deviceInfo);
        setRows((prev) => prev.map((a) => (a.id === activeAsset.id ? { ...a, deviceSerial: form.serial || a.deviceSerial, installer: form.installer || a.installer } : a)));
        setShowDeviceModal(false);
        setActiveAsset(null);
    };

    const nextAssetId = () => {
        const prefix = ASSET.ID_PREFIX;
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
        const { registrationDoc, insuranceDoc, ...rest } = data || {};
        const draft = { ...rest, createdAt: new Date().toISOString(), id };
        typedStorage.drafts.addAsset(draft);
        setShowAssetModal(false);
    };

    return (
        <div className="page">
            <h1>차량 자산 등록/관리</h1>

            <div className="asset-toolbar">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색(차량번호, 차종, 상태, 일련번호...)" className="asset-search" />
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
                <button
                    type="button"
                    className="form-button"
                    style={{ background: COLORS.DANGER }}
                    onClick={handleDeleteSelected}
                    disabled={selectedCount === 0}
                    title={selectedCount === 0 ? "삭제할 항목을 선택하세요" : "선택 항목 삭제"}
                >
                    선택 삭제
                </button>
            </div>

            <Modal isOpen={showAssetModal} onClose={() => setShowAssetModal(false)} title="자산 등록" formId="asset-create" onSubmit={handleAssetSubmit}>
                <AssetForm formId="asset-create" onSubmit={handleAssetSubmit} showSubmit={false} />
            </Modal>

            <Modal
                isOpen={showDeviceModal && activeAsset}
                onClose={() => setShowDeviceModal(false)}
                title={`단말 정보 등록 - ${activeAsset?.id || ""}`}
                formId="device-info"
                onSubmit={handleDeviceInfoSubmit}
            >
                <DeviceInfoForm formId="device-info" initial={deviceInitial} onSubmit={handleDeviceInfoSubmit} showSubmit={false} />
            </Modal>

            <Table
                columns={[
                    { key: "plate", label: "차량번호", render: (row) => (
                        <button
                            type="button"
                            onClick={() => openInfoModal(row)}
                            className="link-button"
                            title="차량 정보 보기"
                        >
                            {row.plate}
                        </button>
                    )},
                    { key: "vehicleType", label: "차종" },
                    { key: "insuranceInfo", label: "보험가입 정보", render: (row) => row.insuranceInfo || "-" },
                    { key: "registrationDate", label: "등록일", render: (row) => formatDateShort(row.registrationDate) },
                    { key: "registrationStatus", label: "차량등록상태" },
                    { key: "installer", label: "장착자", render: (row) => row.installer || "-" },
                    { key: "deviceSerial", label: "단말 일련번호", render: (row) => 
                        row.deviceSerial ? row.deviceSerial : (
                            <button type="button" className="form-button" onClick={() => openDeviceModal(row)}>
                                단말 등록
                            </button>
                        )
                    }
                ]}
                data={filtered}
                selection={selection}
                emptyMessage="조건에 맞는 차량 자산이 없습니다."
            />
            <Modal
                isOpen={showInfoModal && infoVehicle}
                onClose={() => setShowInfoModal(false)}
                title={`차량 상세 정보${infoVehicle?.asset?.plate ? ` - ${infoVehicle.asset.plate}` : ""}`}
                showFooter={false}
                ariaLabel="차량 상세 정보"
            >
                <div className="grid-2col">
                    <section className="card card-padding">
                        <h3 className="section-title section-margin-0">
                            자산 정보
                        </h3>
                        <div className="grid-info">
                            <div>차량번호</div>
                            <div>
                                <strong>{infoVehicle?.asset?.plate || "-"}</strong>
                            </div>
                            <div>차종</div>
                            <div>{infoVehicle?.asset?.vehicleType || "-"}</div>
                            <div>제조사/모델</div>
                            <div>{[infoVehicle?.asset?.make, infoVehicle?.asset?.model].filter(Boolean).join(" ") || "-"}</div>
                            <div>연식/연료</div>
                            <div>{[infoVehicle?.asset?.year, infoVehicle?.asset?.fuelType].filter(Boolean).join(" / ") || "-"}</div>
                            <div>VIN</div>
                            <div>{infoVehicle?.asset?.vin || infoVehicle?.vin || "-"}</div>
                            <div>보험/공제</div>
                            <div>{infoVehicle?.asset?.insuranceInfo || "-"}</div>
                            <div>차량 등록일</div>
                            <div>{infoVehicle?.asset?.registrationDate ? new Date(infoVehicle.asset.registrationDate).toLocaleDateString() : "-"}</div>
                            <div>등록 상태</div>
                            <div>{infoVehicle?.asset?.registrationStatus || "-"}</div>
                            <div>설치자</div>
                            <div>{infoVehicle?.asset?.installer || "-"}</div>
                            <div>기기 시리얼</div>
                            <div>{infoVehicle?.asset?.deviceSerial || "-"}</div>
                        </div>
                    </section>

                    <section className="card card-padding">
                        <h3 className="section-title section-margin-0">
                            대여 정보
                        </h3>
                        <div className="grid-info">
                            <div>계약번호</div>
                            <div>{infoVehicle?.rental?.rental_id || "-"}</div>
                            <div>대여자</div>
                            <div>{infoVehicle?.rental?.renter_name || "-"}</div>
                            <div>연락처</div>
                            <div>{infoVehicle?.rental?.contact_number || "-"}</div>
                            <div>주소</div>
                            <div>{infoVehicle?.rental?.address || "-"}</div>
                            <div>대여 기간</div>
                            <div>
                                {infoVehicle?.rental?.rental_period?.start ? new Date(infoVehicle.rental.rental_period.start).toLocaleDateString() : "-"}
                                {" ~ "}
                                {infoVehicle?.rental?.rental_period?.end ? new Date(infoVehicle.rental.rental_period.end).toLocaleDateString() : "-"}
                            </div>
                            <div>보험사</div>
                            <div>{infoVehicle?.rental?.insurance_name || "-"}</div>
                            <div>대여 위치</div>
                            <div>{infoVehicle?.rental?.rental_location ? `${infoVehicle.rental.rental_location.lat}, ${infoVehicle.rental.rental_location.lng}` : "-"}</div>
                            <div>반납 위치</div>
                            <div>{infoVehicle?.rental?.return_location ? `${infoVehicle.rental.return_location.lat}, ${infoVehicle.rental.return_location.lng}` : "-"}</div>
                            <div>현재 위치</div>
                            <div>{infoVehicle?.rental?.current_location ? `${infoVehicle.rental.current_location.lat}, ${infoVehicle.rental.current_location.lng}` : "-"}</div>
                        </div>
                    </section>
                </div>
            </Modal>
        </div>
    );
}
