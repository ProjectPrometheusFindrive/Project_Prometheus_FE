import React, { useEffect, useMemo, useState } from "react";
import { rentals } from "../data/rentals";
import RentalForm from "../components/forms/RentalForm";

export default function RentalContracts() {
    const [items, setItems] = useState(() => rentals.map((r) => ({ ...r })));
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState(new Set());

    // Load drafts from localStorage and merge once
    useEffect(() => {
        try {
            const raw = localStorage.getItem("rentalDrafts");
            if (!raw) return;
            const drafts = JSON.parse(raw);
            if (!Array.isArray(drafts)) return;
            setItems((prev) => {
                const existingIds = new Set(prev.map((x) => String(x.rental_id)));
                const toAdd = drafts
                    .filter((d) => d && d.rental_id && !existingIds.has(String(d.rental_id)))
                    .map((d) => ({
                        ...d,
                        rental_period: d.rental_period || { start: d.start || "", end: d.end || "" },
                    }));
                if (toAdd.length === 0) return prev;
                return [...prev, ...toAdd];
            });
        } catch {}
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
                statusText = "도난 의심";
                statusClass = "badge--suspicious";
            } else if (isOverdue) {
                statusText = `연체 ${overdueDays}일`;
                statusClass = "badge--overdue";
            } else if (isActive) {
                statusText = "대여 중";
                statusClass = "badge--rented";
            }
            return { ...r, isActive, isOverdue, isStolen, overdueDays, statusText, statusClass };
        });
    }, [items]);

    const allVisibleSelected = useMemo(() => {
        if (!rows || rows.length === 0) return false;
        return rows.every((r) => selected.has(r.rental_id));
    }, [rows, selected]);

    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllVisible = () => {
        setSelected((prev) => {
            const next = new Set(prev);
            const allSelected = rows.every((r) => next.has(r.rental_id));
            if (allSelected) rows.forEach((r) => next.delete(r.rental_id));
            else rows.forEach((r) => next.add(r.rental_id));
            return next;
        });
    };

    const handleDeleteSelected = () => {
        if (!selected || selected.size === 0) return;
        const ok = window.confirm("선택한 항목을 삭제하시겠습니까?");
        if (!ok) return;
        setItems((prev) => prev.filter((r) => !selected.has(r.rental_id)));
        setSelected(new Set());
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
                            disabled={selected.size === 0}
                            title={selected.size === 0 ? "삭제할 항목을 선택하세요" : "선택 항목 삭제"}
                        >
                            삭제
                        </button>
                    </div>
                </div>

                {showCreate && (
                    <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2 style={{ marginTop: 0, marginBottom: 12 }}>대여 계약 등록</h2>
                            <>
                                <RentalForm formId="rental-create" initial={{ rental_id: nextRentalId() }} onSubmit={handleCreateSubmit} showSubmit={false} />
                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <button type="submit" className="form-button" form="rental-create">
                                        저장
                                    </button>
                                    <button type="button" className="form-button" style={{ background: "#777" }} onClick={() => setShowCreate(false)}>
                                        닫기
                                    </button>
                                </div>
                            </>
                        </div>
                    </div>
                )}

                <div className="table-wrap">
                    <table className="asset-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36, textAlign: "center" }}>
                                    <input
                                        type="checkbox"
                                        aria-label="현재 목록 전체 선택"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                    />
                                </th>
                                <th>차량 번호</th>
                                <th>차종</th>
                                <th>고객 보험 정보</th>
                                <th>대여자</th>
                                <th>대여기간</th>
                                <th>대여자 연락처</th>
                                <th>대여 상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.rental_id}>
                                    <td style={{ textAlign: "center" }}>
                                        <input
                                            type="checkbox"
                                            aria-label={`선택: ${r.plate || r.rental_id}`}
                                            checked={selected.has(r.rental_id)}
                                            onChange={() => toggleSelect(r.rental_id)}
                                        />
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
                                    <td>{r.statusText !== "-" ? <span className={`badge ${r.statusClass}`}>{r.statusText}</span> : "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
