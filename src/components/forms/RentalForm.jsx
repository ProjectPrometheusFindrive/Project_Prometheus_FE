import React, { useEffect, useMemo, useState, useRef } from "react";
import useFormState from "../../hooks/useFormState";
import FormGrid from "./FormGrid";
import FormField from "./FormField";
import FormActions from "./FormActions";
import { fetchAssets } from "../../api";
import { getManagementStage } from "../../utils/managementStage";
import StatusBadge from "../StatusBadge";
import { formatPhone11, formatCurrency } from "../../utils/formatters";
import { chooseUploadMode } from "../../constants/uploads";
import { uploadViaSignedPut, uploadResumable } from "../../utils/uploads";
import { ocrExtract } from "../../api";
import { randomId } from "../../utils/id";
import { useAuth } from "../../contexts/AuthContext";
import { useCompany } from "../../contexts/CompanyContext";
import OcrSuggestionPicker from "../OcrSuggestionPicker";

export default function RentalForm({ initial = {}, readOnly = false, onSubmit, formId, showSubmit = true }) {
    const DEBUG = true;
    const initialFormValues = useMemo(() => ({
        rentalId: initial.rentalId || "",
        vin: initial.vin || "",
        vehicleType: initial.vehicleType || "",
        plate: initial.plate || "",
        renterName: initial.renterName || "",
        contactNumber: initial.contactNumber || "",
        address: initial.address || "",
        start: initial.start || initial?.rentalPeriod?.start || "",
        end: initial.end || initial?.rentalPeriod?.end || "",
        rentalAmount: initial.rentalAmount || "",
        rentalType: initial.rentalType || "단기",
        deposit: initial.deposit || "",
        paymentMethod: initial.paymentMethod || "월별 자동이체",
        insuranceName: initial.insuranceName || "",
        contractFile: initial.contractFile || null,
        driverLicenseFile: initial.driverLicenseFile || null,
    }), [initial]);

    const hasInitial = !!(initial && Object.keys(initial).length > 0);
    const tmpIdRef = useRef(randomId("rental"));
    const [preUploaded, setPreUploaded] = useState({ contract: [], license: [] });
    const [ocrSuggest, setOcrSuggest] = useState({});
    const [busy, setBusy] = useState({ status: "idle", message: "", percent: 0 });
    const [step, setStep] = useState((readOnly || hasInitial) ? "details" : "upload");
    const auth = useAuth();
    const { companyInfo } = useCompany();
    const companyId = (auth?.user?.companyId || companyInfo?.companyId || "ci");
    const ocrFolderBase = `company/${companyId}/docs`;

    // Suggestion map by field name
    const fieldSuggestions = useMemo(() => {
        const map = {};
        const push = (name, value, confidence, source) => {
            if (!name) return;
            if (!map[name]) map[name] = [];
            map[name].push({ value, confidence, source });
        };
        const addDoc = (docKey) => {
            const doc = ocrSuggest && ocrSuggest[docKey];
            const fields = (doc && Array.isArray(doc.fields)) ? doc.fields : [];
            const source = doc && doc.source;
            fields.forEach((f) => push(f.name, f.value, f.confidence, source));
        };
        addDoc('contract');
        addDoc('driverLicense');
        // Normalize some driverLicense keys to rental fields
        if (map.name) {
            map.renterName = (map.renterName || []).concat(map.name);
        }
        return map;
    }, [ocrSuggest]);

    const onSubmitWrapped = async (values) => {
        if (typeof onSubmit === 'function') {
            await onSubmit({ ...values, preUploaded, ocrSuggestions: ocrSuggest });
        }
    };

    const { form, update, updateFields, handleSubmit } = useFormState(initialFormValues, { onSubmit: onSubmitWrapped, syncOnInitialChange: hasInitial });

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
                if (!form.insuranceName && a.insuranceInfo) update("insuranceName", a.insuranceInfo);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assetsLoading, assetsError, sortedAssets]);

    // Trace important fields
    useEffect(() => {
        if (DEBUG) console.log("[RentalForm] form", { plate: form.plate, vin: form.vin, vehicleType: form.vehicleType, insuranceName: form.insuranceName });
    }, [form.plate, form.vin, form.vehicleType, form.insuranceName]);

    // Normalize initial numeric amounts to display with commas
    useEffect(() => {
        const normalizeAmount = (val) => {
            if (val == null) return "";
            const s = String(val);
            // If already contains comma, assume formatted
            if (/[,]/.test(s)) return s;
            // If plain digits, format
            if (/^\d+$/.test(s)) return formatCurrency(s);
            return s;
        };
        const updates = {};
        const ra = normalizeAmount(form.rentalAmount);
        if (ra !== form.rentalAmount) updates.rentalAmount = ra;
        const dp = normalizeAmount(form.deposit);
        if (dp !== form.deposit) updates.deposit = dp;
        if (Object.keys(updates).length > 0) {
            updateFields(updates);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
    const uploadOne = async (file, label) => {
        const newName = `ocr-rental-${tmpIdRef.current}-${label}-${file.name}`;
        const wrapped = new File([file], newName, { type: file.type });
        const mode = chooseUploadMode(wrapped.size || 0);
        if (mode === 'signed-put') {
            const { promise } = uploadViaSignedPut(wrapped, { folder: ocrFolderBase, onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })) });
            const res = await promise;
            return { name: newName, objectName: res.objectName || '' };
        } else {
            const { promise } = uploadResumable(wrapped, { folder: ocrFolderBase, onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })) });
            const res = await promise;
            return { name: newName, objectName: res.objectName || '' };
        }
    };

    const handleUploadAndOcr = async () => {
        const contracts = toArray(form.contractFile);
        const licenses = toArray(form.driverLicenseFile);
        // Upload into allowed prefix
        if (contracts.length === 0 && licenses.length === 0) {
            // allow proceed but encourage upload
            setStep('details');
            return;
        }
        setBusy({ status: 'uploading', message: '업로드 중...', percent: 0 });
        try {
            const uploaded = { contract: [], license: [] };
            for (const f of contracts) {
                const item = await uploadOne(f, `contracts`);
                if (item.objectName) uploaded.contract.push(item);
            }
            for (const f of licenses) {
                const item = await uploadOne(f, `licenses`);
                if (item.objectName) uploaded.license.push(item);
            }
            setPreUploaded(uploaded);

            setBusy({ status: 'ocr', message: 'OCR 처리 중...', percent: 0 });
            const suggestions = {};
            if (uploaded.contract[0]?.objectName) {
                try {
                    const resp = await ocrExtract({ docType: 'contract', objectName: uploaded.contract[0].objectName, sourceName: uploaded.contract[0].name, saveOutput: true });
                    if (resp && resp.ocrSuggestions && resp.ocrSuggestions.contract) {
                        suggestions.contract = resp.ocrSuggestions.contract;
                        // map into rental form (conservative)
                        const fields = suggestions.contract.fields || [];
                        const updates = {};
                        const num = (s) => s;
                        fields.forEach(({ name, value }) => {
                            const v = String(value ?? '');
                            if (name === 'renterName' && !form.renterName) updates.renterName = v;
                            if (name === 'contactNumber' && !form.contactNumber) updates.contactNumber = v;
                            if (name === 'address' && !form.address) updates.address = v;
                            if (name === 'start' && !form.start) updates.start = v;
                            if (name === 'end' && !form.end) updates.end = v;
                            if (name === 'rentalAmount' && !form.rentalAmount) updates.rentalAmount = formatCurrency(v);
                            if (name === 'monthlyPayment' && !form.rentalAmount) updates.rentalAmount = formatCurrency(v);
                            if (name === 'deposit' && !form.deposit) updates.deposit = formatCurrency(v);
                            if (name === 'paymentMethod' && !form.paymentMethod) updates.paymentMethod = v;
                            if (name === 'rentalType' && !form.rentalType) updates.rentalType = v;
                        });
                        if (Object.keys(updates).length > 0) updateFields(updates);
                    }
                } catch (e) { /* noop */ }
            }
            if (uploaded.license[0]?.objectName) {
                try {
                    const resp = await ocrExtract({ docType: 'driverLicense', objectName: uploaded.license[0].objectName, sourceName: uploaded.license[0].name, saveOutput: true });
                    if (resp && resp.ocrSuggestions && resp.ocrSuggestions.driverLicense) {
                        suggestions.driverLicense = resp.ocrSuggestions.driverLicense;
                    }
                } catch (e) { /* noop */ }
            }
            setOcrSuggest(suggestions);
        } finally {
            setBusy({ status: 'idle', message: '', percent: 0 });
            setStep('details');
        }
    };

    const UploadStep = () => (
        <>
            <div className="form-row">
                <div className="form-col">
                    <FormField
                        id="contractFile"
                        label="대여 계약서 업로드"
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        multiple
                        onChange={(value) => update("contractFile", value)}
                        disabled={readOnly}
                    >
                        {Array.isArray(form.contractFile) && form.contractFile.length > 0 && (
                            <div className="file-info">{form.contractFile.map(f => f.name).join(", ")}</div>
                        )}
                        {form.contractFile && !Array.isArray(form.contractFile) && (
                            <div className="file-info">{form.contractFile.name}</div>
                        )}
                    </FormField>
                </div>
                <div className="form-col">
                    <FormField
                        id="driverLicenseFile"
                        label="운전면허증 업로드"
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        multiple
                        onChange={(value) => update("driverLicenseFile", value)}
                        disabled={readOnly}
                    >
                        {Array.isArray(form.driverLicenseFile) && form.driverLicenseFile.length > 0 && (
                            <div className="file-info">{form.driverLicenseFile.map(f => f.name).join(", ")}</div>
                        )}
                        {form.driverLicenseFile && !Array.isArray(form.driverLicenseFile) && (
                            <div className="file-info">{form.driverLicenseFile.name}</div>
                        )}
                    </FormField>
                </div>
            </div>
            {busy.status !== 'idle' && (
                <div style={{ marginBottom: 12, color: '#555', fontSize: 13 }}>
                    {busy.message} {busy.percent ? `${busy.percent}%` : ''}
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="form-button" onClick={handleUploadAndOcr} disabled={busy.status !== 'idle'}>
                    업로드 및 OCR
                </button>
                <button type="button" className="form-button form-button--muted" onClick={() => setStep('details')} disabled={busy.status !== 'idle'}>
                    OCR 없이 진행
                </button>
            </div>
        </>
    );

    return (
        <FormGrid id={formId} onSubmit={handleSubmit}>
            {!readOnly && (step === 'upload') && (
                <UploadStep />
            )}
            {/* 세부 항목 (Step 2) */}
            {readOnly || step === 'details' ? (
            <>
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
                        if (asset.insuranceInfo) updates.insuranceName = asset.insuranceInfo;
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
                id="rentalId"
                label="대여 계약번호"
                value={form.rentalId}
                onChange={(value) => update("rentalId", value)}
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
                        id="renterName"
                        label="계약자 이름"
                        value={form.renterName}
                        onChange={(value) => update("renterName", value)}
                        placeholder="예: 홍길동"
                        required
                        disabled={readOnly}
                    >
                        <OcrSuggestionPicker items={fieldSuggestions.renterName || []} onApply={(v) => update("renterName", String(v || ""))} />
                    </FormField>
                </div>
                <div className="form-col">
                    <FormField
                        id="contactNumber"
                        label="계약자 연락처"
                        type="tel"
                        value={form.contactNumber}
                        onChange={(value) => update("contactNumber", formatPhone11(value))}
                        placeholder="000-0000-0000"
                        inputMode="numeric"
                        maxLength={13}
                        disabled={readOnly}
                    >
                        <OcrSuggestionPicker items={fieldSuggestions.contactNumber || []} onApply={(v) => update("contactNumber", formatPhone11(String(v || "")))} />
                    </FormField>
                </div>
            </div>

            <FormField
                id="address"
                label="계약자 주소"
                value={form.address}
                onChange={(value) => update("address", value)}
                placeholder="예: 서울 종로구 ..."
                disabled={readOnly}
            >
                <OcrSuggestionPicker items={fieldSuggestions.address || []} onApply={(v) => update("address", String(v || ""))} />
            </FormField>

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
                    >
                        <OcrSuggestionPicker items={fieldSuggestions.start || []} onApply={(v) => update("start", String(v || ""))} />
                    </FormField>
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
                    >
                        <OcrSuggestionPicker items={fieldSuggestions.end || []} onApply={(v) => update("end", String(v || ""))} />
                    </FormField>
                </div>
            </div>

            {/* 계약 유형 / 결제 방식 */}
            <div className="form-row">
                <div className="form-col">
                    <label className="form-label" htmlFor="rentalType">계약 기간</label>
                    <div className="form-radio-row" role="radiogroup" aria-label="계약 유형">
                        <label className="form-radio">
                            <input
                                type="radio"
                                name="rentalType"
                                value="단기"
                                checked={form.rentalType === "단기"}
                                onChange={(e) => update("rentalType", e.target.value)}
                                disabled={readOnly}
                            />
                            단기
                        </label>
                        <label className="form-radio">
                            <input
                                type="radio"
                                name="rentalType"
                                value="장기"
                                checked={form.rentalType === "장기"}
                                onChange={(e) => update("rentalType", e.target.value)}
                                disabled={readOnly}
                            />
                            장기
                        </label>
                    </div>
                </div>
                <div className="form-col">
                    <FormField
                        id="paymentMethod"
                        label="결제 방식"
                        type="select"
                        value={form.paymentMethod}
                        onChange={(value) => update("paymentMethod", value)}
                        options={[
                            { value: "월별 자동이체", label: "월별 자동이체" },
                            { value: "일시불", label: "일시불" },
                            { value: "계좌이체", label: "계좌이체" },
                            { value: "카드 결제", label: "카드 결제" },
                        ]}
                        disabled={readOnly}
                    >
                        <OcrSuggestionPicker items={fieldSuggestions.paymentMethod || []} onApply={(v) => update("paymentMethod", String(v || ""))} />
                    </FormField>
                </div>
            </div>

            {/* 금액/보증금 */}
            <div className="form-row">
                <div className="form-col">
                    <FormField
                        id="rentalAmount"
                        label="대여금액"
                        type="text"
                        value={form.rentalAmount}
                        onChange={(value) => update("rentalAmount", formatCurrency(value))}
                        placeholder="예: 22,800,000"
                        inputMode="numeric"
                        maxLength={20}
                        disabled={readOnly}
                    >
                        <OcrSuggestionPicker items={fieldSuggestions.rentalAmount || fieldSuggestions.monthlyPayment || []} onApply={(v) => update("rentalAmount", formatCurrency(String(v || "")))} />
                    </FormField>
                </div>
                <div className="form-col">
                    <FormField
                        id="deposit"
                        label="보증금"
                        type="text"
                        value={form.deposit}
                        onChange={(value) => update("deposit", formatCurrency(value))}
                        placeholder="예: 3,000,000"
                        inputMode="numeric"
                        maxLength={20}
                        disabled={readOnly}
                    >
                        <OcrSuggestionPicker items={fieldSuggestions.deposit || []} onApply={(v) => update("deposit", formatCurrency(String(v || "")))} />
                    </FormField>
                </div>
            </div>


            {false && (
                <FormField
                    id="insuranceName"
                    label="보험사"
                    value={form.insuranceName}
                    onChange={(value) => update("insuranceName", value)}
                    placeholder="예: ABC 보험"
                    disabled={readOnly}
                />
            )}

            

            {!readOnly && showSubmit && (
                <FormActions>
                    {!readOnly && step === 'details' && (
                        <>
                            <button type="button" className="form-button form-button--muted" onClick={() => setStep('upload')} style={{ marginRight: 8 }}>
                                이전
                            </button>
                            <button type="submit" className="form-button">
                                저장
                            </button>
                        </>
                    )}
                </FormActions>
            )}
            </>
            ) : null}
        </FormGrid>
    );
}
