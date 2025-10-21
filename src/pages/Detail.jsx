import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAssetById, fetchRentalById, saveAsset, updateRental, createIssueDraft } from "../api";
import { ALLOWED_MIME_TYPES, chooseUploadMode } from "../constants/uploads";
import { uploadViaSignedPut, uploadResumable } from "../utils/uploads";
import AssetForm from "../components/forms/AssetForm";
import RentalForm from "../components/forms/RentalForm";
import IssueForm from "../components/forms/IssueForm";

export default function Detail() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const t = (type || "").toLowerCase();
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [data, setData] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (t === "asset") {
                    const a = await fetchAssetById(id);
                    if (mounted) setData(a || null);
                } else if (t === "rental" || t === "issue") {
                    const r = await fetchRentalById(id);
                    if (mounted) setData(r || null);
                } else {
                    if (mounted) setData(null);
                }
            } catch (e) {
                console.error("Failed to fetch detail data", e);
                if (mounted) setData(null);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [t, id]);

    if (!data) {
        return (
            <div className="page space-y-4">
                <h1 className="text-2xl font-semibold text-gray-900">Details</h1>
                <div className="empty">No data found.</div>
            </div>
        );
    }

    return (
        <div className="page space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">Details</h1>

            <div className="sticky-header">
                <div className="header-row">
                    <div className="view-toggle" role="toolbar" aria-label="Detail actions">
                        <button type="button" className="toggle-btn" onClick={() => navigate(-1)}>
                            Back
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${editing ? "is-active" : ""}`}
                            onClick={() => {
                                if (editing) {
                                    const f = document.getElementById("detail-form");
                                    if (f) {
                                        // prefer requestSubmit when available (triggers validation)
                                        if (typeof f.requestSubmit === "function") {
                                            f.requestSubmit();
                                        } else {
                                            // fallback: find a submit button inside the form
                                            const submitBtn = f.querySelector('button[type="submit"]');
                                            if (submitBtn) submitBtn.click();
                                        }
                                    } else {
                                        // as a last resort, toggle editing off
                                        console.warn("detail form not found: unable to submit");
                                        setEditing(false);
                                    }
                                } else {
                                    setEditing(true);
                                }
                            }}
                        >
                            {editing ? "Save" : "Edit"}
                        </button>
                    </div>

                    {saved && (
                        <div className="saved-indicator" aria-live="polite">
                            Saved
                        </div>
                    )}
                </div>
            </div>

            <div className="page-scroll space-y-4">
                {t === "asset" && (
                    <AssetForm
                        key={`asset-${editing}-${data.id}`}
                        initial={data}
                        readOnly={!editing}
                        formId="detail-form"
                        showSubmit={false}
                        onSubmit={async (form) => {
                            try {
                                const { registrationDoc, insuranceDoc, ...rest } = form || {};
                                const patch = {
                                    ...rest,
                                    year: rest.year ? Number(rest.year) : rest.year,
                                };
                                await saveAsset(data.id, patch);
                            } catch (e) {
                                console.error("Failed saving asset via API", e);
                                alert("자산 저장에 실패했습니다.");
                                return;
                            }
                            setEditing(false);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 1500);
                        }}
                    />
                )}
                {t === "rental" && (
                    <RentalForm
                        key={`rental-${editing}-${data.rentalId}`}
                        initial={data}
                        readOnly={!editing}
                        formId="detail-form"
                        showSubmit={false}
                        onSubmit={async (form) => {
                            try {
                                const { contractFile, driverLicenseFile, ...rest } = form || {};
                                const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
                                const contractFiles = toArray(contractFile);
                                const licenseFiles = toArray(driverLicenseFile);
                                const patch = { ...rest };
                                // Upload new files if provided
                                if (contractFiles.length > 0 || licenseFiles.length > 0) {
                                    const folderBase = `rentals/${encodeURIComponent(data.rentalId)}`;
                                const uploadOne = async (file, keyLabel) => {
                                        if (!file) return null;
                                        const type = file.type || "";
                                        if (type && !ALLOWED_MIME_TYPES.includes(type)) return null;
                                        const folder = `${folderBase}/${keyLabel}`;
                                        const mode = chooseUploadMode(file.size || 0);
                                        try {
                                            if (mode === "signed-put") {
                                                const { promise } = uploadViaSignedPut(file, { folder });
                                                const res = await promise;
                                                return { url: res?.publicUrl || null, objectName: res?.objectName || null };
                                            } else {
                                                const { promise } = uploadResumable(file, { folder });
                                                const res = await promise;
                                                return { url: res?.publicUrl || null, objectName: res?.objectName || null };
                                            }
                                        } catch {
                                            return null;
                                        }
                                    };
                                    const uploadMany = async (files, label) => {
                                        const urls = [];
                                        const objects = [];
                                        const names = [];
                                        for (const f of files) {
                                            const res = await uploadOne(f, label);
                                            if (res && (res.url || res.objectName)) {
                                                names.push(f.name);
                                                if (res.url) urls.push(res.url);
                                                if (res.objectName) objects.push(res.objectName);
                                            }
                                        }
                                        return { names, urls, objects };
                                    };
                                    const [contractRes, licenseRes] = await Promise.all([
                                        uploadMany(contractFiles, "contracts"),
                                        uploadMany(licenseFiles, "licenses"),
                                    ]);
                                    if (contractRes.names.length > 0) {
                                        patch.contractDocNames = contractRes.names;
                                        if (contractRes.urls.length > 0) patch.contractDocUrls = contractRes.urls;
                                        if (contractRes.objects.length > 0) patch.contractDocGcsObjectNames = contractRes.objects;
                                        patch.contractDocName = contractRes.names[0];
                                        if (contractRes.urls[0]) patch.contractDocUrl = contractRes.urls[0];
                                        if (contractRes.objects[0]) patch.contractDocGcsObjectName = contractRes.objects[0];
                                    }
                                    if (licenseRes.names.length > 0) {
                                        patch.licenseDocNames = licenseRes.names;
                                        if (licenseRes.urls.length > 0) patch.licenseDocUrls = licenseRes.urls;
                                        if (licenseRes.objects.length > 0) patch.licenseDocGcsObjectNames = licenseRes.objects;
                                        patch.licenseDocName = licenseRes.names[0];
                                        if (licenseRes.urls[0]) patch.licenseDocUrl = licenseRes.urls[0];
                                        if (licenseRes.objects[0]) patch.licenseDocGcsObjectName = licenseRes.objects[0];
                                    }
                                }
                                await updateRental(data.rentalId, patch);
                            } catch (e) {
                                console.error("Failed saving rental via API", e);
                                alert("계약 저장에 실패했습니다.");
                                return;
                            }
                            setEditing(false);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 1500);
                        }}
                    />
                )}
                {t === "issue" && (
                    <IssueForm
                        key={`issue-${editing}-${data.rentalId}`}
                        initial={{
                            vin: data.vin,
                            type: data.reportedStolen ? "stolen" : new Date() > new Date(data.rentalPeriod.end) ? "overdue" : "other",
                            severity: data.reportedStolen ? "high" : "medium",
                            description: `From rental #${data.rentalId}`,
                        }}
                        readOnly={!editing}
                        formId="detail-form"
                        showSubmit={false}
                        onSubmit={async (form) => {
                            try {
                                const result = await createIssueDraft(form);
                                if (!result?.ok) throw new Error(result?.error || "Issue create failed");
                            } catch (e) {
                                console.error("Failed creating issue via API", e);
                                alert("이슈 저장에 실패했습니다.");
                                return;
                            }
                            setEditing(false);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 1500);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
