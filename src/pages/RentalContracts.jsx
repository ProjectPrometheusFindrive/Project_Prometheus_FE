import React, { useEffect, useMemo, useState } from "react";
import { fetchRentals } from "../api";
import RentalForm from "../components/forms/RentalForm";
import Modal from "../components/Modal";
import useTableSelection from "../hooks/useTableSelection";
import { FaCar } from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";

export default function RentalContracts() {
    const [items, setItems] = useState([]);
    const [showCreate, setShowCreate] = useState(false);

    // Initial load via fake API, then merge any local drafts once
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const base = await fetchRentals();
                let list = Array.isArray(base) ? base.map((r) => ({ ...r })) : [];
                try {
                    const raw = localStorage.getItem("rentalDrafts");
                    if (raw) {
                        const drafts = JSON.parse(raw);
                        if (Array.isArray(drafts)) {
                            const existingIds = new Set(list.map((x) => String(x.rental_id)));
                            const toAdd = drafts
                                .filter((d) => d && d.rental_id && !existingIds.has(String(d.rental_id)))
                                .map((d) => ({
                                    ...d,
                                    rental_period: d.rental_period || { start: d.start || "", end: d.end || "" },
                                }));
                            if (toAdd.length > 0) list = [...list, ...toAdd];
                        }
                    }
                } catch {}
                if (mounted) setItems(list);
            } catch (e) {
                console.error("Failed to load rentals", e);
                if (mounted) setItems([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const rows = useMemo(() => {
        const now = new Date();
        return items.map((r) => {
            const start = r?.rental_period?.start ? new Date(r.rental_period.start) : null;
            const end = r?.rental_period?.end ? new Date(r.rental_period.end) : null;
            const isActive = start && end ? now >= start && now <= end : false;
            const isOverdue = end ? now > end : false;
            const isStolen = Boolean(r.reported_stolen);
            const overdueDays = end ? Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24))) : 0;
            let statusText = "-";
            let statusClass = "";
            if (isStolen) {
                statusText = "Suspicious";
                statusClass = "badge--suspicious";
            } else if (isOverdue) {
                statusText = `Overdue ${overdueDays}d`;
                statusClass = "badge--overdue";
            } else if (isActive) {
                statusText = "Active";
                statusClass = "badge--rented";
            }
            return { ...r, isActive, isOverdue, isStolen, overdueDays, statusText, statusClass };
        });
    }, [items]);

    const { selected, toggleSelect, toggleSelectAllVisible, selectedCount, allVisibleSelected, clearSelection } = useTableSelection(rows, "rental_id");

    const handleDeleteSelected = () => {
        if (selectedCount === 0) return;
        const ok = window.confirm("Delete selected items?");
        if (!ok) return;
        setItems((prev) => prev.filter((r) => !selected.has(r.rental_id)));
        clearSelection();
    };

    const nextRentalId = () => {
        let max = 0;
        items.forEach((r) => {
            const n = parseInt(String(r.rental_id || 0), 10);
            if (!Number.isNaN(n)) max = Math.max(max, n);
        });
        return max + 1;
    };

    const handleCreateSubmit = (data) => {
        const { contract_file, driver_license_file, ...rest } = data || {};
        const rental_id = rest.rental_id && String(rest.rental_id).trim() ? rest.rental_id : nextRentalId();
        const normalized = {
            ...rest,
            rental_id,
            rental_period: { start: rest.start || "", end: rest.end || "" },
        };
        setItems((prev) => [normalized, ...prev]);
        try {
            const arr = JSON.parse(localStorage.getItem("rentalDrafts") || "[]");
            arr.push({ ...rest, rental_id, createdAt: new Date().toISOString() });
            localStorage.setItem("rentalDrafts", JSON.stringify(arr));
        } catch {}
        setShowCreate(false);
    };

    return (
        <div className="page">
            <h1>Rental Contracts</h1>
            <div className="page-scroll">
                <div className="asset-toolbar" style={{ marginBottom: 12 }}>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="form-button" onClick={() => setShowCreate(true)}>
                            계약 등록
                        </button>
                        <button
                            type="button"
                            className="form-button"
                            style={{ background: "#c62828" }}
                            onClick={handleDeleteSelected}
                            disabled={selectedCount === 0}
                            title={selectedCount === 0 ? "Select rows to delete" : "Delete selected"}
                        >
                            선택 삭제
                        </button>
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="asset-table rentals-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36, textAlign: "center" }}>
                                    <input type="checkbox" aria-label="Select all visible" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                                </th>
                                <th>Plate</th>
                                <th>Vehicle</th>
                                <th>Insurance</th>
                                <th>Renter</th>
                                <th>Period</th>
                                <th>Contact</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.rental_id}>
                                    <td style={{ textAlign: "center" }}>
                                        <input type="checkbox" aria-label={`Select: ${r.plate || r.rental_id}`} checked={selected.has(r.rental_id)} onChange={() => toggleSelect(r.rental_id)} />
                                    </td>
                                    <td>{r.plate || "-"}</td>
                                    <td>{r.vehicleType || "-"}</td>
                                    <td>{r.insurance_name || "-"}</td>
                                    <td>{r.renter_name || "-"}</td>
                                    <td>
                                        {r.rental_period?.start ? new Date(r.rental_period.start).toLocaleDateString() : "-"} ~{" "}
                                        {r.rental_period?.end ? new Date(r.rental_period.end).toLocaleDateString() : "-"}
                                    </td>
                                    <td>{r.contact_number || "-"}</td>
                                    <td>
                                        {r.statusText !== "-" ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span
                                                    className={`marker ${r.isStolen ? "marker--suspicious" : r.isOverdue ? "marker--overdue" : r.isActive ? "marker--rented" : "marker--car"}`}
                                                    aria-hidden
                                                >
                                                    {r.isStolen ? <FiAlertTriangle className="map-icon-svg" /> : <FaCar className="map-icon-svg" />}
                                                </span>
                                                <span className={`badge ${r.statusClass}`}>{r.statusText}</span>
                                            </div>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Rental" showFooter={false} ariaLabel="Create Rental">
                <RentalForm onSubmit={handleCreateSubmit} formId="rental-create" />
            </Modal>
        </div>
    );
}
