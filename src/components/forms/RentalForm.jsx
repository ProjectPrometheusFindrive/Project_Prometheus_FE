import React, { useEffect, useMemo, useState } from "react";
import useFormState from "../../hooks/useFormState";
import FormGrid from "./FormGrid";
import FormField from "./FormField";
import FormActions from "./FormActions";
import { fetchAssets } from "../../api";
import { getManagementStage } from "../../utils/managementStage";
import StatusBadge from "../StatusBadge";

export default function RentalForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
    const DEBUG = true;
    const initialFormValues = useMemo(() => ({
        rental_id: initial.rental_id || "",
        vin: initial.vin || "",
        vehicleType: initial.vehicleType || "",
        plate: initial.plate || "",
        renter_name: initial.renter_name || "",
        contact_number: initial.contact_number || "",
        address: initial.address || "",
        start: initial.start || initial?.rental_period?.start || "",
        end: initial.end || initial?.rental_period?.end || "",
        rental_amount: initial.rental_amount || "",
        rental_type: initial.rental_type || "단기",
        deposit: initial.deposit || "",
        payment_method: initial.payment_method || "월별 자동이체",
        insurance_name: initial.insurance_name || "",
        contract_file: initial.contract_file || null,
        driver_license_file: initial.driver_license_file || null,
    }), [initial]);

    const hasInitial = !!(initial && Object.keys(initial).length > 0);
    const { form, update, updateFields, handleSubmit } = useFormState(initialFormValues, { onSubmit, syncOnInitialChange: hasInitial });

    // Assets for vehicle dropdown
    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [assetsError, setAssetsError] = useState("");

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (DEBUG) console.log("[RentalForm] fetchAssets start");
            setAssetsLoading(true);
            setAssetsError("");
            try {
                const list = await fetchAssets();
                const normalized = Array.isArray(list)
                    ? list.map((a) => ({ ...a, managementStage: getManagementStage(a) }))
                    : [];
                if (mounted) setAssets(normalized);
                if (DEBUG) console.log("[RentalForm] fetchAssets success count=", normalized.length);
            } catch (e) {
                console.warn("Failed to fetch assets for rental form", e);
                if (mounted) setAssetsError("자산 목록을 불러오지 못했습니다.");
                if (DEBUG) console.log("[RentalForm] fetchAssets error", e);
            } finally {
                if (mounted) setAssetsLoading(false);
                if (DEBUG) console.log("[RentalForm] fetchAssets done");
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // Stage ranking per requested order
    const stageRank = (stage) => {
        const s = String(stage || "").trim();
        switch (s) {
            case "대여가능":
                return 0; // 현재 대여가능
            case "대여중":
                return 1; // 대여 중
            case "수리/점검 완료":
                return 2; // 수리/점검 완료
            case "수리/점검 중":
                return 3; // 수리/점검 중
            case "예약중":
            case "예약 중":
                return 4; // 예약중
            default:
                return 9; // 나머지
        }
    };

    const sortedAssets = useMemo(() => {
        const list = Array.isArray(assets) ? [...assets] : [];
        list.sort((a, b) => {
            const ra = stageRank(a?.managementStage);
            const rb = stageRank(b?.managementStage);
            if (ra !== rb) return ra - rb;
            const pa = String(a?.plate || "");
            const pb = String(b?.plate || "");
            return pa.localeCompare(pb, "ko");
        });
        return list;
    }, [assets]);

    const options = useMemo(() => {
        const base = [{ value: "", label: assetsLoading ? "로딩 중..." : "차량번호 선택" }];
        if (assetsError) {
            base[0] = { value: "", label: "자산 불러오기 실패" };
        }
        const mapped = sortedAssets.map((a) => {
            const plate = a?.plate || "-";
            const vt = a?.vehicleType || "";
            const st = a?.managementStage || "";
            return {
                value: plate,
                label: [plate, vt && `· ${vt}`, st && `· ${st}`].filter(Boolean).join(" "),
                __stage: st,
                __asset: a,
            };
        });
        const opts = [...base, ...mapped];
        if (DEBUG) console.log("[RentalForm] options built", opts.length);
        return opts;
    }, [sortedAssets, assetsLoading, assetsError]);

    const findSelectedAsset = () => {
        const plate = (form.plate || "").trim();
        if (!plate) return null;
        return sortedAssets.find((a) => String(a.plate || "").trim() === plate) || null;
    };

    const selectedAsset = findSelectedAsset();

    const stageToBadgeType = (stage) => {
        const s = String(stage || "").trim();
        if (s === "대여가능") return "available";
        if (s === "대여중") return "rented";
        if (s === "예약중" || s === "예약 중") return "pending";
        if (s === "수리/점검 중") return "maintenance";
        if (s === "수리/점검 완료") return "completed";
        return "default";
    };

    // If initial has plate but missing fields, auto-fill once after assets load
    useEffect(() => {
        if (!assetsLoading && !assetsError && form.plate && (!form.vin || !form.vehicleType)) {
            const p = String(form.plate || "").trim();
            const a = sortedAssets.find((it) => String(it.plate || "").trim() === p);
            if (a) {
                if (DEBUG) console.log("[RentalForm] autofill after assets load from plate", form.plate, a);
                if (!form.vin && a.vin) update("vin", a.vin);
                if (!form.vehicleType && a.vehicleType) update("vehicleType", a.vehicleType);
                if (!form.insurance_name && a.insuranceInfo) update("insurance_name", a.insuranceInfo);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assetsLoading, assetsError, sortedAssets]);

    // Trace important fields
    useEffect(() => {
        if (DEBUG) console.log("[RentalForm] form", { plate: form.plate, vin: form.vin, vehicleType: form.vehicleType, insurance_name: form.insurance_name });
    }, [form.plate, form.vin, form.vehicleType, form.insurance_name]);

    return (
        <FormGrid id={formId} onSubmit={handleSubmit}>
            {/* 차량번호를 최상단 드롭다운으로 변경 */}
            <FormField
                id="plate"
                label="차량번호"
                type="select"
                value={form.plate}
                onChange={(value) => {
                    const nextPlate = String(value || "").trim();
                    if (DEBUG) console.log("[RentalForm] plate onChange", nextPlate);
                    const asset = sortedAssets.find((a) => String(a.plate || "").trim() === nextPlate);
                    const updates = { plate: nextPlate };
                    if (asset) {
                        if (asset.vin) updates.vin = asset.vin;
                        if (asset.vehicleType) updates.vehicleType = asset.vehicleType;
                        if (asset.insuranceInfo) updates.insurance_name = asset.insuranceInfo;
                    }
                    // Batch update to prevent flicker
                    if (typeof updateFields === 'function') {
                        if (DEBUG) console.log("[RentalForm] applying updates", updates);
                        updateFields(updates);
                    } else {
                        Object.entries(updates).forEach(([k, v]) => update(k, v));
                    }
                }}
                options={options}
                disabled={readOnly}
                required
            >
                {selectedAsset ? (
                    <div
                        style={{
                            marginTop: 6,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            color: "#555",
                            fontSize: "12px",
                        }}
                    >
                        <StatusBadge type={stageToBadgeType(selectedAsset.managementStage)}>
                            {selectedAsset.managementStage}
                        </StatusBadge>
                        <span>|</span>
                        <span>차종: <strong>{selectedAsset.vehicleType || "-"}</strong></span>
                        <span>VIN: <strong>{selectedAsset.vin || "-"}</strong></span>
                        <span>보험사: <strong>{selectedAsset.insuranceInfo || "-"}</strong></span>
                    </div>
                ) : null}
            </FormField>

            <FormField
                id="rental_id"
                label="대여 계약번호"
                value={form.rental_id}
                onChange={(value) => update("rental_id", value)}
                placeholder="예: 100000000017"
                required
                disabled={readOnly}
            />

            {false && (
                <>
                    <FormField
                        id="vin"
                        label="VIN"
                        value={form.vin}
                        onChange={(value) => update("vin", value)}
                        placeholder="예: 1HGCM82633A004352"
                        required
                        disabled={readOnly}
                    />

                    <FormField
                        id="vehicleType"
                        label="차종"
                        value={form.vehicleType}
                        onChange={(value) => update("vehicleType", value)}
                        placeholder="예: 싼타페 25년형"
                        disabled={readOnly}
                    />
                </>
            )}

            <div className="form-row">
                <div className="form-col">
                    <FormField
                        id="renter_name"
                        label="계약자 이름"
                        value={form.renter_name}
                        onChange={(value) => update("renter_name", value)}
                        placeholder="예: 홍길동"
                        required
                        disabled={readOnly}
                    />
                </div>
                <div className="form-col">
                    <FormField
                        id="contact_number"
                        label="계약자 연락처"
                        value={form.contact_number}
                        onChange={(value) => update("contact_number", value)}
                        placeholder="예: 010-1234-5678"
                        disabled={readOnly}
                    />
                </div>
            </div>

            <FormField
                id="address"
                label="계약자 주소"
                value={form.address}
                onChange={(value) => update("address", value)}
                placeholder="예: 서울 종로구 ..."
                disabled={readOnly}
            />

            <div className="form-row">
                <div className="form-col">
                    <FormField
                        id="start"
                        label="대여 시작일"
                        type="date"
                        value={form.start}
                        onChange={(value) => update("start", value)}
                        required
                        disabled={readOnly}
                    />
                </div>
                <div className="form-col">
                    <FormField
                        id="end"
                        label="대여 종료일"
                        type="date"
                        value={form.end}
                        onChange={(value) => update("end", value)}
                        required
                        disabled={readOnly}
                    />
                </div>
            </div>

            {/* 계약 유형 */}
            <div>
                <label className="form-label" htmlFor="rental_type">계약 유형</label>
                <div className="form-radio-row" role="radiogroup" aria-label="계약 유형">
                    <label className="form-radio">
                        <input
                            type="radio"
                            name="rental_type"
                            value="단기"
                            checked={form.rental_type === "단기"}
                            onChange={(e) => update("rental_type", e.target.value)}
                            disabled={readOnly}
                        />
                        단기
                    </label>
                    <label className="form-radio">
                        <input
                            type="radio"
                            name="rental_type"
                            value="장기"
                            checked={form.rental_type === "장기"}
                            onChange={(e) => update("rental_type", e.target.value)}
                            disabled={readOnly}
                        />
                        장기
                    </label>
                </div>
            </div>

            {/* 금액/보증금 */}
            <div className="form-row">
                <div className="form-col">
                    <FormField
                        id="rental_amount"
                        label="대여금액"
                        type="number"
                        value={form.rental_amount}
                        onChange={(value) => update("rental_amount", value)}
                        placeholder="예: 22800000"
                        min="0"
                        step="1000"
                        disabled={readOnly}
                    />
                </div>
                <div className="form-col">
                    <FormField
                        id="deposit"
                        label="보증금"
                        type="number"
                        value={form.deposit}
                        onChange={(value) => update("deposit", value)}
                        placeholder="예: 3000000"
                        min="0"
                        step="1000"
                        disabled={readOnly}
                    />
                </div>
            </div>

            {/* 결제 방식 */}
            <FormField
                id="payment_method"
                label="결제 방식"
                type="select"
                value={form.payment_method}
                onChange={(value) => update("payment_method", value)}
                options={[
                    { value: "월별 자동이체", label: "월별 자동이체" },
                    { value: "일시불", label: "일시불" },
                    { value: "계좌이체", label: "계좌이체" },
                    { value: "카드 결제", label: "카드 결제" },
                ]}
                disabled={readOnly}
            />

            <FormField
                id="rental_amount"
                label="대여금액"
                type="number"
                value={form.rental_amount}
                onChange={(value) => update("rental_amount", value)}
                placeholder="예: 1500000"
                min="0"
                step="1000"
                disabled={readOnly}
            />

            {false && (
                <FormField
                    id="insurance_name"
                    label="보험사"
                    value={form.insurance_name}
                    onChange={(value) => update("insurance_name", value)}
                    placeholder="예: ABC 보험"
                    disabled={readOnly}
                />
            )}

            <FormField
                id="contract_file"
                label="대여 계약서 업로드"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={(value) => update("contract_file", value)}
                disabled={readOnly}
            >
                {form.contract_file && <div className="file-info">{form.contract_file.name}</div>}
            </FormField>

            <FormField
                id="driver_license_file"
                label="운전면허증 업로드"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={(value) => update("driver_license_file", value)}
                disabled={readOnly}
            >
                {form.driver_license_file && <div className="file-info">{form.driver_license_file.name}</div>}
            </FormField>

            {!readOnly && showSubmit && (
                <FormActions>
                    <button type="submit" className="form-button">
                        저장
                    </button>
                </FormActions>
            )}
        </FormGrid>
    );
}
