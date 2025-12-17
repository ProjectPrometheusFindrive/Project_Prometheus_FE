import React, { useState, useEffect, useMemo, useRef } from "react";
import FilePreview from "../FilePreview";
import FilesPreviewCarousel from "../FilesPreviewCarousel";
import MultiDocGallery from "../MultiDocGallery";

function formatFullDateDot(value) {
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        const yyyy = String(d.getFullYear());
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}. ${mm}. ${dd}`;
    } catch {
        return "";
    }
}

export default function DeviceInfoDialog({
    asset = {},
    onClose,
    onSubmit,
    readOnly = false,
    allowEditToggle = false
}) {
    const [form, setForm] = useState({
        supplier: asset.supplier || "",
        installDate: asset.deviceInstallDate || asset.installDate || "",
        installer: asset.installer || "",
        serial: asset.deviceSerial || "",
        photos: asset.photos || []
    });

    const [isReadOnly, setIsReadOnly] = useState(!!readOnly);
    const [errors, setErrors] = useState({});
    const fileInputRef = useRef(null);

    useEffect(() => {
        setIsReadOnly(!!readOnly);
    }, [readOnly]);

    useEffect(() => {
        setForm({
            supplier: asset.supplier || "",
            installDate: asset.deviceInstallDate || asset.installDate || "",
            installer: asset.installer || "",
            serial: asset.deviceSerial || "",
            photos: asset.photos || []
        });
        setErrors({});
    }, [asset?.id, asset?.supplier, asset?.deviceInstallDate, asset?.installDate, asset?.installer, asset?.deviceSerial, asset?.photos]);

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleSave = () => {
        const newErrors = {};
        if (!form.supplier.trim()) {
            newErrors.supplier = "필수 입력 항목입니다.";
        }
        if (!form.installDate) {
            newErrors.installDate = "필수 입력 항목입니다.";
        }
        if (!form.installer.trim()) {
            newErrors.installer = "필수 입력 항목입니다.";
        }
        if (!form.serial.trim()) {
            newErrors.serial = "필수 입력 항목입니다.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (onSubmit) {
            onSubmit(form);
        }
    };

    const onFile = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const prev = Array.isArray(form.photos) ? form.photos : [];
            updateField("photos", [...prev, ...files]);
        }
    };

    const photos = useMemo(() => {
        return Array.isArray(form.photos) ? form.photos.filter(Boolean) : [];
    }, [form.photos]);

    const deviceHistory = useMemo(() => {
        const list = Array.isArray(asset.deviceHistory) ? asset.deviceHistory : [];
        if (list.length === 0 && (asset.deviceInstallDate || asset.installDate)) {
            return [{
                id: `virtual-${asset.id}`,
                type: "install",
                label: "단말 장착",
                date: asset.deviceInstallDate || asset.installDate,
                meta: { installer: asset.installer }
            }];
        }
        return list;
    }, [asset.deviceHistory, asset.deviceInstallDate, asset.installDate, asset.installer, asset.id]);

    const infoRow = (label, value) => (
        <>
            <div className="asset-info__label">{label}</div>
            <div className="asset-info__value">{value ?? <span className="empty">-</span>}</div>
        </>
    );

    const docBoxView = () => {
        const list = Array.isArray(asset.devicePhotoList) ? asset.devicePhotoList : [];

        if (list.length > 0) {
            return (
                <MultiDocGallery title="단말장착사진" items={list} />
            );
        }

        return (
            <div className="asset-doc asset-doc--view">
                <div className="asset-doc__title">단말장착사진</div>
                <div
                    className="asset-doc__box Box32"
                    style={{
                        width: 330,
                        height: 198,
                        background: "#FAFAFA",
                        borderRadius: 6,
                        border: "1px rgba(0, 0, 0, 0.08) solid",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {photos.length > 0 ? (
                        <FilesPreviewCarousel files={photos} />
                    ) : (
                        <div className="asset-doc__placeholder">등록된 사진이 없습니다.</div>
                    )}
                </div>
            </div>
        );
    };

    const docBoxEdit = () => {
        const count = photos.length;

        return (
            <div className="asset-doc asset-doc--upload">
                <div className="asset-doc__title">단말장착사진</div>
                <div className={`asset-doc__box ${count > 0 ? "asset-doc__box--has-file" : ""}`}>
                    {count === 0 ? (
                        <div className="asset-doc__placeholder">
                            파일을 선택하면 미리보기가 표시됩니다.
                        </div>
                    ) : (
                        <FilesPreviewCarousel
                            files={photos}
                            className="asset-doc__carousel"
                            onChange={(next) => updateField("photos", next)}
                        />
                    )}
                </div>
                <label className={`asset-doc__upload-row ${count > 0 ? "asset-doc__upload-row--active" : ""}`} htmlFor="device-photos">
                    <div className="asset-doc__upload-button">
                        <span className="asset-doc__upload-icon" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M17 10.0944L10.8539 15.8909C10.101 16.6011 9.07974 17 8.01492 17C6.9501 17 5.92889 16.6011 5.17594 15.8909C4.423 15.1808 4 14.2177 4 13.2134C4 12.2092 4.423 11.246 5.17594 10.5359L11.322 4.73937C11.824 4.26596 12.5048 4 13.2147 4C13.9246 4 14.6054 4.26596 15.1073 4.73937C15.6093 5.21279 15.8913 5.85487 15.8913 6.52438C15.8913 7.19389 15.6093 7.83598 15.1073 8.30939L8.95456 14.1059C8.70358 14.3426 8.36317 14.4756 8.00823 14.4756C7.65329 14.4756 7.31289 14.3426 7.06191 14.1059C6.81093 13.8692 6.66993 13.5482 6.66993 13.2134C6.66993 12.8787 6.81093 12.5576 7.06191 12.3209L12.7399 6.97221"
                                    stroke="#1C1C1C"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </span>
                        <span className="asset-doc__upload-label">파일 및 사진 추가</span>
                    </div>
                    <input
                        ref={fileInputRef}
                        id="device-photos"
                        name="photos"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={onFile}
                        className="sr-only"
                    />
                    <div className={`asset-doc__upload-count ${count > 0 ? "asset-doc__upload-count--active" : ""}`}>
                        {count > 0 ? `${count} / ${count}` : "0 / 0"}
                    </div>
                </label>
            </div>
        );
    };

    const isExisting = !!(asset?.deviceSerial || asset?.supplier);

    return (
        <div className={`asset-dialog ${isReadOnly ? "asset-dialog--edit" : "asset-dialog--create"}`}>
            <div className="asset-dialog__body">
                {isReadOnly ? (
                    <>
                        <div className="asset-docs-section mb-4">
                            {docBoxView()}
                        </div>

                        <div className="asset-info grid-info asset-info--two-col">
                            {infoRow("단말 공급사", asset.supplier || "")}
                            {infoRow("단말 장착일", asset.deviceInstallDate || asset.installDate ? formatFullDateDot(asset.deviceInstallDate || asset.installDate) : "")}
                            {infoRow("장착자 이름", asset.installer || "")}
                            {infoRow("단말 시리얼번호", asset.deviceSerial || "")}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="asset-docs-section">
                            {docBoxEdit()}
                        </div>
                        <div className="asset-form-separator" />

                        <div className="asset-info grid-info asset-info--two-col">
                            {infoRow(
                                "단말 공급사",
                                <div className="flex flex-col gap-1 w-full">
                                    <input
                                        id="device-supplier"
                                        name="supplier"
                                        className={`form-input w-full${errors.supplier ? " is-invalid" : ""}`}
                                        value={form.supplier}
                                        onChange={(e) => updateField("supplier", e.target.value)}
                                        placeholder="예: DB자동차보험"
                                    />
                                    {errors.supplier && (
                                        <span className="text-red-600 text-[12px]">{errors.supplier}</span>
                                    )}
                                </div>
                            )}
                            {infoRow(
                                "단말 장착일",
                                <div className="flex flex-col gap-1 w-full">
                                    <input
                                        id="device-installDate"
                                        name="installDate"
                                        type="date"
                                        className={`form-input w-full${errors.installDate ? " is-invalid" : ""}`}
                                        value={form.installDate}
                                        onChange={(e) => updateField("installDate", e.target.value)}
                                    />
                                    {errors.installDate && (
                                        <span className="text-red-600 text-[12px]">{errors.installDate}</span>
                                    )}
                                </div>
                            )}
                            {infoRow(
                                "장착자 이름",
                                <div className="flex flex-col gap-1 w-full">
                                    <input
                                        id="device-installer"
                                        name="installer"
                                        className={`form-input w-full${errors.installer ? " is-invalid" : ""}`}
                                        value={form.installer}
                                        onChange={(e) => updateField("installer", e.target.value)}
                                        placeholder="예: 홍길동"
                                    />
                                    {errors.installer && (
                                        <span className="text-red-600 text-[12px]">{errors.installer}</span>
                                    )}
                                </div>
                            )}
                            {infoRow(
                                "단말 시리얼번호",
                                <div className="flex flex-col gap-1 w-full">
                                    <input
                                        id="device-serial"
                                        name="serial"
                                        className={`form-input w-full${errors.serial ? " is-invalid" : ""}`}
                                        value={form.serial}
                                        onChange={(e) => updateField("serial", e.target.value)}
                                        placeholder="예: 1ABCD-SONATA-26"
                                    />
                                    {errors.serial && (
                                        <span className="text-red-600 text-[12px]">{errors.serial}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="asset-dialog__footer asset-dialog__footer--main">
                {isReadOnly && deviceHistory.length > 0 && (
                    <div className="asset-history-lines">
                        {deviceHistory.map((h, idx) => {
                            const when = formatFullDateDot(h.date || h.installDate || "");
                            const label = h.type === "install" ? "단말 장착" : (h.label || "이벤트");
                            const installer = h.meta?.installer || h.installer || "";
                            return (
                                <div key={h.id || idx} className="asset-history__line asset-history__line--reg">
                                    <div
                                        style={{
                                            justifyContent: "center",
                                            display: "flex",
                                            flexDirection: "column",
                                            color: "#888888",
                                            fontSize: 12,
                                            fontFamily: "Pretendard",
                                            fontWeight: 400,
                                            lineHeight: "18px",
                                        }}
                                    >
                                        {label}
                                    </div>
                                    <div
                                        style={{
                                            justifyContent: "center",
                                            display: "flex",
                                            flexDirection: "column",
                                            color: "#1C1C1C",
                                            fontSize: 12,
                                            fontFamily: "Pretendard",
                                            fontWeight: 400,
                                            lineHeight: "18px",
                                        }}
                                    >
                                        {when}{installer ? ` (장착자: ${installer})` : ""}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div className="asset-dialog__footer-actions">
                    {allowEditToggle && isReadOnly && isExisting && (
                        <button type="button" className="form-button form-button--close" onClick={() => setIsReadOnly(false)}>수정</button>
                    )}
                    <button type="button" className="form-button form-button--close" onClick={onClose}>닫기</button>
                    {!isReadOnly && (
                        <button type="button" className="form-button form-button--save" onClick={handleSave}>
                            {isExisting ? '저장' : '등록'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
