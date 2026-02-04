import { useEffect, useMemo, useState, useRef } from "react";
import { fetchAssets, fetchAssetsSummary, ocrExtract } from "../../api";
import { getManagementStage } from "../../utils/managementStage";
import { formatPhone11, formatCurrency } from "../../utils/formatters";
import { emitToast } from "../../utils/toast";
import { uploadOneOCR } from "../../utils/uploadHelpers";
import { randomId } from "../../utils/id";
import generateContractNumber from "../../utils/rentalId";
import { useAuth } from "../../contexts/AuthContext";
import { useCompany } from "../../contexts/CompanyContext";
import StatusBadge from "../badges/StatusBadge";
import FilesPreviewCarousel from "../FilesPreviewCarousel";
import FilePreview from "../FilePreview";
import "./RentalCreateModal.css";

const CloseIcon = () => (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z" fill="#1C1C1C"/>
        <path d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z" fill="#1C1C1C"/>
    </svg>
);

const AttachIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 10.0944L10.8539 15.8909C10.101 16.6011 9.07974 17 8.01492 17C6.9501 17 5.92889 16.6011 5.17594 15.8909C4.423 15.1808 4 14.2177 4 13.2134C4 12.2092 4.423 11.246 5.17594 10.5359L11.322 4.73937C11.824 4.26596 12.5048 4 13.2147 4C13.9246 4 14.6054 4.26596 15.1073 4.73937C15.6093 5.21279 15.8913 5.85487 15.8913 6.52438C15.8913 7.19389 15.6093 7.83598 15.1073 8.30939L8.95456 14.1059C8.70358 14.3426 8.36317 14.4756 8.00823 14.4756C7.65329 14.4756 7.31289 14.3426 7.06191 14.1059C6.81093 13.8692 6.66993 13.5482 6.66993 13.2134C6.66993 12.8787 6.81093 12.5576 7.06191 12.3209L12.7399 6.97221" stroke="#1C1C1C" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const DropdownIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.40319 11.7539C8.69193 12.082 9.30807 12.082 9.59681 11.7539L13.8695 6.89736C14.2031 6.51817 13.8585 6 13.2727 6H4.7273C4.14151 6 3.79689 6.51817 4.1305 6.89736L8.40319 11.7539Z" fill="#1C1C1C"/>
    </svg>
);

const RentalCreateModal = ({ isOpen, onClose, onSubmit, initial = {} }) => {
    const auth = useAuth();
    const { companyInfo } = useCompany();
    const companyId = auth?.user?.companyId || companyInfo?.companyId || "ci";
    const ocrFolderBase = `company/${companyId}/docs`;

    const tmpIdRef = useRef(randomId("rental"));
    const generatedAtRef = useRef(new Date());

    // Form state
    const [form, setForm] = useState({
        plate: initial.plate || "",
        vin: initial.vin || "",
        vehicleType: initial.vehicleType || "",
        renterName: initial.renterName || "",
        contactNumber: initial.contactNumber || "",
        address: initial.address || "",
        start: initial.start || "",
        end: initial.end || "",
        rentalAmount: initial.rentalAmount || "",
        deposit: initial.deposit || "",
        paymentMethod: initial.paymentMethod || "월별 자동이체",
        rentalType: initial.rentalType || "장기",
        contractFile: null,
        driverLicenseFile: null,
    });
    const [formErrors, setFormErrors] = useState({});
    const [dateError, setDateError] = useState("");

    const [preUploaded, setPreUploaded] = useState({ contract: [], license: [] });
    const [ocrSuggest, setOcrSuggest] = useState({});
    const [busy, setBusy] = useState({ status: "idle", message: "", percent: 0 });

    // Assets for vehicle dropdown
    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);

    const update = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setFormErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
        if (field === "start" || field === "end") {
            setDateError("");
        }
    };

    const getBizRegNo = () => {
        const c = auth?.user?.company || {};
        const u = auth?.user || {};
        const ci = companyInfo || {};
        const candidates = [
            u.companyId, c.companyId, c.regNumber, c.bizRegNo, c.businessNumber,
            u.regNumber, u.bizRegNo, u.businessNumber,
            ci.regNumber, ci.bizRegNo, ci.businessNumber, ci.companyId,
        ];
        for (const v of candidates) {
            if (v != null && String(v).trim()) return String(v);
        }
        return "";
    };

    const contractNumber = useMemo(() => {
        const bizRegNo = getBizRegNo();
        return generateContractNumber({ bizRegNo, plate: form.plate, date: generatedAtRef.current });
    }, [form.plate]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setForm({
                plate: initial.plate || "",
                vin: initial.vin || "",
                vehicleType: initial.vehicleType || "",
                renterName: initial.renterName || "",
                contactNumber: initial.contactNumber || "",
                address: initial.address || "",
                start: initial.start || "",
                end: initial.end || "",
                rentalAmount: initial.rentalAmount || "",
                deposit: initial.deposit || "",
                paymentMethod: initial.paymentMethod || "월별 자동이체",
                rentalType: initial.rentalType || "장기",
                contractFile: null,
                driverLicenseFile: null,
            });
            setPreUploaded({ contract: [], license: [] });
            setOcrSuggest({});
            setBusy({ status: "idle", message: "", percent: 0 });
            setFormErrors({});
            setDateError("");
            tmpIdRef.current = randomId("rental");
            generatedAtRef.current = new Date();
        }
    }, [isOpen]);

    // Load assets
    useEffect(() => {
        if (!isOpen) return;
        let mounted = true;
        (async () => {
            setAssetsLoading(true);
            try {
                let list = await fetchAssetsSummary().catch(() => null);
                if (!Array.isArray(list)) {
                    list = await fetchAssets();
                }
                const normalized = Array.isArray(list)
                    ? list.map((a) => ({ ...a, managementStage: getManagementStage(a) }))
                    : [];
                if (mounted) setAssets(normalized);
            } catch (e) {
                console.warn("Failed to fetch assets", e);
            } finally {
                if (mounted) setAssetsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [isOpen]);

    // Sort assets by stage
    const stageRank = (stage) => {
        const s = String(stage || "").trim();
        if (s === "대여가능") return 0;
        if (s === "대여중") return 1;
        if (s === "수리/점검 완료") return 2;
        if (s === "수리/점검 중") return 3;
        if (s === "예약중" || s === "예약 중") return 4;
        return 9;
    };

    const sortedAssets = useMemo(() => {
        const list = Array.isArray(assets) ? [...assets] : [];
        list.sort((a, b) => {
            const ra = stageRank(a?.managementStage);
            const rb = stageRank(b?.managementStage);
            if (ra !== rb) return ra - rb;
            return String(a?.plate || "").localeCompare(String(b?.plate || ""), "ko");
        });
        return list;
    }, [assets]);

    const selectedAsset = useMemo(() => {
        const plate = (form.plate || "").trim();
        if (!plate) return null;
        return sortedAssets.find((a) => String(a.plate || "").trim() === plate) || null;
    }, [form.plate, sortedAssets]);

    const handlePlateChange = (e) => {
        const nextPlate = e.target.value;
        const asset = sortedAssets.find((a) => String(a.plate || "").trim() === nextPlate);
        setForm((prev) => ({
            ...prev,
            plate: nextPlate,
            vin: asset?.vin || prev.vin,
            vehicleType: asset?.vehicleType || prev.vehicleType,
        }));
    };

    const toArray = (val) => (Array.isArray(val) ? val : val instanceof File ? [val] : []);

    const uploadOneFile = async (file, label) => {
        return uploadOneOCR(file, {
            folder: ocrFolderBase,
            type: "rental",
            tmpId: tmpIdRef.current,
            label,
            onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })),
        });
    };

    const handleUploadAndOcr = async () => {
        const contracts = toArray(form.contractFile);
        const licenses = toArray(form.driverLicenseFile);

        if (contracts.length === 0 && licenses.length === 0) {
            return;
        }

        setBusy({ status: "uploading", message: "업로드 중...", percent: 0 });

        try {
            const uploaded = { contract: [], license: [] };

            for (const f of contracts) {
                const item = await uploadOneFile(f, "contracts");
                if (item?.objectName) uploaded.contract.push(item);
            }
            for (const f of licenses) {
                const item = await uploadOneFile(f, "licenses");
                if (item?.objectName) uploaded.license.push(item);
            }
            setPreUploaded(uploaded);

            setBusy({ status: "ocr", message: "자동 채움 처리 중...", percent: 0 });

            const suggestions = {};

            if (uploaded.contract[0]?.objectName) {
                try {
                    const resp = await ocrExtract({
                        docType: "contract",
                        objectName: uploaded.contract[0].objectName,
                        sourceName: uploaded.contract[0].name,
                        saveOutput: true,
                    });
                    if (resp?.ocrSuggestions?.contract) {
                        suggestions.contract = resp.ocrSuggestions.contract;
                        const fields = suggestions.contract.fields || [];
                        const updates = {};
                        fields.forEach(({ name, value }) => {
                            const v = String(value ?? "");
                            if (name === "renterName" && !form.renterName) updates.renterName = v;
                            if (name === "contactNumber" && !form.contactNumber) updates.contactNumber = v;
                            if (name === "address" && !form.address) updates.address = v;
                            if (name === "start" && !form.start) updates.start = v;
                            if (name === "end" && !form.end) updates.end = v;
                            if ((name === "rentalAmount" || name === "monthlyPayment") && !form.rentalAmount) {
                                updates.rentalAmount = formatCurrency(v);
                            }
                            if (name === "deposit" && !form.deposit) updates.deposit = formatCurrency(v);
                            if (name === "paymentMethod" && !form.paymentMethod) updates.paymentMethod = v;
                            if (name === "rentalType" && !form.rentalType) updates.rentalType = v;
                        });
                        if (Object.keys(updates).length > 0) {
                            setForm((prev) => ({ ...prev, ...updates }));
                        }
                    }
                } catch (e) { /* noop */ }
            }

            if (uploaded.license[0]?.objectName) {
                try {
                    const resp = await ocrExtract({
                        docType: "driverLicense",
                        objectName: uploaded.license[0].objectName,
                        sourceName: uploaded.license[0].name,
                        saveOutput: true,
                    });
                    if (resp?.ocrSuggestions?.driverLicense) {
                        suggestions.driverLicense = resp.ocrSuggestions.driverLicense;
                    }
                } catch (e) { /* noop */ }
            }

            setOcrSuggest(suggestions);
        } finally {
            setBusy({ status: "idle", message: "", percent: 0 });
        }
    };

    const handleSubmit = async () => {
        const errors = {};
        if (!String(form.plate || "").trim()) errors.plate = "차량번호를 선택해주세요.";
        if (!String(form.renterName || "").trim()) errors.renterName = "계약자명을 입력해주세요.";
        if (!form.start) errors.start = "대여 시작일을 선택해주세요.";
        if (!form.end) errors.end = "대여 종료일을 선택해주세요.";
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            emitToast("필수값을 모두 입력해주세요.", "error");
            return;
        }

        setDateError("");
        if (form.start && form.end) {
            const startDate = new Date(form.start);
            const endDate = new Date(form.end);
            if (!isNaN(startDate) && !isNaN(endDate) && startDate >= endDate) {
                const msg = "대여 종료일이 시작일보다 늦어야 합니다.";
                setDateError(msg);
                emitToast(msg, "error");
                return;
            }
        }

        const bizRegNo = getBizRegNo();
        const rentalId = generateContractNumber({ bizRegNo, plate: form.plate, date: generatedAtRef.current });

        if (typeof onSubmit === "function") {
            await onSubmit({
                ...form,
                rentalId,
                preUploaded,
                ocrSuggestions: ocrSuggest,
            });
        }
    };

    const handleFileChange = (field) => (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            // 기존 파일에 새 파일 추가
            const currentFiles = toArray(form[field]);
            const newFiles = Array.from(files);
            update(field, [...currentFiles, ...newFiles]);
        }
    };

    const contractFiles = toArray(form.contractFile);
    const licenseFiles = toArray(form.driverLicenseFile);
    const contractFileCount = contractFiles.length;
    const licenseFileCount = licenseFiles.length;

    if (!isOpen) return null;

    return (
        <div className="rental-create-modal-overlay" onClick={onClose}>
            <div className="rental-create-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="rental-create-modal__header">
                    <h2 className="rental-create-modal__title">계약등록</h2>
                    <button className="rental-create-modal__close" onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>
                <div className="rental-create-modal__header-line" />

                {/* Upload Section */}
                <div className="rental-create-modal__upload-section">
                    <div className="rental-create-modal__upload-row">
                        {/* Contract Upload */}
                        <div className="rental-create-modal__upload-col">
                            <label className="rental-create-modal__upload-label">대여 계약서 업로드</label>
                            <div className={`rental-create-modal__upload-preview ${contractFileCount > 0 ? "rental-create-modal__upload-preview--has-file" : ""}`}>
                                {contractFileCount > 0 ? (
                                    <FilesPreviewCarousel
                                        files={contractFiles}
                                        onChange={(next) => update("contractFile", next.length > 0 ? next : null)}
                                    />
                                ) : (
                                    <span className="rental-create-modal__upload-placeholder">
                                        파일을 선택하면 미리보기가 표시됩니다.
                                    </span>
                                )}
                            </div>
                            <label className={`rental-create-modal__file-input-wrapper ${contractFileCount > 0 ? "rental-create-modal__file-input-wrapper--active" : ""}`}>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    multiple
                                    onChange={handleFileChange("contractFile")}
                                    className="rental-create-modal__file-input"
                                />
                                <div className="rental-create-modal__file-btn">
                                    <AttachIcon />
                                    <span>파일 및 사진 추가</span>
                                </div>
                                <span className={`rental-create-modal__file-count ${contractFileCount > 0 ? "rental-create-modal__file-count--active" : ""}`}>
                                    {contractFileCount} / {contractFileCount}
                                </span>
                            </label>
                        </div>

                        {/* License Upload */}
                        <div className="rental-create-modal__upload-col">
                            <label className="rental-create-modal__upload-label">운전면허증 업로드</label>
                            <div className={`rental-create-modal__upload-preview ${licenseFileCount > 0 ? "rental-create-modal__upload-preview--has-file" : ""}`}>
                                {licenseFileCount > 0 ? (
                                    <FilesPreviewCarousel
                                        files={licenseFiles}
                                        onChange={(next) => update("driverLicenseFile", next.length > 0 ? next : null)}
                                    />
                                ) : (
                                    <span className="rental-create-modal__upload-placeholder">
                                        파일을 선택하면 미리보기가 표시됩니다.
                                    </span>
                                )}
                            </div>
                            <label className={`rental-create-modal__file-input-wrapper ${licenseFileCount > 0 ? "rental-create-modal__file-input-wrapper--active" : ""}`}>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    multiple
                                    onChange={handleFileChange("driverLicenseFile")}
                                    className="rental-create-modal__file-input"
                                />
                                <div className="rental-create-modal__file-btn">
                                    <AttachIcon />
                                    <span>파일 및 사진 추가</span>
                                </div>
                                <span className={`rental-create-modal__file-count ${licenseFileCount > 0 ? "rental-create-modal__file-count--active" : ""}`}>
                                    {licenseFileCount} / {licenseFileCount}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Upload Button */}
                    <button
                        type="button"
                        className="rental-create-modal__upload-btn"
                        onClick={handleUploadAndOcr}
                        disabled={busy.status !== "idle"}
                    >
                        {busy.status === "uploading" ? `업로드 중... ${busy.percent}%` :
                         busy.status === "ocr" ? "자동 채움 처리 중..." :
                         "업로드 및 자동채움"}
                    </button>
                </div>

                <div className="rental-create-modal__divider" />

                {/* Form Section */}
                <div className="rental-create-modal__form">
                    {/* Vehicle Info */}
                    <div className="rental-create-modal__form-row">
                        <label className="rental-create-modal__form-label">차량정보</label>
                        <div className="rental-create-modal__select-wrapper rental-create-modal__select-wrapper--wide rental-create-modal__select-wrapper--readonly">
                            <select
                                value={form.plate}
                                onChange={handlePlateChange}
                                className={`rental-create-modal__select${formErrors.plate ? " rental-create-modal__select--error" : ""}`}
                            >
                                <option value="">{assetsLoading ? "로딩 중..." : "차량번호 선택"}</option>
                                {sortedAssets.map((a, idx) => (
                                    <option key={a.id || `${a.plate}-${idx}`} value={a.plate}>
                                        {[a.plate, a.vehicleType && `· ${a.vehicleType}`, a.vin && `· ${a.vin}`, a.managementStage && `· ${a.managementStage}`].filter(Boolean).join(" ")}
                                    </option>
                                ))}
                            </select>
                            <DropdownIcon />
                        </div>
                        {formErrors.plate && <div className="rental-create-modal__error">{formErrors.plate}</div>}
                    </div>

                    {/* Contract Number */}
                    <div className="rental-create-modal__contract-number">
                        <span className="rental-create-modal__contract-number-label">대여 계약번호</span>
                        <span className="rental-create-modal__contract-number-value">{contractNumber}</span>
                    </div>

                    {/* Renter Name & Contact */}
                    <div className="rental-create-modal__form-row rental-create-modal__form-row--double">
                        <div className="rental-create-modal__form-col">
                            <label className="rental-create-modal__form-label">계약자 이름</label>
                            <input
                                type="text"
                                value={form.renterName}
                                onChange={(e) => update("renterName", e.target.value)}
                                placeholder="예: 김나박이"
                                className={`rental-create-modal__input${formErrors.renterName ? " rental-create-modal__input--error" : ""}`}
                            />
                            {formErrors.renterName && <div className="rental-create-modal__error">{formErrors.renterName}</div>}
                        </div>
                        <div className="rental-create-modal__form-col">
                            <label className="rental-create-modal__form-label">계약자 연락처</label>
                            <input
                                type="tel"
                                value={form.contactNumber}
                                onChange={(e) => update("contactNumber", formatPhone11(e.target.value))}
                                placeholder="010-0000-0000"
                                maxLength={13}
                                className="rental-create-modal__input"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="rental-create-modal__form-row">
                        <label className="rental-create-modal__form-label">계약자 주소</label>
                        <div className="rental-create-modal__input-wrapper">
                            <input
                                type="text"
                                value={form.address}
                                onChange={(e) => update("address", e.target.value)}
                                placeholder="주소를 입력하세요"
                                className="rental-create-modal__input rental-create-modal__input--wide"
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="rental-create-modal__form-row rental-create-modal__form-row--double">
                        <div className="rental-create-modal__form-col">
                            <label className="rental-create-modal__form-label">대여 시작일</label>
                            <div className="rental-create-modal__date-wrapper">
                                <input
                                    type="date"
                                    value={form.start}
                                    onChange={(e) => update("start", e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                    className={`rental-create-modal__input rental-create-modal__input--date${formErrors.start ? " rental-create-modal__input--error" : ""}`}
                                />
                            </div>
                            {formErrors.start && <div className="rental-create-modal__error">{formErrors.start}</div>}
                        </div>
                        <div className="rental-create-modal__form-col">
                            <label className="rental-create-modal__form-label">대여 종료일</label>
                            <div className="rental-create-modal__date-wrapper">
                                <input
                                    type="date"
                                    value={form.end}
                                    onChange={(e) => update("end", e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                    className={`rental-create-modal__input rental-create-modal__input--date${formErrors.end ? " rental-create-modal__input--error" : ""}`}
                                />
                            </div>
                            {formErrors.end && <div className="rental-create-modal__error">{formErrors.end}</div>}
                        </div>
                    </div>
                    {dateError && (
                        <div style={{ marginTop: "4px", fontSize: "12px", color: "#dc2626" }}>
                            {dateError}
                        </div>
                    )}

                    {/* Payment Method & Rental Type */}
                    <div className="rental-create-modal__form-row rental-create-modal__form-row--double">
                        <div className="rental-create-modal__form-col">
                            <label className="rental-create-modal__form-label">결제방식</label>
                            <div className="rental-create-modal__select-wrapper">
                                <select
                                    value={form.paymentMethod}
                                    onChange={(e) => update("paymentMethod", e.target.value)}
                                    className="rental-create-modal__select"
                                >
                                    <option value="월별 자동이체">월별 자동이체</option>
                                    <option value="일시불">일시불</option>
                                    <option value="계좌이체">계좌이체</option>
                                    <option value="카드 결제">카드 결제</option>
                                </select>
                                <DropdownIcon />
                            </div>
                        </div>
                        <div className="rental-create-modal__form-col">
                            <label className="rental-create-modal__form-label">계약기간</label>
                            <div className="rental-create-modal__radio-group">
                                <label className="rental-create-modal__radio">
                                    <input
                                        type="radio"
                                        name="rentalType"
                                        value="단기"
                                        checked={form.rentalType === "단기"}
                                        onChange={(e) => update("rentalType", e.target.value)}
                                    />
                                    <span className={`rental-create-modal__radio-circle ${form.rentalType === "단기" ? "rental-create-modal__radio-circle--selected" : ""}`} />
                                    단기
                                </label>
                                <label className="rental-create-modal__radio">
                                    <input
                                        type="radio"
                                        name="rentalType"
                                        value="장기"
                                        checked={form.rentalType === "장기"}
                                        onChange={(e) => update("rentalType", e.target.value)}
                                    />
                                    <span className={`rental-create-modal__radio-circle ${form.rentalType === "장기" ? "rental-create-modal__radio-circle--selected" : ""}`} />
                                    장기
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Amount & Deposit */}
                    <div className="rental-create-modal__form-row rental-create-modal__form-row--double">
                        <div className="rental-create-modal__form-col">
                            <label className="rental-create-modal__form-label">대여금액</label>
                            <input
                                type="text"
                                value={form.rentalAmount}
                                onChange={(e) => update("rentalAmount", formatCurrency(e.target.value))}
                                placeholder="예: 22,800,000"
                                className="rental-create-modal__input"
                            />
                        </div>
                        <div className="rental-create-modal__form-col">
                            <label className="rental-create-modal__form-label">보증금</label>
                            <input
                                type="text"
                                value={form.deposit}
                                onChange={(e) => update("deposit", formatCurrency(e.target.value))}
                                placeholder="예: 3,000,000"
                                className="rental-create-modal__input"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="rental-create-modal__footer">
                    <div className="rental-create-modal__footer-line" />
                    <div className="rental-create-modal__footer-buttons">
                        <button type="button" className="rental-create-modal__btn rental-create-modal__btn--cancel" onClick={onClose}>
                            닫기
                        </button>
                        <button type="button" className="rental-create-modal__btn rental-create-modal__btn--submit" onClick={handleSubmit}>
                            저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RentalCreateModal;
