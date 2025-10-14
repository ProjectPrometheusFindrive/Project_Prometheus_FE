import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAssetById, fetchRentalById, saveAsset, updateRental, createIssueDraft } from "../api";
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
            <div className="page">
                <h1>Details</h1>
                <div className="empty">No data found.</div>
            </div>
        );
    }

    return (
        <div className="page">
            <h1>Details</h1>

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

            <div className="page-scroll">
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
                                await updateRental(data.rentalId, rest);
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
