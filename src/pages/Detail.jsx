import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assets } from "../data/assets";
import { rentals } from "../data/rentals";
import AssetForm from "../components/forms/AssetForm";
import RentalForm from "../components/forms/RentalForm";
import IssueForm from "../components/forms/IssueForm";

export default function Detail() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const t = (type || "").toLowerCase();
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);

    const data = useMemo(() => {
        if (t === "asset") {
            return assets.find((a) => String(a.id) === String(id));
        }
        if (t === "rental" || t === "issue") {
            const rid = Number(id);
            return rentals.find((r) => Number(r.rental_id) === rid);
        }
        return null;
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
                        {!editing ? (
                            <button type="button" className="toggle-btn" onClick={() => setEditing(true)}>
                                Edit
                            </button>
                        ) : (
                            // Use a programmatic submit for more reliable behavior from outside the form
                            <button
                                type="button"
                                className="toggle-btn is-active"
                                onClick={() => {
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
                                }}
                            >
                                Save
                            </button>
                        )}
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
                        onSubmit={(form) => {
                            try {
                                const edits = JSON.parse(localStorage.getItem("assetEdits") || "{}");
                                const { registrationDoc, insuranceDoc, ...rest } = form || {};
                                edits[String(data.id)] = { ...data, ...rest };
                                localStorage.setItem("assetEdits", JSON.stringify(edits));
                                console.log("Asset saved:", edits[String(data.id)]);
                            } catch (e) {
                                console.error("Failed saving asset edit", e);
                            }
                            setEditing(false);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 1500);
                        }}
                    />
                )}
                {t === "rental" && (
                    <RentalForm
                        key={`rental-${editing}-${data.rental_id}`}
                        initial={data}
                        readOnly={!editing}
                        formId="detail-form"
                        showSubmit={false}
                        onSubmit={(form) => {
                            try {
                                const edits = JSON.parse(localStorage.getItem("rentalEdits") || "{}");
                                const { contract_file, ...rest } = form || {};
                                edits[String(data.rental_id)] = { ...data, ...rest };
                                localStorage.setItem("rentalEdits", JSON.stringify(edits));
                                console.log("Rental saved:", edits[String(data.rental_id)]);
                            } catch (e) {
                                console.error("Failed saving rental edit", e);
                            }
                            setEditing(false);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 1500);
                        }}
                    />
                )}
                {t === "issue" && (
                    <IssueForm
                        key={`issue-${editing}-${data.rental_id}`}
                        initial={{
                            vin: data.vin,
                            type: data.reported_stolen ? "stolen" : new Date() > new Date(data.rental_period.end) ? "overdue" : "other",
                            severity: data.reported_stolen ? "high" : "medium",
                            description: `From rental #${data.rental_id}`,
                        }}
                        readOnly={!editing}
                        formId="detail-form"
                        showSubmit={false}
                        onSubmit={(form) => {
                            try {
                                const edits = JSON.parse(localStorage.getItem("issueEdits") || "{}");
                                edits[String(data.rental_id)] = form;
                                localStorage.setItem("issueEdits", JSON.stringify(edits));
                                console.log("Issue saved:", edits[String(data.rental_id)]);
                            } catch (e) {
                                console.error("Failed saving issue edit", e);
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
