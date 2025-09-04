import React, { useEffect, useMemo, useState } from "react";
import { dummyGeofences } from "../data/geofences";
import { useNavigate, useSearchParams } from "react-router-dom";
import AssetForm from "../components/forms/AssetForm";
import RentalForm from "../components/forms/RentalForm";
import IssueForm from "../components/forms/IssueForm";
import GeofenceGlobalForm from "../components/forms/GeofenceGlobalForm";
import GeofencePreview from "../components/GeofencePreview";

export default function Registration() {
    const [searchParams, setSearchParams] = useSearchParams();
    const typeParam = (searchParams.get("type") || "asset").toLowerCase();
    const mode = useMemo(() => (["asset", "rental", "issue", "geofence"].includes(typeParam) ? typeParam : "asset"), [typeParam]);
    const navigate = useNavigate();
    const [geofenceStored, setGeofenceStored] = useState(null); // { geofences: Item[], updatedAt, isDummy? }
    const [geofenceDraft, setGeofenceDraft] = useState({ geofences: [] }); // drawing buffer (array of points[])
    const [editingIdx, setEditingIdx] = useState(null);
    const [editingName, setEditingName] = useState("");
    const [geofenceList, setGeofenceList] = useState([]);

    // Normalize input to items with { name, points }
    const toItems = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((it, i) => {
            if (Array.isArray(it)) return { name: `Polygon ${i + 1}`, points: it };
            if (it && Array.isArray(it.points)) return { name: it.name || `Polygon ${i + 1}`, points: it.points };
            return { name: `Polygon ${i + 1}`, points: [] };
        });
    };

    useEffect(() => {
        // Normalize invalid values to a valid one
        if (typeParam !== mode) {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("type", mode);
                    return next;
                },
                { replace: true }
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // Load stored geofences or dummy
    useEffect(() => {
        try {
            const raw = localStorage.getItem("geofenceSets");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed?.geofences) && parsed.geofences.length > 0) {
                    // Migrate to items form if needed
                    const items = toItems(parsed.geofences);
                    setGeofenceStored({ geofences: items, updatedAt: parsed.updatedAt || null, isDummy: false });
                } else {
                    // Saved exists but empty → treat as dummy
                    setGeofenceStored({ geofences: toItems(dummyGeofences), updatedAt: null, isDummy: true });
                }
            } else {
                // Dummy data when no saved set exists (sourced from data)
                const dummy = {
                    geofences: toItems(dummyGeofences),
                    updatedAt: null,
                    isDummy: true,
                };
                setGeofenceStored(dummy);
            }
        } catch {
            setGeofenceStored(null);
        }
    }, []);

    // Initialize in-memory geofence list from predefined data (ignore saved payload for display)
    useEffect(() => {
        try {
            const cloned = JSON.parse(JSON.stringify(dummyGeofences));
            setGeofenceList(toItems(cloned));
        } catch {
            setGeofenceList(toItems(dummyGeofences));
        }
    }, []);

    const changeMode = (next) => {
        setSearchParams((prev) => {
            const sp = new URLSearchParams(prev);
            sp.set("type", next);
            return sp;
        });
    };

    const handleAssetSubmit = (data) => {
        try {
            const arr = JSON.parse(localStorage.getItem("assetDrafts") || "[]");
            // Omit non-serializable file objects for now
            const { registrationDoc, insuranceDoc, ...rest } = data || {};
            arr.push({ ...rest, createdAt: new Date().toISOString() });
            localStorage.setItem("assetDrafts", JSON.stringify(arr));
        } catch {}
        navigate("/assets");
    };

    const handleRentalSubmit = (data) => {
        try {
            const arr = JSON.parse(localStorage.getItem("rentalDrafts") || "[]");
            // Omit non-serializable file objects for now
            const { contract_file, driver_license_file, ...rest } = data || {};
            arr.push({ ...rest, createdAt: new Date().toISOString() });
            localStorage.setItem("rentalDrafts", JSON.stringify(arr));
        } catch {}
        navigate("/rentals");
    };

    const handleIssueSubmit = (data) => {
        try {
            const arr = JSON.parse(localStorage.getItem("issueDrafts") || "[]");
            arr.push({ ...data, createdAt: new Date().toISOString() });
            localStorage.setItem("issueDrafts", JSON.stringify(arr));
        } catch {}
        navigate("/returns");
    };

    const handleGeofenceSubmit = (data) => {
        try {
            const now = new Date().toISOString();
            // If editing a single polygon, replace only that index (in-memory)
            if (editingIdx !== null && editingIdx >= 0) {
                setGeofenceList((prev) => {
                    const base = Array.isArray(prev) ? prev.map((it) => ({ name: it.name, points: [...it.points] })) : [];
                    const existing = base[editingIdx] || { name: `Polygon ${editingIdx + 1}`, points: [] };
                    const incoming = Array.isArray(data?.geofences) && data.geofences[0] ? data.geofences[0] : null;
                    const points = Array.isArray(incoming) && incoming.length > 0 ? incoming : existing.points;
                    const name = (data?.name && data.name.trim()) || editingName || existing.name;
                    base[editingIdx] = { name, points };
                    try {
                        localStorage.setItem("geofenceSets", JSON.stringify({ geofences: base, updatedAt: now }));
                        setGeofenceStored({ geofences: base, updatedAt: now, isDummy: false });
                    } catch {}
                    return base;
                });
                // clear edit state
                setEditingIdx(null);
                setEditingName("");
                setGeofenceDraft({ geofences: [] });
                return;
            }

            // New save: use provided name input if single polygon; otherwise auto names
            const polys = Array.isArray(data?.geofences) ? data.geofences : [];
            let items = [];
            if (polys.length === 1) {
                const nm = (data?.name && data.name.trim()) || `Polygon 1`;
                items = [{ name: nm, points: polys[0] }];
            } else {
                items = polys.map((pts, i) => ({ name: `Polygon ${i + 1}`, points: pts }));
            }
            setGeofenceList(items);
            try {
                localStorage.setItem("geofenceSets", JSON.stringify({ geofences: items, updatedAt: now }));
                setGeofenceStored({ geofences: items, updatedAt: now, isDummy: false });
            } catch {}
            setGeofenceDraft({ geofences: [] });
            setEditingName("");
        } catch {}
    };

    const handleGeofenceDelete = () => {
        try {
            localStorage.removeItem("geofenceSets");
        } catch {}
        // After delete, fall back to dummy display
        setGeofenceStored({ geofences: toItems(dummyGeofences), updatedAt: null, isDummy: true });
        console.log("[Geofence Delete] Cleared localStorage.geofenceSets");
    };

    const handleGeofenceEditAll = () => {
        const set = geofenceList || [];
        const points = toItems(set).map((it) => it.points);
        setGeofenceDraft({ geofences: points });
        setEditingIdx(null);
        setEditingName("");
        if (mode !== "geofence") changeMode("geofence");
    };

    const handleGeofenceEditOne = (idx) => {
        const items = toItems(geofenceList || []);
        const it = items[idx];
        if (!it) return;
        setEditingIdx(idx);
        setEditingName(it.name || "");
        setGeofenceDraft({ geofences: [it.points] });
        if (mode !== "geofence") changeMode("geofence");
    };

    const handleGeofenceDeleteOne = (idx) => {
        setGeofenceList((prev) => {
            const next = Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : [];
            try {
                localStorage.setItem("geofenceSets", JSON.stringify({ geofences: next, updatedAt: new Date().toISOString() }));
                setGeofenceStored({ geofences: next, updatedAt: new Date().toISOString(), isDummy: next.length === 0 });
            } catch {}
            return next;
        });
    };

    const handleRenameOne = (idx, name) => {
        setGeofenceList((prev) => {
            const list = toItems(prev || []);
            if (!list[idx]) return prev;
            list[idx] = { ...list[idx], name: name || list[idx].name };
            try {
                localStorage.setItem("geofenceSets", JSON.stringify({ geofences: list, updatedAt: new Date().toISOString() }));
                setGeofenceStored({ geofences: list, updatedAt: new Date().toISOString(), isDummy: false });
            } catch {}
            return list;
        });
    };

    return (
        <div className="page">
            <h1>Registration</h1>

            <div className="sticky-header">
                <div className="view-toggle" role="tablist" aria-label="Registration type">
                    <button type="button" className={`toggle-btn ${mode === "asset" ? "is-active" : ""}`} onClick={() => changeMode("asset")} role="tab" aria-selected={mode === "asset"}>
                        Asset
                    </button>
                    <button type="button" className={`toggle-btn ${mode === "rental" ? "is-active" : ""}`} onClick={() => changeMode("rental")} role="tab" aria-selected={mode === "rental"}>
                        Rental
                    </button>
                    <button type="button" className={`toggle-btn ${mode === "issue" ? "is-active" : ""}`} onClick={() => changeMode("issue")} role="tab" aria-selected={mode === "issue"}>
                        Issue
                    </button>
                    <button type="button" className={`toggle-btn ${mode === "geofence" ? "is-active" : ""}`} onClick={() => changeMode("geofence")} role="tab" aria-selected={mode === "geofence"}>
                        Geofence
                    </button>
                </div>
            </div>
            <div className="page-scroll">
                {mode === "asset" && <AssetForm onSubmit={handleAssetSubmit} />}
                {mode === "rental" && <RentalForm onSubmit={handleRentalSubmit} />}
                {mode === "issue" && <IssueForm onSubmit={handleIssueSubmit} />}
                {mode === "geofence" && (
                    <>
                        <GeofenceGlobalForm
                            initial={geofenceDraft}
                            initialName={editingIdx !== null ? editingName : ""}
                            onSubmit={handleGeofenceSubmit}
                            onChange={(v) => setGeofenceDraft(v)}
                            onNameChange={(v) => setEditingName(v)}
                        />
                        <div style={{ marginTop: 16 }}>
                            <h2 style={{ margin: "0 0 8px" }}>Geofence 목록</h2>
                            {(() => {
                                const displayItems = toItems(geofenceList).filter(
                                    (it) => Array.isArray(it.points) && it.points.length > 0
                                );
                                if (!displayItems || displayItems.length === 0) return <div className="empty">No geofences</div>;
                                return (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                            <span style={{ marginLeft: "auto", color: "#333" }}>{displayItems.length} polygon(s)</span>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                                            {displayItems.map((item, idx) => (
                                                <div key={idx}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                        <span className="badge badge--available">#{idx + 1}</span>
                                                        <span style={{ flex: 1, color: "#333", fontWeight: 600 }}>{item.name}</span>
                                                    </div>
                                                    <GeofencePreview polygons={[item.points]} height={200} />
                                                    <div className="form-actions" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                                        <button className="form-button" type="button" onClick={() => handleGeofenceEditOne(idx)}>
                                                            Edit
                                                        </button>
                                                        <button className="form-button" type="button" onClick={() => handleGeofenceDeleteOne(idx)} style={{ background: "#c62828" }}>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
